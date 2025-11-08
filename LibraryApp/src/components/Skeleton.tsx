import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors } from '../styles/colors';

type Style = ViewStyle | ViewStyle[] | undefined;

export const SkeletonBox: React.FC<{ width?: number | string; height?: number; radius?: number; style?: Style }>
  = ({ width = '100%', height = 12, radius = 6, style }) => {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[
      styles.box,
      { width, height, borderRadius: radius, opacity },
      style as any
    ]} />
  );
};

export const SkeletonCircle: React.FC<{ size?: number; style?: Style }> = ({ size = 48, style }) => (
  <SkeletonBox width={size} height={size} radius={size / 2} style={style} />
);

export const SkeletonLines: React.FC<{ lines?: number; lineHeight?: number; gap?: number; style?: Style }>
  = ({ lines = 3, lineHeight = 12, gap = 8, style }) => (
  <View style={style}>
    {Array.from({ length: lines }).map((_, i) => (
      <View key={i} style={{ marginBottom: i === lines - 1 ? 0 : gap }}>
        <SkeletonBox height={lineHeight} width={i === 0 ? '70%' : '100%'} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.border,
  },
});

export default SkeletonBox;
