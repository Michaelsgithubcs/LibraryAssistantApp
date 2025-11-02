import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addNotification, markAsRead as markAsReadAction } from '../store/slices/notificationSlice';
import NotificationCenter from './NotificationCenter';
import NotificationService from '../services/NotificationService';

import { Notification, NotificationBase } from '../store/slices/notificationSlice';

interface NotificationContextType {
  showNotification: (title: string, message: string, data?: any) => void;
  showNotificationCenter: () => void;
  notifications: Notification[];
  markAsRead: (id: string) => void;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  unreadCount: number;
  refreshNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

type NotificationProviderProps = {
  children: React.ReactNode;
};

const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const dispatch = useDispatch();
  const { notifications: reduxNotifications, unreadCount } = useSelector((state: RootState) => state.notifications);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Sync with Redux
  useEffect(() => {
    setNotifications(reduxNotifications);
  }, [reduxNotifications]);

  const markAsRead = useCallback((id: string) => {
    // This will update the Redux store via the notificationSlice
    dispatch(markAsReadAction(id));
  }, [dispatch]);

  // Show notification center
  const showNotificationCenter = useCallback(() => {
    setIsNotificationVisible(true);
  }, []);

  // Show a notification
  const showNotification = useCallback(async (title: string, message: string, data?: any) => {
    const notification = {
      id: Date.now().toString(),
      type: data?.type || 'reservation',
      title,
      message,
      timestamp: data?.timestamp || new Date().toISOString(),
      data
    };
    
    // Add to Redux store
    dispatch(addNotification(notification));
    
    // Save to backend database for persistence
    try {
      const { notificationApi } = await import('../services/api');
      const userData = data?.userId || data?.user_id;
      if (userData) {
        await notificationApi.createNotification(userData, {
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: JSON.stringify(notification.data || {}),
          timestamp: notification.timestamp,
        });
        console.log('Notification saved to backend database');
      }
    } catch (error) {
      console.error('Failed to save notification to backend:', error);
    }
    
    // Show system notification
    NotificationService.showLocalNotification({
      title,
      message,
      data
    });
  }, [dispatch]);

  // Initialize notification service
  useEffect(() => {
    // Initialize notification service
    try {
      NotificationService.configure();
      
      // Set up notification handlers for both in-app and push notifications
      NotificationService.setNotificationHandler((notification) => {
        console.log("Received notification:", notification);
        showNotification(notification.title, notification.message, notification.data);
      });
      
      // Check for unread notifications at regular intervals (every 5 minutes)
      const checkInterval = setInterval(() => {
        try {
          // If there are unread notifications, refresh notification badge
          if (unreadCount > 0) {
            console.log(`Refreshing notification badge: ${unreadCount} unread notifications`);
            // Force a re-render to ensure the badge is displayed
            setNotifications(prevNotifications => [...prevNotifications]);
          }
        } catch (error) {
          console.error("Error in notification check interval:", error);
        }
      }, 5 * 60 * 1000);
      
      return () => {
        try {
          NotificationService.cleanup();
          clearInterval(checkInterval);
        } catch (error) {
          console.error("Error cleaning up notifications:", error);
        }
      };
    } catch (error) {
      console.error("Error initializing notification service:", error);
      return () => {}; // Empty cleanup function in case of error
    }
  }, [showNotification, unreadCount]);

  // Function to refresh the notification state
  const refreshNotifications = useCallback(() => {
    console.log("Manually refreshing notifications state");
    setNotifications([...reduxNotifications]);
  }, [reduxNotifications]);

  const contextValue = {
    showNotification,
    showNotificationCenter,
    notifications,
    markAsRead,
    setNotifications,
    unreadCount,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      <View style={{ flex: 1 }}>
        {children}
        <NotificationCenter 
          isVisible={isNotificationVisible} 
          onClose={() => setIsNotificationVisible(false)} 
        />
      </View>
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;
