import React, { useState, useEffect } from 'react';
import { useNotifications } from '../components/NotificationProvider';
import { Notification } from '../store/slices/notificationSlice';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, StatusBar, TouchableOpacity } from 'react-native';
import ReservationIcon from '../../assets/icons/notifications icons/reservation-notification.svg';
import DueDateIcon from '../../assets/icons/notifications icons/duedate-notification.svg';
import OverdueIcon from '../../assets/icons/notifications icons/overdue-notification.svg';
import FineIcon from '../../assets/icons/notifications icons/fines-notifications.svg';
import ReturnedIcon from '../../assets/icons/notifications icons/return-notification.svg';
import NewBookIcon from '../../assets/icons/notifications icons/bookadded-notification.svg';
import AllCaughtUpIcon from '../../assets/icons/notifications icons/allcoughtup.svg';
import { ModernCard } from '../components/ModernCard';
import { Button } from '../components/Button';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User } from '../types';
import { apiClient } from '../services/api';
import { useDispatch } from 'react-redux';
import { markAllAsRead } from '../store/slices/notificationSlice';

interface NotificationsScreenProps {
  user: User;
  navigation: any;
}

// Using Notification interface from notificationSlice

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ user, navigation }) => {
  const { notifications, markAsRead, setNotifications } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest'); // Default to newest first
  const dispatch = useDispatch();

  useEffect(() => {
    fetchNotifications();
    
    // Reduced polling to every 30 seconds to prevent conflicts with DashboardScreen (15s)
    // This prevents the infinite glitch from fighting updates
    const interval = setInterval(() => {
      console.log('Auto-fetching notifications...');
      fetchNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Mark all as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (notifications.some(n => !n.read)) {
        // Use the Redux action directly to mark all as read in one operation
        dispatch(markAllAsRead());
        
        // This will ensure the badge is also reset
        const NotificationService = require('../services/NotificationService').default;
        NotificationService.resetBadgeCount();
        
        console.log("Marked all notifications as read using Redux action");
      }
    }, [notifications, dispatch])
  );

  // Reset badge count when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Import here to avoid circular dependency
      const NotificationService = require('../services/NotificationService').default;
      
      // Reset badge count on app icon
      NotificationService.resetBadgeCount();
      
      console.log('NotificationsScreen focused - resetting badge count');
      
    }, [])
  );

  const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications data...');
      
      // First, load persisted notifications from backend database
      const { notificationApi } = await import('../services/api');
      const persistedNotifications = await notificationApi.getUserNotifications(user.id);
      console.log(`Loaded ${persistedNotifications.length} persisted notifications from database`);
      
      // Convert backend notifications to app format
      const backendNotifications: Notification[] = persistedNotifications.map((n: any) => ({
        id: `db-${n.id}`,
        type: n.type,
        title: n.title,
        message: n.message,
        timestamp: n.created_at,
        read: n.is_read === 1,
        data: n.data ? JSON.parse(n.data) : {}
      }));
      
      const [reservations, myBooks, fines, books] = await Promise.all([
        apiClient.getReservationStatus(user.id),
        apiClient.getMyBooks(user.id),
        apiClient.getMyFines(user.id),
        apiClient.getBooks()
      ]);

      const notificationList: Notification[] = [...backendNotifications];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Reservation notifications - ONLY from Redux store (added when user makes reservation)
      // Don't generate fake backend notifications for approved/rejected reservations
      // Those should be handled by push notifications or backend webhooks

      // Due date and overdue notifications
      myBooks.forEach((book) => {
        if (book.status === 'issued') {
          const dueDate = new Date(book.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 2) {
            // Calculate when this notification should have been sent (2 days before due date)
            const notificationDate = new Date(book.due_date);
            notificationDate.setDate(notificationDate.getDate() - 2);
            
            const notification = {
              id: `due-soon-2-${book.id}`,
              type: 'due_soon',
              title: 'Book Due in 2 Days',
              message: `"${book.title}" is due in 2 days (${new Date(book.due_date).toLocaleDateString()}). Please return it on time to avoid fines.`,
              timestamp: notificationDate.toISOString(),
              read: false,
              data: book
            };
            notificationList.push(notification);
          } else if (diffDays === 1) {
            // Calculate when this notification should have been sent (1 day before due date)
            const notificationDate = new Date(book.due_date);
            notificationDate.setDate(notificationDate.getDate() - 1);
            
            const notification = {
              id: `due-soon-1-${book.id}`,
              type: 'due_soon',
              title: 'Book Due Tomorrow',
              message: `"${book.title}" is due tomorrow (${new Date(book.due_date).toLocaleDateString()}). Please return it to avoid fines.`,
              timestamp: notificationDate.toISOString(),
              read: false,
              data: book
            };
            notificationList.push(notification);
          } else if (diffDays < 0) {
            const daysOverdue = Math.abs(diffDays);
            const fineAmount = daysOverdue * 5.00;
            
            const notification = {
              id: `overdue-${book.id}`,
              type: 'overdue',
              title: 'Book Overdue!',
              message: `"${book.title}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. Fine: R${fineAmount.toFixed(2)}. Please return immediately.`,
              timestamp: book.due_date || new Date().toISOString(),
              read: false,
              data: { ...book, daysOverdue, fineAmount }
            };
            notificationList.push(notification);
          }
        }
      });

      // Fine notifications
      fines.forEach((fine) => {
        if (fine.damageFine > 0 || fine.overdueFine > 0) {
          const totalFine = fine.damageFine + fine.overdueFine;
          const reason = fine.damageDescription ? 'Damage: ' + fine.damageDescription : 'Overdue fine';
          const notification = {
            id: `fine-${fine.id}`,
            type: 'fine',
            title: 'Outstanding Fine',
            message: `You have an outstanding fine of R${totalFine.toFixed(2)} for "${fine.bookTitle}". ${reason}`,
            timestamp: fine.dueDate || fine.issueDate || new Date().toISOString(),
            read: false,
            data: fine
          };
          notificationList.push(notification);
        }
      });
      
      // Book returned notifications - DON'T show these
      // Returned books are history, not active notifications
      
      // New book notifications - REMOVED
      // These were fake notifications showing random books
      // Real new book notifications should come from backend when admin adds a book

      // Merge notifications intelligently to prevent duplicates and glitching
      // Strategy: Backend notifications are source of truth, but include Redux notifications
      // that start with "db-" prefix (those came from backend) or recent ones (< 60 seconds old)
      
      // Create a Map to deduplicate by unique key (type + book/reservation info)
      const notificationMap = new Map<string, Notification>();
      
      // Get Redis notifications that should be preserved:
      // 1. Those from backend (id starts with "db-")
      // 2. Recent notifications (less than 60 seconds old) - might not be in backend yet
      const now = Date.now();
      const recentReduxNotifications = notifications.filter(n => {
        const notifTime = new Date(n.timestamp).getTime();
        const ageInSeconds = (now - notifTime) / 1000;
        return !n.id.startsWith('db-') && ageInSeconds < 60;
      });
      
      // Merge: backend + recent redux + newly generated
      [...backendNotifications, ...recentReduxNotifications, ...notificationList].forEach(notif => {
        // Create a unique key based on notification type and relevant data
        let uniqueKey = notif.id;
        
        // For reservation notifications, use reservationId or bookTitle to prevent duplicates
        if (notif.type === 'reservation' || notif.type === 'reservation_approved') {
          const bookTitle = notif.data?.bookTitle || notif.message.match(/"([^"]+)"/)?.[1] || '';
          const reservationId = notif.data?.reservationId || '';
          uniqueKey = `${notif.type}-${reservationId || bookTitle}`;
        }
        // For due/overdue notifications, use book ID
        else if (notif.type === 'due_soon' || notif.type === 'overdue') {
          const bookId = notif.data?.id || notif.data?.book_id || '';
          uniqueKey = `${notif.type}-${bookId}`;
        }
        // For fine notifications, use fine ID
        else if (notif.type === 'fine') {
          const fineId = notif.data?.id || '';
          uniqueKey = `${notif.type}-${fineId}`;
        }
        
        // Keep the most recent notification for each unique key
        const existing = notificationMap.get(uniqueKey);
        if (!existing || new Date(notif.timestamp) > new Date(existing.timestamp)) {
          notificationMap.set(uniqueKey, notif);
        }
      });
      
      // Convert back to array
      const deduplicatedNotifications = Array.from(notificationMap.values());
      
      // Only update if notifications have actually changed
      // Compare by count and IDs to prevent unnecessary updates that cause glitching
      const currentIds = new Set(notifications.map(n => n.id).sort());
      const newIds = new Set(deduplicatedNotifications.map(n => n.id).sort());
      
      const hasChanged = 
        notifications.length !== deduplicatedNotifications.length ||
        ![...currentIds].every(id => newIds.has(id));
      
      if (hasChanged) {
        console.log(`Notifications changed: ${notifications.length} -> ${deduplicatedNotifications.length}`);
        console.log(`Backend: ${backendNotifications.length}, Generated: ${notificationList.length}, Recent Redux: ${recentReduxNotifications.length}`);
        console.log('Notification types:', deduplicatedNotifications.map(n => `${n.type}: ${n.title}`));
        setNotifications(deduplicatedNotifications);
      } else {
        console.log('Notifications unchanged, skipping update');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Import notification service
      const NotificationService = require('../services/NotificationService').default;
      
      // Reset badge count
      NotificationService.resetBadgeCount();
      
      // Fetch latest notifications
      await fetchNotifications();
      
      // Mark all notifications as read
      dispatch(markAllAsRead());
      
      console.log("Notifications refreshed and marked as read");
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };



  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'reservation':
      case 'reservation_approved':
        return <ReservationIcon width={24} height={24} />;
      case 'fine':
        return <FineIcon width={24} height={24} />;
      case 'overdue':
        return <OverdueIcon width={24} height={24} />;
      case 'due_soon':
        return <DueDateIcon width={24} height={24} />;
      case 'returned':
        return <ReturnedIcon width={24} height={24} />;
      case 'new_book':
        return <NewBookIcon width={24} height={24} />;
      default:
        return <NewBookIcon width={24} height={24} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'reservation': return colors.primary;
      case 'reservation_approved': return colors.success;
      case 'fine': return colors.primary;
      case 'overdue': return colors.danger;
      case 'due_soon': return colors.warning;
      case 'returned': return colors.success;
      case 'new_book': return colors.primary;
      default: return colors.text.secondary;
    }
  };
  
  const getActionText = (type: string) => {
    switch (type) {
      case 'reservation': return 'View Status';
      case 'reservation_approved': return 'View Books';
      case 'fine': return 'Pay Fine';
      case 'overdue': return 'View Books';
      case 'due_soon': return 'View Books';
      case 'returned': return 'View History';
      case 'new_book': return 'Reserve Book';
      default: return 'View Details';
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    
    switch (notification.type) {
      case 'reservation':
      case 'reservation_approved':
      case 'overdue':
      case 'due_soon':
        navigation.navigate('BorrowedBooks');
        break;
      case 'fine':
        navigation.navigate('Fines');
        break;
      case 'returned':
        navigation.navigate('BorrowedBooks');
        break;
      case 'new_book':
        navigation.navigate('MyBooks');
        break;
      default:
        break;
    }
  };

  // Sort notifications based on sort order
  const sortedNotifications = React.useMemo(() => {
    const sorted = [...notifications].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      
      if (sortOrder === 'newest') {
        return dateB - dateA; // Newest first (descending)
      } else {
        return dateA - dateB; // Oldest first (ascending)
      }
    });
    
    console.log(`Sorting notifications: ${sortOrder}, count: ${sorted.length}`);
    return sorted;
  }, [notifications, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => {
      const newOrder = prevOrder === 'newest' ? 'oldest' : 'newest';
      console.log(`Sort order changed to: ${newOrder}`);
      return newOrder;
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>{notifications.length} notifications</Text>
          </View>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={toggleSortOrder}
          >
            <Text style={styles.sortButtonText}>
              {sortOrder === 'newest' ? '↓ Newest' : '↑ Oldest'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sortedNotifications.length > 0 ? (
          sortedNotifications.map((notification) => (
            <ModernCard 
              key={notification.id} 
              variant="elevated" 
              style={{
                ...styles.notificationCard,
                ...(!notification.read && styles.unreadCard)
              }}>
                <View style={styles.notificationHeader}>
                <View style={[
                  styles.notificationIcon,
                  { backgroundColor: getNotificationColor(notification.type) + '20' }
                ]}>
                  {renderNotificationIcon(notification.type)}
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.notificationTitle}>
                      {notification.title}
                    </Text>
                    {!notification.read && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>
                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {new Date(notification.timestamp).toLocaleString()}
                  </Text>
                </View>
              </View>
              
              <Button
                title={getActionText(notification.type)}
                onPress={() => handleNotificationPress(notification)}
                variant="outline"
                style={styles.viewButton}
              />
            </ModernCard>
          ))
        ) : (
          <ModernCard variant="elevated">
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <AllCaughtUpIcon width={64} height={64} />
              </View>
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyMessage}>
                You have no new notifications. We'll notify you about reservations, due dates, fines, and new books.
              </Text>
            </View>
          </ModernCard>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.inverse,
    marginBottom: 4,
  },
  
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.inverse,
    opacity: 0.8,
  },
  
  sortButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  sortButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  
  content: {
    flex: 1,
    paddingTop: 8,
  },
  
  notificationCard: {
    marginBottom: 12,
  },
  

  
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  
  iconText: {
    fontSize: 22,
  },
  
  notificationContent: {
    flex: 1,
  },
  
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  
  notificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  
  notificationMessage: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  
  notificationTime: {
    fontSize: 13,
    color: colors.text.muted,
    fontWeight: '500',
  },
  
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  
  unreadCard: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  
  viewButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  
  emptyMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});