"use client";

import { useState } from "react";
import useChatStore from "@/store/useChatStore";
import Image from "next/image";

interface JoinGroupRequestModalProps {
  group: {
    id: string;
    name: string;
    imageUrl?: string;
    description?: string;
    memberCount: number;
    isPrivate: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  onJoinRequest: () => Promise<void>;
}

export default function JoinGroupRequestModal({
  group,
  isOpen,
  onClose,
  onJoinRequest,
}: JoinGroupRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestStatus, setRequestStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      setRequestStatus("sending");

      await onJoinRequest();
      setRequestStatus("success");

      // Close modal after success delay
      setTimeout(() => {
        onClose();
        setRequestStatus("idle");
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send join request"
      );
      setRequestStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-primary-600 py-4 px-6">
          <h2 className="text-xl font-semibold text-white">
            {group.isPrivate ? "Request to Join Private Group" : "Join Group"}
          </h2>
        </div>

        <div className="p-6">
          {/* Group info */}
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-full overflow-hidden mr-4 bg-gray-300 flex items-center justify-center">
              {group.imageUrl ? (
                <Image
                  src={group.imageUrl}
                  alt={group.name}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-gray-600">
                  {group.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium">{group.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {group.memberCount} members
              </p>
            </div>
          </div>

          {requestStatus === "success" ? (
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
                Join request sent successfully!
              </p>
            </div>
          ) : requestStatus === "error" ? (
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
              <p className="text-lg font-medium">Failed to send request</p>
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Private group message */}
              {group.isPrivate && (
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-900">
                  <p className="text-yellow-800 dark:text-yellow-400">
                    This is a private group. You need to request an invitation
                    to join.
                  </p>
                </div>
              )}

              {/* Group description if available */}
              {group.description && (
                <div className="mb-6">
                  <h4 className="font-medium mb-1">About this group</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {group.description}
                  </p>
                </div>
              )}

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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Sending...
                    </div>
                  ) : group.isPrivate ? (
                    "Request to Join"
                  ) : (
                    "Join Group"
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
