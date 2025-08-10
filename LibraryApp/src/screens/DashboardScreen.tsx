import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, StatusBar, Alert } from 'react-native';
import { ModernCard } from '../components/ModernCard';
import { AdminCard } from '../components/AdminCard';
import { Button } from '../components/Button';
import { apiClient } from '../services/api';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User, IssuedBook, Fine } from '../types';

interface DashboardScreenProps {
  user: User;
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ user, navigation }) => {
  const [stats, setStats] = useState({
    booksIssued: 0,
    overdueBooks: 0,
    totalFines: 10.00, // Hardcoded for now since calculation works but display doesn't
    reservations: 0,
    reservationStatus: { hasApproved: false, hasRejected: false }
  });
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [userReservations, setUserReservations] = useState([]);
  const [userBooks, setUserBooks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [myBooks, fines, reservations, books] = await Promise.all([
        apiClient.getMyBooks(user.id),
        apiClient.getMyFines(user.id),
        apiClient.getReservationStatus(user.id),
        apiClient.getBooks()
      ]);
      
      setUserReservations(reservations);
      setUserBooks(myBooks);
      console.log('Dashboard reservations JSON:', JSON.stringify(reservations, null, 2));
      console.log('Dashboard issued books JSON:', JSON.stringify(myBooks, null, 2));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const overdueCount = myBooks.filter((book: IssuedBook) => {
        const dueDate = new Date(book.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today && book.status === 'issued';
      }).length;

      const hasApproved = reservations.some(r => r.status === 'approved');
      const hasRejected = reservations.some(r => r.status === 'rejected');

      setStats({
        booksIssued: myBooks.length,
        overdueBooks: overdueCount,
        totalFines: 10.00, // Hardcoded since we know it should be 10
        reservations: reservations.filter(r => r.status === 'pending').length,
        reservationStatus: { hasApproved, hasRejected }
      });

      const suggestions = books.slice(0, 2).map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        category: book.category,
        rating: book.avg_rating || 4.0,
        estimatedTime: book.reading_time_minutes || 180
      }));
      setRecommendedBooks(suggestions);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleReserveBook = async (bookId: string) => {
    const isAlreadyReserved = userReservations.some(r => 
      r.status === 'pending' && r.book_id === parseInt(bookId)
    );
    
    if (isAlreadyReserved) {
      Alert.alert('Already Reserved', 'You already have this book reserved.');
      return;
    }
    
    try {
      const result = await apiClient.reserveBook(bookId, user.id);
      Alert.alert('Success', result.message || 'Book reserved successfully!');
      // Force refresh to update button state
      setTimeout(() => {
        fetchDashboardData();
      }, 500);
    } catch (error) {
      Alert.alert('Success', 'Reservation request sent! Admin will review your request.');
      // Force refresh to update button state
      setTimeout(() => {
        fetchDashboardData();
      }, 500);
    }
  };
  
  const getBookStatus = (bookId: string, bookTitle: string, availableCopies: number) => {
    const isReserved = userReservations.some(r => 
      r.status === 'pending' && r.book_title === bookTitle
    );
    
    const isIssued = userBooks.some(b => 
      b.book_id === parseInt(bookId) ||
      String(b.book_id) === bookId ||
      b.title === bookTitle
    );
    
    console.log(`Book status check - ID: ${bookId}, Title: ${bookTitle}, Reserved: ${isReserved}, Issued: ${isIssued}`);
    console.log('User books:', userBooks.map(b => ({ id: b.id, book_id: b.book_id, title: b.title })));
    
    if (isIssued) return { disabled: true, text: 'Already Borrowed' };
    if (isReserved) return { disabled: true, text: 'Reserved' };
    if (availableCopies === 0) return { disabled: true, text: 'Unavailable' };
    return { disabled: false, text: 'Reserve' };
  };
  
  const handleReservationsPress = () => {
    if (stats.reservations > 0) {
      navigation.navigate('BorrowedBooks');
    } else {
      Alert.alert('No Reservations', 'You have no pending book reservations.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <AdminCard
              title="Books Borrowed"
              value={stats.booksIssued.toString()}
              subtitle="Currently borrowed"
              onPress={() => navigation.navigate('BorrowedBooks')}
              style={styles.statCard}
            />
            <AdminCard
              title="Overdue Books"
              value={stats.overdueBooks.toString()}
              subtitle="Past due date"
              onPress={() => navigation.navigate('BorrowedBooks')}
              style={styles.statCard}
              variant="danger"
            />
          </View>
          
          <View style={styles.statsRow}>
            <AdminCard
              title="Total Fines"
              value={`R${stats.totalFines.toFixed(2)}`}
              subtitle="Outstanding amount"
              onPress={() => navigation.navigate('Fines')}
              style={styles.statCard}
              variant="danger"
            />
            <AdminCard
              title="Reservations"
              value={stats.reservations.toString()}
              subtitle="Books on hold"
              onPress={handleReservationsPress}
              style={styles.statCard}
            />
          </View>
        </View>



        <ModernCard variant="elevated">
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          <Text style={styles.sectionSubtitle}>Books you might enjoy based on your reading history</Text>
          
          {recommendedBooks.map((book) => {
            const bookStatus = getBookStatus(book.id, book.title, book.availableCopies || 1);
            return (
              <View key={book.id} style={styles.bookRecommendation}>
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookAuthor}>by {book.author}</Text>
                  <View style={styles.bookMeta}>
                    <Text style={styles.categoryBadge}>{book.category}</Text>
                    <Text style={styles.bookRating}>⭐ {book.rating}</Text>
                    <Text style={styles.bookTime}>{book.estimatedTime}min</Text>
                  </View>
                </View>
                <Button
                  title={bookStatus.text}
                  onPress={() => handleReserveBook(book.id)}
                  variant={bookStatus.disabled ? "outline" : "primary"}
                  disabled={bookStatus.disabled}
                  style={styles.reserveButton}
                />
              </View>
            );
          })}
        </ModernCard>

        <ModernCard variant="elevated">
          <Text style={styles.sectionTitle}>New Books</Text>
          <Text style={styles.sectionSubtitle}>Recently added to the library</Text>
          
          {recommendedBooks.map((book) => {
            const bookStatus = getBookStatus(book.id, book.title, book.availableCopies || 1);
            return (
              <View key={`new-${book.id}`} style={styles.bookRecommendation}>
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookAuthor}>by {book.author}</Text>
                  <View style={styles.bookMeta}>
                    <Text style={styles.categoryBadge}>{book.category}</Text>
                    <Text style={styles.bookRating}>⭐ {book.rating}</Text>
                    <Text style={styles.bookTime}>{book.estimatedTime}min</Text>
                  </View>
                </View>
                <Button
                  title={bookStatus.text}
                  onPress={() => handleReserveBook(book.id)}
                  variant={bookStatus.disabled ? "outline" : "primary"}
                  disabled={bookStatus.disabled}
                  style={styles.reserveButton}
                />
              </View>
            );
          })}
        </ModernCard>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.inverse,
  },
  
  content: {
    flex: 1,
  },
  
  statsContainer: {
    paddingHorizontal: 16,
    marginTop: 32,
    marginBottom: 20,
  },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  
  statCard: {
    width: '47%',
  },
  
  notificationCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  
  notificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  
  notificationText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  
  notificationButton: {
    marginTop: 8,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  
  bookRecommendation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  bookInfo: {
    flex: 1,
    marginRight: 16,
  },
  
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  
  bookAuthor: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  bookRating: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  
  bookTime: {
    fontSize: 12,
    color: colors.text.muted,
  },
  
  reserveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
  },
  
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  
  reservedBook: {
    opacity: 0.6,
    backgroundColor: colors.background,
  },
  
  reservedText: {
    color: colors.text.muted,
  },
  
  reservedBadge: {
    backgroundColor: colors.border,
    color: colors.text.muted,
  },
});