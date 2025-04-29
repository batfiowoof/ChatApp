"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useChatStore from "@/store/useChatStore";
import Cookies from "js-cookie";

export default function NotificationsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const {
    notifications,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteAllNotifications,
    setSelectedUser,
  } = useChatStore();

  // Check for authentication
  useEffect(() => {
    const token = Cookies.get("token") || localStorage.getItem("token");

    if (!token) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
      setIsLoading(false);
    }
  }, [router]);

  // Fetch notifications when the page loads
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  const handleNotificationClick = (notification: any) => {
    markNotificationAsRead(notification.id);

    // Navigate based on notification type
    if (
      notification.type === "PrivateMessage" &&
      notification.payload?.senderId
    ) {
      setSelectedUser(notification.payload.senderId);
      router.push("/chat");
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "PrivateMessage":
        return (
          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
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
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
        );
      case "MissedMessages":
        return (
          <div className="p-2 rounded-full bg-purple-100 text-purple-600">
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
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-full bg-gray-100 text-gray-600">
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
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
          </div>
        );
    }
  };

  const getNotificationContent = (notification: any) => {
    switch (notification.type) {
      case "PrivateMessage":
        return (
          <>
            <div className="font-medium">
              Message from {notification.payload?.senderName || "Someone"}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {notification.payload?.messagePreview ||
                "You received a new message"}
            </div>
          </>
        );
      case "MissedMessages":
        return (
          <>
            <div className="font-medium">Missed Messages</div>
            <div className="text-sm text-gray-500 mt-1">
              {notification.payload?.summaryText ||
                "You have unread messages from while you were offline"}
            </div>
          </>
        );
      default:
        return (
          <>
            <div className="font-medium">New Notification</div>
            <div className="text-sm text-gray-500 mt-1">
              You have a new notification
            </div>
          </>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-full mx-auto py-8 text-center">
        <div className="animate-pulse">
          <h1 className="text-3xl font-bold mb-6 text-primary-800 dark:text-primary-400">
            Loading...
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Loading your notifications
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary-800 dark:text-primary-400">
          Notifications
        </h1>
        <div className="flex gap-2">
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
            >
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => {
                if (
                  confirm("Are you sure you want to delete all notifications?")
                ) {
                  deleteAllNotifications();
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Delete all
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-16 h-16 mx-auto text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>

          <h2 className="mt-4 text-xl font-medium text-gray-600 dark:text-gray-300">
            No notifications
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            You do not have any notifications right now.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start p-4 gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                  !notification.isRead ? "bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  {getNotificationContent(notification)}
                  <div className="text-xs text-gray-400 mt-1">
                    {formatDate(notification.sentAt)}
                  </div>
                </div>
                {!notification.isRead && (
                  <span className="h-3 w-3 bg-blue-500 rounded-full flex-shrink-0"></span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
