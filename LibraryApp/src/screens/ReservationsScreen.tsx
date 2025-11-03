import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User, ReservationStatus } from '../types';
import { apiClient } from '../services/api';
import { SkeletonBox, SkeletonLines } from '../components/Skeleton';

interface ReservationsScreenProps {
  user: User;
  navigation: any;
}

export const ReservationsScreen: React.FC<ReservationsScreenProps> = ({ user }) => {
  const [reservations, setReservations] = useState<ReservationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReservations = async () => {
    try {
      const data = await apiClient.getReservationHistory(user.id);
      setReservations(Array.isArray(data) ? data : []);
    } catch (e) {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReservations(); }, []);
  useFocusEffect(React.useCallback(() => { loadReservations(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  };

  const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : '—');

  const statusColor = (status: ReservationStatus['status']) =>
    status === 'approved' ? colors.success : status === 'rejected' ? colors.danger : colors.warning;

  if (loading) {
    return (
      <ScrollView style={commonStyles.container}>
        <Card>
          <SkeletonLines lines={2} />
        </Card>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} style={{ marginBottom: 12 }}>
            <SkeletonBox width={'60%'} height={16} />
            <View style={{ height: 8 }} />
            <SkeletonLines lines={2} />
            <View style={{ height: 8 }} />
            <SkeletonBox width={'40%'} height={12} />
          </Card>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={commonStyles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Card>
        <Text style={commonStyles.subtitle}>Reservations</Text>
        <Text style={commonStyles.textSecondary}>All your reservations, newest first</Text>
      </Card>

      {reservations.length === 0 ? (
        <Card>
          <View style={styles.emptyState}>
            <Text style={commonStyles.textSecondary}>No reservations yet</Text>
          </View>
        </Card>
      ) : (
        reservations.map((r) => (
          <Card key={r.id}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={commonStyles.subtitle}>{r.book_title}</Text>
                <Text style={commonStyles.textSecondary}>by {r.book_author}</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: statusColor(r.status) + '20', borderColor: statusColor(r.status) }]}>
                <Text style={{ color: statusColor(r.status), fontWeight: '600' }}>{r.status.toUpperCase()}</Text>
              </View>
            </View>
            <View style={{ height: 8 }} />
            <View style={styles.metaRow}>
              <Text style={commonStyles.textMuted}>Requested</Text>
              <Text style={commonStyles.text}>{formatDateTime(r.requested_at)}</Text>
            </View>
            {r.approved_at && (
              <View style={styles.metaRow}>
                <Text style={commonStyles.textMuted}>{r.status === 'rejected' ? 'Decided' : 'Approved'}</Text>
                <Text style={commonStyles.text}>{formatDateTime(r.approved_at)}</Text>
              </View>
            )}
            {r.rejection_reason && (
              <View style={styles.metaRow}>
                <Text style={commonStyles.textMuted}>Reason</Text>
                <Text style={[commonStyles.text, { color: colors.danger }]}>{r.rejection_reason}</Text>
              </View>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});

export default ReservationsScreen;
