import React, { useState, useEffect } from 'react';
import { useNotifications } from '../components/NotificationProvider';
import { Notification } from '../store/slices/notificationSlice';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, StatusBar } from 'react-native';
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

interface NotificationsScreenProps {
  user: User;
  navigation: any;
}

// Using Notification interface from notificationSlice

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ user, navigation }) => {
  const { notifications, markAsRead, setNotifications } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark all as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (notifications.some(n => !n.read)) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    }, [notifications, setNotifications])
  );

  const fetchNotifications = async () => {
    try {
      const [reservations, myBooks, fines, books] = await Promise.all([
        apiClient.getReservationStatus(user.id),
        apiClient.getMyBooks(user.id),
        apiClient.getMyFines(user.id),
        apiClient.getBooks()
      ]);

      const notificationList: Notification[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Reservation notifications
      reservations.forEach((reservation, index) => {
        if (reservation.status === 'approved') {
          const notification = {
            id: `reservation-${reservation.id}`,
            type: 'reservation',
            title: 'Reservation Approved!',
            message: `Your reservation for "${reservation.book_title}" has been approved and the book has been issued to you!`,
            timestamp: new Date().toISOString(),
            read: false,
            data: reservation
          };
          notificationList.push(notification);
        } else if (reservation.status === 'rejected') {
          const notification = {
            id: `reservation-${reservation.id}`,
            type: 'reservation',
            title: 'Reservation Rejected',
            message: `Your reservation for "${reservation.book_title}" was rejected. ${reservation.rejection_reason || ''}`,
            timestamp: new Date().toISOString(),
            read: false,
            data: reservation
          };
          notificationList.push(notification);
        }
      });

      // Due date and overdue notifications
      myBooks.forEach((book) => {
        if (book.status === 'issued') {
          const dueDate = new Date(book.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 2) {
            const notification = {
              id: `due-soon-2-${book.id}`,
              type: 'due_soon',
              title: 'Book Due in 2 Days',
              message: `"${book.title}" is due in 2 days (${new Date(book.due_date).toLocaleDateString()}). Please return it on time to avoid fines.`,
              timestamp: new Date().toISOString(),
              read: false,
              data: book
            };
            notificationList.push(notification);
          } else if (diffDays === 1) {
            const notification = {
              id: `due-soon-1-${book.id}`,
              type: 'due_soon',
              title: 'Book Due Tomorrow',
              message: `"${book.title}" is due tomorrow (${new Date(book.due_date).toLocaleDateString()}). Please return it to avoid fines.`,
              timestamp: new Date().toISOString(),
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
              timestamp: new Date().toISOString(),
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
            timestamp: new Date().toISOString(),
            read: false,
            data: fine
          };
          notificationList.push(notification);
        }
      });
      
      // Book returned notifications
      myBooks.forEach((book) => {
        if (book.status === 'returned') {
          notificationList.push({
            id: `returned-${book.id}`,
            type: 'returned',
            title: 'Book Returned',
            message: `"${book.title}" has been successfully returned. Thank you for reading!`,
            timestamp: book.due_date || new Date().toISOString(),
            read: false,
            data: book
          });
        }
      });
      
      // New book notifications (latest 2 books as "new")
      const newBooks = books.slice(0, 2);
      newBooks.forEach((book) => {
        notificationList.push({
          id: `new-book-${book.id}`,
          type: 'new_book',
          title: 'New Book Added',
          message: `"${book.title}" by ${book.author} has been added to the library. Reserve it now!`,
          timestamp: new Date().toISOString(),
          read: false,
          data: book
        });
      });

      // Sort by timestamp (newest first)
      notificationList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setNotifications(notificationList);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };



  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'reservation':
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
      case 'reservation': return 'View Books';
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>{notifications.length} notifications</Text>
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {notifications.length > 0 ? (
          notifications.map((notification) => (
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