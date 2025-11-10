import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface DueBook {
  id: number;
  title: string;
  author: string;
  due_date: string;
  days_overdue?: number;
}

interface DueBooksWidgetProps {
  dueBooks: DueBook[];
  totalFines: number;
  userId: number;
}

const DueBooksWidget: React.FC<DueBooksWidgetProps> = ({
  dueBooks = [],
  totalFines = 0,
  userId
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📚 Due Books</Text>
        {totalFines > 0 && (
          <Text style={styles.finesBadge}>R{totalFines.toFixed(2)}</Text>
        )}
      </View>

      <View style={styles.booksContainer}>
        {dueBooks.slice(0, 4).map((book, index) => {
          const daysLeft = getDaysUntilDue(book.due_date);
          const isOverdue = daysLeft < 0;

          return (
            <View key={book.id} style={styles.bookItem}>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {book.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {book.author}
                </Text>
              </View>
              <View style={styles.dueInfo}>
                <Text style={[
                  styles.dueDate,
                  isOverdue && styles.overdueText
                ]}>
                  {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `Due ${formatDate(book.due_date)}`}
                </Text>
                {isOverdue && <Text style={styles.overdueIcon}>⚠️</Text>}
              </View>
            </View>
          );
        })}

        {dueBooks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No books due</Text>
            <Text style={styles.emptySubtext}>All caught up! 📖</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.viewAllButton}>
        <Text style={styles.viewAllText}>
          View All ({dueBooks.length}) →
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    minHeight: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  finesBadge: {
    backgroundColor: '#e74c3c',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  booksContainer: {
    flex: 1,
    marginBottom: 12,
  },
  bookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookInfo: {
    flex: 1,
    marginRight: 8,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  dueInfo: {
    alignItems: 'flex-end',
  },
  dueDate: {
    fontSize: 11,
    color: '#27ae60',
    fontWeight: '500',
  },
  overdueText: {
    color: '#e74c3c',
  },
  overdueIcon: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  viewAllButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewAllText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DueBooksWidget;