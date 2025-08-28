export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at?: string;
  [key: string]: any; // Add index signature to allow additional properties
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  availableCopies: number;
  totalCopies: number;
  publishDate: string;
  avg_rating?: number;
  rating_count?: number;
  rating?: number;
  estimatedTime?: number;
  coverImage?: string;
  reading_time_minutes?: number;
  score?: number; // ML recommendation score
}

export interface IssuedBook {
  id: string;
  book_id: string;
  title: string;
  author: string;
  issue_date: string;
  due_date: string;
  status: string;
  fine_amount: number;
  reading_time_minutes: number;
  reading_progress: number;
}

export interface Fine {
  id: string;
  memberName: string;
  memberEmail: string;
  bookTitle: string;
  bookAuthor: string;
  damageFine: number;
  overdueFine: number;
  damageDescription: string;
  issueDate: string;
  dueDate: string;
  status: string;
}

export interface ReservationStatus {
  id: string;
  book_id: string;
  status: 'approved' | 'rejected' | 'pending';
  rejection_reason?: string;
  book_title: string;
  book_author: string;
}