"use client";

import useChatStore from "@/store/useChatStore";

interface UserListProps {
  title?: string;
}

export default function UserList({ title = "Users Online" }: UserListProps) {
  const {
    users,
    selectedUser,
    setSelectedUser,
    currentUsername,
    usersWithUnreadMessages,
  } = useChatStore();

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
            .filter((user) => user.username !== currentUsername)
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
                  <span
                    className="h-2 w-2 rounded-full bg-green-500 mr-2"
                    title="Online"
                  ></span>
                  <span className="flex-1">{user.username}</span>

                  {/* Show unread message indicator */}
                  {usersWithUnreadMessages.has(user.userId) && (
                    <span
                      className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                      title="Unread messages"
                    >
                      !
                    </span>
                  )}
                </button>
              </li>
            ))}
          {/* Show current user with different styling */}
          {currentUsername && (
            <li className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="px-3 py-2 flex items-center text-gray-500">
                <span
                  className="h-2 w-2 rounded-full bg-green-500 mr-2"
                  title="Online"
                ></span>
                <span>{currentUsername}</span>
                <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  You
                </span>
              </div>
            </li>
          )}
        </ul>

        {/* Show empty state if no other users */}
        {users.filter((user) => user.username !== currentUsername).length ===
          0 && (
          <div className="text-center text-gray-500 mt-4">
            No other users online
          </div>
        )}
      </div>
    </div>
  );
}
