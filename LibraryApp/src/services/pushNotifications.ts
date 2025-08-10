import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

class PushNotificationService {
  configure() {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },

      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },

      onAction: function (notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
      },

      onRegistrationError: function(err) {
        console.error(err.message, err);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });
  }

  showNotification(title: string, message: string, data?: any) {
    PushNotification.localNotification({
      title,
      message,
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });
  }

  scheduleNotification(title: string, message: string, date: Date, data?: any) {
    PushNotification.localNotificationSchedule({
      title,
      message,
      date,
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });
  }

  // Reservation notifications
  showReservationApproved(bookTitle: string) {
    this.showNotification(
      'Reservation Approved! 📚',
      `Your reservation for "${bookTitle}" has been approved and the book has been issued to you!`,
      { type: 'reservation_approved', bookTitle }
    );
  }

  showReservationRejected(bookTitle: string, reason?: string) {
    this.showNotification(
      'Reservation Rejected ❌',
      `Your reservation for "${bookTitle}" was rejected. ${reason || ''}`,
      { type: 'reservation_rejected', bookTitle, reason }
    );
  }

  // Due date notifications
  showBookDueSoon(bookTitle: string, daysLeft: number) {
    this.showNotification(
      `Book Due in ${daysLeft} Day${daysLeft > 1 ? 's' : ''} ⏰`,
      `"${bookTitle}" is due ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}. Please return it on time to avoid fines.`,
      { type: 'due_soon', bookTitle, daysLeft }
    );
  }

  showBookOverdue(bookTitle: string, daysOverdue: number, fineAmount: number) {
    this.showNotification(
      'Book Overdue! ⚠️',
      `"${bookTitle}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. Fine: R${fineAmount.toFixed(2)}. Please return immediately.`,
      { type: 'overdue', bookTitle, daysOverdue, fineAmount }
    );
  }

  // Fine notifications
  showFineNotification(bookTitle: string, fineAmount: number, reason: string) {
    this.showNotification(
      'Outstanding Fine 💰',
      `You have an outstanding fine of R${fineAmount.toFixed(2)} for "${bookTitle}". ${reason}`,
      { type: 'fine', bookTitle, fineAmount, reason }
    );
  }

  // Schedule due date reminders
  scheduleDueDateReminders(bookTitle: string, dueDate: Date) {
    const now = new Date();
    const due = new Date(dueDate);
    
    // 2 days before due
    const twoDaysBefore = new Date(due);
    twoDaysBefore.setDate(due.getDate() - 2);
    twoDaysBefore.setHours(9, 0, 0, 0); // 9 AM
    
    if (twoDaysBefore > now) {
      this.scheduleNotification(
        'Book Due in 2 Days ⏰',
        `"${bookTitle}" is due in 2 days. Please return it on time to avoid fines.`,
        twoDaysBefore,
        { type: 'due_soon', bookTitle, daysLeft: 2 }
      );
    }

    // 1 day before due
    const oneDayBefore = new Date(due);
    oneDayBefore.setDate(due.getDate() - 1);
    oneDayBefore.setHours(9, 0, 0, 0); // 9 AM
    
    if (oneDayBefore > now) {
      this.scheduleNotification(
        'Book Due Tomorrow ⏰',
        `"${bookTitle}" is due tomorrow. Please return it to avoid fines.`,
        oneDayBefore,
        { type: 'due_soon', bookTitle, daysLeft: 1 }
      );
    }

    // On due date
    const dueDay = new Date(due);
    dueDay.setHours(9, 0, 0, 0); // 9 AM
    
    if (dueDay > now) {
      this.scheduleNotification(
        'Book Due Today! ⚠️',
        `"${bookTitle}" is due today. Please return it to avoid overdue fines.`,
        dueDay,
        { type: 'due_today', bookTitle }
      );
    }
  }
}

export default new PushNotificationService();