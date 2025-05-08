import * as signalR from "@microsoft/signalr";

// Base URLs
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5225/api";
export const SIGNALR_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api$/, "") ||
  "http://localhost:5225";

// User related types
export interface UserInfo {
  userId: string;
  username: string;
  isOnline: boolean;
  profilePictureUrl?: string;
  bio?: string;
}

// Group related types
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

// Message related types
export interface Message {
  id: string;
  content: string;
  sender: string;
  senderId?: string;
  timestamp: Date;
  isPrivate: boolean;
  receiverId?: string;
  groupId?: string;
  isGroupMessage?: boolean;
}

// Notification related types
export interface Notification {
  id: number;
  type: string;
  payload: any;
  isRead: boolean;
  sentAt: Date;
}

// Combined store state
export interface ChatState {
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
  selectedGroup: string | null;
  isLoadingHistory: boolean;

  // Notification state
  notifications: Notification[];
  unreadNotifications: number;
  usersWithUnreadMessages: Set<string>;
  groupsWithUnreadMessages: Set<string>;
}
