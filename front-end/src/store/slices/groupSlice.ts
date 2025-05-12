import { StateCreator } from "zustand";
import * as signalR from "@microsoft/signalr";
import axios from "axios";
import Cookies from "js-cookie";
import {
  API_BASE_URL,
  ChatState,
  GroupInfo,
  GroupMember,
  Message,
} from "../types";

export interface GroupSlice {
  // State
  groups: GroupInfo[];
  selectedGroup: string | null;
  groupsWithUnreadMessages: Set<string>;

  // Actions
  setGroups: (groups: GroupInfo[]) => void;
  fetchGroups: () => Promise<void>;
  createGroup: (name: string, description: string) => Promise<string>;
  joinGroup: (groupId: string) => Promise<void>;
  requestToJoinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  setSelectedGroup: (groupId: string | null) => void;
  clearGroupUnreadMessages: (groupId: string) => void;
  addGroupWithUnreadMessage: (groupId: string) => void;
  fetchGroupMembers: (groupId: string) => Promise<GroupMember[]>;
}

export const createGroupSlice: StateCreator<ChatState, [], [], GroupSlice> = (
  set,
  get
) => ({
  // Initial state
  groups: [],
  selectedGroup: null,
  groupsWithUnreadMessages: new Set<string>(),

  // Set groups list
  setGroups: (groups: GroupInfo[]) => {
    set({ groups });
  },

  // Fetch groups from API
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
          isPrivate: g.isPrivate, // Add the isPrivate property
        }));

        set({ groups });
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  },

  // Create a new group
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

  // Join a group
  joinGroup: async (groupId: string) => {
    try {
      const connection = get().getConnection();
      const { isConnected } = get();

      if (!connection || !isConnected) {
        throw new Error("Not connected to chat hub");
      }

      // Use SignalR hub method to join the group
      await connection.invoke("JoinGroup", groupId);

      // Explicitly fetch the updated groups to ensure UI state is current
      await get().fetchGroups();

      // Update the specific group in the state to ensure immediate UI update
      // This provides immediate feedback even before the server event arrives
      set((state) => {
        const existingGroupIndex = state.groups.findIndex(
          (g) => g.id === groupId
        );
        if (existingGroupIndex >= 0) {
          const updatedGroups = [...state.groups];
          updatedGroups[existingGroupIndex] = {
            ...updatedGroups[existingGroupIndex],
            isMember: true,
            userRole: 0, // Default role for a new member
          };
          return { groups: updatedGroups };
        }
        return {};
      });

      // Select the group after joining
      get().setSelectedGroup(groupId);
    } catch (err) {
      console.error("Error joining group:", err);
      set({ error: "Failed to join group. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
      throw err;
    }
  },

  // Request to join a group
  requestToJoinGroup: async (groupId: string) => {
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await axios.post(
        `${API_BASE_URL}/Group/${groupId}/request`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        console.log("Request to join group sent successfully");
      } else {
        throw new Error("Failed to send request to join group");
      }
    } catch (err) {
      console.error("Error requesting to join group:", err);
      set({ error: "Failed to request to join group. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
      throw err;
    }
  },

  // Leave a group
  leaveGroup: async (groupId: string) => {
    try {
      const connection = get().getConnection();
      const { isConnected } = get();

      if (!connection || !isConnected) {
        throw new Error("Not connected to chat hub");
      }

      // Use SignalR hub method to leave the group
      await connection.invoke("LeaveGroup", groupId);

      // Explicitly fetch the updated groups to ensure UI state is current
      await get().fetchGroups();

      // Update the group in the local state immediately
      set((state) => {
        const existingGroupIndex = state.groups.findIndex(
          (g) => g.id === groupId
        );
        if (existingGroupIndex >= 0) {
          const updatedGroups = [...state.groups];
          updatedGroups[existingGroupIndex] = {
            ...updatedGroups[existingGroupIndex],
            isMember: false,
            userRole: -1,
          };
          return { groups: updatedGroups };
        }
        return {};
      });

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

  // Delete a group
  deleteGroup: async (groupId: string) => {
    try {
      const connection = get().getConnection();
      const { isConnected } = get();

      if (!connection || !isConnected) {
        throw new Error("Not connected to chat hub");
      }

      // Use SignalR hub method to delete the group
      await connection.invoke("DeleteGroup", groupId);

      // Immediately update the local state by removing the group
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
      }));

      // If this was the selected group, clear selection
      if (get().selectedGroup === groupId) {
        get().setSelectedGroup(null);
      }

      // Explicitly fetch groups to ensure latest state
      await get().fetchGroups();
    } catch (err) {
      console.error("Error deleting group:", err);
      set({ error: "Failed to delete group. Please try again." });
      setTimeout(() => set({ error: null }), 5000);
      throw err;
    }
  },

  // Set selected group
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

  // Fetch group members
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

  // Mark group as having unread messages
  addGroupWithUnreadMessage: (groupId: string) => {
    set((state) => ({
      groupsWithUnreadMessages: new Set([
        ...state.groupsWithUnreadMessages,
        groupId,
      ]),
    }));
  },

  // Clear unread message indicator for a group
  clearGroupUnreadMessages: (groupId: string) => {
    set((state) => {
      const newSet = new Set(state.groupsWithUnreadMessages);
      newSet.delete(groupId);
      return { groupsWithUnreadMessages: newSet };
    });
  },
});

// Setup group handlers for SignalR connection
export function setupGroupHandlers(
  connection: signalR.HubConnection,
  get: () => ChatState
) {
  // Add handler for when a new user joins a group
  connection.on(
    "GroupMemberJoined",
    (groupId: string, groupName: string, userId: string, username: string) => {
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
  connection.on(
    "GroupMemberLeft",
    (groupId: string, groupName: string, userId: string, username: string) => {
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
  connection.on("GroupDeleted", (groupId: string) => {
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
  connection.on("UpdateGroupList", (groupList: any[]) => {
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
      isPrivate: g.IsPrivate ?? g.isPrivate, // Add isPrivate property
    }));

    set({ groups: formattedGroups });
  });

  // Add handler for when user joins a group
  connection.on("JoinedGroup", (groupDetails: any) => {
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
  connection.on("LeftGroup", (groupId: string) => {
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
}
