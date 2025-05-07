"use client";

import { useState, useEffect } from "react";
import useChatStore from "@/store/useChatStore";
import Image from "next/image";

interface GroupMembersModalProps {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Member {
  id: string;
  username: string;
  profilePictureUrl: string;
  role: number; // 0: Member, 1: Admin, 2: Owner
  joinedAt: Date;
}

export default function GroupMembersModal({
  groupId,
  isOpen,
  onClose,
}: GroupMembersModalProps) {
  const { users, fetchGroupMembers } = useChatStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteStatus, setInviteStatus] = useState<Record<string, string>>({});

  // Get non-members (users who are not in the group)
  const nonMembers = users.filter(
    (user) => !members.some((member) => member.id === user.userId)
  );

  useEffect(() => {
    if (isOpen && groupId) {
      loadMembers();
    }
  }, [isOpen, groupId]);

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      setError("");

      const groupMembers = await fetchGroupMembers(groupId);
      setMembers(groupMembers);
    } catch (err) {
      console.error("Error fetching group members:", err);
      setError("Failed to load group members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteUser = async (userId: string) => {
    try {
      setInviteStatus((prev) => ({ ...prev, [userId]: "sending" }));

      // This is a placeholder - replace with your actual invitation API call
      // For example: await inviteToGroup(groupId, userId);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay

      setInviteStatus((prev) => ({ ...prev, [userId]: "sent" }));

      // Reset invitation status after 3 seconds
      setTimeout(() => {
        setInviteStatus((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }, 3000);
    } catch (err) {
      console.error(`Error inviting user ${userId} to group:`, err);
      setInviteStatus((prev) => ({ ...prev, [userId]: "error" }));

      // Reset error status after 3 seconds
      setTimeout(() => {
        setInviteStatus((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }, 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-primary-600 py-4 px-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Group Members</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
            aria-label="Close"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div>
              {/* Current members section */}
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                Current Members ({members.length})
              </h3>

              <ul className="mb-6 divide-y divide-gray-200 dark:divide-gray-700">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                        <Image
                          src={
                            member.profilePictureUrl ||
                            "/images/default-avatar.png"
                          }
                          alt={member.username}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{member.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {member.role === 2
                            ? "Owner"
                            : member.role === 1
                            ? "Admin"
                            : "Member"}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Invite users section */}
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                Invite Users
              </h3>

              {nonMembers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No users available to invite
                </p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {nonMembers.map((user) => (
                    <li
                      key={user.userId}
                      className="py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                          <Image
                            src={
                              user.profilePictureUrl ||
                              "/images/default-avatar.png"
                            }
                            alt={user.username}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                        <p>{user.username}</p>
                      </div>

                      <button
                        onClick={() => handleInviteUser(user.userId)}
                        disabled={
                          inviteStatus[user.userId] === "sending" ||
                          inviteStatus[user.userId] === "sent"
                        }
                        className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          inviteStatus[user.userId] === "sent"
                            ? "bg-green-100 text-green-600"
                            : inviteStatus[user.userId] === "error"
                            ? "bg-red-100 text-red-600"
                            : "bg-primary-100 text-primary-600 hover:bg-primary-200"
                        }`}
                        title={
                          inviteStatus[user.userId] === "sent"
                            ? "Invitation sent"
                            : inviteStatus[user.userId] === "error"
                            ? "Failed to send invitation"
                            : "Invite to group"
                        }
                      >
                        {inviteStatus[user.userId] === "sending" ? (
                          <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                        ) : inviteStatus[user.userId] === "sent" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : inviteStatus[user.userId] === "error" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          "+"
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
