import React from 'react';
import { View, ViewStyle } from 'react-native';

interface FallbackLinearGradientProps {
  colors: string[];
  style?: ViewStyle;
  children: React.ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export const FallbackLinearGradient: React.FC<FallbackLinearGradientProps> = ({ 
  colors, 
  style, 
  children 
}) => {
  return (
    <View style={[{ backgroundColor: colors[0] }, style]}>
      {children}
    </View>
  );
};