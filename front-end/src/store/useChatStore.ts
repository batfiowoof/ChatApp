import { create } from "zustand";
import { ChatState } from "./types";
import {
  createConnectionSlice,
  ConnectionSlice,
} from "./slices/connectionSlice";
import {
  createMessageSlice,
  MessageSlice,
  setupMessageHandlers,
} from "./slices/messageSlice";
import { createUserSlice, UserSlice } from "./slices/userSlice";
import {
  createGroupSlice,
  GroupSlice,
  setupGroupHandlers,
} from "./slices/groupSlice";
import {
  createNotificationSlice,
  NotificationSlice,
  setupNotificationHandlers,
} from "./slices/notificationSlice";

// Fix to properly import and export the setup handler functions
export { setupMessageHandlers } from "./slices/messageSlice";
export { setupGroupHandlers } from "./slices/groupSlice";
export { setupNotificationHandlers } from "./slices/notificationSlice";

// Export types for use in components
export type {
  ChatState,
  UserInfo,
  GroupInfo,
  GroupMember,
  Message,
  Notification,
} from "./types";

// Combine all slices into a single store
const useChatStore = create<
  ChatState &
    ConnectionSlice &
    MessageSlice &
    UserSlice &
    GroupSlice &
    NotificationSlice
>((...a) => ({
  ...createConnectionSlice(...a),
  ...createMessageSlice(...a),
  ...createUserSlice(...a),
  ...createGroupSlice(...a),
  ...createNotificationSlice(...a),
}));

export default useChatStore;
