"use client";

import { useState } from "react";
import useChatStore from "@/store/useChatStore";

export default function MessageInput() {
  const [inputMessage, setInputMessage] = useState("");
  const {
    isConnected,
    selectedUser,
    selectedGroup,
    users,
    groups,
    sendPublicMessage,
    sendPrivateMessage,
    sendGroupMessage,
  } = useChatStore();

  const handleSend = async () => {
    if (!inputMessage.trim() || !isConnected) return;

    if (selectedUser) {
      await sendPrivateMessage(selectedUser, inputMessage);
    } else if (selectedGroup) {
      await sendGroupMessage(selectedGroup, inputMessage);
    } else {
      await sendPublicMessage(inputMessage);
    }

    // Clear input after sending
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get recipient name for placeholder
  let recipientName = "everyone";
  if (selectedUser) {
    recipientName =
      users.find((u) => u.userId === selectedUser)?.username || "this user";
  } else if (selectedGroup) {
    recipientName =
      groups.find((g) => g.id === selectedGroup)?.name || "this group";
  }

  return (
    <div className="flex items-center">
      <textarea
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={`Type a message to ${recipientName}`}
        className="input-field flex-grow resize-none h-12 py-2"
        disabled={!isConnected}
      />
      <button
        onClick={handleSend}
        disabled={!inputMessage.trim() || !isConnected}
        className="btn-primary ml-2"
      >
        Send
      </button>
    </div>
  );
}
