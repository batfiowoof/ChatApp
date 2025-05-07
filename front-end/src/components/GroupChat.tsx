import React, { useEffect, useState, useRef } from "react";
import {
  Avatar,
  Button,
  Divider,
  Input,
  List,
  Modal,
  Popover,
  Tooltip,
  message,
} from "antd";
import {
  SendOutlined,
  InfoCircleOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import useChatStore from "@/store/useChatStore";
import type { GroupInfo, GroupMember } from "@/store/useChatStore";

interface GroupChatProps {
  groupId: string;
}

const GroupChat: React.FC<GroupChatProps> = ({ groupId }) => {
  const [messageText, setMessageText] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Access store state and methods
  const { messages, groups, sendGroupMessage, fetchGroupMembers } =
    useChatStore();

  // Find the current group
  const currentGroup = groups.find((g) => g.id === groupId);

  // Filter messages for this group
  const groupMessages = messages.filter(
    (m) => m.isGroupMessage && m.groupId === groupId
  );

  // Load group members when opened
  useEffect(() => {
    const loadMembers = async () => {
      if (!groupId) return;

      setLoading(true);
      try {
        const members = await fetchGroupMembers(groupId);
        setGroupMembers(members);
      } catch (error) {
        console.error("Failed to load members:", error);
        message.error("Failed to load group members");
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [groupId, fetchGroupMembers]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = () => {
    if (messageText.trim() && groupId) {
      sendGroupMessage(groupId, messageText.trim());
      setMessageText("");
    }
  };

  // Handle keyboard event to send message on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Render member role as text
  const renderRole = (role: number) => {
    switch (role) {
      case 2:
        return "Owner";
      case 1:
        return "Admin";
      default:
        return "Member";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Group header */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 border-b">
        <div className="flex items-center">
          <Avatar
            icon={<TeamOutlined />}
            src={currentGroup?.imageUrl}
            className="mr-2"
            size="large"
          />
          <div>
            <h3 className="text-lg font-semibold m-0">{currentGroup?.name}</h3>
            <p className="text-xs text-gray-500 m-0">
              {currentGroup?.memberCount} members
            </p>
          </div>
        </div>
        <Tooltip title="Group Info">
          <Button
            type="text"
            shape="circle"
            icon={<InfoCircleOutlined />}
            onClick={() => setShowMembers(true)}
          />
        </Tooltip>
      </div>

      {/* Chat messages area */}
      <div className="flex-grow overflow-y-auto p-4">
        {groupMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <TeamOutlined style={{ fontSize: "48px", marginBottom: "16px" }} />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupMessages.map((message) => (
              <div
                key={message.id}
                className={`
                  flex items-start 
                  ${message.sender === "System" ? "justify-center" : ""}
                `}
              >
                {message.sender !== "System" && (
                  <Avatar icon={<UserOutlined />} className="mr-2 mt-1" />
                )}
                <div
                  className={`
                    p-3 rounded-lg max-w-[80%]
                    ${
                      message.sender === "System"
                        ? "bg-gray-200 dark:bg-gray-700 text-center text-sm py-1 px-3"
                        : "bg-blue-100 dark:bg-blue-800"
                    }
                  `}
                >
                  {message.sender !== "System" && (
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      {message.sender}
                    </p>
                  )}
                  <p className="m-0 break-words">{message.content}</p>
                  <span className="text-xs text-gray-500 block text-right mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <div className="border-t p-3">
        <div className="flex items-center">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-grow"
            maxLength={500}
            autoComplete="off"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="ml-2"
          />
        </div>
      </div>

      {/* Members modal */}
      <Modal
        title={`${currentGroup?.name} - Members (${groupMembers.length})`}
        open={showMembers}
        onCancel={() => setShowMembers(false)}
        footer={null}
      >
        <List
          loading={loading}
          dataSource={groupMembers}
          renderItem={(member) => (
            <List.Item className="flex items-center">
              <div className="flex items-center flex-grow">
                <Avatar
                  icon={<UserOutlined />}
                  src={member.profilePictureUrl}
                  className="mr-3"
                />
                <div>
                  <p className="m-0 font-medium">{member.username}</p>
                  <p className="text-xs text-gray-500 m-0">
                    {renderRole(member.role)} · Joined{" "}
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default GroupChat;
