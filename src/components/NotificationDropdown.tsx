import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  useNotifications,
  type AppNotification,
} from "@/hooks/useNotifications"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Bell,
  ShoppingCart,
  Truck,
  AlertCircle,
  MessageSquare,
  MessageSquareWarning,
  Check,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"


function getNotificationIcon(type: string) {
  switch (type) {
    case "order_created":
    case "order_updated":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
          <ShoppingCart className="h-4 w-4" />
        </div>
      )
    case "purchase_request_created":
    case "purchase_request_updated":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <Truck className="h-4 w-4" />
        </div>
      )
    case "purchase_request_comment_created":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
          <MessageSquare className="h-4 w-4" />
        </div>
      )
    case "complaint_created":
    case "complaint_updated":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
          <AlertCircle className="h-4 w-4" />
        </div>
      )
    case "complaint_comment_created":
      return (
        <div className="text-amber-550 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
          <MessageSquareWarning className="h-4 w-4" />
        </div>
      )
    default:
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500">
          <Bell className="h-4 w-4" />
        </div>
      )
  }
}

export const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications()

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.is_read) {
      markAsRead(notif.id)
    }
    setOpen(false)
    if (notif.link) {
      navigate(notif.link)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="relative"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4.5 animate-pulse items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                {unreadCount}
              </span>
            )}
          </Button>
        }
      />

      <PopoverContent align="end" alignOffset={-10} className="w-80 p-0 md:w-96">
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <p className="truncate text-[10px] text-muted-foreground">
                You have {unreadCount} unread
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                className="h-8 gap-1 rounded-lg px-2 text-xs hover:text-primary"
              >
                <Check className="h-3.5 w-3.5" />
                Read All
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (
                    confirm("Are you sure you want to clear all notifications?")
                  ) {
                    clearAll()
                  }
                }}
                className="h-8 gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-rose-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        <Separator />

        <ScrollArea className="h-80 md:h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/35" />
              <p className="text-xs font-medium text-muted-foreground">
                All caught up!
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                No notifications to display
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 border-b border-muted/30 p-4 text-left transition-all hover:bg-muted/50",
                    !notif.is_read && "bg-primary/2 dark:bg-primary/1"
                  )}
                >
                  {getNotificationIcon(notif.type)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-xs font-semibold",
                          !notif.is_read
                            ? "font-bold text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {notif.title}
                      </p>
                      <span className="shrink-0 text-[9px] font-medium text-muted-foreground">
                        {/* {formatRelativeTime(notif.created_at)} */}
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true
                        })}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 text-[11px] leading-relaxed",
                        !notif.is_read
                          ? "text-foreground/90"
                          : "text-muted-foreground/80"
                      )}
                    >
                      {notif.message}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationDropdown
