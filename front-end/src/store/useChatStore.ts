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
          const newMessage: Message = {
            id: Date.now().toString(),
            content: messageContent,
            sender: username,
            timestamp: new Date(),
            isPrivate: true,
          };
          get().addMessage(newMessage);
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

    set({
      connection: null,
      isConnected: false,
      selectedUser: null,
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
    set({ selectedUser: userId });
  },
}));

export default useChatStore;
