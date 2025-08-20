import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface NotificationBadgeProps {
  onPress: () => void;
  size?: number;
  fontSize?: number;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  onPress, 
  size = 24, 
  fontSize = 12 
}) => {
  const { unreadCount } = useSelector((state: RootState) => state.notifications);
  
  if (unreadCount === 0) {
    return null;
  }

  // Format count (e.g., 99+ if more than 99)
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.text, { fontSize }]}>{displayCount}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginRight: 12,
  },
  badge: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
    minHeight: 20,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default NotificationBadge;
