import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import useChatStore from "@/store/useChatStore";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    fetchNotifications,
    setSelectedUser,
  } = useChatStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Refresh notifications when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      console.log("Dropdown opened, fetching notifications");
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notification: any) => {
    console.log("Notification clicked:", notification);
    markNotificationAsRead(notification.id);

    // Navigate based on notification type
    if (
      notification.type === "PrivateMessage" &&
      notification.payload?.senderId
    ) {
      setSelectedUser(notification.payload.senderId);
      router.push("/chat");
    } else if (
      notification.type === "GroupMessage" &&
      notification.payload?.groupId
    ) {
      // Handle group messages if you implement group chat
      router.push(`/chat/group/${notification.payload.groupId}`);
    } else if (
      notification.type === "GroupInvite" &&
      notification.payload?.groupId
    ) {
      // Handle group invites
      router.push(`/groups/${notification.payload.groupId}/invite`);
    } else {
      // Default action for other notification types
      router.push("/notifications");
    }

    setIsOpen(false);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();

    // Less than a minute ago
    if (diff < 60 * 1000) {
      return "Just now";
    }

    // Less than an hour ago
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    }

    // Less than a day ago
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }

    // Format as date
    return new Date(date).toLocaleDateString();
  };

  const getNotificationContent = (notification: any) => {
    console.log("Getting content for notification:", notification);

    switch (notification.type) {
      case "PrivateMessage":
        return `${
          notification.payload?.senderName || "Someone"
        } sent you a message`;
      case "GroupMessage":
        return `New message in ${notification.payload?.groupName || "a group"}`;
      case "GroupInvite":
        return `You've been invited to join ${
          notification.payload?.groupName || "a group"
        }`;
      case "GroupJoinRequest":
        return `${
          notification.payload?.userName || "Someone"
        } wants to join your group`;
      default:
        return "New notification";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="p-1 rounded-full text-white hover:bg-primary-700 focus:outline-none"
        title="Notifications"
      >
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          </svg>

          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
              {unreadNotifications}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Notifications
            </h3>
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={() => markAllNotificationsAsRead()}
                className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              <ul>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      !notification.isRead
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex justify-between">
                      <p
                        className={`text-sm ${
                          !notification.isRead ? "font-semibold" : ""
                        }`}
                      >
                        {getNotificationContent(notification)}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(notification.sentAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
