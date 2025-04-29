// File: front-end/src/store/useChatStore.ts
import { create } from "zustand";
import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";

export interface UserInfo {
  userId: string;
  username: string;
}

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  isPrivate: boolean;
  receiverId?: string;
}

export interface Notification {
  id: number;
  type: string;
  payload: any;
  isRead: boolean;
  sentAt: Date;
}

interface ChatState {
  // Connection state
  connection: signalR.HubConnection | null;
  isConnected: boolean;
  error: string | null;

  // UI state
  users: UserInfo[];
  messages: Message[];
  currentUsername: string;
  selectedUser: string | null;

  // Notification state
  notifications: Notification[];
  unreadNotifications: number;
  usersWithUnreadMessages: Set<string>;

  // Actions
  connect: (token?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  getConnection: () => signalR.HubConnection | null;
  setError: (error: string | null) => void;

  // Message actions
  sendPublicMessage: (message: string) => Promise<void>;
  sendPrivateMessage: (receiverId: string, message: string) => Promise<void>;
  addMessage: (message: Message) => void;

  // User actions
  setUsers: (users: UserInfo[]) => void;
  setSelectedUser: (userId: string | null) => void;

  // Notification actions
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: number) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  addUserWithUnreadMessage: (userId: string) => void;
  clearUserUnreadMessages: (userId: string) => void;
}

const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  connection: null,
  isConnected: false,
  error: null,
  users: [],
  messages: [],
  currentUsername: "",
  selectedUser: null,
  notifications: [],
  unreadNotifications: 0,
  usersWithUnreadMessages: new Set<string>(),

  // Connection management
  connect: async (token?: string) => {
    // If already connected, do nothing
    if (get().connection && get().isConnected) {
      return;
    }

    // Get token from parameters, cookie, or localStorage
    const authToken =
      token || Cookies.get("token") || localStorage.getItem("token");

    if (!authToken) {
      set({ error: "No authentication token available" });
      throw new Error("No authentication token available");
    }

    try {
      // Clean up any existing connection
      await get().disconnect();

      // Create a new connection
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl("http://localhost:5225/hubs/chat", {
          accessTokenFactory: () => authToken,
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Set up event handlers
      newConnection.on(
        "ReceiveMessage",
        (username: string, messageContent: string) => {
          // Don't add duplicate messages if we already added this message locally
          // We'll identify our own messages by the username
          if (
            get().messages.some(
              (m) =>
                m.sender === username &&
                m.content === messageContent &&
                // Check if the message was added in the last 1 second (to avoid filtering out legitimate duplicates)
                Date.now() - new Date(m.timestamp).getTime() < 1000
            )
          ) {
            return;
          }

          const newMessage: Message = {
            id: Date.now().toString(),
            content: messageContent,
            sender: username,
            timestamp: new Date(),
            isPrivate: false,
          };
          get().addMessage(newMessage);
        }
      );

      newConnection.on(
        "ReceivePrivateMessage",
        (username: string, messageContent: string) => {
          // Find the user ID based on the username
          const sender = get().users.find((u) => u.username === username);
          const senderId = sender?.userId;

          const newMessage: Message = {
            id: Date.now().toString(),
            content: messageContent,
            sender: username,
            timestamp: new Date(),
            isPrivate: true,
          };
          get().addMessage(newMessage);

          // If we're not currently chatting with this user, mark them as having unread messages
          if (get().selectedUser !== senderId && senderId) {
            get().addUserWithUnreadMessage(senderId);
          }
        }
      );

      // Updated handler for new notifications
      newConnection.on(
        "NewNotification",
        (id: number, payload: any, sentAt: string) => {
          console.log("Received notification:", { id, payload, sentAt });

          // Extract notification type and data from the new payload structure
          const notificationType = payload.type || "unknown";
          const notificationData = payload.data || payload;

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
        }
      );

      newConnection.on("UpdateUserList", (userList: UserInfo[]) => {
        set({ users: userList });
      });

      newConnection.on("UserNotConnected", (errorMessage: string) => {
        set({ error: `Error: ${errorMessage}` });
        // Clear error after 5 seconds
        setTimeout(() => set({ error: null }), 5000);
      });

      // Handle connection close
      newConnection.onclose((error) => {
        console.log("Connection closed", error);
        set({
          isConnected: false,
          error: "Connection closed. Attempting to reconnect...",
        });

        // You can implement reconnection logic here if needed
        setTimeout(() => {
          if (!get().isConnected) {
            get().connect(authToken);
          }
        }, 5000);
      });

      // Update state with the new connection
      set({ connection: newConnection });

      // Start the connection
      await newConnection.start();

      // Set connected state
      set({ isConnected: true, error: null });

      // Extract username from JWT token
      try {
        const payload = authToken.split(".")[1];
        const decodedPayload = JSON.parse(atob(payload));
        console.log("JWT payload:", decodedPayload); // Debug log to check token structure

        // Since the backend uses ClaimTypes.Name (which maps to 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name')
        // We need to look for this specific claim
        const username =
          decodedPayload[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
          ] || // ClaimTypes.Name
          decodedPayload.unique_name ||
          decodedPayload.name ||
          "Unknown";

        set({ currentUsername: username });
      } catch (err) {
        console.error("Error extracting username from token:", err);
        set({ currentUsername: "User" });
      }

      console.log("Connected to SignalR hub!");

      // Fetch notifications after connecting
      await get().fetchNotifications();
    } catch (err) {
      console.error("Failed to connect to SignalR hub:", err);
      set({
        connection: null,
        isConnected: false,
        error: `Failed to connect: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
      throw err;
    }
  },

  disconnect: async () => {
    const connection = get().connection;

    if (
      connection &&
      connection.state !== signalR.HubConnectionState.Disconnected
    ) {
      try {
        await connection.stop();
        console.log("Disconnected from SignalR hub");
      } catch (err) {
        console.warn("Error while disconnecting:", err);
      }
    }

    // Reset all state to initial values
    set({
      connection: null,
      isConnected: false,
      selectedUser: null,
      users: [],
      messages: [],
      currentUsername: "",
      notifications: [],
      unreadNotifications: 0,
      usersWithUnreadMessages: new Set<string>(),
      error: null,
    });
  },

  getConnection: () => {
    return get().connection;
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // Message actions
  sendPublicMessage: async (message: string) => {
    const { connection, isConnected, currentUsername } = get();

    if (!message.trim() || !connection || !isConnected) {
      return;
    }

    try {
      await connection.invoke("SendPublicMessage", message);
    } catch (err) {
      console.error("Error sending public message:", err);
      set({ error: "Failed to send message. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  sendPrivateMessage: async (receiverId: string, message: string) => {
    const { connection, isConnected, currentUsername } = get();

    if (!message.trim() || !connection || !isConnected || !receiverId) {
      return;
    }

    try {
      await connection.invoke("SendPrivateMessage", receiverId, message);

      // Add the message to our local state since we won't receive it back from the server
      const newMessage: Message = {
        id: Date.now().toString(),
        content: message,
        sender: currentUsername,
        timestamp: new Date(),
        isPrivate: true,
        receiverId: receiverId,
      };

      get().addMessage(newMessage);
    } catch (err) {
      console.error("Error sending private message:", err);
      set({ error: "Failed to send private message. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  // User actions
  setUsers: (users: UserInfo[]) => {
    set({ users });
  },

  setSelectedUser: (userId: string | null) => {
    // Clear unread messages indicator when selecting a user
    if (userId) {
      get().clearUserUnreadMessages(userId);
    }
    set({ selectedUser: userId });
  },

  // Notification actions
  fetchNotifications: async () => {
    try {
      console.log("Fetching notifications...");
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        console.error("No token found for fetching notifications");
        return;
      }

      const response = await fetch("http://localhost:5225/api/notification", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error(
          "Failed to fetch notifications:",
          response.status,
          response.statusText
        );
        throw new Error(
          `Failed to fetch notifications: ${response.statusText}`
        );
      }

      const notifications: any[] = await response.json();
      console.log("Fetched notifications:", notifications);

      if (notifications.length === 0) {
        console.log("No notifications returned from the API");
        return;
      }

      const processedNotifications: Notification[] = notifications.map((n) => {
        // Try to parse the JSON payload if it's a string
        let payload = n.payloadJson;

        // Check for camelCase variations due to JSON serialization
        if (!payload && n.payloadJson === undefined) {
          payload = n.payloadJson || n.PayloadJson;
        }

        if (typeof payload === "string") {
          try {
            payload = JSON.parse(payload);
          } catch (e) {
            console.error("Error parsing notification payload:", e, payload);
          }
        }

        // Extract type from the payload or the notification type field
        // Account for different casings (type vs Type)
        let type = n.type || n.Type;
        if (payload && payload.type) {
          type = payload.type;
          payload = payload.data || payload;
        }

        return {
          id: n.id || n.Id,
          type: type,
          payload: payload,
          isRead: n.isRead || n.IsRead || false,
          sentAt: new Date(n.sentAt || n.SentAt || new Date()),
        };
      });

      console.log("Processed notifications:", processedNotifications);

      const unreadCount = processedNotifications.filter(
        (n) => !n.isRead
      ).length;

      set({
        notifications: processedNotifications,
        unreadNotifications: unreadCount,
      });
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  },

  markNotificationAsRead: async (notificationId: number) => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `http://localhost:5225/api/notification/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to mark notification as read");

      // Update local state
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadNotifications: Math.max(0, state.unreadNotifications - 1),
      }));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        "http://localhost:5225/api/notification/read-all",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok)
        throw new Error("Failed to mark all notifications as read");

      // Update local state
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadNotifications: 0,
      }));
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  },

  addUserWithUnreadMessage: (userId: string) => {
    set((state) => ({
      usersWithUnreadMessages: new Set([
        ...state.usersWithUnreadMessages,
        userId,
      ]),
    }));
  },

  clearUserUnreadMessages: (userId: string) => {
    set((state) => {
      const newSet = new Set(state.usersWithUnreadMessages);
      newSet.delete(userId);
      return { usersWithUnreadMessages: newSet };
    });
  },
}));

export default useChatStore;
