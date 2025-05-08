import { StateCreator } from "zustand";
import { ChatState, UserInfo } from "../types";

export interface UserSlice {
  // State
  users: UserInfo[];
  selectedUser: string | null;
  usersWithUnreadMessages: Set<string>;

  // Actions
  setUsers: (users: UserInfo[]) => void;
  setSelectedUser: (userId: string | null) => void;
  addUserWithUnreadMessage: (userId: string) => void;
  clearUserUnreadMessages: (userId: string) => void;
}

export const createUserSlice: StateCreator<ChatState, [], [], UserSlice> = (
  set,
  get
) => ({
  // Initial state
  users: [],
  selectedUser: null,
  usersWithUnreadMessages: new Set<string>(),

  // Set users list
  setUsers: (users: UserInfo[]) => {
    set({ users });
  },

  // Set selected user
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

  // Mark user as having unread messages
  addUserWithUnreadMessage: (userId: string) => {
    set((state) => ({
      usersWithUnreadMessages: new Set([
        ...state.usersWithUnreadMessages,
        userId,
      ]),
    }));
  },

  // Clear unread message indicator for a user
  clearUserUnreadMessages: (userId: string) => {
    set((state) => {
      const newSet = new Set(state.usersWithUnreadMessages);
      newSet.delete(userId);
      return { usersWithUnreadMessages: newSet };
    });
  },
});
