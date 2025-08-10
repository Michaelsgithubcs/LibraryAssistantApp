import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/api';
import { User } from '../types';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => void;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider = ({ user, children }: { user: User, children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    try {
      const [reservations, myBooks, fines, books] = await Promise.all([
        apiClient.getReservationStatus(user.id),
        apiClient.getMyBooks(user.id),
        apiClient.getMyFines(user.id),
        apiClient.getBooks()
      ]);
      const notificationList: Notification[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Reservation notifications
      reservations.forEach((reservation: any) => {
        if (reservation.status === 'approved') {
          notificationList.push({
            id: `reservation-${reservation.id}`,
            type: 'reservation',
            title: 'Reservation Approved! 📚',
            message: `Your reservation for "${reservation.book_title}" has been approved and the book has been issued to you!`,
            timestamp: new Date().toISOString(),
            read: false,
            data: reservation
          });
        } else if (reservation.status === 'rejected') {
          notificationList.push({
            id: `reservation-${reservation.id}`,
            type: 'reservation',
            title: 'Reservation Rejected ❌',
            message: `Your reservation for "${reservation.book_title}" was rejected. ${reservation.rejection_reason || ''}`,
            timestamp: new Date().toISOString(),
            read: false,
            data: reservation
          });
        }
      });
      // Due date and overdue notifications
      myBooks.forEach((book: any) => {
        if (book.status === 'issued') {
          const dueDate = new Date(book.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 2) {
            notificationList.push({
              id: `due-soon-2-${book.id}`,
              type: 'due_soon',
              title: 'Book Due in 2 Days ⏰',
              message: `"${book.title}" is due in 2 days (${new Date(book.due_date).toLocaleDateString()}). Please return it on time to avoid fines.`,
              timestamp: new Date().toISOString(),
              read: false,
              data: book
            });
          } else if (diffDays === 1) {
            notificationList.push({
              id: `due-soon-1-${book.id}`,
              type: 'due_soon',
              title: 'Book Due Tomorrow ⏰',
              message: `"${book.title}" is due tomorrow (${new Date(book.due_date).toLocaleDateString()}). Please return it on time to avoid fines.`,
              timestamp: new Date().toISOString(),
              read: false,
              data: book
            });
          } else if (diffDays < 0) {
            notificationList.push({
              id: `overdue-${book.id}`,
              type: 'overdue',
              title: 'Book Overdue ⚠️',
              message: `"${book.title}" is overdue! Please return it as soon as possible to avoid additional fines.`,
              timestamp: new Date().toISOString(),
              read: false,
              data: book
            });
          }
        }
      });
      // Fine notifications
      fines.forEach((fine: any) => {
        if (fine.amount > 0) {
          notificationList.push({
            id: `fine-${fine.id}`,
            type: 'fine',
            title: 'Outstanding Fine 💸',
            message: `You have an outstanding fine of R${fine.amount.toFixed(2)} for "${fine.book_title}". Please pay it at the library.`,
            timestamp: new Date().toISOString(),
            read: false,
            data: fine
          });
        }
      });
      // Book returned notifications
      myBooks.forEach((book: any) => {
        if (book.status === 'returned') {
          notificationList.push({
            id: `returned-${book.id}`,
            type: 'returned',
            title: 'Book Returned ✅',
            message: `"${book.title}" has been successfully returned. Thank you for reading!`,
            timestamp: book.return_date || new Date().toISOString(),
            read: false,
            data: book
          });
        }
      });
      // New book notifications (latest 2 books as "new")
      const newBooks = books.slice(0, 2);
      newBooks.forEach((book: any) => {
        notificationList.push({
          id: `new-book-${book.id}`,
          type: 'new_book',
          title: 'New Book Added 🆕',
          message: `"${book.title}" by ${book.author} has been added to the library. Reserve it now!`,
          timestamp: new Date().toISOString(),
          read: false,
          data: book
        });
      });
      setNotifications(notificationList);
    } catch (e) {
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Optionally, poll for new notifications every N seconds
    // const interval = setInterval(fetchNotifications, 60000);
    // return () => clearInterval(interval);
  }, [user]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, refreshNotifications: fetchNotifications, markAsRead, setNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
