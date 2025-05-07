import React, { useState, useEffect } from "react";
import {
  Button,
  Form,
  Input,
  List,
  Modal,
  Tabs,
  Card,
  Avatar,
  Tooltip,
  Popconfirm,
  message,
  Empty,
} from "antd";
import {
  PlusOutlined,
  TeamOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
} from "@ant-design/icons";
import useChatStore from "@/store/useChatStore";
import type { GroupInfo } from "@/store/useChatStore";

const { TabPane } = Tabs;

const GroupManagement: React.FC = () => {
  // State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // Get store data and methods
  const {
    groups,
    createGroup,
    updateGroup,
    deleteGroup,
    joinGroup,
    leaveGroup,
    fetchGroups,
  } = useChatStore();

  // Filter groups by membership
  const myGroups = groups.filter((group) => group.isMember);
  const availableGroups = groups.filter((group) => !group.isMember);

  // Initial load
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Handle creating a group
  const handleCreateGroup = async (values: {
    name: string;
    description: string;
  }) => {
    try {
      await createGroup(values.name, values.description);
      setCreateModalVisible(false);
      form.resetFields();
      message.success("Group created successfully!");
    } catch (error) {
      console.error("Failed to create group:", error);
      message.error("Failed to create group");
    }
  };

  // Handle updating a group
  const handleUpdateGroup = async (values: {
    name: string;
    description: string;
  }) => {
    if (!selectedGroup) return;

    try {
      await updateGroup(selectedGroup.id, values.name, values.description);
      setEditModalVisible(false);
      editForm.resetFields();
      message.success("Group updated successfully!");
    } catch (error) {
      console.error("Failed to update group:", error);
      message.error("Failed to update group");
    }
  };

  // Handle deleting a group
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      message.success("Group deleted successfully!");
    } catch (error) {
      console.error("Failed to delete group:", error);
      message.error("Failed to delete group");
    }
  };

  // Open edit modal with group data
  const openEditModal = (group: GroupInfo) => {
    setSelectedGroup(group);
    editForm.setFieldsValue({
      name: group.name,
      description: group.description,
    });
    setEditModalVisible(true);
  };

  // Check if user is owner
  const isOwner = (group: GroupInfo) => group.userRole === 2;

  // Check if user is admin
  const isAdmin = (group: GroupInfo) => group.userRole === 1 || isOwner(group);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Groups</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          Create Group
        </Button>
      </div>

      <Tabs defaultActiveKey="myGroups">
        <TabPane tab="My Groups" key="myGroups">
          {myGroups.length === 0 ? (
            <Empty description="You haven't joined any groups yet" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map((group) => (
                <Card
                  key={group.id}
                  className="h-full"
                  actions={[
                    isAdmin(group) && (
                      <Tooltip title="Edit Group">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => openEditModal(group)}
                        />
                      </Tooltip>
                    ),
                    isOwner(group) && (
                      <Popconfirm
                        title="Delete this group?"
                        description="All messages will be permanently deleted."
                        onConfirm={() => handleDeleteGroup(group.id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Tooltip title="Delete Group">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Tooltip>
                      </Popconfirm>
                    ),
                    !isOwner(group) && (
                      <Popconfirm
                        title="Leave this group?"
                        onConfirm={() => leaveGroup(group.id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Tooltip title="Leave Group">
                          <Button type="text" icon={<UserDeleteOutlined />} />
                        </Tooltip>
                      </Popconfirm>
                    ),
                  ].filter(Boolean)}
                >
                  <div className="flex items-center mb-4">
                    <Avatar
                      size="large"
                      icon={<TeamOutlined />}
                      src={group.imageUrl}
                      className="mr-3"
                    />
                    <div>
                      <h3 className="text-lg font-medium m-0">{group.name}</h3>
                      <p className="text-xs text-gray-500">
                        {group.memberCount} members
                      </p>
                    </div>
                  </div>
                  {group.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabPane>

        <TabPane tab="Browse Groups" key="availableGroups">
          {availableGroups.length === 0 ? (
            <Empty description="No available groups to join" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableGroups.map((group) => (
                <Card key={group.id} className="h-full">
                  <div className="flex items-center mb-4">
                    <Avatar
                      size="large"
                      icon={<TeamOutlined />}
                      src={group.imageUrl}
                      className="mr-3"
                    />
                    <div>
                      <h3 className="text-lg font-medium m-0">{group.name}</h3>
                      <p className="text-xs text-gray-500">
                        {group.memberCount} members
                      </p>
                    </div>
                  </div>
                  {group.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={() => joinGroup(group.id)}
                    block
                  >
                    Join Group
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabPane>
      </Tabs>

      {/* Create Group Modal */}
      <Modal
        title="Create New Group"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateGroup}>
          <Form.Item
            name="name"
            label="Group Name"
            rules={[{ required: true, message: "Please enter a group name" }]}
          >
            <Input placeholder="Enter a name for your group" maxLength={50} />
          </Form.Item>

          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea
              placeholder="What's this group about?"
              maxLength={200}
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button type="primary" htmlType="submit" block>
              Create Group
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        title="Edit Group"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateGroup}>
          <Form.Item
            name="name"
            label="Group Name"
            rules={[{ required: true, message: "Please enter a group name" }]}
          >
            <Input placeholder="Enter a name for your group" maxLength={50} />
          </Form.Item>

          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea
              placeholder="What's this group about?"
              maxLength={200}
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button type="primary" htmlType="submit" block>
              Update Group
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GroupManagement;
