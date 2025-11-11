import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { apiClient } from '../services/api';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { useAuth } from '../hooks/useAuth';

interface LoginScreenProps {
  onLogin?: (user: any) => void;
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, navigation }) => {
  const { login: authLogin, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    console.log("Starting login process...");
    setLoading(true);
    try {
      console.log("Calling API login...");
      const userData = await apiClient.login(email, password);
      console.log("API login successful, userData:", userData);
      
      if (userData.role !== 'user') {
        Alert.alert('Access Denied', 'This app is for library users only. Please use the web interface for admin access.');
        setLoading(false);
        return;
      }
      
      console.log("Login successful, setting auth state");
      
      // Set the user in auth context
      await authLogin(userData);
      
      // Set loading to false after successful login
      setLoading(false);
      
      // Navigate to main screen with a small delay to ensure state is updated
      console.log("Navigating to Main screen after login");
      setTimeout(() => {
        try {
          if (navigation) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
            console.log("Navigation reset to Main completed");
          } else {
            console.log("Navigation prop not available");
          }
        } catch (error) {
          console.error("Navigation error in LoginScreen:", error);
        }
      }, 200);
      
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'Invalid credentials');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={commonStyles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>Welcome back!</Text>
          <Text style={commonStyles.textSecondary}>Sign in to access your library account</Text>
        </View>

        <Card style={styles.loginCard}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />
          <Button
            title={loading ? "Signing in..." : "Sign In"}
            onPress={handleLogin}
            disabled={loading}
            style={styles.loginButton}
          />
        </Card>

        <View style={{ ...styles.footer, marginTop: 16 }}>
          <Text style={commonStyles.textMuted}>
            Demo accounts: user@library.com / user
          </Text>
          <Button
            title="Request Account Creation"
            onPress={() => navigation.navigate('AccountRequest')}
            variant="outline"
            style={styles.signupButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  
  loginCard: {
    marginHorizontal: 16,
  },
  
  loginButton: {
    marginTop: 16,
  },
  
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
  },
  
  signupButton: {
    marginTop: 16,
  },
});