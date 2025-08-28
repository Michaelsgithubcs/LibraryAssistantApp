import PushNotification, { PushNotification as PN } from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';
import { store, type AppDispatch } from '../store';
import { addNotification } from '../store/slices/notificationSlice';

export interface NotificationData {
  title: string;
  message: string;
  data?: any;
}

type NotificationHandler = (notification: NotificationData) => void;

// Extend the PushNotification type to include the missing methods
declare module 'react-native-push-notification' {
  interface PushNotification {
    configure(options: any): void;
    createChannel(
      channel: {
        channelId: string;
        channelName: string;
        channelDescription?: string;
        soundName?: string;
        importance?: number;
        vibrate?: boolean;
      },
      created: (created: boolean) => void
    ): void;
    localNotification(details: any): void;
    cancelAllLocalNotifications(): void;
    removeAllDeliveredNotifications(): void;
  }
}

class NotificationService {
  private notificationHandlers: NotificationHandler[] = [];
  
  constructor() {
    this.configure();
  }

  configure = () => {
    try {
      // Configure push notifications
      PushNotification.configure({
        // Called when token is generated
        onRegister: (token: any) => {
          console.log('TOKEN:', token);
        },
        // Called when a notification is received
        onNotification: (notification: any) => {
          console.log('NOTIFICATION:', notification);
          
          // Call notification handlers
          this.notificationHandlers.forEach(handler => 
            handler({
              title: notification.title || 'New Notification',
              message: notification.message || '',
              data: notification.data
            })
          );
          
          // Required for iOS
          if (Platform.OS === 'ios') {
            notification.finish(PushNotificationIOS.FetchResult.NoData);
          }
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        popInitialNotification: true,
        requestPermissions: Platform.OS === 'ios',
      });

      // Create notification channel for Android
      if (Platform.OS === 'android') {
        PushNotification.createChannel(
          {
            channelId: 'library-notifications',
            channelName: 'Library Notifications',
            channelDescription: 'Notifications for library activities',
            soundName: 'default',
            importance: 4, // Importance.HIGH
            vibrate: true,
          },
          (created: boolean) => console.log(`Channel created: ${created}`)
        );
      }
    } catch (error) {
      console.error('Error configuring notifications:', error);
    }
  };

  // Show local notification
  showLocalNotification = ({ title, message, data = {} }: NotificationData) => {
    this.localNotification(title, message, data);
  };

  // Enhanced local notification
  localNotification = (title: string, message: string, data: { type?: string; [key: string]: any } = {}) => {
    // Generate a unique ID for the notification
    const notificationId = Date.now().toString();
    
    // Create notification object matching NotificationBase
    const notification = {
      id: notificationId,
      type: data.type || 'info', // Default to 'info' if type not provided
      title,
      message,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        notificationId // Include the ID in the data for tracking
      },
    };
    
    console.log(`Creating notification: ${title} (${notificationId})`);
    
    // Add to Redux store for in-app notifications
    (store.dispatch as AppDispatch)(
      addNotification(notification)
    );

    try {
      // Show push notification with enhanced properties
      PushNotification.localNotification({
        channelId: 'library-notifications',
        id: parseInt(notificationId.slice(-8), 10), // Use last 8 digits of ID as numeric ID
        title,
        message,
        playSound: true,
        soundName: 'default',
        importance: 4, // HIGH
        priority: 'high',
        visibility: 'public',
        vibrate: true,
        badge: (store.getState().notifications?.unreadCount || 0) + 1, // Update badge count
        userInfo: { 
          notificationId,
          ...data
        }, // For iOS notification tracking
        ...data,
      } as any); // Type assertion needed due to library type definitions
      
      console.log(`Push notification sent: ${title} (${notificationId})`);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  };

  // Schedule a local notification
  scheduleNotification = (title: string, message: string, date: Date, data = {}) => {
    PushNotification.localNotificationSchedule({
      channelId: 'library-notifications',
      title,
      message,
      date,
      allowWhileIdle: true,
      importance: 4, // HIGH
      priority: 'high',
      visibility: 'public',
      ...data,
    } as any); // Type assertion needed due to library type definitions
  };

  // Notification for when a book is issued
  notifyBookIssued = (bookTitle: string, dueDate: Date) => {
    this.localNotification(
      'Book Issued',
      `You have successfully issued "${bookTitle}". Due date: ${dueDate.toDateString()}`,
      {
        type: 'book_issued',
        bookTitle,
        dueDate: dueDate.toISOString(),
      }
    );

    // Schedule reminder 3 days before due date
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 3);
    
    if (reminderDate > new Date()) {
      this.scheduleNotification(
        'Due Date Reminder',
        `Your book "${bookTitle}" is due in 3 days. Don't forget to return it on time!`,
        reminderDate,
        {
          type: 'due_reminder',
          bookTitle,
          dueDate: dueDate.toISOString(),
        }
      );
    }
  };

  // Notification for when a book is returned
  notifyBookReturned = (bookTitle: string, fine: number = 0) => {
    const message = fine > 0 
      ? `"${bookTitle}" has been returned. Fine: $${fine.toFixed(2)}`
      : `"${bookTitle}" has been successfully returned. Thank you!`;

    this.localNotification(
      'Book Returned',
      message,
      {
        type: 'book_returned',
        bookTitle,
        fine,
      }
    );
  };

  // Notification for when a reservation is available
  notifyReservationAvailable = (bookTitle: string) => {
    this.localNotification(
      'Reservation Available',
      `"${bookTitle}" is now available for you to borrow. Please collect it within 48 hours.`,
      {
        type: 'reservation_available',
        bookTitle,
      }
    );
  };

  // Notification for overdue books
  notifyOverdueBook = (bookTitle: string, daysOverdue: number, fine: number) => {
    this.localNotification(
      'Overdue Book',
      `Your book "${bookTitle}" is ${daysOverdue} days overdue. Current fine: $${fine.toFixed(2)}`,
      {
        type: 'overdue_book',
        bookTitle,
        daysOverdue,
        fine,
      }
    );
  };

  // Notification for new books matching user preferences
  notifyNewArrival = (bookTitle: string, author: string, category: string) => {
    this.localNotification(
      'New Book Arrival',
      `New book in ${category}: "${bookTitle}" by ${author} is now available.`,
      {
        type: 'new_arrival',
        bookTitle,
        author,
        category,
      }
    );
  };

  // Clear all delivered notifications
  clearDelivered = () => {
    PushNotification.removeAllDeliveredNotifications();
  };

  // Cancel all scheduled notifications
  cancelAll = () => {
    PushNotification.cancelAllLocalNotifications();
  };

  // Set up notification handler
  setNotificationHandler = (handler: NotificationHandler) => {
    this.notificationHandlers.push(handler);
    return () => {
      this.notificationHandlers = this.notificationHandlers.filter(h => h !== handler);
    };
  };

  // Cleanup resources
  cleanup = () => {
    // Remove all notification handlers
    this.notificationHandlers = [];
    
    // Cancel all scheduled notifications
    PushNotification.cancelAllLocalNotifications();
    
    // Remove all delivered notifications
    PushNotification.removeAllDeliveredNotifications();
    
    // Remove all delivered notifications (iOS specific)
    if (Platform.OS === 'ios') {
      PushNotificationIOS.removeAllDeliveredNotifications();
    }
  };
  
  // Reset badge count
  resetBadgeCount = () => {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(0);
    } else {
      // For Android
      PushNotification.setApplicationIconBadgeNumber(0);
    }
  };

  // Show notification to user and call handlers
  private handleNotification = (notification: NotificationData) => {
    // Call all registered handlers
    this.notificationHandlers.forEach(handler => handler(notification));
  };
}

export default new NotificationService();
