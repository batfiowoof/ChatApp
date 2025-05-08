import { StateCreator } from "zustand";
import * as signalR from "@microsoft/signalr";
import axios from "axios";
import Cookies from "js-cookie";
import { API_BASE_URL, ChatState, Notification } from "../types";

export interface NotificationSlice {
  // State
  notifications: Notification[];
  unreadNotifications: number;

  // Actions
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: number) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
}

export const createNotificationSlice: StateCreator<
  ChatState,
  [],
  [],
  NotificationSlice
> = (set, get) => ({
  // Initial state
  notifications: [],
  unreadNotifications: 0,

  // Fetch notifications
  fetchNotifications: async () => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await axios.get(`${API_BASE_URL}/Notification`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        const notifications = response.data.map((n: any) => ({
          id: n.id,
          type: n.type,
          // Handle payload properly - it's already an object in the response
          payload: n.payload || {},
          isRead: n.isRead,
          sentAt: new Date(n.sentAt),
        }));

        // Count unread notifications
        const unreadCount = notifications.filter((n: any) => !n.isRead).length;

        set({
          notifications,
          unreadNotifications: unreadCount,
        });
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      set({ error: "Failed to load notifications" });
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  // Mark notification as read
  markNotificationAsRead: async (notificationId: number) => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      await axios.put(
        `${API_BASE_URL}/Notification/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update the local state
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadNotifications: Math.max(0, state.unreadNotifications - 1),
      }));
    } catch (err) {
      console.error("Error marking notification as read:", err);
      set({ error: "Failed to update notification" });
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  // Mark all notifications as read
  markAllNotificationsAsRead: async () => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      await axios.patch(
        `${API_BASE_URL}/Notification/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update the local state
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadNotifications: 0,
      }));
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      set({ error: "Failed to update notifications" });
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  // Delete all notifications
  deleteAllNotifications: async () => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      await axios.delete(`${API_BASE_URL}/Notification/delete-all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Update the local state
      set({
        notifications: [],
        unreadNotifications: 0,
      });
    } catch (err) {
      console.error("Error deleting all notifications:", err);
      set({ error: "Failed to delete notifications" });
      setTimeout(() => set({ error: null }), 5000);
    }
  },
});

// Setup notification handlers for SignalR connection
export function setupNotificationHandlers(
  connection: signalR.HubConnection,
  get: () => ChatState
) {
  // Updated handler for new notifications
  connection.on(
    "NewNotification",
    (id: number, payload: any, sentAt: string) => {
      console.log("Received notification:", { id, payload, sentAt });

      // Extract notification type and data from the new payload structure
      // Be more defensive with the payload handling
      let notificationType = "unknown";
      let notificationData = payload;

      try {
        // Check if payload is a string that needs parsing
        if (typeof payload === "string" && payload.trim().startsWith("{")) {
          const parsedPayload = JSON.parse(payload);
          notificationType = parsedPayload.type || "unknown";
          notificationData = parsedPayload.data || parsedPayload;
        } else if (typeof payload === "object" && payload !== null) {
          // Already an object, extract directly
          notificationType = payload.type || "unknown";
          notificationData = payload.data || payload;
        }
      } catch (err) {
        console.error("Error processing notification payload:", err);
      }

      const newNotification: Notification = {
        id,
        type: notificationType,
        payload: notificationData,
        isRead: false,
        sentAt: new Date(sentAt),
      };

      set((state) => ({
        notifications: [newNotification, ...state.notifications],
        unreadNotifications: state.unreadNotifications + 1,
      }));

      // Handle group message notifications
      if (notificationType === "GroupMessage" && notificationData.groupId) {
        // Mark the group as having unread messages
        if (get().selectedGroup !== notificationData.groupId) {
          get().addGroupWithUnreadMessage(notificationData.groupId);
        }
      }
    }
  );
}
