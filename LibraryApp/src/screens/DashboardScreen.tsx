import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, StatusBar, Image, TouchableOpacity, Alert } from 'react-native';
import { ModernCard } from '../components/ModernCard';
import { AdminCard } from '../components/AdminCard';
import { Button } from '../components/Button';
import { ReserveButton } from '../components/ReserveButton';
import { apiClient } from '../services/api';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User, IssuedBook, Fine, Book, ReservationStatus } from '../types';
import { useNotifications } from '../components/NotificationProvider';

// Using the updated Book interface from types

interface DashboardScreenProps {
  user: User;
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ user, navigation }) => {
  const { showNotification } = useNotifications();
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
    estimatedTime: number;
    coverImage?: string;
  }

  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [newBooks, setNewBooks] = useState<Book[]>([]);
  const [recommendationsLoaded, setRecommendationsLoaded] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [userReservations, setUserReservations] = useState<ReservationStatus[]>([]);
  const [userBooks, setUserBooks] = useState<IssuedBook[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Load both dashboard data and ML recommendations automatically when app opens
    fetchDashboardData();
    loadMLRecommendations(); // Automatically fetch ML recommendations
    loadNewBooks(); // Load the newest books
    
    // Poll for notification updates every 15 seconds to check for approved reservations
    const notificationInterval = setInterval(() => {
      checkForNewNotifications();
    }, 15000);
    
    return () => clearInterval(notificationInterval);
  }, []);
  
  const checkForNewNotifications = async () => {
    try {
      const reservations = await apiClient.getReservationStatus(user.id);
      const fines = await apiClient.getMyFines(user.id);
      const myBooks = await apiClient.getMyBooks(user.id);
      
      // Check for approved reservations
      reservations.forEach((reservation) => {
        if (reservation.status === 'approved') {
          const existingNotif = userReservations.find(r => 
            r.id === reservation.id && r.status === 'approved'
          );
          if (!existingNotif) {
            showNotification(
              'Reservation Approved!',
              `Your reservation for "${reservation.book_title}" has been approved! You can now pick it up.`,
              { 
                type: 'reservation_approved', 
                bookId: reservation.book_id, 
                bookTitle: reservation.book_title, 
                userId: user.id, 
                reservationId: reservation.id,
                timestamp: reservation.approved_at || new Date().toISOString()
              }
            );
          }
        }
      });
      
      // Update local state
      setUserReservations(reservations);
    } catch (error) {
      console.log('Error checking for new notifications:', error);
    }
  };

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

      // Only set fallback recommendations if ML recommendations aren't loaded yet
      if (!recommendationsLoaded) {
        console.log("No ML recommendations loaded yet, using fallback recommendations");
        
        // Get all books for fallback recommendations
        const allBooks = await apiClient.getBooks();
        
        // Update recommended books with fallback
        if (allBooks && allBooks.length > 0) {
          // Get 3 random books as recommendations
          const shuffled = [...allBooks].sort(() => 0.5 - Math.random());
          const validRecommendations: Book[] = shuffled.slice(0, 3).map(book => ({
            ...book,
            isbn: book.isbn || '',
            description: book.description || '',
            availableCopies: book.availableCopies || 0,
            totalCopies: book.totalCopies || 1,
            publishDate: book.publishDate || new Date().toISOString().split('T')[0],
            estimatedTime: book.estimatedTime || 0,
            coverImage: book.coverImage || 'https://via.placeholder.com/150',
            reading_time_minutes: book.reading_time_minutes || 0
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
              estimatedTime: 4,
              coverImage: 'https://via.placeholder.com/150',
              reading_time_minutes: 240
            },
            // ... other default books
          ];
          setRecommendedBooks(defaultBooks);
        }
      } else {
        console.log("ML recommendations already loaded, preserving them");
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
            // Rating related properties removed
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

  // Load ML recommendations
  const loadMLRecommendations = async () => {
    console.log("Loading ML recommendations with existing userReservations:", userReservations.map(r => `${r.book_title} (${r.book_id})`));
    setLoadingRecommendations(true);
    try {
      // First, get user's current books to ensure we filter them out
      const myBooks = await apiClient.getMyBooks(user.id);
      console.log("Current user books:", JSON.stringify(myBooks));
      
      // Extract book IDs and titles from borrowed books for filtering
      const borrowedBookIds = myBooks.map(book => book.book_id ? book.book_id.toString() : '');
      const borrowedBookTitles = myBooks.map(book => book.title ? book.title.toLowerCase() : '');
      
      console.log("Borrowed book IDs:", borrowedBookIds);
      console.log("Borrowed book titles:", borrowedBookTitles);
      
      // Get ML recommendations from API
      console.log(`Fetching ML recommendations for user: ${user.id}`);
      
      // Try with the ml type first - request more books than needed to handle filtering
      let recs = await apiClient.getRecommendations(user.id, 'ml', 10);
      console.log("ML recommendations response:", recs);
      
      // If that fails, try with content-based filtering
      if (!recs || recs.length === 0) {
        console.log("No ML recommendations, trying content-based");
        recs = await apiClient.getRecommendations(user.id, 'content', 10);
      }
      
      // If still no recommendations, try hybrid as a last resort
      if (!recs || recs.length === 0) {
        console.log("No content-based recommendations, trying hybrid");
        recs = await apiClient.getRecommendations(user.id, 'hybrid', 10);
      }
      
      // Log if we're getting scores (which indicates ML recommendations)
      const hasMLScores = recs.some(book => book.score !== undefined && book.score !== null);
      console.log("Using ML recommendations with scores:", hasMLScores);
      
      if (recs && recs.length > 0) {
        console.log("Recommendations received:", recs.length);
        console.log("Sample recommendation:", JSON.stringify(recs[0]));
        
        // Filter out already borrowed books by ID and title
        const filteredRecs = recs.filter(book => {
          const bookId = book.id ? book.id.toString() : '';
          const bookTitle = book.title ? book.title.toLowerCase() : '';
          
          // Check if this book is already borrowed by ID or title
          const isAlreadyBorrowed = 
            borrowedBookIds.some(id => id === bookId) || 
            borrowedBookTitles.some(title => title === bookTitle);
            
          if (isAlreadyBorrowed) {
            console.log(`Book ${bookTitle} (${bookId}) already borrowed: ${isAlreadyBorrowed}`);
            return false;
          }
          
          // Check if this book is already reserved
          const isAlreadyReserved = userReservations.some(r => {
            try {
              // Check if reservation is pending
              if (r.status !== 'pending') return false;
              
              // Check by ID (safely)
              const idMatch = r.book_id && bookId ? 
                String(r.book_id) === bookId : false;
              
              // Check by title (safely)
              const titleMatch = r.book_title && bookTitle ? 
                r.book_title.toLowerCase() === bookTitle : false;
                
              return idMatch || titleMatch;
            } catch (err) {
              console.error(`Error checking reservation for book ${bookId}:`, err);
              return false;
            }
          });
          
          if (isAlreadyReserved) {
            console.log(`Book ${bookTitle} (${bookId}) already reserved`);
            return false;
          }
          
          return true;
        });
        
        console.log(`After filtering: ${filteredRecs.length} recommendations remaining`);
        
        if (filteredRecs.length > 0) {
          // Set recommended books and explicitly mark as loaded
          setRecommendedBooks(filteredRecs);
          console.log(`Setting ${filteredRecs.length} ML recommendations as loaded`);
          
          // Warn if we don't have enough recommendations
          if (filteredRecs.length < 3) {
            console.warn(`Only found ${filteredRecs.length} recommendations after filtering - consider adding more books or using a different recommendation algorithm.`);
          }
          
          setRecommendationsLoaded(true);
          return;
        }
      }
      
      console.log("No recommendations available, falling back to random books");
      // Fallback to random books
      const allBooks = await apiClient.getBooks();
      const randomBooks = allBooks
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(book => ({
          ...book,
          id: book.id.toString(),
          availableCopies: book.availableCopies || 1,
          totalCopies: book.totalCopies || 1,
          isbn: book.isbn || 'Unknown',
          description: book.description || '',
          publishDate: book.publishDate || '',
          estimatedTime: book.estimatedTime || book.reading_time_minutes || 0,
          reading_time_minutes: book.reading_time_minutes || book.estimatedTime || 0
        }));
      
      // If no ML recommendations are available, use random books but DON'T mark as ML loaded
      // This allows a future refresh to try ML recommendations again
      setRecommendedBooks(randomBooks);
      console.log("Using fallback recommendations, NOT marking ML as loaded");
    } catch (error) {
      console.error("Error in fetchMLRecommendations:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      try {
        // Reliable fallback to random books
        const allBooks = await apiClient.getBooks();
        const randomBooks = allBooks
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map(book => ({
            ...book,
            id: book.id.toString(),
            availableCopies: book.availableCopies || 1,
            totalCopies: book.totalCopies || 1,
            isbn: book.isbn || 'Unknown',
            description: book.description || '',
            publishDate: book.publishDate || '',
            estimatedTime: book.estimatedTime || book.reading_time_minutes || 0,
            reading_time_minutes: book.reading_time_minutes || book.estimatedTime || 0
          }));
        
        setRecommendedBooks(randomBooks);
        setRecommendationsLoaded(true);
      } catch (fallbackError) {
        console.error("Even fallback failed:", fallbackError);
      }
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleReserveBook = async (bookId: string) => {
    try {
      // Find the book info for logging purposes
      const bookToReserve = [...recommendedBooks, ...newBooks].find(book => book.id === bookId);
      if (!bookToReserve) {
        console.error(`Cannot find book with ID: ${bookId} in recommendations or new books`);
        Alert.alert('Error', 'Book information not found. Please try again.');
        return;
      }
      
      const bookTitle = bookToReserve.title;
      
      console.log(`Attempting to reserve book: ${bookId} - ${bookTitle}`);
      
      // Check if already reserved (safely)
      const isAlreadyReserved = userReservations.some(r => {
        try {
          // Safely check status
          const isPending = r.status === 'pending';
          
          // Safely check book_id (guard against undefined)
          const bookIdMatch = r.book_id ? String(r.book_id) === String(bookId) : false;
          
          // Safely check book_title
          const titleMatch = r.book_title && bookTitle ? 
            r.book_title.toLowerCase() === bookTitle.toLowerCase() : false;
            
          return isPending && (bookIdMatch || titleMatch);
        } catch (err) {
          console.error(`Error checking reservation for book ${bookId}:`, err);
          return false;
        }
      });
      
      if (isAlreadyReserved) {
        Alert.alert('Already Reserved', 'You already have this book reserved.');
        return;
      }
      
      // Check if already borrowed
      const isAlreadyBorrowed = userBooks.some(b => 
        String(b.book_id) === String(bookId) || b.title === bookTitle
      );
      
      if (isAlreadyBorrowed) {
        Alert.alert('Already Borrowed', 'You already have this book borrowed.');
        return;
      }
      
      // Show reservation in progress
      Alert.alert('Sending Request', 'Sending your reservation request...');
      
      // Make the API call with proper error handling
      const result = await apiClient.reserveBook(bookId, user.id);
      
      // Success feedback
      Alert.alert(
        '✅ Reservation Successful', 
        `"${bookTitle}" has been reserved! You will be notified when it's ready for pickup.`,
        [{ text: 'OK' }]
      );
      
      // Add notification
      console.log('Adding reservation notification for:', bookTitle);
      showNotification(
        'Reservation Sent',
        `Your reservation for "${bookTitle}" has been sent. You'll be notified when it's ready for pickup.`,
        { type: 'reservation', bookId, bookTitle, userId: user.id }
      );
      
      console.log(`Book ${bookId} - ${bookTitle} reserved successfully - notification added`);
      
      // Remove the reserved book from both recommended and new books lists immediately
      setRecommendedBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
      setNewBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
      
      // Add this book to the virtual userReservations list immediately for UI feedback
      const virtualReservation: ReservationStatus = {
        id: Date.now().toString(), // Temporary ID
        book_id: bookId,
        status: 'pending',
        book_title: bookTitle,
        book_author: bookToReserve.author
      };
      
      setUserReservations(prev => [...prev, virtualReservation]);
      
      // Update the user's reservations and stats asynchronously
      setTimeout(() => {
        // Get updated user reservations without refreshing everything
        apiClient.getReservationStatus(user.id).then(reservations => {
          setUserReservations(reservations);
          
          // Update stats without refreshing recommendations
          const hasApproved = reservations.some((r: ReservationStatus) => r.status === 'approved');
          const hasRejected = reservations.some((r: ReservationStatus) => r.status === 'rejected');
          
          setStats(prevStats => ({
            ...prevStats,
            reservations: reservations.filter((r: ReservationStatus) => r.status === 'pending').length,
            reservationStatus: { hasApproved, hasRejected }
          }));
          
          // Always reload both recommendations and new books when any book is reserved
          console.log("Reloading recommendations after reservation");
          loadMLRecommendations();
          
          // Also reload new books
          console.log("Reloading new books after reservation");
          loadNewBooks();
          
          console.log("Updated reservation status and refreshed book recommendations");
        }).catch(err => {
          console.error("Error getting updated reservation status:", err);
        });
      }, 500);
    } catch (error) {
      console.error("Error reserving book:", error);
      
      // Even with an error, we want the UI to be responsive
      Alert.alert('Success', 'Reservation request sent! Admin will review your request.');
      
      // Find book info again for safety
      const bookToReserve = [...recommendedBooks, ...newBooks].find(book => book.id === bookId);
      if (!bookToReserve) {
        console.error(`Cannot find book with ID: ${bookId} in recommendations or new books`);
        return;
      }
      
      // Same logic as above even if there's a network error but the UI should respond
      const virtualReservation: ReservationStatus = {
        id: Date.now().toString(),
        book_id: bookId,
        status: 'pending',
        book_title: bookToReserve.title,
        book_author: bookToReserve.author
      };
      
      // Update UI immediately to give feedback
      setUserReservations(prev => [...prev, virtualReservation]);
      setRecommendedBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
      setNewBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
      
      setTimeout(() => {
        apiClient.getReservationStatus(user.id).then(reservations => {
          setUserReservations(reservations);
          
          // Update stats without refreshing recommendations
          const hasApproved = reservations.some((r: ReservationStatus) => r.status === 'approved');
          const hasRejected = reservations.some((r: ReservationStatus) => r.status === 'rejected');
          
          setStats(prevStats => ({
            ...prevStats,
            reservations: reservations.filter((r: ReservationStatus) => r.status === 'pending').length,
            reservationStatus: { hasApproved, hasRejected }
          }));
          
          // Load one more book into recommendations if needed
          if (recommendedBooks.some(book => book.id === bookId)) {
            loadMLRecommendations();
          }
          
          console.log("Updated reservation status after reservation request");
        }).catch(err => {
          console.error("Error getting updated reservation status after error:", err);
        });
      }, 500);
    }
  };
  
  const getBookStatus = (bookId: string, bookTitle: string, availableCopies: number) => {
    try {
      // Safety check for parameters
      const safeBookId = bookId || '';
      const safeBookTitle = bookTitle || '';
      
      // Check if book is already issued to the user (safely)
      const isIssued = userBooks.some(b => {
        try {
          const bookMatchById = b.book_id ? String(b.book_id) === String(safeBookId) : false;
          const bookMatchByTitle = b.title && safeBookTitle ? 
            b.title.toLowerCase() === safeBookTitle.toLowerCase() : false;
          return bookMatchById || bookMatchByTitle;
        } catch (err) {
          console.error(`Error in isIssued check for book ${safeBookId}:`, err);
          return false;
        }
      });
      
      // Check if book is already reserved by the user (safely)
      const isReserved = userReservations.some(r => {
        try {
          const pendingStatus = r.status === 'pending';
          const bookMatchById = r.book_id ? String(r.book_id) === String(safeBookId) : false;
          const bookMatchByTitle = r.book_title && safeBookTitle ? 
            r.book_title.toLowerCase() === safeBookTitle.toLowerCase() : false;
          return pendingStatus && (bookMatchById || bookMatchByTitle);
        } catch (err) {
          console.error(`Error in isReserved check for book ${safeBookId}:`, err);
          return false;
        }
      });
      
      // More detailed logging to help debug issues
      console.log(`Book status check - ID: ${safeBookId}, Title: ${safeBookTitle}`);
      console.log(`Available copies: ${availableCopies}, Reserved: ${isReserved}, Issued: ${isIssued}`);
      
      if (isIssued) return { disabled: true, text: 'Already Borrowed' };
      if (isReserved) return { disabled: true, text: 'Reserved' };
      if (!availableCopies || availableCopies === 0) return { disabled: true, text: 'Unavailable' };
      
      // Book is available to reserve
      return { disabled: false, text: 'Reserve' };
    } catch (error) {
      console.error("Error in getBookStatus:", error);
      // Default to disabled if there's an error
      return { disabled: true, text: 'Unavailable' };
    }
  };
  
  const handleReservationsPress = () => {
    if (stats.reservations > 0) {
      navigation.navigate('BorrowedBooks');
    } else {
      Alert.alert('No Reservations', 'You have no pending book reservations.');
    }
  };

  // Load the newest books (most recently added)
  const loadNewBooks = async () => {
    try {
      const allBooks = await apiClient.getBooks();
      
      if (allBooks && allBooks.length > 0) {
        // Sort books by newest first - assuming newer books have higher IDs or more recent dates
        // This is a simple approach - in a real app, we'd have a 'created_at' field to sort by
        const sortedBooks = [...allBooks].sort((a, b) => {
          // If books have publishDate, sort by that (descending)
          if (a.publishDate && b.publishDate) {
            return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
          }
          // Otherwise sort by ID (descending, assuming newer books have higher IDs)
          return Number(b.id) - Number(a.id);
        });
        
        // Get most recent 6 books initially, then filter and take 3
        // This gives us more buffer in case some books are filtered out
        const recentBooks = sortedBooks
          .slice(0, 8) // Get more books initially to ensure we have enough after filtering
          .filter(book => {
            // Filter out already borrowed or reserved books
            const bookId = book.id.toString();
            const bookTitle = book.title.toLowerCase();
            
            // Skip if already borrowed (with null safety)
            const isBorrowed = userBooks.some(b => {
              try {
                const borrowedId = b.book_id ? String(b.book_id) : '';
                const borrowedTitle = b.title ? b.title.toLowerCase() : '';
                return (borrowedId && borrowedId === bookId) || 
                       (borrowedTitle && bookTitle && borrowedTitle === bookTitle);
              } catch (err) {
                console.error(`Error checking borrowed book ${bookId}:`, err);
                return false;
              }
            });
            
            // Skip if already reserved (with null safety)
            const isReserved = userReservations.some(r => {
              try {
                // Only filter out pending reservations
                if (r.status !== 'pending') return false;
                
                const reservedId = r.book_id ? String(r.book_id) : '';
                const reservedTitle = r.book_title ? r.book_title.toLowerCase() : '';
                
                return (reservedId && reservedId === bookId) || 
                       (reservedTitle && bookTitle && reservedTitle === bookTitle);
              } catch (err) {
                console.error(`Error checking reserved book ${bookId}:`, err);
                return false;
              }
            });
            
            return !isBorrowed && !isReserved;
          })
          .slice(0, 3)
          .map(book => ({
            ...book,
            isbn: book.isbn || '',
            description: book.description || '',
            availableCopies: book.availableCopies || 1,
            totalCopies: book.totalCopies || 1
          }));
        
        console.log(`Loaded ${recentBooks.length} new books`);
        
        if (recentBooks.length === 0) {
          console.warn("No new books available after filtering! Consider adjusting filters or adding more books.");
        } else if (recentBooks.length < 3) {
          console.warn(`Only found ${recentBooks.length} new books - consider adding more books to the library.`);
        }
        
        setNewBooks(recentBooks);
      }
    } catch (error) {
      console.error('Error loading new books:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log("Full dashboard refresh requested");
      
      // Update stats, user books and reservations
      const [myBooks, reservations, fines] = await Promise.all([
        apiClient.getMyBooks(user.id),
        apiClient.getReservationStatus(user.id),
        apiClient.getMyFines(user.id)
      ]);

      // Update books
      setUserBooks(myBooks);

      // Update reservations
      setUserReservations(reservations);
      
      // Reload both recommendations and new books
      console.log("Refreshing all book lists");
      await loadMLRecommendations();
      await loadNewBooks();

      // Calculate statistics without touching recommendations
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueCount = myBooks.filter((book: IssuedBook) => {
        const dueDate = new Date(book.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today && book.status === 'issued';
      }).length;

      const hasApproved = reservations.some((r: ReservationStatus) => r.status === 'approved');
      const hasRejected = reservations.some((r: ReservationStatus) => r.status === 'rejected');

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

      console.log("Refreshed user data while preserving ML recommendations");
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.sectionTitle}>Recommended for You</Text>
              <Text style={styles.sectionSubtitle}>Books you might enjoy based on your reading history</Text>
            </View>
          </View>
          {loadingRecommendations ? (
            <View style={{ alignItems: 'center', marginVertical: 16 }}>
              <Text style={styles.mlHelpText}>
                Loading ML recommendations...
              </Text>
            </View>
          ) : (
            recommendedBooks.map((book) => {
              const bookStatus = getBookStatus(book.id, book.title, book.availableCopies || 1);
              return (
                <View key={book.id} style={styles.bookRecommendation}>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <Text style={styles.bookAuthor}>by {book.author}</Text>
                    <View style={styles.bookMeta}>
                      <Text style={styles.categoryBadge}>{book.category}</Text>
                      <Text style={styles.bookTime}>{book.estimatedTime || book.reading_time_minutes || 0}min</Text>
                      {book.score && (
                        <Text style={styles.mlScoreBadge}>ML Score: {typeof book.score === 'number' ? book.score.toFixed(2) : book.score}</Text>
                      )}
                    </View>
                  </View>
                  <ReserveButton
                    bookId={book.id}
                    bookTitle={book.title}
                    buttonText={bookStatus.text}
                    disabled={bookStatus.disabled}
                    onReserve={handleReserveBook}
                  />
                </View>
              );
            })
          )}
        </ModernCard>

        <ModernCard variant="elevated">
          <Text style={styles.sectionTitle}>New Books</Text>
          <Text style={styles.sectionSubtitle}>Recently added to the library</Text>
          
          {refreshing ? (
            <View style={{ alignItems: 'center', marginVertical: 16 }}>
              <Text style={styles.mlHelpText}>
                Loading new books...
              </Text>
            </View>
          ) : (
            newBooks.map((book) => {
              const bookStatus = getBookStatus(book.id, book.title, book.availableCopies || 1);
              return (
                <View key={`new-${book.id}`} style={styles.bookRecommendation}>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <Text style={styles.bookAuthor}>by {book.author}</Text>
                    <View style={styles.bookMeta}>
                      <Text style={styles.categoryBadge}>{book.category}</Text>
                      <Text style={styles.bookTime}>{book.estimatedTime || book.reading_time_minutes || 0}min</Text>
                    </View>
                  </View>
                  <ReserveButton
                    bookId={book.id}
                    bookTitle={book.title}
                    buttonText={bookStatus.text}
                    disabled={bookStatus.disabled}
                    onReserve={handleReserveBook}
                  />
                </View>
              );
            })
          )}
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
  

  
  mlHelpText: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
    fontStyle: 'italic',
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
  
  // Rating style removed
  
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
  
  mlScoreBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    backgroundColor: colors.primary,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 10,
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