import { useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import useChatStore from "@/store/useChatStore";

export default function ToastProvider() {
  const { notifications, markNotificationAsRead } = useChatStore();

  // Show toast notification when a new notification is received
  useEffect(() => {
    // Get the last notification if it exists and is unread
    const lastNotification = notifications[0];
    if (lastNotification && !lastNotification.isRead) {
      console.log("Showing toast for notification:", lastNotification);

      // Show different toast styles based on notification type
      switch (lastNotification.type) {
        case "PrivateMessage":
          toast(
            <div onClick={() => markNotificationAsRead(lastNotification.id)}>
              <p className="font-bold">New Private Message</p>
              <p>From: {lastNotification.payload?.senderName || "Someone"}</p>
              <p className="text-xs text-gray-500">Click to mark as read</p>
            </div>,
            { duration: 5000 }
          );
          break;

        case "GroupMessage":
          toast(
            <div onClick={() => markNotificationAsRead(lastNotification.id)}>
              <p className="font-bold">New Message in Group</p>
              <p>Group: {lastNotification.payload?.groupName || "Group"}</p>
              <p className="text-xs text-gray-500">Click to mark as read</p>
            </div>,
            { duration: 5000 }
          );
          break;

        case "GroupInvite":
          toast(
            <div onClick={() => markNotificationAsRead(lastNotification.id)}>
              <p className="font-bold">Group Invitation</p>
              <p>
                You have been invited to join{" "}
                {lastNotification.payload?.groupName || "a group"}
              </p>
              <p className="text-xs text-gray-500">Click to mark as read</p>
            </div>,
            { duration: 6000 }
          );
          break;

        case "GroupJoinRequest":
          toast(
            <div onClick={() => markNotificationAsRead(lastNotification.id)}>
              <p className="font-bold">Join Request</p>
              <p>
                {lastNotification.payload?.userName || "Someone"} wants to join
                your group
              </p>
              <p className="text-xs text-gray-500">Click to mark as read</p>
            </div>,
            { duration: 6000 }
          );
          break;

        default:
          // Generic fallback for unknown notification types
          toast(
            <div onClick={() => markNotificationAsRead(lastNotification.id)}>
              <p className="font-bold">New Notification</p>
              <p>{JSON.stringify(lastNotification.payload).substring(0, 50)}</p>
              <p className="text-xs text-gray-500">Click to mark as read</p>
            </div>,
            { duration: 4000 }
          );
          break;
      }
    }
  }, [notifications, markNotificationAsRead]);

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className: "bg-white dark:bg-gray-800 dark:text-white",
        style: {
          border: "1px solid #E2E8F0",
          padding: "16px",
          color: "#000",
        },
      }}
    />
  );
}
