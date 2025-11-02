import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, FlatList, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import GridIcon from '../../assets/icons/grid.svg';
import ListIcon from '../../assets/icons/list.svg';
import { Input } from '../components/Input';
import { apiClient } from '../services/api';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User, Book, ReservationStatus, IssuedBook } from '../types';
import { useNotifications } from '../components/NotificationProvider';

interface MyBooksScreenProps {
  user: User;
  navigation: any;
}

export const MyBooksScreen: React.FC<MyBooksScreenProps> = ({ user, navigation }) => {
  const { showNotification } = useNotifications();
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [reservations, setReservations] = useState<ReservationStatus[]>([]);
  const [userBooks, setUserBooks] = useState<IssuedBook[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGridView, setIsGridView] = useState(false);

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
    const bookIdNum = parseInt(bookId, 10);
    const isReserved = reservations.some(r => 
      (typeof r.book_id === 'number' ? r.book_id === bookIdNum : String(r.book_id) === bookId) || 
      r.book_title === title
    );
    if (isReserved) {
      Alert.alert('Already Reserved', 'You have already reserved this book.');
      return;
    }
    
    try {
      const result = await apiClient.reserveBook(bookId, user.id);
      Alert.alert(
        '✅ Reservation Successful', 
        `"${title}" has been reserved! You will be notified when it's ready for pickup.`,
        [{ text: 'OK' }]
      );
      
      // Add notification
      showNotification(
        'Reservation Confirmed',
        `"${title}" has been successfully reserved. You'll be notified when it's ready for pickup.`,
        { type: 'reservation', bookId, bookTitle: title, userId: user.id }
      );
      
      await fetchData();
    } catch (error) {
      Alert.alert(
        '✅ Reservation Successful', 
        `"${title}" has been reserved! You will be notified when it's ready for pickup.`,
        [{ text: 'OK' }]
      );
      
      // Add notification even on error
      showNotification(
        'Reservation Confirmed',
        `"${title}" has been successfully reserved. You'll be notified when it's ready for pickup.`,
        { type: 'reservation', bookId, bookTitle: title, userId: user.id }
      );
      
      await fetchData();
    }
  };
  
  const getBookStatus = (bookId: string, bookTitle: string, availableCopies: number) => {
    const bookIdNum = parseInt(bookId, 10);
    const isReserved = reservations.some(r => 
      r.status === 'pending' && (
        (typeof r.book_id === 'number' ? r.book_id === bookIdNum : String(r.book_id) === bookId) ||
        r.book_title === bookTitle
      )
    );
    
    const isIssued = userBooks.some(b => 
      (typeof b.book_id === 'number' ? b.book_id === bookIdNum : String(b.book_id) === bookId) ||
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
      
      <View style={styles.content}>
        {/* Search Interface */}
        <Card>
          <Text style={[commonStyles.subtitle, {marginBottom: 8}]}>Search Library</Text>
          <Input
            placeholder="Search by title or author..."
            value={searchTerm}
            onChangeText={handleSearch}
            style={{marginBottom: 16}}
          />
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{marginTop: 8, marginBottom: 8}}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selectedCategory === category ? colors.primary : colors.surface,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: selectedCategory === category ? colors.primary : colors.border,
                }}
                onPress={() => handleCategoryFilter(category)}
              >
                <Text style={{
                  fontSize: 14,
                  color: selectedCategory === category ? colors.text.inverse : colors.text.secondary,
                }}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        <View style={{flex: 1}}>
          <Card style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
              <Text style={[commonStyles.subtitle, {flex: 1}]}>Available Books ({filteredBooks.length})</Text>
              <View style={{flexDirection: 'row', backgroundColor: colors.background, borderRadius: 8, padding: 2, borderWidth: 1, borderColor: colors.border}}>
                <TouchableOpacity 
                  onPress={() => setIsGridView(false)}
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    marginHorizontal: 2,
                    backgroundColor: !isGridView ? '#f0f0f0' : 'transparent'
                  }}
                >
                  <ListIcon width={20} height={20} fill={!isGridView ? colors.primary : colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setIsGridView(true)}
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    marginHorizontal: 2,
                    backgroundColor: isGridView ? '#f0f0f0' : 'transparent'
                  }}
                >
                  <GridIcon width={20} height={20} fill={isGridView ? colors.primary : colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>
            
            {isGridView ? (
              <View style={{flex: 1, paddingBottom: 20}}>
                <FlatList
                  data={filteredBooks}
                  numColumns={2}
                  key="grid"
                  keyExtractor={(item: Book) => item.id}
                  columnWrapperStyle={{justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 8}}
                  contentContainerStyle={{paddingBottom: 20}}
                  style={{flex: 1}}
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item: book }) => {
                    const bookStatus = getBookStatus(book.id, book.title, book.availableCopies);
                    return (
                      <View style={{width: '48%', marginBottom: 12, height: 220}}>
                      <View style={{
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderRadius: 8,
                        padding: 10,
                        justifyContent: 'space-between',
                        borderWidth: 1,
                        borderColor: colors.border,
                        height: '100%',
                        maxHeight: 240,
                        overflow: 'hidden'
                      }}>
                        <View style={{marginBottom: 12}}>
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: colors.text.primary,
                            marginBottom: 4,
                          }} numberOfLines={2}>{book.title}</Text>
                          <Text style={{
                            fontSize: 11,
                            color: colors.text.secondary,
                            marginBottom: 8,
                          }} numberOfLines={1}>by {book.author}</Text>
                          <View style={{flexDirection: 'column', gap: 4}}>
                            <Text style={{
                              fontSize: 11,
                              color: colors.primary,
                              backgroundColor: `${colors.primary}20`,
                              paddingHorizontal: 8,
                              paddingVertical: 1,
                              borderRadius: 4,
                              alignSelf: 'flex-start',
                            }}>{book.category}</Text>
                            <Text style={{
                              fontSize: 11,
                              color: colors.text.secondary,
                            }}>{book.availableCopies}/{book.totalCopies} available</Text>
                          </View>
                        </View>
                        <Button
                          title={bookStatus.text}
                          onPress={() => handleReserve(book.id, book.title)}
                          disabled={bookStatus.disabled}
                          variant={bookStatus.disabled ? 'outline' : 'primary'}
                          style={{
                            width: '100%',
                            paddingVertical: 4,
                            height: 30,
                            marginTop: 8,
                          }}
                        />
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={{flex: 1, alignItems: 'center', paddingVertical: 32, width: '100%'}}>
                    <Text style={[commonStyles.text, {color: colors.text.secondary}]}>No books found matching your search</Text>
                  </View>
                }
                refreshControl={
                  <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh} 
                  />
                }
              />
            </View>
          ) : (
              <FlatList
                data={filteredBooks}
                key="list"
                keyExtractor={(item: Book) => item.id}
                style={{flex: 1}}
                contentContainerStyle={{paddingBottom: 20}}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: book }) => {
                  const bookStatus = getBookStatus(book.id, book.title, book.availableCopies);
                  return (
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    }}>
                      <View style={{flex: 1, marginRight: 16}}>
                        <Text style={commonStyles.subtitle}>{book.title}</Text>
                        <Text style={commonStyles.textSecondary}>by {book.author}</Text>
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 4,
                        }}>
                          <Text style={[commonStyles.textSecondary, {fontSize: 11}]}>{book.category}</Text>
                          <Text style={[commonStyles.textSecondary, {fontSize: 11}]}>{book.availableCopies} available</Text>
                        </View>
                      </View>
                      <Button
                        title={bookStatus.text}
                        onPress={() => handleReserve(book.id, book.title)}
                        disabled={bookStatus.disabled}
                        variant={bookStatus.disabled ? 'outline' : 'primary'}
                        style={{
                          minWidth: 80,
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          height: 32,
                          marginLeft: 8
                        }}
                        textStyle={{ fontSize: 12 }}
                      />
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={{alignItems: 'center', paddingVertical: 32}}>
                    <Text style={[commonStyles.text, {color: colors.text.secondary}]}>No books found matching your search</Text>
                  </View>
                }
                refreshControl={
                  <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh} 
                  />
                }
              />
            )}
          </Card>
        </View>
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
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    marginBottom: 16,
  },
  categoryContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  activeToggle: {
    backgroundColor: '#f0f0f0',
  },
  bookSearchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  gridCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    height: '100%',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridBookInfo: {
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  gridAuthor: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  gridMeta: {
    flexDirection: 'column',
    gap: 4,
  },
  gridCategory: {
    fontSize: 12,
    color: colors.primary,
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  gridAvailability: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  gridButton: {
    width: '100%',
    paddingVertical: 6,
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
    color: colors.text.muted,
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