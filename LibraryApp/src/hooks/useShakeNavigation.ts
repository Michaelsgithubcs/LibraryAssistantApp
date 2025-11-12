import { useEffect, useRef } from 'react';
import { Vibration, Alert } from 'react-native';

interface UseShakeNavigationProps {
  navigation?: any;
  enabled?: boolean;
  targetScreen?: string;
  showConfirmation?: boolean;
}

import { useNavigation } from '@react-navigation/native';
import { useShakeDetection } from './useShakeDetection';

export const useShakeNavigation = (props?: UseShakeNavigationProps) => {
  const {
    navigation: passedNavigation,
    enabled = true,
    targetScreen = 'Chat',
    showConfirmation = false
  } = props || {};

  console.log('useShakeNavigation called with enabled:', enabled, 'targetScreen:', targetScreen);

  // Use passed navigation or get from context
  const contextNavigation = useNavigation();
  const navigation = passedNavigation || contextNavigation;

  console.log('Navigation available:', !!navigation);

  useShakeDetection(() => {
    if (!enabled) {
      console.log('Shake detected but navigation disabled (no user)');
      return;
    }

    console.log('Shake detected! Navigating to:', targetScreen);

    if (showConfirmation) {
      Alert.alert(
        'Open Library Assistant',
        'Shake detected! Open chat?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open',
            onPress: () => {
              // @ts-ignore - navigation types
              navigation?.navigate(targetScreen);
            }
          }
        ]
      );
    } else {
      // @ts-ignore - navigation types
      navigation?.navigate(targetScreen);
    }
  });

  return null;
};
