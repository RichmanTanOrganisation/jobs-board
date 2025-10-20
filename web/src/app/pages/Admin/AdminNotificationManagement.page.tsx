import React, { useState, useEffect } from 'react';
import { adminApi } from '@/api/admin';
import {
  Grid,
  Card,
  Modal,
  Button,
  Textarea,
  Group,
  Stack,
  Loader,
  Center,
  SimpleGrid,
  Text,
  TextInput,
  Select,
  Radio,
  Divider,
  Badge,
  Alert
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { toast } from 'react-toastify';
import { 
  IconBell, 
  IconUsers, 
  IconUser, 
  IconSend, 
  IconAlertCircle,
  IconInfoCircle
} from '@tabler/icons-react';
import SearchBar from '@/app/components/SearchBar/SearchBar';
import { FsaeRole } from '@/models/roles';

interface User {
  id: string;
  name: string;
  email: string;
  role: FsaeRole;
}

interface NotificationForm {
  title: string;
  content: string;
  targetType: 'everyone' | 'role' | 'individual';
  selectedRoles: string[];
  selectedUsers: string[];
  notificationType: 'notification' | 'announcement';
}

export function AdminNotificationManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [opened, { open, close }] = useDisclosure(false);
  const [isSending, setIsSending] = useState(false);
  
  const [form, setForm] = useState<NotificationForm>({
    title: '',
    content: '',
    targetType: 'everyone',
    selectedRoles: [],
    selectedUsers: [],
    notificationType: 'notification'
  });

  const roleOptions = [
    { value: FsaeRole.ADMIN, label: 'Admin' },
    { value: FsaeRole.MEMBER, label: 'Member' },
    { value: FsaeRole.ALUMNI, label: 'Alumni' },
    { value: FsaeRole.SPONSOR, label: 'Sponsor' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;
    if (search.trim() !== '') {
      filtered = users.filter(user => 
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredUsers(filtered);
  }, [users, search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Get all users from existing endpoints
      const [dashboardUsers, admins] = await Promise.all([
        adminApi.getDashboardRequests(), // Gets alumni, members, sponsors
        adminApi.getAdmins() // Gets admins
      ]);

      // Convert dashboard users (alumni, members, sponsors)
      const dashboardUsersFormatted = dashboardUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as FsaeRole,
        activated: true // Dashboard users are typically activated
      }));

      // Convert admin users
      const adminUsersFormatted = admins.map(admin => ({
        id: admin.id,
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        role: FsaeRole.ADMIN,
        activated: admin.activated
      }));

      // Combine all users
      const allUsers = [...dashboardUsersFormatted, ...adminUsersFormatted];
      setUsers(allUsers);
    } catch (error) {
      toast.error('Failed to fetch users');
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: keyof NotificationForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleToggle = (role: string) => {
    setForm(prev => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(role)
        ? prev.selectedRoles.filter(r => r !== role)
        : [...prev.selectedRoles, role]
    }));
  };

  const handleUserToggle = (userId: string) => {
    setForm(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId]
    }));
  };

  const handleSendNotification = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setIsSending(true);

      if (form.targetType === 'everyone') {
        // Send announcement to all roles
        await adminApi.announce(
          form.title,
          [FsaeRole.ADMIN, FsaeRole.MEMBER, FsaeRole.ALUMNI, FsaeRole.SPONSOR],
          form.content || undefined
        );
        toast.success('Announcement sent to all users');
      } else if (form.targetType === 'role') {
        if (form.selectedRoles.length === 0) {
          toast.error('Please select at least one role');
          return;
        }
        // Send announcement to selected roles
        await adminApi.announce(
          form.title,
          form.selectedRoles,
          form.content || undefined
        );
        toast.success(`Announcement sent to ${form.selectedRoles.length} role(s)`);
      } else if (form.targetType === 'individual') {
        if (form.selectedUsers.length === 0) {
          toast.error('Please select at least one user');
          return;
        }
        
        // Send notifications to all selected users
        const selectedUsers = users.filter(u => form.selectedUsers.includes(u.id));
        const notificationPromises = selectedUsers.map(user => 
          adminApi.notifyUser(
            user.id,
            user.role,
            form.title,
            form.content || undefined,
            form.notificationType
          )
        );
        
        await Promise.all(notificationPromises);
        toast.success(`Notifications sent to ${selectedUsers.length} user(s)`);
      }

      // Reset form and close modal
      setForm({
        title: '',
        content: '',
        targetType: 'everyone',
        selectedRoles: [],
        selectedUsers: [],
        notificationType: 'notification'
      });
      close();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send notification';
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
      
    }
  };

  const handleCloseModal = () => {
    setForm({
      title: '',
      content: '',
      targetType: 'everyone',
      selectedRoles: [],
      selectedUsers: [],
      notificationType: 'notification'
    });
    close();
  };

  if (loading) {
    return (
      <Grid justify="center" align="flex-start">
        <Grid.Col span={12} px={40}>
          <Center h={300}>
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Text size="lg">Loading users...</Text>
            </Stack>
          </Center>
        </Grid.Col>
      </Grid>
    );
  }

  return (
    <>
      <Grid justify="center" align="flex-start">
        <Grid.Col span={12} px={40}>
          <Group justify="space-between" mb="md">
            <div style={{ flex: 1 }}>
              <SearchBar
                search={search}
                setSearch={setSearch}
                title="Notification Management"
                placeholder="Search Users"
              />
            </div>
            <Button
              leftSection={<IconBell size={16} />}
              onClick={open}
              mt="xl"
            >
              Send Notification
            </Button>
          </Group>

          <Alert icon={<IconInfoCircle size={16} />} title="Notification Management" color="blue" mb="md">
            Send notifications to specific users, roles, or everyone. Use announcements for broad communications and individual notifications for targeted messages.
          </Alert>

          {filteredUsers.length === 0 ? (
            <Center py={80}>
              <Stack align="center" gap="md">
                <IconUsers size={64} color="var(--mantine-color-gray-5)" />
                <Text size="xl" fw={600}>No Users Found</Text>
                <Text c="dimmed">There are no users to display.</Text>
              </Stack>
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mt="md">
              {filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                >
                  <Group justify="space-between" mb="md">
                    <Group gap="xs">
                      <IconUser size={20} />
                      <Text fw={600} size="lg">
                        {user.name}
                      </Text>
                    </Group>
                    <Badge color="blue" variant="light">
                      {user.role}
                    </Badge>
                  </Group>

                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      {user.email}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Grid.Col>
      </Grid>

      {/* Send Notification Modal */}
      <Modal
        opened={opened}
        onClose={handleCloseModal}
        title={
          <Group gap="xs">
            <IconBell size={20} />
            <Text fw={600}>Send Notification</Text>
          </Group>
        }
        size="lg"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Title"
            placeholder="Enter notification title"
            value={form.title}
            onChange={(e) => handleFormChange('title', e.currentTarget.value)}
            required
          />

          <Textarea
            label="Content (Optional)"
            placeholder="Enter notification content"
            value={form.content}
            onChange={(e) => handleFormChange('content', e.currentTarget.value)}
            rows={3}
            autosize
            minRows={3}
            maxRows={6}
          />

          <div>
            <Text size="sm" fw={500} mb="xs">
              Notification Type
            </Text>
            <Radio.Group
              value={form.notificationType}
              onChange={(value) => handleFormChange('notificationType', value)}
            >
              <Stack gap="xs">
                <Radio value="notification" label="Individual Notification" />
                <Radio value="announcement" label="Announcement" />
              </Stack>
            </Radio.Group>
          </div>

          <div>
            <Text size="sm" fw={500} mb="xs">
              Target Audience
            </Text>
            <Radio.Group
              value={form.targetType}
              onChange={(value) => handleFormChange('targetType', value)}
            >
              <Stack gap="md">
                <Radio value="everyone" label="Everyone" />
                
                <Radio value="role" label="Specific Roles" />
                {form.targetType === 'role' && (
                  <div style={{ marginLeft: 20 }}>
                    <Text size="sm" c="dimmed" mb="xs">Select roles:</Text>
                    <Stack gap="xs">
                      {roleOptions.map(role => (
                        <label key={role.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={form.selectedRoles.includes(role.value)}
                            onChange={() => handleRoleToggle(role.value)}
                          />
                          <Text size="sm">{role.label}</Text>
                        </label>
                      ))}
                    </Stack>
                  </div>
                )}

                <Radio value="individual" label="Individual Users" />
                {form.targetType === 'individual' && (
                  <div style={{ marginLeft: 20 }}>
                    <Text size="sm" c="dimmed" mb="xs">Select users:</Text>
                    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px', padding: '8px' }}>
                      {users.map(user => (
                        <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                          <input
                            type="checkbox"
                            checked={form.selectedUsers.includes(user.id)}
                            onChange={() => handleUserToggle(user.id)}
                          />
                          <div style={{ flex: 1 }}>
                            <Text size="sm" fw={500}>{user.name}</Text>
                            <Text size="xs" c="dimmed">{user.email} • {user.role}</Text>
                          </div>
                        </label>
                      ))}
                    </div>
                    {form.selectedUsers.length > 0 && (
                      <Text size="sm" c="blue" mt="xs">
                        {form.selectedUsers.length} user(s) selected
                      </Text>
                    )}
                  </div>
                )}
              </Stack>
            </Radio.Group>
          </div>

          <Divider />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              leftSection={<IconSend size={16} />}
              onClick={handleSendNotification}
              disabled={isSending}
              loading={isSending}
            >
              Send Notification
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
