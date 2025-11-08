import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';

interface MoreScreenProps {
  user: User;
  navigation: any;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({ user, navigation }) => {
  const { logout } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState<'email' | 'password'>('email');
  const [newEmail, setNewEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveChanges = async () => {
    try {
      if (editType === 'email') {
        if (!newEmail || !currentPassword) {
          Alert.alert('Error', 'Please fill in all fields');
          return;
        }
        
        await apiClient.updateUserEmail(user.id, newEmail, currentPassword);
        Alert.alert('Success', 'Email updated successfully');
      } else {
        if (!currentPassword || !newPassword || !confirmPassword) {
          Alert.alert('Error', 'Please fill in all fields');
          return;
        }
        
        if (newPassword !== confirmPassword) {
          Alert.alert('Error', 'New passwords do not match');
          return;
        }
        
        if (newPassword.length < 6) {
          Alert.alert('Error', 'Password must be at least 6 characters');
          return;
        }
        
        await apiClient.updateUserPassword(user.id, currentPassword, newPassword);
        Alert.alert('Success', 'Password updated successfully');
      }
      
      setEditModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNewEmail(user.email);
    } catch (error) {
      Alert.alert('Error', 'Failed to update. Please check your current password.');
    }
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            await logout();
            
            // Force navigation reset after logout
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      title: 'Library Assistant',
      subtitle: 'Get help with library questions',
      onPress: () => navigation.navigate('Chatbot')
    },
    {
      title: 'Contact Library',
      subtitle: 'Phone: (011) 123-4567',
      onPress: () => Alert.alert('Contact Info', 'Phone: (011) 123-4567\nEmail: info@library.com\nAddress: 123 Library Street, City Center')
    },
    {
      title: 'Library Hours',
      subtitle: 'View opening hours',
      onPress: () => Alert.alert(
        'Library Hours',
        'Monday - Friday: 8:00 AM - 8:00 PM\nSaturday: 9:00 AM - 6:00 PM\nSunday: 12:00 PM - 5:00 PM\n\nClosed on public holidays'
      )
    }
  ];

  return (
    <View style={styles.container}>
      {/* Header with theme color */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>
      
      <ScrollView style={styles.content}>
      <Card>
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileIcon}>👤</Text>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user.username}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.memberSince}>
                Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : '2024'}
              </Text>
              <View style={styles.debugInfo}>
                <Text style={styles.debugText}>User ID: {user.id}</Text>
                <Text style={styles.debugText}>Role: {user.role}</Text>
              </View>
              {(() => {
                console.log('User object:', user);
                return null;
              })()}
            </View>
          </View>
          
          <View style={styles.profileActions}>
            <Button
              title="Edit Email"
              onPress={() => {
                setEditType('email');
                setEditModalVisible(true);
              }}
              variant="outline"
              style={styles.editButton}
            />
            <Button
              title="Change Password"
              onPress={() => {
                setEditType('password');
                setEditModalVisible(true);
              }}
              variant="outline"
              style={styles.editButton}
            />
          </View>
        </View>
      </Card>

      <Card>
        <Text style={commonStyles.subtitle}>Quick Access</Text>
        {menuItems.map((item, index) => (
          <View key={index} style={styles.menuItem}>
            <Button
              title={item.title}
              onPress={item.onPress}
              variant="outline"
              style={styles.menuButton}
            />
            <Text style={[commonStyles.textMuted, styles.menuSubtitle]}>
              {item.subtitle}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={commonStyles.subtitle}>App Information</Text>
        <View style={styles.infoSection}>
          <Text style={commonStyles.textSecondary}>Version: 1.0.0</Text>
          <Text style={commonStyles.textSecondary}>Library Management System</Text>
          <Text style={commonStyles.textMuted}>Built with ❤️ for modern libraries</Text>
        </View>
      </Card>

      <Card>
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
        />
      </Card>
      </ScrollView>
      
      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editType === 'email' ? 'Edit Email' : 'Change Password'}
            </Text>
            
            {editType === 'email' ? (
              <>
                <Input
                  placeholder="New Email"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  style={styles.modalInput}
                />
                <Input
                  placeholder="Current Password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  style={styles.modalInput}
                />
              </>
            ) : (
              <>
                <Input
                  placeholder="Current Password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  style={styles.modalInput}
                />
                <Input
                  placeholder="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  style={styles.modalInput}
                />
                <Input
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  style={styles.modalInput}
                />
              </>
            )}
            
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setEditModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setNewEmail(user.email);
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Save"
                onPress={handleSaveChanges}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.inverse,
  },
  
  content: {
    flex: 1,
  },
  profileSection: {
    paddingVertical: 16,
  },
  
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  profileIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  
  profileInfo: {
    flex: 1,
  },
  
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  
  userEmail: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  
  memberSince: {
    fontSize: 14,
    color: colors.text.muted,
  },
  
  debugInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  
  debugText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  
  editButton: {
    flex: 1,
    paddingVertical: 8,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  modalInput: {
    marginBottom: 16,
  },
  
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  
  modalButton: {
    flex: 1,
  },
  
  menuItem: {
    marginVertical: 8,
  },
  
  menuButton: {
    marginBottom: 4,
  },
  
  menuSubtitle: {
    textAlign: 'center',
  },
  
  infoSection: {
    alignItems: 'center',
    gap: 4,
  },
});