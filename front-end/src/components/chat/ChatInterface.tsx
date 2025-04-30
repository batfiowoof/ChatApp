"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import useChatStore from "@/store/useChatStore";
import UserList from "./UserList";
import MessagesList from "./MessagesList";
import MessageInput from "./MessageInput";
import { useLoading } from "@/components/common/GlobalLoadingProvider";
import Image from "next/image";
import Link from "next/link";

export default function ChatInterface() {
  const { connect, error, selectedUser, users } = useChatStore();
  const router = useRouter();
  const { showLoading, hideLoading } = useLoading();

  // Connect to SignalR hub on component mount
  useEffect(() => {
    // Try to get token from cookie first, then localStorage as fallback
    const token = Cookies.get("token") || localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    // Show loading while connecting
    showLoading("Connecting to chat...");

    // Connect to the chat hub
    connect(token)
      .then(() => {
        hideLoading();
      })
      .catch((err) => {
        console.error("Failed to connect:", err);
        hideLoading();

        // If we get an unauthorized error, redirect to login
        if (err instanceof Error && err.message.includes("Unauthorized")) {
          Cookies.remove("token");
          localStorage.removeItem("token");
          router.push("/login");
        }
      });

    // We don't disconnect on unmount because we want to keep the connection
    // alive in our global store across component changes
  }, [connect, router, showLoading, hideLoading]);

  // Get the selected user for display
  const selectedUserData = selectedUser
    ? users.find((u) => u.userId === selectedUser)
    : null;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-200px)] gap-4">
      {/* User list */}
      <div className="w-full md:w-1/4">
        <UserList />
      </div>

      {/* Chat area */}
      <div className="w-full md:w-3/4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col">
        <div className="flex items-center mb-3">
          {selectedUser ? (
            <>
              <Link
                href={`/profile/${selectedUser}`}
                className="flex items-center hover:opacity-80"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                  <Image
                    src={
                      selectedUserData?.profilePictureUrl ||
                      "/images/default-avatar.png"
                    }
                    alt={selectedUserData?.username || "User"}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <h2 className="text-lg font-semibold text-primary-600">
                  Private Chat with {selectedUserData?.username || "User"}
                </h2>
              </Link>
            </>
          ) : (
            <h2 className="text-lg font-semibold text-primary-600">
              Public Chat
            </h2>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* Messages area */}
        <MessagesList />

        {/* Input area */}
        <MessageInput />
      </div>
    </div>
  );
}
