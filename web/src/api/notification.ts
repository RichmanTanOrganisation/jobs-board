import { apiInstance } from './ApiInstance';
import { Role } from '@/app/type/role';
import { Notification } from '@/models/notification';

export type NotificationSummary = {
  notifications: Notification[];
  hasUnread: boolean;
  unreadCount: number;
};

export type AnnouncementSummary = {
  announcements: Notification[];
  hasUnread: boolean;
  unreadCount: number;
};

export const notificationApi = {
  async getNotifications(role: Role, id: string) {
    const { data } = await apiInstance.get<NotificationSummary>(
      `/user/${role}/notifications/${id}`
    );
    return data;
  },
  async getAnnouncements(role: Role) {
    const { data } = await apiInstance.get<AnnouncementSummary>(`/user/${role}/announcements`);
    return data;
  },
  async markAsRead(role: Role, id: string) {
    await apiInstance.patch(`/user/${role}/notifications/${id}/read-all`);
  },
  async ackAnnouncements(role: Role) {
    await apiInstance.post(`/user/${role}/announcements/ack`);
  },
};
