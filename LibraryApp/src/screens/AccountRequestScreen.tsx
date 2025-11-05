import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';

interface AccountRequestScreenProps {
  navigation: any;
}

export const AccountRequestScreen: React.FC<AccountRequestScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestAccount = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://libraryassistantapp.onrender.com/api/account-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      if (response.ok) {
        Alert.alert(
          'Request Submitted',
          'Your account request has been submitted successfully! A librarian will review and approve it soon.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to submit account request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit account request. Please try again.');
    } finally {
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
          <Text style={styles.title}>📝 Request Account</Text>
          <Text style={styles.subtitle}>Create Your Account</Text>
          <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginTop: 8 }]}>
            Fill in your details below. A librarian will review and approve your account request.
          </Text>
        </View>

        <Card style={styles.formCard}>
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Choose a username"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
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
            placeholder="Create a password (min. 6 characters)"
            secureTextEntry
          />
          
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            secureTextEntry
          />
          
          <Button
            title={loading ? "Submitting..." : "Submit Request"}
            onPress={handleRequestAccount}
            disabled={loading}
            style={styles.submitButton}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={commonStyles.textMuted}>
            Already have an account?
          </Text>
          <Button
            title="Back to Login"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.backButton}
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
    marginBottom: 32,
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
  },
  
  formCard: {
    marginHorizontal: 16,
  },
  
  submitButton: {
    marginTop: 16,
  },
  
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
  },
  
  backButton: {
    marginTop: 16,
  },
});
