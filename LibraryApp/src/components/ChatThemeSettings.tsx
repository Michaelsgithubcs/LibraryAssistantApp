import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { colors } from '../styles/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ThemeSettings {
  type: 'color' | 'wallpaper' | 'custom';
  value: string; // color hex or image path
}

interface ChatThemeSettingsProps {
  visible: boolean;
  onClose: () => void;
  onThemeChange: (theme: ThemeSettings) => void;
  currentTheme: ThemeSettings;
  chatType: 'library' | 'book'; // To store different themes
  bookId?: string;
}

const PRESET_COLORS = [
  { name: 'Default', color: '#F5F5F5' },
  { name: 'Ocean Blue', color: '#E3F2FD' },
  { name: 'Soft Pink', color: '#FCE4EC' },
  { name: 'Mint Green', color: '#E8F5E9' },
  { name: 'Lavender', color: '#F3E5F5' },
  { name: 'Peach', color: '#FFF3E0' },
  { name: 'Sky Blue', color: '#E1F5FE' },
  { name: 'Light Yellow', color: '#FFFDE7' },
  { name: 'Rose', color: '#FCE4EC' },
  { name: 'Cream', color: '#FFF8E1' },
];

export const ChatThemeSettings: React.FC<ChatThemeSettingsProps> = ({
  visible,
  onClose,
  onThemeChange,
  currentTheme,
  chatType,
  bookId,
}) => {
  const [selectedType, setSelectedType] = useState<'color' | 'wallpaper' | 'custom'>(
    currentTheme.type
  );

  const handleColorSelect = async (color: string) => {
    const theme: ThemeSettings = { type: 'color', value: color };
    await saveTheme(theme);
    onThemeChange(theme);
    onClose();
  };

  const handleWallpaperSelect = async (wallpaper: number) => {
    const theme: ThemeSettings = { type: 'wallpaper', value: wallpaper.toString() };
    await saveTheme(theme);
    onThemeChange(theme);
    onClose();
  };

  const handleCustomImageSelect = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        if (imageUri) {
          const theme: ThemeSettings = { type: 'custom', value: imageUri };
          await saveTheme(theme);
          onThemeChange(theme);
          onClose();
        }
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const saveTheme = async (theme: ThemeSettings) => {
    try {
      const key = chatType === 'library' 
        ? 'chat_theme_library' 
        : `chat_theme_book_${bookId}`;
      await AsyncStorage.setItem(key, JSON.stringify(theme));
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Customize Chat Background</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Colors Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Solid Colors</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorOption,
                      { backgroundColor: item.color },
                      currentTheme.type === 'color' &&
                        currentTheme.value === item.color &&
                        styles.selectedOption,
                    ]}
                    onPress={() => handleColorSelect(item.color)}
                  >
                    {currentTheme.type === 'color' && currentTheme.value === item.color && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preset Wallpapers Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preset Wallpapers</Text>
              <View style={styles.wallpaperGrid}>
                {[1, 2, 3].map((wallpaper) => (
                  <TouchableOpacity
                    key={wallpaper}
                    style={[
                      styles.wallpaperOption,
                      currentTheme.type === 'wallpaper' &&
                        currentTheme.value === wallpaper.toString() &&
                        styles.selectedOption,
                    ]}
                    onPress={() => handleWallpaperSelect(wallpaper)}
                  >
                    <Image
                      source={
                        wallpaper === 1
                          ? require('../../assets/wallpaper1.jpg')
                          : wallpaper === 2
                          ? require('../../assets/wallpaper2.jpg')
                          : require('../../assets/wallpaper3.jpg')
                      }
                      style={styles.wallpaperImage}
                      resizeMode="cover"
                    />
                    {currentTheme.type === 'wallpaper' &&
                      currentTheme.value === wallpaper.toString() && (
                        <View style={styles.selectedOverlay}>
                          <Text style={styles.checkmarkWhite}>✓</Text>
                        </View>
                      )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Image Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Custom Image</Text>
              <TouchableOpacity
                style={styles.customButton}
                onPress={handleCustomImageSelect}
              >
                <Text style={styles.customButtonText}>
                  Choose from Gallery
                </Text>
              </TouchableOpacity>
              {currentTheme.type === 'custom' && (
                <View style={styles.currentCustomContainer}>
                  <Text style={styles.currentCustomText}>Current custom image:</Text>
                  <Image
                    source={{ uri: currentTheme.value }}
                    style={styles.currentCustomImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.text.secondary,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 15,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: (SCREEN_WIDTH - 80) / 5,
    height: (SCREEN_WIDTH - 80) / 5,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wallpaperGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  wallpaperOption: {
    width: (SCREEN_WIDTH - 64) / 3,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  wallpaperImage: {
    width: '100%' as any,
    height: '100%' as any,
  },
  selectedOption: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.primary,
  },
  checkmarkWhite: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
  },
  customButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  customButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  currentCustomContainer: {
    marginTop: 15,
  },
  currentCustomText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  currentCustomImage: {
    width: '100%' as any,
    height: 150,
    borderRadius: 12,
  },
});
