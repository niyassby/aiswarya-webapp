import React, { useState, useEffect, useRef } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/utils/supabase"
import { useAuth } from "@/features/auth/useAuth"
import { useRole } from "@/hooks/useRole"
import { toast } from "@/components/ui/toast"
import StatusBadge from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Send,
  Paperclip,
  ImageIcon,
  MessageSquareWarning,
  Loader2,
} from "lucide-react"

export const ComplaintDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const { isManager, isSuperAdmin, isSalesAdmin } = useRole()

  const [commentText, setCommentText] = useState("")
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const canManage = isManager || isSuperAdmin || isSalesAdmin

  // 1. Fetch Complaint Details
  const { data: complaint, isLoading: complaintLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select(
          `
          *,
          customers (*),
          orders (order_no),
          creator:profiles!complaints_raised_by_fkey (full_name),
          assigned_staff:profiles!complaints_assigned_to_fkey (full_name)
        `
        )
        .eq("id", id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // 2. Fetch Active Staff/Profiles for Assignment dropdown
  const { data: staffList = [] } = useQuery({
    queryKey: ["staff-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
      if (error) throw error
      return data || []
    },
  })

  // 3. Fetch Comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["complaint-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaint_comments")
        .select(
          `
          *,
          profiles (full_name)
        `
        )
        .eq("complaint_id", id)
        .order("created_at", { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  // 4. Realtime subscription
  useEffect(() => {
    if (!id) return

    // Listen to comments
    const commentsChannel = supabase
      .channel(`complaint-comments-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "complaint_comments",
          filter: `complaint_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["complaint-comments", id],
          })
          setTimeout(scrollToBottom, 300)
        }
      )
      .subscribe()

    // Listen to complaint ticket edits
    const complaintChannel = supabase
      .channel(`complaint-ticket-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "complaints",
          filter: `id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["complaint", id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(commentsChannel)
      supabase.removeChannel(complaintChannel)
    }
  }, [id, queryClient])

  // Scroll to bottom helper
  const scrollToBottom = () => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (comments.length > 0) {
      scrollToBottom()
    }
  }, [comments])

  // Mutation: Update details (Status, Priority, Assignee)
  const updateComplaintMutation = useMutation({
    mutationFn: async (payload: {
      status?: string
      priority?: string
      assigned_to?: string | null
    }) => {
      const updateData: any = {
        ...payload,
        updated_at: new Date().toISOString(),
      }

      if (payload.assigned_to !== undefined) {
        updateData.assigned_by = profile?.id
      }

      const { data, error } = await supabase
        .from("complaints")
        .update(updateData)
        .eq("id", id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaint", id] })
      queryClient.invalidateQueries({ queryKey: ["complaints"] })
      toast.success("Complaint details updated!")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update complaint fields")
    },
  })

  // Mutation: Post a comment
  const postCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase.from("complaint_comments").insert([
        {
          complaint_id: id,
          author_id: profile?.id,
          comment: text,
        },
      ])
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaint-comments", id] })
      setCommentText("")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to post note")
    },
  })

  // Handle Comment Submission
  const handlePostComment = () => {
    if (!commentText.trim()) return
    postCommentMutation.mutate(commentText)
  }

  // Upload file attachment
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setUploadingFile(true)

    try {
      // 1. Check or Create complaints storage bucket
      // Just try to upload, if bucket doesn't exist try to create, or handle error
      const fileExt = file.name.split(".").pop()
      const randomName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `${id}/${randomName}`

      // Upload file to bucket 'complaints'
      const { error: uploadErr } = await supabase.storage
        .from("complaints")
        .upload(filePath, file, { cacheControl: "3600", upsert: true })

      if (uploadErr) {
        // If bucket doesn't exist, try to create bucket programmatically and re-upload
        if (uploadErr.message.toLowerCase().includes("bucket not found")) {
          const { error: bucketErr } = await supabase.storage.createBucket(
            "complaints",
            { public: true }
          )
          if (bucketErr) throw bucketErr

          // Retry upload
          const { error: retryErr } = await supabase.storage
            .from("complaints")
            .upload(filePath, file)
          if (retryErr) throw retryErr
        } else {
          throw uploadErr
        }
      }

      // 2. Get Public URL
      const { data: urlData } = supabase.storage
        .from("complaints")
        .getPublicUrl(filePath)
      const publicUrl = urlData.publicUrl

      // 3. Post a comment linking to the image or file
      const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(
        fileExt?.toLowerCase() || ""
      )
      const commentMarkup = isImage
        ? `![Uploaded Attachment: ${file.name}](${publicUrl})`
        : `Uploaded Attachment: [${file.name}](${publicUrl})`

      await postCommentMutation.mutateAsync(commentMarkup)
      toast.success("Attachment uploaded successfully!")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to upload attachment")
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (complaintLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">
          Loading complaint case details...
        </p>
      </div>
    )
  }

  if (!complaint) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-2xl font-bold">Complaint ticket not found</h2>
        <Button
          onClick={() => navigate("/complaints")}
          className="mt-4 rounded-xl"
        >
          Back to complaints Board
        </Button>
      </div>
    )
  }

  // Helper parser for markdown images inside comments
  const renderCommentContent = (content: string) => {
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g
    const match = imgRegex.exec(content)

    if (match) {
      const altText = match[1]
      const imgUrl = match[2]
      return (
        <div className="space-y-2">
          <p className="flex items-center gap-1 text-[11px] text-slate-500 italic">
            <ImageIcon className="h-3.5 w-3.5" />
            {altText || "Image Attachment"}
          </p>
          <a
            href={imgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block max-w-sm overflow-hidden rounded-lg border border-slate-200 transition-opacity hover:opacity-95 dark:border-slate-800"
          >
            <img
              src={imgUrl}
              alt={altText}
              className="max-h-64 w-full object-contain"
            />
          </a>
        </div>
      )
    }

    const linkRegex = /\[(.*?)\]\((.*?)\)/g
    const linkMatch = linkRegex.exec(content)
    if (linkMatch) {
      const linkText = linkMatch[1]
      const linkUrl = linkMatch[2]
      return (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          <Paperclip className="h-3.5 w-3.5" />
          {linkText}
        </a>
      )
    }

    return <p className="leading-relaxed whitespace-pre-wrap">{content}</p>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 max-md:flex-col max-md:items-start">
        <Button
          render={<Link to="/complaints" />}
          variant="secondary"
          size="sm"
          className="gap-1 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to complaints
        </Button>
        <h1 className="text-slate-850 text-xl font-bold tracking-tight dark:text-white">
          Case File Details
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Thread and details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Main Case details Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b p-5">
              <div>
                <span className="block font-mono text-[10px] font-bold text-muted-foreground uppercase">
                  {complaint.complaint_no}
                </span>
                <CardTitle className="mt-0.5 text-lg font-bold">
                  {complaint.subject}
                </CardTitle>
              </div>
              <StatusBadge
                status={complaint.status}
                type="complaint"
                className="scale-110"
              />
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-xl border p-4 text-xs leading-relaxed">
                <span className="mb-1 block text-[10px] font-bold text-muted-foreground uppercase">
                  Incident description
                </span>
                <p className="whitespace-pre-wrap">{complaint.description}</p>
              </div>

              {/* Raised by audit metadata */}
              <div className="flex items-center justify-between pt-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span>
                    Logged by: {complaint.creator?.full_name || "Staff"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Logged at: {new Date(complaint.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity / Comments Timeline Thread */}
          <Card className="flex min-h-[400px] pb-0">
            <CardHeader className="border-b border-slate-200/50 p-5 dark:border-slate-800/50">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <MessageSquareWarning className="h-5 w-5 text-muted-foreground" />
                Incident Log & Coordination timeline
              </CardTitle>
            </CardHeader>

            {/* Chat board */}
            <div className="max-h-[350px] flex-1 scrollbar-thin space-y-4 overflow-y-auto p-5">
              {commentsLoading ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  Loading logs...
                </div>
              ) : comments.length === 0 ? (
                <div className="mx-auto max-w-xs space-y-2 py-12 text-center text-xs text-muted-foreground">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Timeline is empty
                  </p>
                  <p>
                    Coordinate customer calls, update progress notes, and attach
                    photo evidence using the box below.
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {comment.profiles?.full_name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="rounded-xl border bg-muted p-2">
                      {renderCommentContent(comment.comment)}
                    </div>
                  </div>
                ))
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Chat box inputs */}
            <div className="flex items-center gap-2 border-t p-4">
              {/* File Attachment hidden input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadFile}
                className="hidden"
                accept="image/*,application/pdf"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={uploadingFile || postCommentMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
                title="Attach image or file"
              >
                {uploadingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4 text-slate-500" />
                )}
              </Button>

              <Input
                placeholder={
                  uploadingFile
                    ? "Uploading attachment..."
                    : "Post progress update note..."
                }
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePostComment()
                }}
                disabled={uploadingFile || postCommentMutation.isPending}
                className="flex-1 text-xs"
              />

              <Button
                onClick={handlePostComment}
                size={"icon"}
                disabled={
                  !commentText.trim() ||
                  uploadingFile ||
                  postCommentMutation.isPending
                }
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar Info & Controls */}
        <div className="space-y-6">
          {/* Customer & Order Linked Card */}
          <Card>
            <CardContent className="space-y-4 p-5 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                  Customer Account
                </span>
                {complaint.customer_id ? (
                  <Link
                    to={`/customers/${complaint.customer_id}`}
                    className="mt-0.5 block text-sm font-bold hover:underline"
                  >
                    {complaint.customers?.name}
                  </Link>
                ) : (
                  <span className="text-slate-400 italic">
                    No Customer Linked
                  </span>
                )}
              </div>

              {complaint.order_id && (
                <div className="dark:border-slate-850 border-t pt-2">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                    Linked Sales Order
                  </span>
                  <Link
                    to={`/orders/${complaint.order_id}`}
                    className="mt-0.5 block font-mono text-xs font-bold text-primary hover:underline"
                  >
                    {complaint.orders?.order_no}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ticket Field Controls form */}
          {canManage && (
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <Clock className="h-4.5 w-4.5 text-primary" />
                  Ticket settings control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                {/* Status selector */}
                <div className="space-y-2">
                  <Label htmlFor="status-select" className="text-xs">
                    Ticket status
                  </Label>
                  <select
                    id="status-select"
                    value={complaint.status}
                    onChange={(e) =>
                      updateComplaintMutation.mutate({ status: e.target.value })
                    }
                    className="w-full rounded-xl border bg-muted px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Priority Selector */}
                <div className="space-y-2">
                  <Label htmlFor="priority-select" className="text-xs">
                    Escalate Priority
                  </Label>
                  <select
                    id="priority-select"
                    value={complaint.priority}
                    onChange={(e) =>
                      updateComplaintMutation.mutate({
                        priority: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border bg-muted px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Operator Assignment dropdown (Only Manager/Super Admin can assign) */}
                {(isManager || isSuperAdmin) && (
                  <div className="space-y-2">
                    <Label htmlFor="assignee-select" className="text-xs">
                      Assign Operator
                    </Label>
                    <select
                      id="assignee-select"
                      value={complaint.assigned_to || ""}
                      onChange={(e) =>
                        updateComplaintMutation.mutate({
                          assigned_to:
                            e.target.value === "" ? null : e.target.value,
                          status: e.target.value === "" ? "open" : "assigned",
                        })
                      }
                      className="w-full rounded-xl border bg-muted px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Unassigned --</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default ComplaintDetail
