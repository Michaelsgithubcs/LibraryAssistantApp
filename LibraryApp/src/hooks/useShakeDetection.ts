import { useEffect, useRef } from 'react';
import { DeviceEventEmitter, Vibration, Platform } from 'react-native';

interface ShakeConfig {
  debounceMs?: number;
}

export const useShakeDetection = (
  onShake: () => void,
  config: ShakeConfig = {}
) => {
  const { debounceMs = 1000 } = config;

  const lastShakeTime = useRef<number>(0);

  console.log('useShakeDetection initialized');

  useEffect(() => {
    let shakeTimeout: ReturnType<typeof setTimeout>;

    console.log('Setting up shake detection listener');

    // Listen for the shake event that React Native uses internally
    const subscription = DeviceEventEmitter.addListener(
      'RCTShowDevMenuNotification',
      () => {
        console.log('RCTShowDevMenuNotification received in useShakeDetection!');

        const currentTime = Date.now();

        // Clear any existing timeout
        if (shakeTimeout) {
          clearTimeout(shakeTimeout);
        }

        // Set a timeout to debounce single shakes
        shakeTimeout = setTimeout(() => {
          // Single shake is now safe since dev menu shake is disabled
          if (currentTime - lastShakeTime.current > debounceMs) {
            lastShakeTime.current = currentTime;

            console.log('Shake detected in useShakeDetection!');

            // Provide haptic feedback
            if (Platform.OS === 'ios') {
              // Try different vibration patterns for iPhone 14 Pro
              Vibration.vibrate(100); // Longer vibration
            } else {
              Vibration.vibrate([0, 100]);
            }

            // Call the shake callback
            onShake();
          }
        }, 200); // Shorter debounce for single shakes
      }
    );

    // Cleanup
    return () => {
      subscription.remove();
      if (shakeTimeout) {
        clearTimeout(shakeTimeout);
      }
    };
  }, [onShake, debounceMs]);
};