import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';

interface SignupScreenProps {
  navigation: any;
  onSignup: (userData: any) => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation, onSignup }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // For demo purposes, we'll simulate signup
      // In a real app, you'd call an API endpoint
      const userData = {
        id: Date.now(),
        username: formData.username,
        email: formData.email,
        role: 'user'
      };
      
      Alert.alert(
        'Success', 
        'Account created successfully! You can now login.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={commonStyles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📚 Library App</Text>
          <Text style={styles.subtitle}>Create Your Account</Text>
        </View>

        <Card style={styles.formCard}>
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.username}
            onChangeText={(text) => setFormData({...formData, username: text})}
            autoCapitalize="words"
          />

          <Input
            label="Email"
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={formData.password}
            onChangeText={(text) => setFormData({...formData, password: text})}
            secureTextEntry
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
            secureTextEntry
          />

          <Button
            title={loading ? "Creating Account..." : "Sign Up"}
            onPress={handleSignup}
            disabled={loading}
            style={styles.signupButton}
          />

          <View style={styles.loginLink}>
            <Text style={commonStyles.textSecondary}>Already have an account? </Text>
            <Button
              title="Login"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
              style={styles.linkButton}
            />
          </View>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 18,
    color: colors.text.secondary,
  },
  
  formCard: {
    padding: 24,
  },
  
  signupButton: {
    marginTop: 20,
  },
  
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  
  linkButton: {
    paddingHorizontal: 0,
    marginLeft: 8,
  },
});