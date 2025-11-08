import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { FallbackLinearGradient as LinearGradient } from './FallbackLinearGradient';
import { colors } from '../styles/colors';

interface GradientCardProps {
  title: string;
  value: string;
  icon: string;
  gradient: string[];
  onPress?: () => void;
  style?: ViewStyle;
}

export const GradientCard: React.FC<GradientCardProps> = ({ 
  title, 
  value, 
  icon, 
  gradient, 
  onPress, 
  style 
}) => {
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent style={[styles.container, style]} onPress={onPress}>
      <View style={[styles.gradient, { backgroundColor: gradient[0] }]}>
        <View style={styles.content}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  gradient: {
    padding: 16,
    minHeight: 100,
  },
  
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.inverse,
    marginBottom: 4,
  },
  
  title: {
    fontSize: 14,
    color: colors.text.inverse,
    opacity: 0.9,
    textAlign: 'center',
  },
});