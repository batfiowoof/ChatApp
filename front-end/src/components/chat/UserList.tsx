"use client";

import { useState } from "react";
import useChatStore from "@/store/useChatStore";
import Image from "next/image";
import Link from "next/link";
import InviteUserToGroupModal from "./InviteUserToGroupModal";

interface UserListProps {
  title?: string;
}

export default function UserList({ title = "Online Users" }: UserListProps) {
  const {
    users,
    selectedUser,
    setSelectedUser,
    currentUsername,
    usersWithUnreadMessages,
    groups,
  } = useChatStore();

  // State for invitation modal
  const [invitingUser, setInvitingUser] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Find the current user's data including profile picture
  const currentUser = users.find((user) => user.username === currentUsername);

  // Check if we have any groups to which we can invite users
  const hasInvitableGroups = groups.some((group) => group.isMember);

  // Function to handle clicking the invite button
  const handleInviteClick = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the user
    setInvitingUser(userId);
    setShowInviteModal(true);
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 overflow-hidden flex flex-col">
      <h2 className="text-lg font-semibold mb-3 text-primary-600">{title}</h2>
      <div className="overflow-y-auto flex-grow">
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => setSelectedUser(null)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                selectedUser === null
                  ? "bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              Public Chat
            </button>
          </li>
          {/* Filter out the current user and display others with online indicator */}
          {users
            .filter(
              (user) => user.username !== currentUsername && user.isOnline
            )
            .map((user) => (
              <li key={user.userId}>
                <button
                  onClick={() => setSelectedUser(user.userId)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center ${
                    selectedUser === user.userId
                      ? "bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <Link
                    href={`/profile/${user.userId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="relative mr-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <Image
                        src={
                          user.profilePictureUrl || "/images/default-avatar.png"
                        }
                        alt={user.username}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <span
                      className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-white dark:border-gray-800"
                      title="Online"
                    ></span>
                  </Link>
                  <span className="flex-1">{user.username}</span>

                  <div className="flex items-center space-x-1">
                    {/* Group invitation button */}
                    {hasInvitableGroups && (
                      <button
                        onClick={(e) => handleInviteClick(user.userId, e)}
                        className="text-primary-600 hover:text-primary-800 p-1 mr-1"
                        title={`Invite ${user.username} to a group`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </button>
                    )}

                    {/* Show unread message indicator */}
                    {usersWithUnreadMessages.has(user.userId) && (
                      <span
                        className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                        title="Unread messages"
                      >
                        !
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          {/* Show current user with different styling */}
          {currentUsername && (
            <li className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="px-3 py-2 flex items-center text-gray-500">
                <Link
                  href="/profile"
                  className="relative mr-3 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <Image
                      src={
                        currentUser?.profilePictureUrl ||
                        "/images/default-avatar.png"
                      }
                      alt={currentUsername}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  </div>
                  <span
                    className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-white dark:border-gray-800"
                    title="Online"
                  ></span>
                </Link>
                <span className="flex-1">{currentUsername}</span>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  You
                </span>
              </div>
            </li>
          )}
        </ul>

        {/* Display offline users */}
        <ul className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {users
            .filter(
              (user) =>
                user.username !== currentUsername && user.isOnline === false
            )
            .map((user) => (
              <li key={user.userId} className="px-3 py-2 text-gray-500">
                <button
                  onClick={() => setSelectedUser(user.userId)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center ${
                    selectedUser === user.userId
                      ? "bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <Link
                    href={`/profile/${user.userId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-3">
                      <Image
                        src={
                          user.profilePictureUrl || "/images/default-avatar.png"
                        }
                        alt={user.username}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                  </Link>
                  <span className="flex-1">{user.username}</span>

                  <div className="flex items-center space-x-1">
                    {/* Group invitation button - also available for offline users */}
                    {hasInvitableGroups && (
                      <button
                        onClick={(e) => handleInviteClick(user.userId, e)}
                        className="text-primary-600 hover:text-primary-800 p-1 mr-1"
                        title={`Invite ${user.username} to a group`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </button>
                    )}

                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                      Offline
                    </span>
                  </div>
                </button>
              </li>
            ))}
        </ul>
      </div>

      {/* Modal for inviting users to groups */}
      {invitingUser && (
        <InviteUserToGroupModal
          userId={invitingUser}
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setInvitingUser(null);
          }}
        />
      )}
    </div>
  );
}
