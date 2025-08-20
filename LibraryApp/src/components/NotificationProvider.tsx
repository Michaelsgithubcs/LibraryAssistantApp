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
  const showNotification = useCallback((title: string, message: string, data?: any) => {
    const notification = {
      id: Date.now().toString(),
      type: data?.type || 'info',
      title,
      message,
      timestamp: new Date().toISOString(),
      data
    };
    
    // Add to Redux store
    dispatch(addNotification(notification));
    
    // Show system notification
    NotificationService.showLocalNotification({
      title,
      message,
      data
    });
  }, [dispatch]);

  // Initialize notification service
  useEffect(() => {
    NotificationService.configure();
    
    // Set up notification handlers
    NotificationService.setNotificationHandler((notification) => {
      showNotification(notification.title, notification.message, notification.data);
    });
    
    return () => {
      NotificationService.cleanup();
    };
  }, [showNotification]);

  const contextValue = {
    showNotification,
    showNotificationCenter,
    notifications,
    markAsRead,
    setNotifications,
    unreadCount
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
