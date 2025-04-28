"use client";

import { formatDistanceToNow } from "date-fns";

interface ChatMessageProps {
  content: string;
  sender: string;
  isCurrentUser: boolean;
  timestamp: Date;
  isPrivate: boolean;
}

export default function ChatMessage({
  content,
  sender,
  isCurrentUser,
  timestamp,
  isPrivate,
}: ChatMessageProps) {
  const formattedTime = formatDistanceToNow(timestamp, { addSuffix: true });

  return (
    <div
      className={`flex mb-4 ${isCurrentUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2 ${
          isCurrentUser
            ? "bg-primary-600 text-white"
            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        } ${isPrivate ? "border-l-4 border-secondary-500" : ""}`}
      >
        {!isCurrentUser && (
          <div className="font-semibold text-sm">
            {sender}
            {isPrivate && (
              <span className="ml-2 bg-secondary-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                Private
              </span>
            )}
          </div>
        )}
        <div className="my-1">{content}</div>
        <div className="text-xs opacity-70 text-right">{formattedTime}</div>
      </div>
    </div>
  );
}
