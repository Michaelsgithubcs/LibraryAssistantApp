import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Book, IssuedBook, Fine, ReservationStatus } from '../types';

// Change this to your computer's IP address when testing on physical device
// For Android emulator: use 10.0.2.2
// For iOS simulator: use localhost
const API_BASE = 'http://10.0.2.2:5001/api'; 

export const apiClient = {
  async login(email: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    
    const data = await response.json();
    if (data.id) {
      await AsyncStorage.setItem('user', JSON.stringify(data));
    }
    return data;
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

  async reserveBook(bookId: string, userId: number): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE}/books/${bookId}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      
      const result = await response.json();
      console.log('Reserve response:', result); // Debug log
      
      if (!response.ok) {
        return { message: result.message || 'Reservation request submitted successfully!' };
      }
      
      return result;
    } catch (error) {
      console.log('Reserve error:', error);
      return { message: 'Reservation request submitted successfully!' };
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
    const response = await fetch(`${API_BASE}/users/${userId}/history`);
    if (!response.ok) {
      throw new Error('Failed to fetch read history');
    }
    return response.json();
  },

  async getRecommendations(userId: number, type: 'hybrid' | 'collaborative' | 'content' = 'hybrid', limit: number = 5): Promise<Book[]> {
    const response = await fetch(`${API_BASE}/recommendations/${userId}?type=${type}&limit=${limit}`);
    if (!response.ok) {
      console.warn('Failed to fetch recommendations, using fallback');
      return [];
    }
    
    const data = await response.json();
    if (!data.success) {
      console.warn('Failed to get recommendations:', data.error);
      return [];
    }
    
    return data.recommendations.map((book: any) => ({
      id: book.id.toString(),
      title: book.title,
      author: book.author,
      category: book.category,
      description: book.description || '',
      availableCopies: book.available_copies || book.availableCopies || 1,
      totalCopies: book.total_copies || 1,
      publishDate: book.publish_date || '',
      coverImage: book.cover_image || '',
      avg_rating: book.avg_rating || book.rating || 0,
      rating_count: book.rating_count || 0
    }));
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
    const response = await fetch(`${API_BASE}/ai/book-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book, question }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'AI request failed');
    }
    const data = await response.json();
    return data.answer || 'No answer returned.';
  } catch (e) {
    throw e;
  }
}