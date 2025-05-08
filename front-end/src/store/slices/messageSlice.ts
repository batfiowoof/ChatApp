import { StateCreator } from "zustand";
import * as signalR from "@microsoft/signalr";
import axios from "axios";
import Cookies from "js-cookie";
import { API_BASE_URL, ChatState, Message } from "../types";

export interface MessageSlice {
  // State
  messages: Message[];
  isLoadingHistory: boolean;

  // Actions
  sendPublicMessage: (message: string) => Promise<void>;
  sendPrivateMessage: (receiverId: string, message: string) => Promise<void>;
  sendGroupMessage: (groupId: string, message: string) => Promise<void>;
  addMessage: (message: Message) => void;
  fetchMessageHistory: (userId: string | null) => Promise<void>;
  fetchPublicMessages: () => Promise<void>;
  fetchGroupMessages: (groupId: string) => Promise<void>;
}

export const createMessageSlice: StateCreator<
  ChatState,
  [],
  [],
  MessageSlice
> = (set, get) => ({
  // Initial state
  messages: [],
  isLoadingHistory: false,

  // Send public message
  sendPublicMessage: async (message: string) => {
    const { isConnected } = get();
    const connection = get().getConnection();

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

  // Send private message
  sendPrivateMessage: async (receiverId: string, message: string) => {
    const { isConnected, currentUsername } = get();
    const connection = get().getConnection();

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
        isGroupMessage: false,
      };

      get().addMessage(newMessage);
    } catch (err) {
      console.error("Error sending private message:", err);
      set({ error: "Failed to send private message. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  // Send group message
  sendGroupMessage: async (groupId: string, message: string) => {
    const { isConnected, currentUsername } = get();
    const connection = get().getConnection();

    if (!message.trim() || !connection || !isConnected || !groupId) {
      return;
    }

    try {
      await connection.invoke("SendGroupMessage", groupId, message);

      // Add the message to our local state immediately
      const newMessage: Message = {
        id: Date.now().toString(),
        content: message,
        sender: currentUsername,
        timestamp: new Date(),
        isPrivate: false,
        isGroupMessage: true,
        groupId: groupId,
      };

      get().addMessage(newMessage);
    } catch (err) {
      console.error("Error sending group message:", err);
      set({ error: "Failed to send group message. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  // Add message to local state
  addMessage: (message: Message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  // Fetch private message history
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
          sender: msg.isFromCurrentUser
            ? get().currentUsername
            : get().users.find((u) => u.userId === msg.senderId)?.username ||
              "Unknown",
          senderId: msg.senderId,
          timestamp: new Date(msg.sentAt),
          isPrivate: true,
          receiverId: msg.receiverId,
          isGroupMessage: false,
        }));

        // Clear existing messages for this conversation and add history messages
        set((state) => {
          // Filter out messages that don't belong to this conversation
          const otherMessages = state.messages.filter((m) => {
            // Keep group messages
            if (m.isGroupMessage) return true;

            // Keep public messages
            if (!m.isPrivate) return true;

            // If private, filter out messages between these users
            const isConversationMessage =
              m.receiverId === userId || m.senderId === userId;

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
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  // Fetch group message history
  fetchGroupMessages: async (groupId: string) => {
    if (!groupId) return;

    set({ isLoadingHistory: true });

    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Use the API endpoint to get group messages
      const response = await axios.get(
        `${API_BASE_URL}/Group/${groupId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 && response.data) {
        const groupMessages = response.data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.senderName,
          senderId: msg.senderId,
          timestamp: new Date(msg.sentAt),
          isPrivate: false,
          isGroupMessage: true,
          groupId,
          isFromCurrentUser: msg.isFromCurrentUser,
        }));

        // Clear existing group messages and add new ones
        set((state) => {
          // Filter out messages for this group
          const otherMessages = state.messages.filter((m) => {
            if (m.isGroupMessage) {
              return m.groupId !== groupId;
            }
            return true; // Keep all non-group messages
          });

          return {
            messages: [...otherMessages, ...groupMessages],
            isLoadingHistory: false,
          };
        });
      } else {
        set({ isLoadingHistory: false });
      }
    } catch (err) {
      console.error("Error fetching group messages:", err);
      set({ isLoadingHistory: false, error: "Failed to load group messages" });
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  // Fetch public messages
  fetchPublicMessages: async () => {
    set({ isLoadingHistory: true });

    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await axios.get(`${API_BASE_URL}/Message/public`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200 && response.data) {
        const publicMessages = response.data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.senderName,
          senderId: msg.senderId,
          timestamp: new Date(msg.sentAt),
          isPrivate: false,
          isGroupMessage: false,
          isFromCurrentUser: msg.isFromCurrentUser,
        }));

        // Clear existing public messages and add new ones
        set((state) => {
          // Filter out public messages
          const otherMessages = state.messages.filter(
            (m) => m.isPrivate || m.isGroupMessage
          );

          return {
            messages: [...otherMessages, ...publicMessages],
            isLoadingHistory: false,
          };
        });
      } else {
        set({ isLoadingHistory: false });
      }
    } catch (err) {
      console.error("Error fetching public messages:", err);
      set({ isLoadingHistory: false, error: "Failed to load public messages" });
      setTimeout(() => set({ error: null }), 5000);
    }
  },
});

// Setup message handlers for SignalR connection
export function setupMessageHandlers(
  connection: signalR.HubConnection,
  get: () => ChatState
) {
  connection.on(
    "ReceiveMessage",
    (username: string, messageContent: string) => {
      // Don't add duplicate messages if we already added this message locally
      if (
        get().messages.some(
          (m) =>
            m.sender === username &&
            m.content === messageContent &&
            // Check if the message was added in the last 1 second (to avoid duplicates)
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
        isGroupMessage: false,
      };
      get().addMessage(newMessage);
    }
  );

  connection.on(
    "ReceivePrivateMessage",
    (username: string, messageContent: string) => {
      // Find the user ID based on the username
      const sender = get().users.find((u) => u.username === username);
      const senderId = sender?.userId;

      const newMessage: Message = {
        id: Date.now().toString(),
        content: messageContent,
        sender: username,
        senderId,
        timestamp: new Date(),
        isPrivate: true,
        isGroupMessage: false,
      };
      get().addMessage(newMessage);

      // If we're not currently chatting with this user, mark them as having unread messages
      if (get().selectedUser !== senderId && senderId) {
        get().addUserWithUnreadMessage(senderId);
      }
    }
  );

  // Add handler for group messages
  connection.on(
    "ReceiveGroupMessage",
    (
      groupId: string,
      groupName: string,
      username: string,
      messageContent: string
    ) => {
      console.log("Group message received:", {
        groupId,
        groupName,
        username,
        messageContent,
      });
      const sender = get().users.find((u) => u.username === username);
      const senderId = sender?.userId;

      const newMessage: Message = {
        id: Date.now().toString(),
        content: messageContent,
        sender: username,
        senderId,
        timestamp: new Date(),
        isPrivate: false,
        isGroupMessage: true,
        groupId,
      };
      get().addMessage(newMessage);

      // If we're not currently in this group chat, mark it as having unread messages
      if (get().selectedGroup !== groupId) {
        get().addGroupWithUnreadMessage(groupId);
      }
    }
  );
}
