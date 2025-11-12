import { useEffect, useRef } from 'react';
import { Vibration, Alert } from 'react-native';
import RNShake from 'react-native-shake';

interface UseShakeNavigationProps {
  navigation: any;
  enabled?: boolean;
  targetScreen?: string;
  showConfirmation?: boolean;
}

export const useShakeNavigation = ({
  navigation,
  enabled = true,
  targetScreen = 'BookChat',
  showConfirmation = false
}: UseShakeNavigationProps) => {
  const lastShakeTime = useRef(0);
  
  useEffect(() => {
    if (!enabled) return;
    
    const subscription = RNShake.addListener(() => {
      const now = Date.now();
      
      // Debounce: prevent multiple triggers within 2 seconds
      if (now - lastShakeTime.current < 2000) return;
      lastShakeTime.current = now;
      
      // Provide haptic feedback
      Vibration.vibrate(150);
      
      if (showConfirmation) {
        // Show confirmation dialog
        Alert.alert(
          'Open Library Assistant?',
          'Shake detected! Open the library assistant?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open', 
              onPress: () => {
                navigation.navigate(targetScreen);
              }
            }
          ]
        );
      } else {
        // Navigate directly
        navigation.navigate(targetScreen);
      }
    });
    
    return () => {
      subscription?.remove();
    };
  }, [navigation, enabled, targetScreen, showConfirmation]);
};
