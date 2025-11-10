import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../services/api';

export interface DueBook {
  id: number;
  title: string;
  author: string;
  due_date: string;
  days_overdue?: number;
}

export interface WidgetData {
  dueBooks: DueBook[];
  totalFines: number;
  lastConversation?: string;
  unreadCount?: number;
}

class WidgetService {
  private static instance: WidgetService;

  static getInstance(): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService();
    }
    return WidgetService.instance;
  }

  async getWidgetData(userId: number): Promise<WidgetData> {
    try {
      // Get due books
      const dueBooksResponse = await fetch(`${API_BASE}/user/${userId}/issued-books`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      let dueBooks: DueBook[] = [];
      if (dueBooksResponse.ok) {
        const issuedBooks = await dueBooksResponse.json();
        // Filter books that are due soon or overdue
        const today = new Date();
        dueBooks = issuedBooks
          .filter((book: any) => {
            const dueDate = new Date(book.due_date);
            const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilDue <= 7; // Show books due within 7 days
          })
          .map((book: any) => ({
            id: book.id,
            title: book.title,
            author: book.author,
            due_date: book.due_date,
          }));
      }

      // Get total fines
      const finesResponse = await fetch(`${API_BASE}/user/${userId}/fines`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      let totalFines = 0;
      if (finesResponse.ok) {
        const fines = await finesResponse.json();
        totalFines = fines.reduce((total: number, fine: any) => total + (fine.fine_amount || 0), 0);
      }

      // Get last conversation (optional)
      let lastConversation = '';
      let unreadCount = 0;
      try {
        const conversationsResponse = await fetch(`${API_BASE}/chat/conversations?user_id=${userId}`, {
          headers: {
            'Authorization': `Bearer ${await this.getAuthToken()}`,
          },
        });

        if (conversationsResponse.ok) {
          const conversations = await conversationsResponse.json();
          if (conversations.length > 0) {
            const lastConv = conversations[0];
            lastConversation = lastConv.last_message || 'Continue our conversation...';

            // Get unread count
            const messagesResponse = await fetch(`${API_BASE}/chat/messages/${lastConv.id}`, {
              headers: {
                'Authorization': `Bearer ${await this.getAuthToken()}`,
              },
            });

            if (messagesResponse.ok) {
              const messages = await messagesResponse.json();
              unreadCount = messages.filter((msg: any) => !msg.is_read && !msg.is_user_message).length;
            }
          }
        }
      } catch (error) {
        // Ignore conversation errors
        console.log('Could not fetch conversation data for widget');
      }

      return {
        dueBooks,
        totalFines,
        lastConversation,
        unreadCount,
      };
    } catch (error) {
      console.error('Error fetching widget data:', error);
      return {
        dueBooks: [],
        totalFines: 0,
        lastConversation: '',
        unreadCount: 0,
      };
    }
  }

  private async getAuthToken(): Promise<string> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token || '';
    } catch (error) {
      console.error('Error getting auth token:', error);
      return '';
    }
  }

  async refreshWidgetData(userId: number): Promise<void> {
    const data = await this.getWidgetData(userId);

    // Store data locally for widgets to access
    try {
      await AsyncStorage.setItem('widgetData', JSON.stringify(data));
    } catch (error) {
      console.error('Error storing widget data:', error);
    }
  }

  async getStoredWidgetData(): Promise<WidgetData | null> {
    try {
      const data = await AsyncStorage.getItem('widgetData');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting stored widget data:', error);
      return null;
    }
  }
}

export default WidgetService;