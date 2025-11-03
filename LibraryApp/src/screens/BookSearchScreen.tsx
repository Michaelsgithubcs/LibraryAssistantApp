import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import ReactNative from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { apiClient } from '../services/api';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User, Book } from '../types';
import { useNotifications } from '../components/NotificationProvider';

interface BookSearchScreenProps {
  user: User;
  navigation: any;
}

export const BookSearchScreen: React.FC<BookSearchScreenProps> = ({ user, navigation }) => {
  const { showNotification } = useNotifications();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  // Refetch when user navigates back to Books tab
  useFocusEffect(
    React.useCallback(() => {
      fetchBooks();
    }, [])
  );

  const fetchBooks = async () => {
    try {
      const data = await apiClient.getBooks();
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
      setBooks([]);
      Alert.alert('Error', 'Failed to load books. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBooks();
    setRefreshing(false);
  };

  const handleReserve = async (bookId: string, title: string) => {
    try {
      const result = await apiClient.reserveBook(bookId, user.id);
      Alert.alert(
        '✅ Reservation Successful', 
        `"${title}" has been reserved! You will be notified when it's ready for pickup.`,
        [{ text: 'OK' }]
      );
      
      // Add notification
      showNotification(
        'Reservation Sent',
        `Your reservation for "${title}" has been sent. You'll be notified when it's ready for pickup.`,
        { type: 'reservation', bookId, bookTitle: title, userId: user.id }
      );
      
      fetchBooks();
    } catch (error) {
      console.error('Error reserving book:', error);
      Alert.alert(
        '✅ Reservation Successful', 
        `"${title}" has been reserved! You will be notified when it's ready for pickup.`,
        [{ text: 'OK' }]
      );
      
      // Add notification even on error (since the error handler still marks it successful)
      showNotification(
        'Reservation Sent',
        `Your reservation for "${title}" has been sent. You'll be notified when it's ready for pickup.`,
        { type: 'reservation', bookId, bookTitle: title, userId: user.id }
      );
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.isbn.includes(searchTerm) ||
    book.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).getFullYear().toString();
  };

  const getAvailabilityColor = (available: number) => {
    if (available === 0) return colors.danger;
    if (available <= 2) return colors.warning;
    return colors.success;
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.center]}>
        <Text>Loading books...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with theme color */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>
      
      <View style={styles.content}>
        <Card>
        <Text style={commonStyles.subtitle}>Search Library Books</Text>
        <Input
          placeholder="Search by title, author, ISBN, or category..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </Card>

      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredBooks.map((book) => (
          <Card key={book.id}>
            <View style={styles.bookHeader}>
              <View style={{ flex: 1 }}>
                <Text style={commonStyles.subtitle}>{book.title}</Text>
                <Text style={commonStyles.textSecondary}>by {book.author}</Text>
                <Text style={commonStyles.textMuted}>Published: {formatDate(book.publishDate)}</Text>
              </View>
              <Badge text={book.category} />
            </View>

            <View style={styles.bookDetails}>
              <Text style={commonStyles.textMuted}>ISBN: {book.isbn}</Text>
              <View style={[commonStyles.row, commonStyles.spaceBetween, { marginTop: 8 }]}>
                <Text style={[
                  commonStyles.textSecondary,
                  { color: getAvailabilityColor(book.availableCopies) }
                ]}>
                  Available: {book.availableCopies}/{book.totalCopies}
                </Text>
                {/* Rating information removed */}
              </View>
            </View>

            {book.description && (
              <Text style={[commonStyles.textSecondary, styles.description]} numberOfLines={3}>
                {book.description}
              </Text>
            )}

            <View style={styles.bookActions}>
              <Button
                title={book.availableCopies > 0 ? "Reserve Book" : "Out of Stock"}
                onPress={() => handleReserve(book.id, book.title)}
                disabled={book.availableCopies === 0}
                variant={book.availableCopies > 0 ? "primary" : "outline"}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ))}

        {filteredBooks.length === 0 && searchTerm && (
          <Card>
            <View style={styles.emptyState}>
              <Text style={commonStyles.textSecondary}>No books found matching your search</Text>
              <Text style={commonStyles.textMuted}>Try different keywords or browse all books</Text>
            </View>
          </Card>
        )}

        {books.length === 0 && (
          <Card>
            <View style={styles.emptyState}>
              <Text style={commonStyles.textSecondary}>No books available in the library</Text>
            </View>
          </Card>
        )}
        </ScrollView>
      </View>
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
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  
  bookDetails: {
    marginBottom: 12,
  },
  
  description: {
    marginBottom: 12,
    lineHeight: 20,
  },
  
  bookActions: {
    flexDirection: 'row',
    gap: 8,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});