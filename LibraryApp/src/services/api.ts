import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, IssuedBook, User, ReservationStatus, Fine, HistoryItem } from '../types';

// Android emulator API URL (10.0.2.2 is the host machine's localhost)
export const API_BASE = 'http://10.0.2.2:5001/api'; 

export const apiClient = {
  async login(email: string, password: string): Promise<User> {
    console.log('API: Starting login request to:', `${API_BASE}/auth/login`);
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('API: Login request timed out');
      controller.abort();
    }, 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('API: Login response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('API: Login failed with error:', error);
        throw new Error(error.error || 'Login failed');
      }
      
      const data = await response.json();
      console.log('API: Login successful, user data received');
      
      if (data.id) {
        await AsyncStorage.setItem('user', JSON.stringify(data));
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API: Login request failed:', error);
      throw error;
    }
  },

  async getBooks(): Promise<Book[]> {
    try {
      const response = await fetch(`${API_BASE}/books`);
      if (!response.ok) {
        // Return demo data if API fails
        return this.getDemoBooks();
      }
      
      const data = await response.json();
      return data.map((book: any) => ({
        id: book.id.toString(),
        title: book.title,
        author: book.author,
        isbn: book.isbn || 'Auto-generated',
        category: book.category,
        description: book.description || '',
        availableCopies: book.available_copies || 1,
        totalCopies: book.total_copies || 1,
        publishDate: book.publish_date || '',
        avg_rating: book.avg_rating || 0,
        rating_count: book.rating_count || 0
      }));
    } catch (error) {
      return this.getDemoBooks();
    }
  },

  getDemoBooks(): Book[] {
    return [
      {
        id: '1',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '978-0-7432-7356-5',
        category: 'Fiction',
        description: 'A classic American novel set in the Jazz Age.',
        availableCopies: 3,
        totalCopies: 5,
        publishDate: '1925',
        avg_rating: 4.2,
        rating_count: 156
      },
      {
        id: '2',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '978-0-06-112008-4',
        category: 'Fiction',
        description: 'A gripping tale of racial injustice and childhood innocence.',
        availableCopies: 2,
        totalCopies: 4,
        publishDate: '1960',
        avg_rating: 4.5,
        rating_count: 203
      },
      {
        id: '3',
        title: '1984',
        author: 'George Orwell',
        isbn: '978-0-452-28423-4',
        category: 'Science Fiction',
        description: 'A dystopian social science fiction novel.',
        availableCopies: 1,
        totalCopies: 3,
        publishDate: '1949',
        avg_rating: 4.3,
        rating_count: 189
      }
    ];
  },

  async getMyBooks(userId: number): Promise<IssuedBook[]> {
    try {
      const response = await fetch(`${API_BASE}/user/${userId}/issued-books`);
      if (!response.ok) return [];
      return response.json();
    } catch (error) {
      return [];
    }
  },

  async getMyFines(userId: number): Promise<Fine[]> {
    try {
      const response = await fetch(`${API_BASE}/user/${userId}/fines`);
      if (!response.ok) return [];
      const finesData = await response.json();
      console.log('API Fines Response:', finesData);
      return finesData;
    } catch (error) {
      console.log('Fines API Error:', error);
      return [];
    }
  },

  async getReservationStatus(userId: number): Promise<ReservationStatus[]> {
    try {
      const response = await fetch(`${API_BASE}/user/${userId}/reservations`);
      if (!response.ok) return [];
      const data = await response.json();
      console.log('Reservation status data:', data); // Debug log
      return data;
    } catch (error) {
      console.log('Reservation status error:', error);
      return [];
    }
  },

  async getReservationHistory(userId: number): Promise<ReservationStatus[]> {
    try {
      const response = await fetch(`${API_BASE}/user/${userId}/reservations/all`);
      if (!response.ok) return [];
      const data = await response.json();
      return data;
    } catch (error) {
      console.log('Reservation history error:', error);
      return [];
    }
  },

  async reserveBook(bookId: string, userId: number): Promise<{ status: string; message?: string; reason?: string }> {
    try {
      console.log(`API Request: Reserving book ${bookId} for user ${userId}`);
      
      const response = await fetch(`${API_BASE}/books/${bookId}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      
      // Log detailed response information
      console.log(`Reserve response status: ${response.status}, ${response.statusText}`);
      
      const result = await response.json();
      console.log('Reserve response data:', result);
      
      if (!response.ok) {
        console.log(`Non-OK response: ${response.status}`);
        return { status: 'error', message: result.error || 'Failed to reserve book' };
      }
      
      return result;
    } catch (error) {
      console.log('Reserve error:', error);
      return { status: 'error', message: 'Failed to reserve book' };
    }
  },

  async cancelReservation(reservationId: number): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE}/reservations/${reservationId}/cancel`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel reservation');
      }
      
      return response.json();
    } catch (error) {
      throw new Error('Failed to cancel reservation');
    }
  },
  
  async markBookAsRead(issueId: number, userId: number): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE}/issues/${issueId}/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark book as read');
      }
      
      return response.json();
    } catch (error) {
      throw new Error('Failed to mark book as read');
    }
  },
  
  async getReadHistory(userId: number): Promise<IssuedBook[]> {
    try {
      const response = await fetch(`${API_BASE}/user/${userId}/read-history`);
      if (!response.ok) {
        throw new Error('Failed to fetch read history');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching read history:', error);
      return [];
    }
  },
  
  async getAllUserHistory(userId: number): Promise<{success: boolean, history: HistoryItem[]}> {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch complete history');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching complete history:', error);
      return { success: false, history: [] };
    }
  },

  async getRecommendations(userId: number, type: 'ml' | 'hybrid' | 'collaborative' | 'content' = 'ml', limit: number = 5): Promise<Book[]> {
    try {
      console.log(`Fetching recommendations for user ${userId} with type ${type} and limit ${limit}`);
      
      // Get user's borrowed books to filter out
      const myBooks = await this.getMyBooks(userId);
      const borrowedBookIds = myBooks.map(book => book.book_id ? book.book_id.toString() : '');
      const borrowedBookTitles = myBooks.map(book => book.title ? book.title.toLowerCase() : '');
      console.log('Already borrowed books IDs:', borrowedBookIds);
      console.log('Already borrowed books titles:', borrowedBookTitles);
      
      // Get recommendations from API - request significantly more books to account for filtering
      const response = await fetch(`${API_BASE}/recommendations/${userId}?type=${type}&limit=${limit+15}`); // Get extra to account for filtering
      if (!response.ok) {
        console.error('Recommendations API returned error:', response.status);
        return [];
      }
      
      const data = await response.json();
      console.log('Recommendation API response:', data);
      
      if (!data.success && !data.recommendations) {
        console.error('No recommendations data found');
        return [];
      }
      
      // Support both { recommendations: [...] } and just an array
      const recs = data.recommendations || data;
      
      if (!Array.isArray(recs)) {
        console.error('Recommendations data is not an array:', recs);
        return [];
      }
      
      // Map and filter out already borrowed books
      const mappedRecs = recs
        .filter(book => book && typeof book === 'object') // Only process valid book objects
        .map((book: any) => ({
          id: book.id ? book.id.toString() : '',
          title: book.title || 'Unknown Title',
          author: book.author || 'Unknown Author',
          category: book.category || 'Uncategorized',
          description: book.description || '',
          isbn: book.isbn || 'Unknown ISBN',
          availableCopies: book.available_copies || book.availableCopies || 1,
          totalCopies: book.total_copies || book.totalCopies || 1,
          publishDate: book.publish_date || book.publishDate || '',
          coverImage: book.cover_image || book.coverImage || '',
          estimatedTime: book.estimatedTime || book.reading_time_minutes || 0,
          avg_rating: book.avg_rating || book.rating || 0,
          rating_count: book.rating_count || 0,
          reading_time_minutes: book.reading_time_minutes || book.estimatedTime || 0,
          score: book.score || null // Include the ML score if available
        }))
        .filter((book) => {
          // Check if book is already borrowed, by ID or by title
          const bookId = book.id;
          const bookTitle = book.title.toLowerCase();
          
          // Skip books that match by ID or title
          const isAlreadyBorrowed = 
            borrowedBookIds.some(id => id === bookId) || 
            borrowedBookTitles.some(title => bookTitle.includes(title) || title.includes(bookTitle));
          
          return bookId && !isAlreadyBorrowed;
        })
        .slice(0, limit); // Only return the requested number of books
      
      console.log(`Returning ${mappedRecs.length} filtered recommendations`);
      return mappedRecs;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  },

  async updateUserEmail(userId: number, newEmail: string, currentPassword: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE}/user/${userId}/update-email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          new_email: newEmail,
          current_password: currentPassword
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update email');
      }
      
      return response.json();
    } catch (error) {
      throw new Error('Failed to update email');
    }
  },
  
  async updateUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE}/user/${userId}/update-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update password');
      }
      
      return response.json();
    } catch (error) {
      throw new Error('Failed to update password');
    }
  },

  // ==================== CHAT HISTORY METHODS ====================
  
  async getConversations(userId: number) {
    const response = await fetch(`${API_BASE}/chat/conversations?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
  },

  async createConversation(userId: number, conversationType: 'book' | 'library', bookId?: number, title?: string) {
    const response = await fetch(`${API_BASE}/chat/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        book_id: bookId,
        conversation_type: conversationType,
        title: title
      })
    });
    if (!response.ok) throw new Error('Failed to create conversation');
    return response.json();
  },

  async getMessages(conversationId: number) {
    const response = await fetch(`${API_BASE}/chat/messages/${conversationId}`);
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  },

  async saveMessage(
    conversationId: number,
    userId: number,
    messageText: string,
    isUserMessage: boolean = true,
    replyToId?: number
  ) {
    const response = await fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        user_id: userId,
        message_text: messageText,
        is_user_message: isUserMessage,
        reply_to_id: replyToId
      })
    });
    if (!response.ok) throw new Error('Failed to save message');
    return response.json();
  },

  async deleteConversation(conversationId: number, userId: number) {
    const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}?user_id=${userId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete conversation');
    return response.json();
  }
};

// AI helpers
export interface AiBookContext {
  title: string;
  author: string;
  description?: string;
  category?: string;
}

export async function askBookAssistant(book: AiBookContext, question: string): Promise<string> {
  try {
    // Create a timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(`${API_BASE}/ai/book-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book, question }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'AI request failed');
    }
    const data = await response.json();
    return data.answer || 'No answer returned.';
  } catch (e: any) {
    // If API fails, provide a helpful fallback response
    console.error('AI API error:', e);
    
    // Provide contextual fallback based on the question
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('character')) {
      return `I'd love to discuss the characters in "${book.title}" by ${book.author}! While I'm currently unable to connect to the AI assistant, I can help you explore:\n\n• Character motivations and development\n• Relationships between characters\n• Character analysis techniques\n\nPlease try your question again in a moment, or feel free to share your thoughts about the characters!`;
    }
    
    if (lowerQuestion.includes('theme') || lowerQuestion.includes('plot')) {
      return `Great question about "${book.title}"! I'm currently experiencing connectivity issues with the AI assistant, but I'd still love to help you explore the themes and plot of this book.\n\nPlease try again in a moment, and we can discuss the deeper meanings and story structure together!`;
    }
    
    if (lowerQuestion.includes('chapter') || lowerQuestion.includes('summary')) {
      return `I'd be happy to help you with chapter analysis for "${book.title}"! Unfortunately, I'm currently unable to connect to the full AI assistant.\n\nPlease try your question again shortly, and I'll provide detailed chapter breakdowns and key points!`;
    }
    
    // Generic fallback
    return `I'm sorry, but I'm currently experiencing connectivity issues with the AI assistant for "${book.title}". This could be due to:\n\n• Network connectivity\n• Server maintenance\n• High traffic\n\nPlease try your question again in a few moments. I'll be ready to help you explore characters, themes, plot, and more about this book!`;
  }
}

export async function askLibraryAssistant(userId: number | null, question: string): Promise<{
  answer: string;
  has_recommendations: boolean;
  recommendations: any[];
  search_results?: any[];
  comparison_results?: any[];
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout for more complex queries

    const response = await fetch(`${API_BASE}/ai/library-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, question }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'AI request failed');
    }

    const data = await response.json();
    return {
      answer: data.answer || 'No answer returned.',
      has_recommendations: data.has_recommendations || false,
      recommendations: data.recommendations || [],
      search_results: data.search_results || [],
      comparison_results: data.comparison_results || []
    };
  } catch (e: any) {
    console.error('Library Assistant AI error:', e);

    // Provide contextual fallback responses
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('recommend') || lowerQuestion.includes('suggest')) {
      return {
        answer: "I'd love to recommend some great books! While I'm currently experiencing technical difficulties, here are some popular choices:\n\n📚 **Fiction**: 'The Seven Husbands of Evelyn Hugo' by Taylor Jenkins Reid\n📖 **Mystery**: 'The Thursday Murder Club' by Richard Osman\n🚀 **Sci-Fi**: 'Project Hail Mary' by Andy Weir\n\nPlease try again in a moment for personalized recommendations based on your reading history!",
        has_recommendations: false,
        recommendations: [],
        search_results: [],
        comparison_results: []
      };
    }

    if (lowerQuestion.includes('hour') || lowerQuestion.includes('open')) {
      return {
        answer: "📅 **Library Hours**:\n\n• Monday - Friday: 8:00 AM - 8:00 PM\n• Saturday: 9:00 AM - 6:00 PM\n• Sunday: 12:00 PM - 5:00 PM\n\nWe're closed on public holidays. Please try your question again for more detailed information!",
        has_recommendations: false,
        recommendations: [],
        search_results: [],
        comparison_results: []
      };
    }

    return {
      answer: "I'm sorry, but I'm currently experiencing connectivity issues. Please try your question again in a moment. I'm here to help with book recommendations, library information, and reading guidance!",
      has_recommendations: false,
      recommendations: [],
      search_results: [],
      comparison_results: []
    };
  }
}

// ============ NOTIFICATION API METHODS ============
export const notificationApi = {
  async getUserNotifications(userId: number) {
    const response = await fetch(`${API_BASE}/users/${userId}/notifications`);
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  async createNotification(userId: number, notification: {
    type: string;
    title: string;
    message: string;
    data?: string;
    timestamp?: string;
  }) {
    const response = await fetch(`${API_BASE}/users/${userId}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });
    if (!response.ok) throw new Error('Failed to create notification');
    return response.json();
  },

  async markNotificationRead(notificationId: number) {
    const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return response.json();
  },

  async markAllNotificationsRead(userId: number) {
    const response = await fetch(`${API_BASE}/users/${userId}/notifications/mark-all-read`, {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
    return response.json();
  }
};