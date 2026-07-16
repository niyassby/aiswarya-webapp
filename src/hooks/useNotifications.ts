import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/features/auth/useAuth";
import { toast } from "@/components/ui/toast";
import { useNavigate } from "react-router-dom";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const queryKey = ["notifications", user?.id];

  // 1. Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<AppNotification[]>({
    queryKey,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // 2. Mutation: Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications = queryClient.getQueryData<AppNotification[]>(queryKey);

      if (previousNotifications) {
        queryClient.setQueryData<AppNotification[]>(
          queryKey,
          previousNotifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          )
        );
      }

      return { previousNotifications };
    },
    onError: (_err, _id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // 3. Mutation: Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications = queryClient.getQueryData<AppNotification[]>(queryKey);

      if (previousNotifications) {
        queryClient.setQueryData<AppNotification[]>(
          queryKey,
          previousNotifications.map((n) => ({ ...n, is_read: true }))
        );
      }

      return { previousNotifications };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // 4. Mutation: Clear (delete) all notifications
  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications = queryClient.getQueryData<AppNotification[]>(queryKey);

      queryClient.setQueryData<AppNotification[]>(queryKey, []);

      return { previousNotifications };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // 5. Request Web Notification Permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // 6. Real-time Subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          
          // Prepend new notification to state
          queryClient.setQueryData<AppNotification[]>(queryKey, (prev = []) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });

          // Trigger toast
          toast.info(newNotif.title, {
            description: newNotif.message,
            duration: 7000,
            action: newNotif.link
              ? {
                  label: "View",
                  onClick: () => {
                    markAsReadMutation.mutate(newNotif.id);
                    navigate(newNotif.link!);
                  },
                }
              : undefined,
          });

          // Trigger Web Notification
          try{

            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              const systemNotif = new Notification(newNotif.title, {
                body: newNotif.message,
                tag: newNotif.id,
              });
              systemNotif.onclick = () => {
                window.focus();
                markAsReadMutation.mutate(newNotif.id);
                if (newNotif.link) {
                  navigate(newNotif.link);
                }
              };
            }
          }catch(error){
            console.log(error);
            
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, navigate]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    clearAll: clearAllNotificationsMutation.mutate,
  };
}

