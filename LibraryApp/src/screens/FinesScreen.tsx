import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User } from '../types';

interface Fine {
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

interface FinesScreenProps {
  user: User;
  navigation: any;
}

export const FinesScreen: React.FC<FinesScreenProps> = ({ user, navigation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchFines();
  }, []);

  const fetchFines = async () => {
    try {
      const endpoint = user.role === 'admin' 
        ? 'http://10.0.2.2:5001/api/admin/fines'
        : `http://10.0.2.2:5001/api/user/${user.id}/fines`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setFines(data);
      }
    } catch (error) {
      console.error('Error fetching fines:', error);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFines();
    setRefreshing(false);
  };

  const filteredFines = fines.filter(fine =>
    fine.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fine.memberEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fine.bookTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPendingFines = fines
    .reduce((sum, fine) => sum + (fine.damageFine || 0) + (fine.overdueFine || 0), 0);

  const handlePayDamage = async (fineId: string) => {
    try {
      const response = await fetch(`http://10.0.2.2:5001/api/admin/fines/${fineId}/pay-damage`, {
        method: 'POST'
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Damage fine paid successfully!');
        fetchFines();
      } else {
        Alert.alert('Error', 'Failed to pay damage fine');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pay damage fine');
    }
  };

  const handlePayOverdue = async (fineId: string) => {
    try {
      const response = await fetch(`http://10.0.2.2:5001/api/admin/fines/${fineId}/pay-overdue`, {
        method: 'POST'
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Overdue fine paid successfully!');
        fetchFines();
      } else {
        Alert.alert('Error', 'Failed to pay overdue fine');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pay overdue fine');
    }
  };

  const calculateDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.center]}>
        <Text>Loading fines...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {user.role === 'admin' ? 'Fines Management' : 'My Fines'}
        </Text>
      </View>
      
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Card */}
        <Card>
          <Text style={commonStyles.subtitle}>Outstanding Fines</Text>
          <Text style={[styles.totalAmount, { color: colors.danger }]}>
            R{(totalPendingFines || 0).toFixed(2)}
          </Text>
          <Text style={commonStyles.textMuted}>
            {fines.filter(f => f.status === "issued").length} outstanding fines
          </Text>
        </Card>

        {/* Search */}
        <Card>
          <Text style={commonStyles.subtitle}>Search Fines</Text>
          <Input
            placeholder="Search by member name, email, or book title..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
          />
        </Card>

        {/* Fines List */}
        <Card>
          <Text style={commonStyles.subtitle}>All Fines ({filteredFines.length})</Text>
          <Text style={commonStyles.textSecondary}>Complete list of library fines and their status</Text>
          
          {filteredFines.map((fine) => {
            const daysOverdue = calculateDaysOverdue(fine.dueDate);
            
            return (
              <View key={fine.id} style={styles.fineItem}>
                <View style={styles.fineHeader}>
                  <View style={styles.bookInfo}>
                    <Text style={commonStyles.subtitle}>{fine.bookTitle}</Text>
                    <Text style={commonStyles.textSecondary}>by {fine.bookAuthor}</Text>
                    {fine.overdueFine > 0 && (
                      <Text style={[styles.fineAmount, { color: colors.warning }]}>
                        Overdue Fine: R{fine.overdueFine.toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
                
                {fine.damageDescription && (
                  <View style={styles.damageReport}>
                    <Text style={styles.damageTitle}>Damage Report:</Text>
                    <Text style={styles.damageDescription}>{fine.damageDescription}</Text>
                    {fine.damageFine > 0 && (
                      <Text style={[styles.fineAmount, { color: colors.danger }]}>
                        Damage Fine: R{fine.damageFine.toFixed(2)}
                      </Text>
                    )}
                  </View>
                )}
                
                <View style={styles.fineDetails}>
                  {user.role === 'admin' && (
                    <Text style={commonStyles.textMuted}>
                      Member: {fine.memberName} ({fine.memberEmail})
                    </Text>
                  )}
                  <Text style={commonStyles.textMuted}>
                    Due: {new Date(fine.dueDate).toLocaleDateString()}
                  </Text>
                  {daysOverdue > 0 && (
                    <Text style={[commonStyles.textMuted, { color: colors.danger }]}>
                      {daysOverdue} days overdue
                    </Text>
                  )}
                </View>
                
                <View style={styles.actionButtons}>
                  {user.role === 'admin' && (
                    <>
                      {fine.damageFine > 0 && (
                        <Button
                          title="Pay Damage"
                          onPress={() => handlePayDamage(fine.id)}
                          style={[styles.payButton, { backgroundColor: colors.success }]}
                        />
                      )}
                      {fine.overdueFine > 0 && (
                        <Button
                          title={`Pay Overdue (R${fine.overdueFine.toFixed(2)})`}
                          onPress={() => handlePayOverdue(fine.id)}
                          style={[styles.payButton, { backgroundColor: colors.warning }]}
                        />
                      )}
                    </>
                  )}
                  {user.role === 'user' && (fine.damageFine > 0 || fine.overdueFine > 0) && (
                    <Button
                      title="Pay Fine"
                      onPress={() => Alert.alert('Payment Info', 'The library only accepts cash payments')}
                      style={[styles.payButton, { backgroundColor: colors.success }]}
                    />
                  )}
                  {fine.damageFine === 0 && fine.overdueFine === 0 && (
                    <Button
                      title="All Paid"
                      variant="outline"
                      disabled={true}
                      style={styles.paidButton}
                    />
                  )}
                </View>
              </View>
            );
          })}
          
          {filteredFines.length === 0 && fines.length > 0 && (
            <View style={styles.emptyState}>
              <Text style={commonStyles.textSecondary}>No fines match your search.</Text>
            </View>
          )}
          
          {fines.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={commonStyles.textSecondary}>No fines found.</Text>
            </View>
          )}
        </Card>
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
  
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  
  searchInput: {
    marginTop: 12,
  },
  
  fineItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 16,
  },
  
  fineHeader: {
    marginBottom: 12,
  },
  
  bookInfo: {
    marginBottom: 8,
  },
  
  fineAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  
  damageReport: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    borderRightWidth: 4,
    borderRightColor: colors.danger,
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  
  damageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
    marginBottom: 4,
  },
  
  damageDescription: {
    fontSize: 14,
    color: colors.danger,
    marginBottom: 4,
  },
  
  fineDetails: {
    marginBottom: 12,
    gap: 4,
  },
  
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  payButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 100,
  },
  
  paidButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});