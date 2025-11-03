import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationBase {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

export interface Notification extends NotificationBase {
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<NotificationBase>) => {
      const notification: Notification = {
        ...action.payload,
        read: false,
      };
      state.notifications.unshift(notification);
      state.unreadCount += 1;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount -= 1;
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        if (!notification.read) {
          notification.read = true;
        }
      });
      state.unreadCount = 0;
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      // Directly set unread count from backend or recomputation
      state.unreadCount = Math.max(0, action.payload);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        if (!state.notifications[index].read) {
          state.unreadCount -= 1;
        }
        state.notifications.splice(index, 1);
      }
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
});

export const { 
  addNotification, 
  markAsRead, 
  markAllAsRead, 
  setUnreadCount,
  removeNotification, 
  clearAllNotifications 
} = notificationSlice.actions;

export default notificationSlice.reducer;
