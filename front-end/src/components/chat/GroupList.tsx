"use client";

import { useState } from "react";
import useChatStore from "@/store/useChatStore";
import Image from "next/image";
import CreateGroupModal from "./CreateGroupModal";

interface GroupListProps {
  title?: string;
}

export default function GroupList({ title = "Groups" }: GroupListProps) {
  const {
    groups,
    selectedGroup,
    setSelectedGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    currentUsername,
    groupsWithUnreadMessages,
  } = useChatStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Group the groups into categories: My Groups and Available Groups
  const myGroups = groups.filter((g) => g.isMember);
  const availableGroups = groups.filter((g) => !g.isMember);

  // Function to handle group action (join/leave/delete)
  const handleGroupAction = async (
    groupId: string,
    action: "join" | "leave" | "delete"
  ) => {
    try {
      if (action === "join") {
        await joinGroup(groupId);
      } else if (action === "leave") {
        await leaveGroup(groupId);
      } else if (action === "delete") {
        if (confirm("Are you sure you want to delete this group?")) {
          await deleteGroup(groupId);
        }
      }
    } catch (error) {
      console.error(`Error performing ${action} action:`, error);
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-primary-600">{title}</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold"
          title="Create New Group"
        >
          +
        </button>
      </div>

      <div className="overflow-y-auto flex-grow">
        {/* My Groups Section */}
        {myGroups.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              My Groups
            </h3>
            <ul className="space-y-2 mb-4">
              {myGroups.map((group) => (
                <li key={group.id}>
                  <div
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between ${
                      selectedGroup === group.id
                        ? "bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    } cursor-pointer`}
                  >
                    <div
                      className="flex items-center flex-1 truncate"
                      onClick={() => setSelectedGroup(group.id)}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden mr-3 bg-gray-300 flex-shrink-0 flex items-center justify-center">
                        {group.imageUrl ? (
                          <Image
                            src={group.imageUrl}
                            alt={group.name}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-600">
                            {group.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 truncate">
                        <span className="font-medium truncate">
                          {group.name}
                        </span>

                        {/* Unread messages indicator */}
                        {groupsWithUnreadMessages.has(group.id) && (
                          <span
                            className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                            title="Unread messages"
                          >
                            !
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      {/* The actions depend on the user's role in the group */}
                      {group.userRole === 2 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGroupAction(group.id, "delete");
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete Group"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGroupAction(group.id, "leave");
                          }}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                          title="Leave Group"
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
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Available Groups Section */}
        {availableGroups.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Available Groups
            </h3>
            <ul className="space-y-2">
              {availableGroups.map((group) => (
                <li key={group.id}>
                  <div className="w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className="flex items-center flex-1 truncate">
                      <div className="w-8 h-8 rounded-full overflow-hidden mr-3 bg-gray-300 flex-shrink-0 flex items-center justify-center">
                        {group.imageUrl ? (
                          <Image
                            src={group.imageUrl}
                            alt={group.name}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-600">
                            {group.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">{group.name}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {group.description || `${group.memberCount} members`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleGroupAction(group.id, "join")}
                      className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm"
                    >
                      Join
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {groups.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
            No groups available. Create a new group to get started!
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
