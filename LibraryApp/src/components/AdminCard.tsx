import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors } from '../styles/colors';

interface AdminCardProps {
  title: string;
  value: string;
  subtitle?: string;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'danger';
}

export const AdminCard: React.FC<AdminCardProps> = ({ 
  title, 
  value, 
  subtitle,
  onPress, 
  style,
  variant = 'default'
}) => {
  console.log(`AdminCard - ${title}: ${value}`);
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent 
      style={[
        styles.container, 
        variant === 'danger' && styles.dangerCard,
        style
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[
          styles.value,
          variant === 'danger' && styles.dangerValue
        ]}>
          {value}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  
  dangerCard: {
    borderColor: '#FEE2E2',
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  
  content: {
    paddingTop: 8,
  },
  
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  
  dangerValue: {
    color: colors.danger,
  },
  
  subtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});