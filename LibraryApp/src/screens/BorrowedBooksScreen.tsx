import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { apiClient } from '../services/api';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User, IssuedBook, ReservationStatus, HistoryItem } from '../types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { removeNotification } from '../store/slices/notificationSlice';
import { SkeletonBox, SkeletonLines } from '../components/Skeleton';

interface BorrowedBooksScreenProps {
  user: User;
  navigation: any;
}

export const BorrowedBooksScreen: React.FC<BorrowedBooksScreenProps> = ({ user, navigation }) => {
  const [myBooks, setMyBooks] = useState<IssuedBook[]>([]);
  const [readHistory, setReadHistory] = useState<HistoryItem[]>([]);
  const [returnedBooks, setReturnedBooks] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'borrowed' | 'returned' | 'read'>('borrowed');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const notifications = useSelector((state: RootState) => state.notifications.notifications);

  useEffect(() => {
    // Initial fetch
    fetchData();
    
    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    
    // Cleanup the listener on unmount
    return unsubscribe;
  }, [navigation]);

  const fetchData = async () => {
    try {
      // Fetch all book data, including borrowed, returned and read books
      const [issuedAndReturnedBooks, reservationsData, readBooksHistory] = await Promise.all([
        apiClient.getMyBooks(user.id),
        Promise.resolve([]),
        apiClient.getReadHistory(user.id)
      ]);
      
      // Get a complete history from the /users/:id/history endpoint
      const historyResponse = await apiClient.getAllUserHistory(user.id);
      const completeHistory = historyResponse.history || [];
      
      // Current borrowed books
      setMyBooks(issuedAndReturnedBooks.filter(book => book.status === 'issued'));
      
      // Books that have been returned but not necessarily marked as read
      // Using the complete history to get returned books
      setReturnedBooks(completeHistory.filter((book: HistoryItem) =>
        book.status === 'returned' && 
        (!book.reading_progress || book.reading_progress < 100)
  ));
      
      // Books that have been explicitly marked as read (100% progress)
      setReadHistory(readBooksHistory || []);
      
      console.log(`Loaded ${issuedAndReturnedBooks.length} books: ${issuedAndReturnedBooks.filter(book => book.status === 'issued').length} borrowed`);
      console.log(`Loaded ${completeHistory.filter((book: HistoryItem) => book.status === 'returned').length} returned books`);
      console.log(`Loaded ${readBooksHistory?.length || 0} books in read history`);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load your books');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  const handleCancelReservation = async (reservationId: number, bookTitle: string) => {
    try {
      await apiClient.cancelReservation(reservationId);
      
      // Remove notification from Redux store
      // Find and remove the notification for this book
      const notificationToRemove = notifications.find(n => 
        n.type === 'reservation' && 
        n.message.includes(bookTitle)
      );
      
      if (notificationToRemove) {
        dispatch(removeNotification(notificationToRemove.id));
        console.log(`Removed notification for cancelled reservation: ${bookTitle}`);
      }
      
      Alert.alert('Success', `Reservation for "${bookTitle}" has been cancelled.`);
      fetchData(); // Refresh data
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel reservation. Please try again.');
    }
  };

  const calculateFinishTime = (estimatedMinutes: number, progress: number) => {
    const remainingMinutes = estimatedMinutes * (1 - progress / 100);
    return Math.ceil(remainingMinutes / 120);
  };
  
  const handleMarkAsRead = async (book: IssuedBook) => {
    try {
      // Use the issued book id
      const bookId = book.id;
      console.log('Marking as read - Book:', book, 'Using bookId:', bookId, 'UserId:', user.id);
      await apiClient.markBookAsRead(Number(bookId), user.id);
      Alert.alert('Success', `"${book.title}" has been marked as read and added to your reading history.`);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Mark as read error:', error);
      Alert.alert('Error', 'Failed to mark book as read. Please try again.');
    }
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const isOverdueResult = due < today;
    console.log(`Book due ${dueDate}, today ${today.toDateString()}, overdue: ${isOverdueResult}`);
    return isOverdueResult;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <ScrollView style={commonStyles.container}>
        <Card>
          <Text style={commonStyles.subtitle}>Book History</Text>
          <Text style={commonStyles.textSecondary}>View your current and past borrowed books</Text>
          <View style={{ height: 12 }} />
          {/* Tabs skeleton */}
          <View style={styles.tabContainer}>
            {Array.from({ length: 3 }).map((_, i) => (
              <View key={i} style={[styles.tab, { paddingVertical: 10 }]}>
                <SkeletonBox width={100} height={14} radius={7} />
              </View>
            ))}
          </View>
          {/* List skeleton items */}
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.historyItem}>
              <View style={styles.bookHeader}>
                <View style={{ flex: 1 }}>
                  <SkeletonBox width={'70%'} height={16} />
                  <View style={{ height: 6 }} />
                  <SkeletonBox width={'40%'} height={12} />
                </View>
                <SkeletonBox width={140} height={12} />
              </View>
              <View style={styles.bookActions}>
                <SkeletonBox height={36} style={styles.actionButton as any} />
                <SkeletonBox height={36} style={styles.actionButton as any} />
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={commonStyles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Reservation content removed from BorrowedBooks; use Reservations screen */}

      {/* Book History with Tabs */}
      <Card>
        <Text style={commonStyles.subtitle}>Book History</Text>
        <Text style={commonStyles.textSecondary}>View your current and past borrowed books</Text>
        
        {/* Tabs for navigation between book states */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'borrowed' && styles.activeTab]} 
            onPress={() => setActiveTab('borrowed')}
          >
            <Text style={[styles.tabText, activeTab === 'borrowed' && styles.activeTabText]}>
              Borrowed{myBooks.length > 0 ? ` (${myBooks.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'returned' && styles.activeTab]} 
            onPress={() => setActiveTab('returned')}
          >
            <Text style={[styles.tabText, activeTab === 'returned' && styles.activeTabText]}>
              Returned{returnedBooks.length > 0 ? ` (${returnedBooks.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'read' && styles.activeTab]} 
            onPress={() => setActiveTab('read')}
          >
            <Text style={[styles.tabText, activeTab === 'read' && styles.activeTabText]}>
              Read{readHistory.length > 0 ? ` (${readHistory.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Currently Borrowed Books */}
        {activeTab === 'borrowed' && (
          <View>
            {myBooks.length > 0 ? (
              myBooks.map((book) => (
                <View key={`borrowed-${book.id}`} style={styles.historyItem}>
                  <View style={styles.bookHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={commonStyles.subtitle}>{book.title}</Text>
                      <Text style={commonStyles.textSecondary}>{book.author}</Text>
                    </View>
                    <Text 
                      style={[
                        commonStyles.textMuted, 
                        { fontSize: 12 },
                        isOverdue(book.due_date) && styles.overdueText
                      ]}
                    >
                      Due: {book.due_date ? formatDate(book.due_date) : 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.bookActions}>
                    <Button
                      title="Ask About Book"
                      onPress={() => navigation.navigate('BookChat', { book })}
                      variant="outline"
                      style={styles.actionButton}
                    />
                    {(book.reading_progress || 0) < 100 && (
                      <Button
                        title="Mark as Read"
                        onPress={() => handleMarkAsRead(book)}
                        style={styles.actionButton}
                      />
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={commonStyles.textSecondary}>No books currently borrowed</Text>
                <Button
                  title="Browse Books"
                  onPress={() => navigation.navigate('MyBooks')}
                  style={styles.emptyButton}
                />
              </View>
            )}
          </View>
        )}
        
        {/* Returned Books */}
        {activeTab === 'returned' && (
          <View>
            {returnedBooks.length > 0 ? (
              returnedBooks.map((book) => (
                <View key={`returned-${book.id}`} style={styles.historyItem}>
                  <View style={styles.bookHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={commonStyles.subtitle}>{book.title}</Text>
                      <Text style={commonStyles.textSecondary}>{book.author}</Text>
                    </View>
                    <Text style={[commonStyles.textMuted, { fontSize: 12 }]}>
                      Returned: {book.return_date ? formatDate(book.return_date) : 'Recently'}
                    </Text>
                  </View>
                  <View style={styles.bookActions}>
                    <Button
                      title="Ask About Book"
                      onPress={() => navigation.navigate('BookChat', { book })}
                      variant="outline"
                      style={styles.actionButton}
                    />
                    <Button
                      title="Mark as Read"
                      onPress={() => handleMarkAsRead(book)}
                      style={styles.actionButton}
                    />
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={commonStyles.textSecondary}>No returned books in your history</Text>
                <Text style={commonStyles.textMuted}>Books you've returned but not marked as read will appear here</Text>
              </View>
            )}
          </View>
        )}
        
        {/* Read Books History */}
        {activeTab === 'read' && (
          <View>
            {readHistory.length > 0 ? (
              readHistory.map((book) => (
                <View key={`history-${book.id}`} style={styles.historyItem}>
                  <View style={styles.bookHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={commonStyles.subtitle}>{book.title}</Text>
                      <Text style={commonStyles.textSecondary}>{book.author}</Text>
                    </View>
                    <Text style={[commonStyles.textMuted, { fontSize: 12 }]}>
                      Completed: {book.completed_date ? formatDate(book.completed_date) : 'Recently'}
                    </Text>
                  </View>
                  <View style={styles.bookActions}>
                    <Button
                      title="Ask About Book"
                      onPress={() => navigation.navigate('BookChat', { book })}
                      variant="outline"
                      style={styles.actionButton}
                    />
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={commonStyles.textSecondary}>No completed books yet</Text>
                <Text style={commonStyles.textMuted}>Books you mark as read will appear here</Text>
              </View>
            )}
          </View>
        )}
      </Card>


    </ScrollView>
  );
};

const styles = StyleSheet.create({
  reservationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 6,
  },
  
  bookItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  
  bookDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  
  progressSection: {
    marginBottom: 12,
  },
  
  bookActions: {
    flexDirection: 'row',
    gap: 8,
  },
  
  actionButton: {
    flex: 1,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  
  emptyButton: {
    marginTop: 16,
  },
  
  historyItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  // Tab navigation styles
  tabContainer: {
    flexDirection: 'row',
    marginVertical: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  activeTab: {
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  
  tabText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  
  overdueText: {
    color: colors.danger,
    fontWeight: '600',
  },
});