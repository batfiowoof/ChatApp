"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import useChatStore from "@/store/useChatStore";
import UserList from "./UserList";
import GroupList from "./GroupList";
import MessagesList from "./MessagesList";
import MessageInput from "./MessageInput";
import GroupMembersModal from "./GroupMembersModal";
import { useLoading } from "@/components/common/GlobalLoadingProvider";
import Image from "next/image";
import Link from "next/link";

export default function ChatInterface() {
  const {
    connect,
    error,
    selectedUser,
    selectedGroup,
    users,
    groups,
    isConnected,
  } = useChatStore();
  const router = useRouter();
  const { showLoading, hideLoading } = useLoading();
  const [activeTab, setActiveTab] = useState<"users" | "groups">("users");
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Connect to SignalR hub on component mount if not already connected
  useEffect(() => {
    // Try to get token from cookie first, then localStorage as fallback
    const token = Cookies.get("token") || localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    if (!isConnected) {
      // Only show loading if we actually need to connect
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
    }
    // We don't disconnect on unmount because we want to keep the connection
    // alive in our global store across component changes
  }, [connect, router, showLoading, hideLoading, isConnected]);

  // Get the selected user for display
  const selectedUserData = selectedUser
    ? users.find((u) => u.userId === selectedUser)
    : null;

  // Get the selected group for display
  const selectedGroupData = selectedGroup
    ? groups.find((g) => g.id === selectedGroup)
    : null;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-200px)] gap-4">
      {/* Left sidebar: users & groups */}
      <div className="w-full md:w-1/4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4">
          {/* Tab navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === "users"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === "groups"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Groups
            </button>
          </div>
        </div>

        {/* Show appropriate list based on active tab */}
        {activeTab === "users" ? <UserList /> : <GroupList />}
      </div>

      {/* Chat area */}
      <div className="w-full md:w-3/4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          {selectedUser ? (
            // Private chat header
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
          ) : selectedGroup ? (
            // Group chat header
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full overflow-hidden mr-3 bg-gray-300 flex items-center justify-center">
                  {selectedGroupData?.imageUrl ? (
                    <Image
                      src={selectedGroupData.imageUrl}
                      alt={selectedGroupData.name}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-gray-600">
                      {selectedGroupData?.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-primary-600">
                    {selectedGroupData?.name || "Group Chat"}
                  </h2>
                  {selectedGroupData?.description && (
                    <p className="text-xs text-gray-500 truncate max-w-sm">
                      {selectedGroupData.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Group actions button */}
              <button
                onClick={() => setShowMembersModal(true)}
                className="text-primary-600 hover:text-primary-800 dark:hover:text-primary-400"
                title="View Group Members"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </button>
            </div>
          ) : (
            // Public chat header
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

      {/* Group members modal */}
      {selectedGroup && (
        <GroupMembersModal
          groupId={selectedGroup}
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
        />
      )}
    </div>
  );
}
