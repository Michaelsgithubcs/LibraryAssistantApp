import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, Image, FlatList, Linking } from 'react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User } from '../types';
import { SkeletonBox, SkeletonLines } from '../components/Skeleton';

interface EbookStoreScreenProps {
  user: User;
  navigation: any;
}

interface Ebook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  ia?: string[];
}

export const EbookStoreScreen: React.FC<EbookStoreScreenProps> = ({ user, navigation }) => {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [searchTerm, setSearchTerm] = useState('fiction');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEbooks();
  }, []);

  // Refresh ebooks when screen/tab is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchEbooks();
    }, [searchTerm])
  );

  const fetchEbooks = async () => {
    try {
      const query = searchTerm || 'fiction';
      console.log(`Fetching ebooks with query: ${query}`);
      
      // Using a CORS proxy to avoid network issues
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&has_fulltext=true&limit=20`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const data = await response.json();
      
      const availableBooks = (data.docs || [])
        .filter((book: any) => 
          book && 
          book.key && 
          book.title && 
          typeof book.title === 'string' &&
          book.ia && 
          Array.isArray(book.ia) && 
          book.ia.length > 0
        )
        .map((book: any) => ({
          ...book,
          key: String(book.key || ''),
          title: String(book.title || ''),
          author_name: Array.isArray(book.author_name) ? book.author_name : [],
          first_publish_year: book.first_publish_year ? Number(book.first_publish_year) : undefined
        }))
        .slice(0, 20);
      
      setEbooks(availableBooks);
    } catch (error) {
      console.error('Error loading ebooks:', error);
      setEbooks([]);
      Alert.alert('Error', 'Failed to load ebooks. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEbooks();
    setRefreshing(false);
  };

  const handleSearch = () => {
    setLoading(true);
    fetchEbooks();
  };

  const handleDownload = async (book: Ebook) => {
    // Try to open the book on Open Library or Internet Archive
    const bookId = book.key.replace('/works/', '');
    const openLibraryUrl = `https://openlibrary.org${book.key}`;
    
    // If the book has Internet Archive links, prefer those
    let readUrl = openLibraryUrl;
    if (book.ia && book.ia.length > 0) {
      readUrl = `https://archive.org/details/${book.ia[0]}`;
    }
    
    Alert.alert(
      'Read Ebook',
      `"${book.title}" will open in your browser.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Book', 
          onPress: async () => {
            try {
              // Direct open without checking - Android sometimes fails canOpenURL check
              await Linking.openURL(readUrl);
            } catch (error) {
              Alert.alert(
                'Error', 
                `Failed to open the book. URL: ${readUrl}\n\nPlease copy and paste this URL in your browser.`,
                [
                  { text: 'OK' }
                ]
              );
              console.error('Error opening book:', error);
            }
          }
        }
      ]
    );
  };

  const getCoverUrl = (coverId: number) => {
    return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
  };

  const getAuthors = (authors: string[] | undefined) => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    return authors.slice(0, 2).join(', ');
  };

  const renderBook = ({ item }: { item: Ebook }) => {
    try {
      if (!item || !item.title || !item.key) {
        return (
          <View style={styles.bookCard}>
            <View style={[styles.bookCover, styles.placeholderCover]}>
              <Text style={styles.placeholderText}>📚</Text>
            </View>
            <Text style={styles.bookTitle}>Loading...</Text>
          </View>
        );
      }
      
      return (
        <View style={styles.bookCard}>
          {item.cover_i ? (
            <Image
              source={{ uri: getCoverUrl(item.cover_i) }}
              style={styles.bookCover}
              resizeMode="cover"
              onError={() => {}}
            />
          ) : (
            <View style={[styles.bookCover, styles.placeholderCover]}>
              <Text style={styles.placeholderText}>📚</Text>
            </View>
          )}
          <Text style={styles.bookTitle} numberOfLines={2}>
            {String(item.title || 'Unknown Title')}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {getAuthors(item.author_name)}
          </Text>
          {item.first_publish_year && (
            <Text style={styles.bookYear}>{String(item.first_publish_year)}</Text>
          )}
          <Text style={styles.freeLabel}>FREE</Text>
          <Button
            title="Download"
            onPress={() => handleDownload(item)}
            style={styles.downloadButton}
          />
        </View>
      );
    } catch (error) {
      console.error('Render error for book:', error);
      return (
        <View style={styles.bookCard}>
          <View style={[styles.bookCover, styles.placeholderCover]}>
            <Text style={styles.placeholderText}>📚</Text>
          </View>
          <Text style={styles.bookTitle}>Error loading book</Text>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>EStore</Text>
        </View>
        <View style={styles.content}>
          <Card>
            <SkeletonLines lines={2} />
            <View style={{ height: 12 }} />
            <SkeletonBox height={40} />
            <View style={{ height: 12 }} />
            <SkeletonBox width={120} height={36} />
          </Card>
          <View style={styles.gridContainer}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.bookCard}>
                <SkeletonBox style={styles.bookCover} />
                <SkeletonBox width={'80%'} height={14} />
                <View style={{ height: 6 }} />
                <SkeletonBox width={'60%'} height={12} />
                <View style={{ height: 6 }} />
                <SkeletonBox width={50} height={12} />
                <View style={{ height: 8 }} />
                <SkeletonBox width={80} height={28} radius={6} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EStore</Text>
      </View>
      
      <View style={styles.content}>
        <Card>
          <Text style={commonStyles.subtitle}>Free Ebook Store</Text>
          <Text style={commonStyles.textSecondary}>Discover thousands of free books</Text>
          <Input
            placeholder="Search for books..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
          />
          <Button
            title="Search"
            onPress={handleSearch}
            style={styles.searchButton}
          />
        </Card>

        <FlatList
          data={ebooks}
          renderItem={renderBook}
          keyExtractor={(item, index) => item?.key ? String(item.key) : `book-${index}`}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={() => (
            <Card>
              <View style={styles.emptyState}>
                <Text style={commonStyles.textSecondary}>No ebooks found</Text>
                <Text style={commonStyles.textMuted}>Try searching for different keywords</Text>
                <Button
                  title="Search Fiction"
                  onPress={() => {
                    setSearchTerm('fiction');
                    handleSearch();
                  }}
                  style={styles.emptyButton}
                />
              </View>
            </Card>
          )}
        />
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
  
  searchInput: {
    marginTop: 12,
  },
  
  searchButton: {
    paddingHorizontal: 20,
  },
  
  gridContainer: {
    padding: 8,
  },
  
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  
  bookCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    width: '48%',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 6,
    backgroundColor: colors.background,
    marginBottom: 8,
  },
  
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 36,
  },
  
  bookAuthor: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  
  bookYear: {
    fontSize: 11,
    color: colors.text.muted,
    marginBottom: 8,
  },
  
  freeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 8,
  },
  
  downloadButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 32,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  
  emptyButton: {
    marginTop: 16,
  },
  
  placeholderCover: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  placeholderText: {
    fontSize: 32,
    opacity: 0.5,
  },
});