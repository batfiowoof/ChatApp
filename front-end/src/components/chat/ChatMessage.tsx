"use client";

import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import useChatStore from "@/store/useChatStore";

interface ChatMessageProps {
  content: string;
  sender: string;
  isCurrentUser: boolean;
  timestamp: Date;
  isPrivate: boolean;
  profilePicture?: string;
  senderId?: string;
}

export default function ChatMessage({
  content,
  sender,
  isCurrentUser,
  timestamp,
  isPrivate,
  profilePicture,
  senderId,
}: ChatMessageProps) {
  const { users } = useChatStore();
  const formattedTime = formatDistanceToNow(timestamp, { addSuffix: true });

  // Find user's profile picture if not directly provided
  const user = users.find((u) => u.username === sender);
  const avatarSrc =
    profilePicture || user?.profilePictureUrl || "/images/default-avatar.png";
  const userId = senderId || user?.userId;

  return (
    <div
      className={`flex mb-4 items-start ${
        isCurrentUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isCurrentUser && (
        <Link
          href={userId ? `/profile/${userId}` : "#"}
          className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <Image
            src={avatarSrc}
            alt={sender}
            width={32}
            height={32}
            className="object-cover"
          />
        </Link>
      )}

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

      {isCurrentUser && (
        <Link
          href="/profile"
          className="w-8 h-8 rounded-full overflow-hidden ml-2 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <Image
            src={avatarSrc}
            alt={sender}
            width={32}
            height={32}
            className="object-cover"
          />
        </Link>
      )}
    </div>
  );
}
