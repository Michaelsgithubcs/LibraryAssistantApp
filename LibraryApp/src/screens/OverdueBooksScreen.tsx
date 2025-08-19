import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { apiClient } from '../services/api';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User, IssuedBook } from '../types';

interface OverdueBooksScreenProps {
  user: User;
  navigation: any;
}

export const OverdueBooksScreen: React.FC<OverdueBooksScreenProps> = ({ user, navigation }) => {
  const [overdueBooks, setOverdueBooks] = useState<IssuedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOverdueBooks();
  }, []);

  const fetchOverdueBooks = async () => {
    try {
      const myBooks = await apiClient.getMyBooks(user.id);
      const overdue = myBooks.filter((book: IssuedBook) => 
        new Date(book.due_date) < new Date() && book.status === 'issued'
      );
      setOverdueBooks(overdue);
    } catch (error) {
      console.error('Error fetching overdue books:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOverdueBooks();
    setRefreshing(false);
  };

  const calculateDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.center]}>
        <Text>Loading overdue books...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={commonStyles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Card>
        <Text style={commonStyles.subtitle}>Overdue Books</Text>
        <Text style={commonStyles.textSecondary}>
          Books that are past their due date
        </Text>
      </Card>

      {overdueBooks.length === 0 ? (
        <Card>
          <View style={styles.emptyState}>
            <Text style={[commonStyles.subtitle, { color: colors.success }]}>
              🎉 No Overdue Books
            </Text>
            <Text style={commonStyles.textSecondary}>
              All your books are returned on time!
            </Text>
          </View>
        </Card>
      ) : (
        overdueBooks.map((book) => {
          const daysOverdue = calculateDaysOverdue(book.due_date);
          const estimatedFine = daysOverdue * 5; // R5 per day
          
          return (
            <Card key={book.id} style={styles.overdueCard}>
              <View style={styles.bookHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.subtitle}>{book.title}</Text>
                  <Text style={commonStyles.textSecondary}>by {book.author}</Text>
                </View>
                <Badge text="Overdue" variant="danger" />
              </View>

              <View style={styles.overdueDetails}>
                <View style={styles.detailRow}>
                  <Text style={commonStyles.textMuted}>Due Date:</Text>
                  <Text style={[commonStyles.text, { color: colors.danger }]}>
                    {formatDate(book.due_date)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={commonStyles.textMuted}>Days Overdue:</Text>
                  <Text style={[commonStyles.text, { color: colors.danger }]}>
                    {daysOverdue} days
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={commonStyles.textMuted}>Estimated Fine:</Text>
                  <Text style={[commonStyles.text, { color: colors.danger }]}>
                    R{estimatedFine.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Please return this book as soon as possible to avoid additional fines
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  overdueCard: {
    marginBottom: 16,
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  overdueDetails: {
    marginBottom: 12,
  },
  
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  
  warningBox: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderColor: colors.warning,
    borderWidth: 1,
  },
  
  warningText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});