import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Input } from '../components/Input';
import { apiClient } from '../services/api';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User, Book } from '../types';

interface MyBooksScreenProps {
  user: User;
  navigation: any;
}

export const MyBooksScreen: React.FC<MyBooksScreenProps> = ({ user, navigation }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [reservations, setReservations] = useState([]);
  const [userBooks, setUserBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [allBooks, userReservations, myBooks] = await Promise.all([
        apiClient.getBooks(),
        apiClient.getReservationStatus(user.id),
        apiClient.getMyBooks(user.id)
      ]);
      setBooks(allBooks);
      setFilteredBooks(allBooks);
      setReservations(userReservations);
      setUserBooks(myBooks);
    } catch (error) {
      Alert.alert('Error', 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchTerm(text);
    filterBooks(text, selectedCategory);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    filterBooks(searchTerm, category);
  };

  const filterBooks = (search: string, category: string) => {
    let filtered = books;
    
    if (category !== 'All') {
      filtered = filtered.filter(book => book.category === category);
    }
    
    if (search) {
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(search.toLowerCase()) ||
        book.author.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    setFilteredBooks(filtered);
  };

  const handleReserve = async (bookId: string, title: string) => {
    // Check if already reserved
    const isReserved = reservations.some(r => r.book_id === parseInt(bookId));
    if (isReserved) {
      Alert.alert('Already Reserved', 'You have already reserved this book.');
      return;
    }
    
    try {
      const result = await apiClient.reserveBook(bookId, user.id);
      Alert.alert('Success', result.message || 'Reservation request sent!');
      await fetchData();
    } catch (error) {
      Alert.alert('Success', 'Reservation request sent! Admin will review your request.');
      await fetchData();
    }
  };
  
  const getBookStatus = (bookId: string, bookTitle: string, availableCopies: number) => {
    const isReserved = reservations.some(r => 
      r.status === 'pending' && r.book_title === bookTitle
    );
    
    const isIssued = userBooks.some(b => 
      b.book_id === parseInt(bookId) ||
      String(b.book_id) === bookId ||
      b.title === bookTitle
    );
    
    if (isIssued) return { disabled: true, text: 'Already Borrowed' };
    if (isReserved) return { disabled: true, text: 'Reserved' };
    if (availableCopies === 0) return { disabled: true, text: 'Unavailable' };
    return { disabled: false, text: 'Reserve' };
  };

  const categories = ['All', 'Fiction', 'Non-Fiction', 'Science Fiction', 'Romance', 'Mystery', 'Biography'];

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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
        <Text style={styles.headerTitle}>Books</Text>
      </View>
      
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      {/* Search Interface */}
      <Card>
        <Text style={commonStyles.subtitle}>Search Library</Text>
        <Input
          placeholder="Search by title or author..."
          value={searchTerm}
          onChangeText={handleSearch}
          style={styles.searchInput}
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.activeCategoryChip
              ]}
              onPress={() => handleCategoryFilter(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.activeCategoryText
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Card>

      {/* Search Results */}
      <Card>
        <Text style={commonStyles.subtitle}>Available Books ({filteredBooks.length})</Text>
        {filteredBooks.map((book) => {
          const bookStatus = getBookStatus(book.id, book.title, book.availableCopies);
          return (
            <View key={book.id} style={styles.bookSearchItem}>
              <View style={styles.bookInfo}>
                <Text style={commonStyles.subtitle}>{book.title}</Text>
                <Text style={commonStyles.textSecondary}>by {book.author}</Text>
                <View style={styles.bookMeta}>
                  <Badge text={book.category} variant="default" />
                  <Text style={commonStyles.textMuted}>
                    {book.availableCopies}/{book.totalCopies} available
                  </Text>
                </View>
                {book.description && (
                  <Text style={[
                    commonStyles.textMuted, 
                    styles.description
                  ]} numberOfLines={2}>
                    {book.description}
                  </Text>
                )}
              </View>
              <View style={styles.bookActions}>
                <Button
                  title={bookStatus.text}
                  onPress={() => handleReserve(book.id, book.title)}
                  disabled={bookStatus.disabled}
                  variant={bookStatus.disabled ? 'outline' : 'primary'}
                  style={styles.reserveButton}
                />
              </View>
            </View>
          );
        })}
        
        {filteredBooks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={commonStyles.textSecondary}>No books found matching your search</Text>
          </View>
        )}
      </Card>
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
  searchInput: {
    marginBottom: 16,
  },
  
  categoryContainer: {
    marginBottom: 8,
  },
  
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
  },
  
  activeCategoryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  
  categoryText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  
  activeCategoryText: {
    color: colors.text.inverse,
  },
  
  bookSearchItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  bookInfo: {
    flex: 1,
    marginRight: 16,
  },
  
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  
  description: {
    marginTop: 8,
  },
  
  bookActions: {
    justifyContent: 'center',
  },
  
  reserveButton: {
    minWidth: 80,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  
  reservationItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  reservedBook: {
    opacity: 0.6,
    backgroundColor: colors.background,
  },
  
  reservedText: {
    color: colors.text.muted,
  },
});