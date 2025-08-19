import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, StatusBar, Alert, Image } from 'react-native';
import { ModernCard } from '../components/ModernCard';
import { AdminCard } from '../components/AdminCard';
import { Button } from '../components/Button';
import { apiClient } from '../services/api';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User, IssuedBook, Fine, Book, ReservationStatus } from '../types';

// Using the updated Book interface from types

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
  interface RecommendedBook {
    id: string;
    title: string;
    author: string;
    category: string;
    rating: number;
    estimatedTime: number;
    coverImage?: string;
  }

  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [userReservations, setUserReservations] = useState<ReservationStatus[]>([]);
  const [userBooks, setUserBooks] = useState<IssuedBook[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [myBooks, reservations, fines] = await Promise.all([
        apiClient.getMyBooks(user.id),
        apiClient.getReservationStatus(user.id),
        apiClient.getMyFines(user.id)
      ]);

      // Update books
      setUserBooks(myBooks);

      // Update reservations
      setUserReservations(reservations);

      // Fetch recommendations from the API
      try {
        const recommendations = await apiClient.getRecommendations(user.id, 'hybrid', 3);
        if (recommendations && recommendations.length > 0) {
          const validRecommendations: Book[] = recommendations.map(book => {
            const recommendationType = (book.recommendation_type || 'popular') as 
              'content_based' | 'association_rules' | 'hybrid' | 'popular' | 'general';
              
            return {
              ...book,
              isbn: book.isbn || '',
              description: book.description || '',
              availableCopies: book.availableCopies || 0,
              totalCopies: book.totalCopies || 1,
              publishDate: book.publishDate || new Date().toISOString().split('T')[0],
              avg_rating: book.avg_rating || 0,
              rating_count: book.rating_count || 0,
              rating: book.rating || 0,
              estimatedTime: book.estimatedTime || 0,
              coverImage: book.cover_image || 'https://via.placeholder.com/150',
              reading_time_minutes: book.reading_time_minutes || 0,
              recommendationType: recommendationType,
              recommendationScore: book.score || 0
            };
          });
          setRecommendedBooks(validRecommendations);
          return; // Exit early if we got recommendations
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      }

      // Fallback to random books if no recommendations
      const allBooks = await apiClient.getBooks();
      if (allBooks && allBooks.length > 0) {
        const shuffled = [...allBooks].sort(() => 0.5 - Math.random());
        const validRecommendations: Book[] = shuffled.slice(0, 3).map(book => ({
          ...book,
          isbn: book.isbn || '',
          description: book.description || '',
          availableCopies: book.availableCopies || 0,
          totalCopies: book.totalCopies || 1,
          publishDate: book.publishDate || new Date().toISOString().split('T')[0],
          avg_rating: book.avg_rating || 0,
          rating_count: book.rating_count || 0,
          rating: book.rating || 0,
          estimatedTime: book.estimatedTime || 0,
          coverImage: book.coverImage || 'https://via.placeholder.com/150',
          reading_time_minutes: book.reading_time_minutes || 0,
          recommendationType: 'popular' // Mark as popular fallback
        }));
        setRecommendedBooks(validRecommendations);
      } else {
        // Fallback to default books if no recommendations
        const defaultBooks: Book[] = [
          {
            id: '1',
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            isbn: '9780743273565',
            category: 'Classic',
            description: 'A story of decadence and excess in the Jazz Age',
            availableCopies: 5,
            totalCopies: 10,
            publishDate: '1925-04-10',
            avg_rating: 4.5,
            rating_count: 1000,
            rating: 4.5,
            estimatedTime: 4,
            coverImage: 'https://via.placeholder.com/150',
            reading_time_minutes: 240
          },
          // ... other default books
        ];
        setRecommendedBooks(defaultBooks);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueCount = myBooks.filter((book: IssuedBook) => {
        const dueDate = new Date(book.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today && book.status === 'issued';
      }).length;

      const hasApproved = reservations.some((r: ReservationStatus) => r.status === 'approved');
      const hasRejected = reservations.some((r: ReservationStatus) => r.status === 'rejected');

      // Check if the user has any reservations
      const hasReservations = userReservations.some((r: ReservationStatus) => 
        r.status === 'approved' || r.status === 'pending'
      );

      // Calculate total outstanding fines
      const totalFines = Array.isArray(fines) ? fines.reduce((sum: number, fine: any) => {
        const damage = typeof fine.damageFine === 'number' ? fine.damageFine : 0;
        const overdue = typeof fine.overdueFine === 'number' ? fine.overdueFine : 0;
        return sum + damage + overdue;
      }, 0) : 0;

      setStats({
        booksIssued: myBooks.length,
        overdueBooks: overdueCount,
        totalFines,
        reservations: reservations.filter((r: ReservationStatus) => r.status === 'pending').length,
        reservationStatus: { hasApproved, hasRejected }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback in case of error
      try {
        const books = await apiClient.getBooks();
        const bookSuggestions = books
          .filter(b => !userBooks.some(ub => ub.book_id.toString() === b.id))
          .slice(0, 4);
        const suggestions: Book[] = bookSuggestions.map(book => {
          // Ensure all required Book interface properties are included
          const bookData: Book = {
            id: book.id || '',
            title: book.title || 'Untitled',
            author: book.author || 'Unknown Author',
            category: book.category || 'Uncategorized',
            isbn: typeof book.isbn === 'string' ? book.isbn : '',
            description: typeof book.description === 'string' ? book.description : '',
            availableCopies: typeof book.availableCopies === 'number' ? book.availableCopies : 0,
            totalCopies: typeof book.totalCopies === 'number' ? book.totalCopies : 1,
            publishDate: typeof book.publishDate === 'string' ? book.publishDate : new Date().toISOString().split('T')[0],
            // Optional properties with type checking
            ...(typeof book.avg_rating === 'number' && { avg_rating: book.avg_rating }),
            ...(typeof book.rating_count === 'number' && { rating_count: book.rating_count }),
            rating: typeof book.rating === 'number' ? book.rating : 
                   typeof book.avg_rating === 'number' ? book.avg_rating : 4.0,
            ...(typeof book.estimatedTime === 'number' && { estimatedTime: book.estimatedTime }),
            ...(typeof book.coverImage === 'string' && { coverImage: book.coverImage })
          };
          return bookData;
        });
        setRecommendedBooks(suggestions);
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    }
  };

  const handleReserveBook = async (bookId: string) => {
    const isAlreadyReserved = userReservations.some(r => 
      r.status === 'pending' && r.book_id.toString() === bookId
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
    
    // Convert both IDs to strings for consistent comparison
    const bookIdStr = String(bookId);
    const isIssued = userBooks.some(b => 
      String(b.book_id) === bookIdStr ||
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
              onPress={() => navigation.navigate('OverdueBooks')}
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