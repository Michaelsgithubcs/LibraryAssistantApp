import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { Alert } from 'react-native';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Add a version counter to track auth state changes
  const [authStateVersion, setAuthStateVersion] = useState(0);

  useEffect(() => {
    loadUser();
  }, []);

  // Force update function to trigger re-renders
  const updateAuthState = useCallback(() => {
    setAuthStateVersion(prev => prev + 1);
  }, []);

  const loadUser = async () => {
    try {
      console.log('Loading user from AsyncStorage...');
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          if (parsedUser && parsedUser.id) {
            console.log('Loaded user from storage:', parsedUser.username);
            setUser(parsedUser);
          } else {
            console.log('Invalid user data in storage, clearing');
            await AsyncStorage.removeItem('user');
            setUser(null);
          }
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          await AsyncStorage.removeItem('user');
          setUser(null);
        }
      } else {
        console.log('No user data found in storage');
        setUser(null);
      }
      // Update auth state version when user data is loaded
      updateAuthState();
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const login = async (userData: User) => {
    // First set the user data in state to trigger immediate UI updates
    setUser(userData);
    
    // Then persist to AsyncStorage
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    // Update auth state version to force navigation reset
    updateAuthState();
    
    // Force an additional update after a slight delay to ensure everything is updated
    setTimeout(() => {
      updateAuthState();
    }, 100);
  };

  const logout = useCallback(async () => {
    try {
      // First, update state to null to trigger immediate UI updates
      setUser(null);
      
      // Update auth state version immediately
      updateAuthState();
      
      // Then clear storage
      await AsyncStorage.removeItem('user');
      
      // Clear any other session data if necessary
      await AsyncStorage.multiRemove([
        'user', 
        'notifications',
        'userPreferences'
        // Add any other session-related keys here
      ]);
      
      // Force an additional update after clearing storage
      updateAuthState();
      
      // Additional safety: force one more update after a slight delay
      setTimeout(() => {
        updateAuthState();
      }, 100);
      
      // Show confirmation to the user
      Alert.alert(
        "Logged Out",
        "You have been successfully logged out.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out properly.');
    }
  }, [updateAuthState]);

  return { user, loading, login, logout, authStateVersion };
};