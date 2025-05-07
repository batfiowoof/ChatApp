"use client";

import { useState, useEffect } from "react";
import useChatStore from "@/store/useChatStore";
import Image from "next/image";

interface InviteUserToGroupModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteUserToGroupModal({
  userId,
  isOpen,
  onClose,
}: InviteUserToGroupModalProps) {
  const { users, groups } = useChatStore();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");

  const user = users.find((u) => u.userId === userId);
  // Only show groups where the current user is a member
  const invitableGroups = groups.filter((g) => g.isMember);

  // Reset the form when the modal opens with a new user
  useEffect(() => {
    if (isOpen) {
      setSelectedGroupId("");
      setInviteStatus("idle");
      // Auto-select first group if available
      if (invitableGroups.length > 0) {
        setSelectedGroupId(invitableGroups[0].id);
      }
    }
  }, [isOpen, userId, invitableGroups]);

  // Handle sending the invitation
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGroupId || !userId) {
      return;
    }

    try {
      setIsSubmitting(true);
      setInviteStatus("sending");

      // This is a placeholder - replace with your actual invitation API call
      // For example: await inviteToGroup(selectedGroupId, userId);
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate API delay

      setInviteStatus("success");

      // Close the modal after a success delay
      setTimeout(() => {
        onClose();
        setInviteStatus("idle");
      }, 1500);
    } catch (err) {
      console.error(`Error inviting user to group:`, err);
      setInviteStatus("error");

      // Reset after error delay
      setTimeout(() => {
        setInviteStatus("idle");
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-primary-600 py-4 px-6">
          <h2 className="text-xl font-semibold text-white">Invite to Group</h2>
        </div>

        <div className="p-6">
          {/* User info */}
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
              <Image
                src={user?.profilePictureUrl || "/images/default-avatar.png"}
                alt={user?.username || "User"}
                width={48}
                height={48}
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="text-lg font-medium">{user?.username}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          {inviteStatus === "success" ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium">
                Invitation sent successfully!
              </p>
            </div>
          ) : inviteStatus === "error" ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
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
              </div>
              <p className="text-lg font-medium">Failed to send invitation</p>
              <p className="text-sm text-gray-500 mt-1">
                Please try again later.
              </p>
            </div>
          ) : (
            <form onSubmit={handleInvite}>
              <div className="mb-6">
                <label
                  htmlFor="groupSelect"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Select Group
                </label>

                {invitableGroups.length > 0 ? (
                  <select
                    id="groupSelect"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="input-field w-full"
                    disabled={isSubmitting}
                    required
                  >
                    {invitableGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.memberCount} members)
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm py-2">
                    You don't have any groups to invite users to.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
                  disabled={isSubmitting || invitableGroups.length === 0}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Sending...
                    </div>
                  ) : (
                    "Send Invitation"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
