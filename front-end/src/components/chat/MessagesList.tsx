"use client";

import { useRef, useEffect } from "react";
import useChatStore from "@/store/useChatStore";
import ChatMessage from "./ChatMessage";

export default function MessagesList() {
  const { messages, users, selectedUser, currentUsername } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter messages based on selected chat (public or private)
  const filteredMessages = messages.filter((msg) => {
    if (!selectedUser) {
      // Public chat
      return !msg.isPrivate;
    } else {
      // Private chat
      const selectedUsername = users.find(
        (u) => u.userId === selectedUser
      )?.username;
      return (
        msg.isPrivate &&
        ((msg.sender === currentUsername && msg.receiverId === selectedUser) ||
          (msg.sender === selectedUsername && !msg.receiverId))
      );
    }
  });

  const selectedUserName = selectedUser
    ? users.find((u) => u.userId === selectedUser)?.username
    : null;

  return (
    <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
      {filteredMessages.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          {selectedUser
            ? `Start a conversation with ${selectedUserName || "this user"}`
            : "No public messages yet. Start the conversation!"}
        </div>
      ) : (
        filteredMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            content={msg.content}
            sender={msg.sender}
            isCurrentUser={msg.sender === currentUsername}
            timestamp={new Date(msg.timestamp)}
            isPrivate={msg.isPrivate}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
