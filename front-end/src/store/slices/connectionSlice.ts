import { StateCreator } from "zustand";
import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";
import { ChatState, SIGNALR_URL } from "../types";

// Global connection variables
let globalConnection: signalR.HubConnection | null = null;
let connectionAttemptInProgress = false;
let reconnectTimeout: NodeJS.Timeout | null = null;

export interface ConnectionSlice {
  // State
  connection: signalR.HubConnection | null;
  isConnected: boolean;
  error: string | null;
  currentUsername: string;

  // Actions
  connect: (token?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  getConnection: () => signalR.HubConnection | null;
  setError: (error: string | null) => void;
}

export const createConnectionSlice: StateCreator<
  ChatState,
  [],
  [],
  ConnectionSlice
> = (set, get) => ({
  // Initial state
  connection: null,
  isConnected: false,
  error: null,
  currentUsername: "",

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

        // Set up SignalR event handlers in other slices
        await setupMessageHandlers(globalConnection, get);
        await setupGroupHandlers(globalConnection, get);
        await setupUserHandlers(globalConnection, set);
        await setupNotificationHandlers(globalConnection, get);

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

        // Extract username from JWT claims
        const username =
          decodedPayload[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
          ] ||
          decodedPayload.unique_name ||
          decodedPayload.name ||
          "Unknown";

        set({ currentUsername: username });
      } catch (err) {
        console.error("Error extracting username from token:", err);
        set({ currentUsername: "User" });
      }

      console.log("Connected to SignalR hub!");

      // Fetch initial data
      await get().fetchGroups();
      await get().fetchNotifications();

      // Load appropriate messages
      if (get().selectedGroup) {
        await get().fetchGroupMessages(get().selectedGroup);
      } else if (!get().selectedUser) {
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

  disconnect: async () => {
    // Only disconnect if explicitly called
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
});

// These are placeholder functions that will be implemented in their respective slices
// They're defined here to avoid circular dependencies
async function setupMessageHandlers(
  connection: signalR.HubConnection,
  get: () => ChatState
) {
  // Implemented in messageSlice
}

async function setupGroupHandlers(
  connection: signalR.HubConnection,
  get: () => ChatState
) {
  // Implemented in groupSlice
}

async function setupUserHandlers(
  connection: signalR.HubConnection,
  set: (state: Partial<ChatState>) => void
) {
  // Set up user-related event handlers
  connection.on("UpdateUserList", (userList: any[]) => {
    set({ users: userList });
  });

  connection.on("UserNotConnected", (errorMessage: string) => {
    set({ error: `Error: ${errorMessage}` });
    // Clear error after 5 seconds
    setTimeout(() => set({ error: null }), 5000);
  });
}

async function setupNotificationHandlers(
  connection: signalR.HubConnection,
  get: () => ChatState
) {
  // Implemented in notificationSlice
}
