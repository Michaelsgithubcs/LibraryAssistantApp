import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../styles/colors';

interface BadgeProps {
  text: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ text, variant = 'default', style }) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'success':
        return [styles.badge, styles.badgeSuccess, style];
      case 'danger':
        return [styles.badge, styles.badgeDanger, style];
      case 'warning':
        return [styles.badge, styles.badgeWarning, style];
      default:
        return [styles.badge, style];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'success':
      case 'danger':
      case 'warning':
        return [styles.badgeText, styles.badgeTextWhite];
      default:
        return styles.badgeText;
    }
  };

  return (
    <View style={getBadgeStyle()}>
      <Text style={getTextStyle()}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  
  badgeSuccess: {
    backgroundColor: colors.success,
  },
  
  badgeDanger: {
    backgroundColor: colors.danger,
  },
  
  badgeWarning: {
    backgroundColor: colors.warning,
  },
  
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  
  badgeTextWhite: {
    color: colors.text.inverse,
  },
});