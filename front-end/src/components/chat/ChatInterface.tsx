"use client";

import { useState, useEffect, useRef } from "react";
import { chatConnection } from "./ChatConnection";
import ChatMessage from "./ChatMessage";
import { HubConnection } from "@microsoft/signalr";

interface UserInfo {
  userId: string;
  username: string;
}

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  isPrivate: boolean;
  receiverId?: string;
}

export default function ChatInterface() {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Connect to SignalR hub on component mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Not authenticated. Please log in.");
      return;
    }

    const connectToHub = async () => {
      try {
        const conn = await chatConnection.connect(token);
        setConnection(conn);
        setIsConnected(true);

        // Set up message handlers
        conn.on(
          "ReceiveMessage",
          (username: string, messageContent: string) => {
            const newMessage: Message = {
              id: Date.now().toString(),
              content: messageContent,
              sender: username,
              timestamp: new Date(),
              isPrivate: false,
            };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
          }
        );

        conn.on(
          "ReceivePrivateMessage",
          (username: string, messageContent: string) => {
            const newMessage: Message = {
              id: Date.now().toString(),
              content: messageContent,
              sender: username,
              timestamp: new Date(),
              isPrivate: true,
            };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
          }
        );

        conn.on("UpdateUserList", (userList: UserInfo[]) => {
          setUsers(userList);
        });

        conn.on("UserNotConnected", (errorMessage: string) => {
          setError(`Error: ${errorMessage}`);
          setTimeout(() => setError(""), 5000);
        });

        // Extract username from JWT token
        const payload = token.split(".")[1];
        const decodedPayload = JSON.parse(atob(payload));
        setCurrentUsername(decodedPayload.unique_name || "Unknown");
      } catch (err) {
        console.error("Error connecting to chat hub:", err);
        setError("Failed to connect to chat. Please try again later.");
      }
    };

    connectToHub();

    return () => {
      // Disconnect when component unmounts
      chatConnection.disconnect();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendPublicMessage = async () => {
    if (!message.trim() || !connection || !isConnected) return;

    try {
      await connection.invoke("SendPublicMessage", message);
      setMessage("");
    } catch (err) {
      console.error("Error sending public message:", err);
      setError("Failed to send message. Please try again.");
    }
  };

  const sendPrivateMessage = async () => {
    if (!message.trim() || !connection || !isConnected || !selectedUser) return;

    try {
      await connection.invoke("SendPrivateMessage", selectedUser, message);

      // Add the message to our local state since we won't receive it back from the server
      const newMessage: Message = {
        id: Date.now().toString(),
        content: message,
        sender: currentUsername,
        timestamp: new Date(),
        isPrivate: true,
        receiverId: selectedUser,
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);

      setMessage("");
    } catch (err) {
      console.error("Error sending private message:", err);
      setError("Failed to send private message. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedUser) {
        sendPrivateMessage();
      } else {
        sendPublicMessage();
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-200px)] gap-4">
      {/* User list */}
      <div className="w-full md:w-1/4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 overflow-hidden flex flex-col">
        <h2 className="text-lg font-semibold mb-3 text-primary-600">
          Users Online
        </h2>
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
            {users.map((user) => (
              <li key={user.userId}>
                <button
                  onClick={() => setSelectedUser(user.userId)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedUser === user.userId
                      ? "bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {user.username}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Chat area */}
      <div className="w-full md:w-3/4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-3 text-primary-600">
          {selectedUser
            ? `Private Chat with ${
                users.find((u) => u.userId === selectedUser)?.username || "User"
              }`
            : "Public Chat"}
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {!isConnected && !error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded mb-4">
            Connecting to chat server...
          </div>
        )}

        {/* Messages area */}
        <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages
              .filter((msg) =>
                !selectedUser
                  ? !msg.isPrivate
                  : msg.isPrivate &&
                    (msg.receiverId === selectedUser ||
                      msg.sender ===
                        users.find((u) => u.userId === selectedUser)?.username)
              )
              .map((msg) => (
                <ChatMessage
                  key={msg.id}
                  content={msg.content}
                  sender={msg.sender}
                  isCurrentUser={msg.sender === currentUsername}
                  timestamp={new Date(msg.timestamp)}
                  isPrivate={msg.isPrivate}
                />
              ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex items-center">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Type a message to ${
              selectedUser
                ? users.find((u) => u.userId === selectedUser)?.username
                : "everyone"
            }`}
            className="input-field flex-grow resize-none h-12 py-2"
            disabled={!isConnected}
          />
          <button
            onClick={selectedUser ? sendPrivateMessage : sendPublicMessage}
            disabled={!message.trim() || !isConnected}
            className="btn-primary ml-2"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
