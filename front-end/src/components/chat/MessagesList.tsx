"use client";

import { useRef, useEffect } from "react";
import useChatStore from "@/store/useChatStore";
import ChatMessage from "./ChatMessage";

export default function MessagesList() {
  const { messages, users, selectedUser, currentUsername, isLoadingHistory } =
    useChatStore();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter messages based on selected chat (public or private)
  const filteredMessages = messages.filter((msg) => {
    if (!selectedUser) {
      // Public chat - show all non-private messages
      return !msg.isPrivate;
    } else {
      // Private chat - show all messages between the current user and selected user
      const selectedUsername = users.find(
        (u) => u.userId === selectedUser
      )?.username;

      return (
        msg.isPrivate &&
        // Messages sent by current user to selected user
        ((msg.sender === currentUsername && msg.receiverId === selectedUser) ||
          // Messages received from selected user
          msg.sender === selectedUsername ||
          // Handle legacy messages that might not have receiverId set
          (msg.sender === selectedUsername && !msg.receiverId))
      );
    }
  });

  // Sort messages by timestamp to ensure chronological order
  const sortedMessages = [...filteredMessages].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const selectedUserName = selectedUser
    ? users.find((u) => u.userId === selectedUser)?.username
    : null;

  return (
    <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
      {/* Loading state */}
      {isLoadingHistory && (
        <div className="flex justify-center items-center h-20">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 mb-2 border-t-4 border-primary-500 rounded-full animate-spin"></div>
            <span className="text-sm text-primary-600 dark:text-primary-400">
              Loading messages...
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoadingHistory && sortedMessages.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          {selectedUser
            ? `Start a conversation with ${selectedUserName || "this user"}`
            : "No public messages yet. Start the conversation!"}
        </div>
      )}

      {/* Messages list */}
      {!isLoadingHistory && sortedMessages.length > 0 && (
        <div className="space-y-3">
          {/* Display conversation date headers */}
          {sortedMessages.map((msg, index) => {
            // Check if this message is from a different day than the previous one
            const showDateHeader =
              index === 0 ||
              new Date(msg.timestamp).toDateString() !==
                new Date(sortedMessages[index - 1].timestamp).toDateString();

            return (
              <div key={msg.id}>
                {showDateHeader && (
                  <div className="text-center my-4">
                    <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-xs rounded-full">
                      {new Date(msg.timestamp).toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
                <ChatMessage
                  content={msg.content}
                  sender={msg.sender}
                  isCurrentUser={msg.sender === currentUsername}
                  timestamp={new Date(msg.timestamp)}
                  isPrivate={msg.isPrivate}
                />
              </div>
            );
          })}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
