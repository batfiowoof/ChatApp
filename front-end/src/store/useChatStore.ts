// File: front-end/src/store/useChatStore.ts
import { create } from "zustand";
import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";
import axios from "axios";

// Define the API base URL from environment or use default
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5225/api";
const SIGNALR_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api$/, "") ||
  "http://localhost:5225";

// Track connection state globally (outside the store)
let globalConnection: signalR.HubConnection | null = null;
let connectionAttemptInProgress = false;
let reconnectTimeout: NodeJS.Timeout | null = null;

export interface UserInfo {
  userId: string;
  username: string;
  isOnline: boolean;
  profilePictureUrl?: string;
  bio?: string;
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
  isLoadingHistory: boolean;

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
  fetchMessageHistory: (userId: string | null) => Promise<void>;
  fetchPublicMessages: () => Promise<void>;

  // User actions
  setUsers: (users: UserInfo[]) => void;
  setSelectedUser: (userId: string | null) => void;

  // Notification actions
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: number) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
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
  isLoadingHistory: false,

  // Connection management
  connect: async (token?: string) => {
    // If already connected or connection attempt is in progress, return the existing connection
    if (
      globalConnection &&
      globalConnection.state === signalR.HubConnectionState.Connected
    ) {
      set({ connection: globalConnection, isConnected: true, error: null });
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (connectionAttemptInProgress) {
      console.log("Connection attempt already in progress, waiting...");

      // Wait for the existing attempt to finish or timeout after 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // If connection was established during the wait, use it
      if (
        globalConnection &&
        globalConnection.state === signalR.HubConnectionState.Connected
      ) {
        set({ connection: globalConnection, isConnected: true, error: null });
        return;
      }
    }

    // Get token from parameters, cookie, or localStorage
    const authToken =
      token || Cookies.get("token") || localStorage.getItem("token");

    if (!authToken) {
      set({ error: "No authentication token available" });
      throw new Error("No authentication token available");
    }

    try {
      // Set flag to prevent multiple connection attempts
      connectionAttemptInProgress = true;

      // If there's a reconnect timeout, clear it
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      // Clean up any existing connection that isn't in Connected state
      if (
        globalConnection &&
        globalConnection.state !== signalR.HubConnectionState.Connected
      ) {
        try {
          await globalConnection.stop();
          globalConnection = null;
        } catch (err) {
          console.warn("Error stopping previous connection:", err);
        }
      }

      // Only create a new connection if we don't have a valid one
      if (!globalConnection) {
        // Create a new connection
        globalConnection = new signalR.HubConnectionBuilder()
          .withUrl(`${SIGNALR_URL}/hubs/chat`, {
            accessTokenFactory: () => authToken,
            skipNegotiation: true,
            transport: signalR.HttpTransportType.WebSockets,
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 20000, 30000, 60000]) // More aggressive reconnect
          .configureLogging(signalR.LogLevel.Information)
          .build();

        // Set up event handlers
        globalConnection.on(
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

        globalConnection.on(
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
        globalConnection.on(
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

        globalConnection.on("UpdateUserList", (userList: UserInfo[]) => {
          set({ users: userList });
        });

        globalConnection.on("UserNotConnected", (errorMessage: string) => {
          set({ error: `Error: ${errorMessage}` });
          // Clear error after 5 seconds
          setTimeout(() => set({ error: null }), 5000);
        });

        // Handle connection close
        globalConnection.onclose((error) => {
          console.log("Connection closed", error);
          set({
            isConnected: false,
            error: "Connection closed. Attempting to reconnect...",
          });

          // Implement progressive reconnection logic
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              if (
                globalConnection?.state !== signalR.HubConnectionState.Connected
              ) {
                connectionAttemptInProgress = false;
                get().connect(authToken);
              }
            }, 3000);
          }
        });
      }

      // Update state with the connection
      set({ connection: globalConnection });

      // Start the connection if not already connected
      if (globalConnection.state !== signalR.HubConnectionState.Connected) {
        await globalConnection.start();
      }

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

      // Also fetch initial messages (public by default)
      await get().fetchPublicMessages();
    } catch (err) {
      console.error("Failed to connect to SignalR hub:", err);
      set({
        connection: null,
        isConnected: false,
        error: `Failed to connect: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });

      // Reset the global connection if it failed to connect
      globalConnection = null;

      throw err;
    } finally {
      // Reset the connection attempt flag
      connectionAttemptInProgress = false;
    }
  },

  disconnect: async () => {
    // Only disconnect if explicitly called - don't stop on component unmounts

    if (
      globalConnection &&
      globalConnection.state !== signalR.HubConnectionState.Disconnected
    ) {
      try {
        await globalConnection.stop();
        globalConnection = null;
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
    return globalConnection;
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // Message actions
  sendPublicMessage: async (message: string) => {
    const { isConnected, currentUsername } = get();

    if (!message.trim() || !globalConnection || !isConnected) {
      return;
    }

    try {
      await globalConnection.invoke("SendPublicMessage", message);
    } catch (err) {
      console.error("Error sending public message:", err);
      set({ error: "Failed to send message. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  sendPrivateMessage: async (receiverId: string, message: string) => {
    const { isConnected, currentUsername } = get();

    if (!message.trim() || !globalConnection || !isConnected || !receiverId) {
      return;
    }

    try {
      await globalConnection.invoke("SendPrivateMessage", receiverId, message);

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

  fetchMessageHistory: async (userId: string | null) => {
    // Skip if no user is selected (this would be public chat)
    if (!userId) {
      // For public chat, we'll fetch public messages instead
      await get().fetchPublicMessages();
      return;
    }

    set({ isLoadingHistory: true });

    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await axios.get(
        `${API_BASE_URL}/Message/history/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 && response.data) {
        const historyMessages = response.data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          // If it's from current user, use current username, otherwise find the username from users list
          sender: msg.isFromCurrentUser
            ? get().currentUsername
            : get().users.find((u) => u.userId === msg.senderId)?.username ||
              "Unknown",
          timestamp: new Date(msg.sentAt),
          isPrivate: true,
          receiverId: msg.receiverId,
        }));

        // Clear existing messages for this conversation and add history messages
        set((state) => {
          // Filter out any private messages between these users
          const otherMessages = state.messages.filter((m) => {
            if (!m.isPrivate) return true; // Keep public messages

            // Remove messages between this user and the current user
            const isConversationMessage =
              m.receiverId === userId ||
              m.sender ===
                get().users.find((u) => u.userId === userId)?.username;

            return !isConversationMessage;
          });

          return {
            messages: [...otherMessages, ...historyMessages],
            isLoadingHistory: false,
          };
        });
      }
    } catch (err) {
      console.error("Error fetching message history:", err);
      set({ isLoadingHistory: false, error: "Failed to load message history" });

      // Clear error after 5 seconds
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  fetchPublicMessages: async () => {
    set({ isLoadingHistory: true });

    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Using the correct API endpoint URL that matches the rest of the application
      const response = await axios.get(`${API_BASE_URL}/Message/public`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Public messages response:", response.data); // Debug log

      if (response.status === 200 && response.data) {
        const publicMessages = response.data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.senderName,
          timestamp: new Date(msg.sentAt),
          isPrivate: false,
        }));

        // Clear existing public messages and add new ones
        set((state) => {
          // Filter out public messages, keep private ones
          const privateMessages = state.messages.filter((m) => m.isPrivate);

          return {
            messages: [...privateMessages, ...publicMessages],
            isLoadingHistory: false,
          };
        });
      } else {
        set({ isLoadingHistory: false });
      }
    } catch (err) {
      console.error("Error fetching public messages:", err);
      set({ isLoadingHistory: false, error: "Failed to load public messages" });

      // Clear error after 5 seconds
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  // User actions
  setUsers: (users: UserInfo[]) => {
    set({ users });
  },

  setSelectedUser: (userId: string | null) => {
    // Load message history when selecting a user
    get().fetchMessageHistory(userId);

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

      const response = await axios.get(`${API_BASE_URL}/notification`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status !== 200) {
        console.error(
          "Failed to fetch notifications:",
          response.status,
          response.statusText
        );
        throw new Error(
          `Failed to fetch notifications: ${response.statusText}`
        );
      }

      const notifications: any[] = response.data;
      console.log("Fetched notifications:", notifications);

      if (!notifications?.length) {
        console.log("No notifications returned from the API");
        set({ notifications: [], unreadNotifications: 0 });
        return;
      }

      // Store current notifications to preserve data between fetches
      const currentNotifications = get().notifications;

      const processedNotifications: Notification[] = notifications.map((n) => {
        const existingNotification = currentNotifications.find(
          (existing) => existing.id === (n.id || n.Id)
        );

        // Get payload from response - this contains our main data
        let payload = n.payload;

        // For older notifications that might have different structures
        if (!payload && typeof n.payloadJson === "string") {
          try {
            payload = JSON.parse(n.payloadJson);
          } catch (e) {
            console.error("Error parsing notification payload:", e);
          }
        }

        // Extract type from the payload or the notification type field
        const type = n.type || n.Type || "unknown";

        // If this notification exists in our current state, and the payload
        // from API is missing key properties like senderName, use the existing one
        if (existingNotification && payload && existingNotification.payload) {
          // Check if current payload is missing senderName
          if (!payload.senderName && existingNotification.payload.senderName) {
            console.log(
              "Restoring senderName from existing notification",
              existingNotification.id,
              existingNotification.payload.senderName
            );

            payload = {
              ...payload,
              senderName: existingNotification.payload.senderName,
            };
          }

          // Check for senderId too
          if (!payload.senderId && existingNotification.payload.senderId) {
            payload = {
              ...payload,
              senderId: existingNotification.payload.senderId,
            };
          }
        }

        // Create the notification with the combined payload
        return {
          id: n.id || n.Id,
          type: type,
          payload: payload || {},
          isRead: !!n.isRead,
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

      // Find notification first to get the sender info before marking as read
      const notification = get().notifications.find(
        (n) => n.id === notificationId
      );
      const senderId = notification?.payload?.senderId;

      const response = await axios.put(
        `${API_BASE_URL}/notification/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200)
        throw new Error("Failed to mark notification as read");

      // Update local state
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadNotifications: Math.max(0, state.unreadNotifications - 1),
      }));

      // If it's a private message notification and has senderId, set the selected user
      if (notification?.type === "PrivateMessage" && senderId) {
        // Set the selected user to navigate to the chat
        get().setSelectedUser(senderId);
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) return;

      const response = await axios.post(
        `${API_BASE_URL}/notification/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200)
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

  deleteAllNotifications: async () => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) return;

      const response = await axios.delete(
        `${API_BASE_URL}/notification/delete-all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200)
        throw new Error("Failed to delete all notifications");

      // Clear notifications in local state
      set({
        notifications: [],
        unreadNotifications: 0,
      });

      console.log("All notifications deleted successfully");
    } catch (err) {
      console.error("Error deleting all notifications:", err);
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
