// Use environment variable for API URL, fallback to production
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://libraryassistantapp.onrender.com/api';

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  description?: string;
  price: number;
  is_free: boolean;
  is_ebook: boolean;
  cover_image?: string;
  pdf_url?: string;
  total_copies: number;
  available_copies: number;
  reading_time_minutes: number;
  avg_rating: number;
  rating_count: number;
}

export interface BookRating {
  book_id: number;
  user_id: number;
  rating: number;
  review?: string;
}

export interface ReadingProgress {
  book_id: number;
  user_id: number;
  progress_percentage: number;
}

export interface Purchase {
  user_id: number;
  book_id: number;
}

// API Functions
export const api = {
  // Books
  async getBooks(category?: string, isEbook?: boolean): Promise<Book[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (isEbook !== undefined) params.append('is_ebook', isEbook.toString());
    
    const response = await fetch(`${API_BASE_URL}/books?${params}`);
    if (!response.ok) throw new Error('Failed to fetch books');
    return response.json();
  },

  async getCategories(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  // Ratings
  async rateBook(bookId: number, rating: BookRating): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rating),
    });
    if (!response.ok) throw new Error('Failed to rate book');
  },

  // Purchases
  async purchaseBook(bookId: number, purchase: Purchase): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/books/${bookId}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(purchase),
    });
    if (!response.ok) throw new Error('Failed to purchase book');
  },

  // Reading Progress
  async updateReadingProgress(progress: ReadingProgress): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/reading-progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(progress),
    });
    if (!response.ok) throw new Error('Failed to update reading progress');
  },

  // Fines
  async payFine(fineId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/fines/${fineId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to pay fine');
  },
};

// Helper functions
export const formatCurrency = (amount: number): string => {
  return `R${amount.toFixed(2)}`;
};

export const formatReadingTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
};

export const calculateReadingProgress = (currentPage: number, totalPages: number): number => {
  return Math.round((currentPage / totalPages) * 100);
};