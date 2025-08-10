import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  height = 8, 
  color = colors.primary 
}) => {
  return (
    <View style={[styles.container, { height }]}>
      <View 
        style={[
          styles.progress, 
          { 
            width: `${Math.min(Math.max(progress, 0), 100)}%`,
            backgroundColor: color,
            height 
          }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  
  progress: {
    borderRadius: 4,
  },
});