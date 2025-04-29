"use client";

import { useState } from "react";
import useChatStore from "@/store/useChatStore";

export default function MessageInput() {
  const [inputMessage, setInputMessage] = useState("");
  const {
    isConnected,
    selectedUser,
    users,
    sendPublicMessage,
    sendPrivateMessage,
  } = useChatStore();

  const handleSend = async () => {
    if (!inputMessage.trim() || !isConnected) return;

    if (selectedUser) {
      await sendPrivateMessage(selectedUser, inputMessage);
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

  const selectedUsername = selectedUser
    ? users.find((u) => u.userId === selectedUser)?.username
    : null;

  return (
    <div className="flex items-center">
      <textarea
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={`Type a message to ${selectedUsername || "everyone"}`}
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
