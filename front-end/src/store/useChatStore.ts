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

export interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  creatorId: string;
  creatorName?: string;
  memberCount: number;
  isMember: boolean;
  userRole?: number; // 0: Member, 1: Admin, 2: Owner
}

export interface GroupMember {
  id: string;
  username: string;
  profilePictureUrl: string;
  role: number;
  joinedAt: Date;
}

export interface Message {
  id: string;
  content: string;
  sender: string;
  senderId?: string;
  timestamp: Date;
  isPrivate: boolean;
  receiverId?: string;
  groupId?: string; // Added for group messages
  isGroupMessage?: boolean; // Flag to identify group messages
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
  groups: GroupInfo[];
  messages: Message[];
  currentUsername: string;
  selectedUser: string | null;
  selectedGroup: string | null; // Added for group chat
  isLoadingHistory: boolean;

  // Notification state
  notifications: Notification[];
  unreadNotifications: number;
  usersWithUnreadMessages: Set<string>;
  groupsWithUnreadMessages: Set<string>; // Added for group chat

  // Actions
  connect: (token?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  getConnection: () => signalR.HubConnection | null;
  setError: (error: string | null) => void;

  // Message actions
  sendPublicMessage: (message: string) => Promise<void>;
  sendPrivateMessage: (receiverId: string, message: string) => Promise<void>;
  sendGroupMessage: (groupId: string, message: string) => Promise<void>; // Added for group chat
  addMessage: (message: Message) => void;
  fetchMessageHistory: (userId: string | null) => Promise<void>;
  fetchPublicMessages: () => Promise<void>;
  fetchGroupMessages: (groupId: string) => Promise<void>; // Added for group chat

  // User actions
  setUsers: (users: UserInfo[]) => void;
  setSelectedUser: (userId: string | null) => void;

  // Group actions
  setGroups: (groups: GroupInfo[]) => void;
  fetchGroups: () => Promise<void>;
  createGroup: (name: string, description: string) => Promise<string>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  setSelectedGroup: (groupId: string | null) => void;
  clearGroupUnreadMessages: (groupId: string) => void;
  addGroupWithUnreadMessage: (groupId: string) => void;
  fetchGroupMembers: (groupId: string) => Promise<GroupMember[]>;

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
  groups: [],
  messages: [],
  currentUsername: "",
  selectedUser: null,
  selectedGroup: null,
  notifications: [],
  unreadNotifications: 0,
  usersWithUnreadMessages: new Set<string>(),
  groupsWithUnreadMessages: new Set<string>(),
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

      // Wait for the existing attempt to finish with more robust polling
      let waitTime = 0;
      const MAX_WAIT_TIME = 10000; // 10 seconds max wait
      const CHECK_INTERVAL = 500; // Check every 500ms

      while (connectionAttemptInProgress && waitTime < MAX_WAIT_TIME) {
        await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
        waitTime += CHECK_INTERVAL;

        // If connection was established during the wait, use it
        if (globalConnection?.state === signalR.HubConnectionState.Connected) {
          set({ connection: globalConnection, isConnected: true, error: null });
          return;
        }
      }

      // If we're still waiting after the timeout, force reset
      if (connectionAttemptInProgress) {
        console.warn("Connection attempt timeout exceeded, forcing reset");
        connectionAttemptInProgress = false;

        // Force cleanup of any hanging connection
        if (globalConnection) {
          try {
            await globalConnection.stop();
          } catch (err) {
            console.warn("Error stopping stale connection:", err);
          }
          globalConnection = null;
        }
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
        globalConnection.on(
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

        // Add handler for when a new user joins a group
        globalConnection.on(
          "GroupMemberJoined",
          (
            groupId: string,
            groupName: string,
            userId: string,
            username: string
          ) => {
            console.log("User joined group:", {
              groupId,
              groupName,
              userId,
              username,
            });
            // Refetch group members if this is the currently selected group
            if (get().selectedGroup === groupId) {
              get().fetchGroupMembers(groupId);
            }

            // Add a system message
            const systemMessage: Message = {
              id: Date.now().toString(),
              content: `${username} has joined the group`,
              sender: "System",
              timestamp: new Date(),
              isPrivate: false,
              isGroupMessage: true,
              groupId,
            };
            get().addMessage(systemMessage);
          }
        );

        // Add handler for when a user leaves a group
        globalConnection.on(
          "GroupMemberLeft",
          (
            groupId: string,
            groupName: string,
            userId: string,
            username: string
          ) => {
            console.log("User left group:", {
              groupId,
              groupName,
              userId,
              username,
            });
            // Refetch group members if this is the currently selected group
            if (get().selectedGroup === groupId) {
              get().fetchGroupMembers(groupId);
            }

            // Add a system message
            const systemMessage: Message = {
              id: Date.now().toString(),
              content: `${username} has left the group`,
              sender: "System",
              timestamp: new Date(),
              isPrivate: false,
              isGroupMessage: true,
              groupId,
            };
            get().addMessage(systemMessage);
          }
        );

        // Add handler for when a group is deleted
        globalConnection.on("GroupDeleted", (groupId: string) => {
          console.log("Group deleted:", groupId);
          // If this was the selected group, clear the selection
          if (get().selectedGroup === groupId) {
            set({ selectedGroup: null });
          }

          // Remove the group from our list
          set((state) => ({
            groups: state.groups.filter((g) => g.id !== groupId),
          }));

          // Add a system message to the chat
          const systemMessage: Message = {
            id: Date.now().toString(),
            content: "This group has been deleted",
            sender: "System",
            timestamp: new Date(),
            isPrivate: false,
            isGroupMessage: false,
          };
          get().addMessage(systemMessage);
        });

        // Add handler for group list updates
        globalConnection.on("UpdateGroupList", (groupList: any[]) => {
          console.log("Group list updated:", groupList);

          // Convert the server data format to our client GroupInfo format
          const formattedGroups = groupList.map((g: any) => ({
            id: g.Id?.toString() || g.id?.toString(),
            name: g.Name || g.name,
            description: g.Description || g.description,
            imageUrl: g.ImageUrl || g.imageUrl,
            creatorId: g.CreatorId?.toString() || g.creatorId?.toString(),
            creatorName: g.CreatorName || g.creatorName,
            memberCount: g.MemberCount || g.memberCount,
            isMember: g.IsMember || g.isMember,
            userRole:
              (g.UserRole ?? g.userRole) || (g.IsMember || g.isMember ? 0 : -1),
          }));

          set({ groups: formattedGroups });
        });

        // Add handler for when user joins a group
        globalConnection.on("JoinedGroup", (groupDetails: any) => {
          console.log("Joined group:", groupDetails);

          // Extract group ID - handle different potential formats from the server
          const groupId = groupDetails.GroupId || groupDetails.groupId;

          // Instead of refetching all groups, we can update the specific group in our state
          set((state) => {
            // Find if we already have this group in our state
            const existingGroupIndex = state.groups.findIndex(
              (g) => g.id === groupId
            );

            if (existingGroupIndex >= 0) {
              // Update the existing group to mark it as joined
              const updatedGroups = [...state.groups];
              updatedGroups[existingGroupIndex] = {
                ...updatedGroups[existingGroupIndex],
                isMember: true,
                userRole: 0, // Default role for a new member
              };
              return { groups: updatedGroups };
            }

            // If we don't have the group, we'll need to fetch it
            get().fetchGroups();
            return {};
          });

          // Switch to the group chat
          get().setSelectedGroup(groupId);
        });

        // Add handler for when user leaves a group
        globalConnection.on("LeftGroup", (groupId: string) => {
          console.log("Left group:", groupId);

          // Instead of refetching all groups, update the specific group in our state
          set((state) => {
            // Find if we have this group in our state
            const existingGroupIndex = state.groups.findIndex(
              (g) => g.id === groupId
            );

            if (existingGroupIndex >= 0) {
              // Update the existing group to mark it as not a member
              const updatedGroups = [...state.groups];
              updatedGroups[existingGroupIndex] = {
                ...updatedGroups[existingGroupIndex],
                isMember: false,
                userRole: -1, // Reset role
              };
              return { groups: updatedGroups };
            }

            return {};
          });

          // If this was the selected group, clear selection
          if (get().selectedGroup === groupId) {
            set({ selectedGroup: null });
          }
        });

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

            // Handle group message notifications
            if (
              notificationType === "GroupMessage" &&
              notificationData.groupId
            ) {
              // Mark the group as having unread messages
              if (get().selectedGroup !== notificationData.groupId) {
                get().addGroupWithUnreadMessage(notificationData.groupId);
              }
            }
          }
        );

        // Existing handlers
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

      // Fetch groups and notifications after connecting
      await get().fetchGroups();
      await get().fetchNotifications();

      // If we have a selected group, fetch its messages
      if (get().selectedGroup) {
        await get().fetchGroupMessages(get().selectedGroup);
      }
      // Otherwise fetch public messages
      else if (!get().selectedUser) {
        await get().fetchPublicMessages();
      }
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

  // ... existing disconnect and connection management methods

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
      selectedGroup: null,
      users: [],
      groups: [],
      messages: [],
      currentUsername: "",
      notifications: [],
      unreadNotifications: 0,
      usersWithUnreadMessages: new Set<string>(),
      groupsWithUnreadMessages: new Set<string>(),
      error: null,
    });
  },

  getConnection: () => {
    return globalConnection;
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // ... existing message methods

  sendPublicMessage: async (message: string) => {
    const { isConnected } = get();

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
        isGroupMessage: false,
      };

      get().addMessage(newMessage);
    } catch (err) {
      console.error("Error sending private message:", err);
      set({ error: "Failed to send private message. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  // New method for sending group messages
  sendGroupMessage: async (groupId: string, message: string) => {
    const { isConnected, currentUsername } = get();

    if (!message.trim() || !globalConnection || !isConnected || !groupId) {
      return;
    }

    try {
      await globalConnection.invoke("SendGroupMessage", groupId, message);

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

  fetchPublicMessages: async () => {
    // ... existing code
  },

  // User actions
  setUsers: (users: UserInfo[]) => {
    set({ users });
  },

  setSelectedUser: (userId: string | null) => {
    // Unselect group if we're selecting a user
    if (userId) set({ selectedGroup: null });

    // Load message history when selecting a user
    get().fetchMessageHistory(userId);

    // Clear unread messages indicator when selecting a user
    if (userId) {
      get().clearUserUnreadMessages(userId);
    }

    set({ selectedUser: userId });
  },

  // Group actions
  setGroups: (groups: GroupInfo[]) => {
    set({ groups });
  },

  fetchGroups: async () => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        console.error("No token found for fetching groups");
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/Group`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        const groups = response.data.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          imageUrl: g.imageUrl,
          creatorId: g.creatorId,
          creatorName: g.creatorName,
          memberCount: g.memberCount,
          isMember: g.isMember,
          userRole: g.userRole,
        }));

        set({ groups });
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  },

  createGroup: async (name: string, description: string) => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await axios.post(
        `${API_BASE_URL}/Group`,
        { name, description },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        // Refresh the groups list
        await get().fetchGroups();

        // Return the new group ID
        return response.data.id;
      } else {
        throw new Error("Failed to create group");
      }
    } catch (err) {
      console.error("Error creating group:", err);
      set({ error: "Failed to create group. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
      throw err;
    }
  },

  joinGroup: async (groupId: string) => {
    try {
      if (!globalConnection || !get().isConnected) {
        throw new Error("Not connected to chat hub");
      }

      // Use SignalR hub method to join the group
      await globalConnection.invoke("JoinGroup", groupId);

      // Refresh groups list
      await get().fetchGroups();

      // Select the group after joining
      get().setSelectedGroup(groupId);
    } catch (err) {
      console.error("Error joining group:", err);
      set({ error: "Failed to join group. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
      throw err;
    }
  },

  leaveGroup: async (groupId: string) => {
    try {
      if (!globalConnection || !get().isConnected) {
        throw new Error("Not connected to chat hub");
      }

      // Use SignalR hub method to leave the group
      await globalConnection.invoke("LeaveGroup", groupId);

      // Refresh groups list
      await get().fetchGroups();

      // If this was the selected group, clear selection
      if (get().selectedGroup === groupId) {
        get().setSelectedGroup(null);
      }
    } catch (err) {
      console.error("Error leaving group:", err);
      set({ error: "Failed to leave group. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
      throw err;
    }
  },

  deleteGroup: async (groupId: string) => {
    try {
      if (!globalConnection || !get().isConnected) {
        throw new Error("Not connected to chat hub");
      }

      // Use SignalR hub method to delete the group
      await globalConnection.invoke("DeleteGroup", groupId);

      // Refresh groups list
      await get().fetchGroups();

      // If this was the selected group, clear selection
      if (get().selectedGroup === groupId) {
        get().setSelectedGroup(null);
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      set({ error: "Failed to delete group. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
      throw err;
    }
  },

  setSelectedGroup: (groupId: string | null) => {
    // Unselect user if we're selecting a group
    if (groupId) set({ selectedUser: null });

    // Load group messages when selecting a group
    if (groupId) {
      get().fetchGroupMessages(groupId);
      get().clearGroupUnreadMessages(groupId);
    }

    set({ selectedGroup: groupId });
  },

  fetchGroupMembers: async (groupId: string) => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await axios.get(
        `${API_BASE_URL}/Group/${groupId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        return response.data.map((m: any) => ({
          id: m.id,
          username: m.username,
          profilePictureUrl: m.profilePictureUrl,
          role: m.role,
          joinedAt: new Date(m.joinedAt),
        }));
      } else {
        return [];
      }
    } catch (err) {
      console.error("Error fetching group members:", err);
      return [];
    }
  },

  addGroupWithUnreadMessage: (groupId: string) => {
    set((state) => ({
      groupsWithUnreadMessages: new Set([
        ...state.groupsWithUnreadMessages,
        groupId,
      ]),
    }));
  },

  clearGroupUnreadMessages: (groupId: string) => {
    set((state) => {
      const newSet = new Set(state.groupsWithUnreadMessages);
      newSet.delete(groupId);
      return { groupsWithUnreadMessages: newSet };
    });
  },

  // Notification methods
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
          payload: n.payload ? JSON.parse(n.payload) : {},
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

  markNotificationAsRead: async (notificationId: number) => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      await axios.patch(
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

  deleteAllNotifications: async () => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      await axios.delete(`${API_BASE_URL}/Notification`, {
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
