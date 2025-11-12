import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import TextRecognition from 'react-native-text-recognition';
import { colors } from '../styles/colors';
import { bookTextProcessor, BookSearchResult } from '../utils/bookTextProcessor';

interface BookScannerProps {
  onTextExtracted: (text: string) => void;
  onBooksFound?: (books: BookSearchResult[]) => void;
  style?: any;
}

export const BookScanner: React.FC<BookScannerProps> = ({ onTextExtracted, onBooksFound, style }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  console.log('📷 BookScanner initialized, TextRecognition available:', !!TextRecognition);

  const processImage = async (imageUri: string) => {
    try {
      setIsProcessing(true);

      console.log('📷 Starting OCR processing for:', imageUri);

      if (!TextRecognition) {
        throw new Error('OCR library not available');
      }

      // Perform OCR on the image
      const result = await TextRecognition.recognize(imageUri);

      console.log('📷 OCR raw result:', result);

      // Extract all text from the result
      const extractedText = Array.isArray(result) ? result.join(' ').trim() : String(result).trim();

      console.log('📷 OCR Result:', extractedText);

      if (!extractedText || extractedText.length < 3) {
        Alert.alert(
          'No Text Found',
          'Could not extract readable text from the image. Please try a clearer photo of the book cover or title.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Use Gemini AI-powered intelligent book search
      console.log('🤖 Running Gemini AI-powered book search...');
      const searchResults = await bookTextProcessor.searchBooksSmart(extractedText);

      console.log('📚 Gemini AI search results:', searchResults);

      if (searchResults.length > 0) {
        // Gemini AI found books! Use the best match for the search field
        const bestMatch = searchResults[0];
        const searchText = bestMatch.title; // Gemini AI already extracted just the title

        if (onTextExtracted) {
          onTextExtracted(searchText);
        }

        if (onBooksFound) {
          onBooksFound(searchResults);
        }

        Alert.alert(
          'Book Found! 🎉',
          `Gemini AI extracted title "${bestMatch.title}" and found it in your library!\n\nSearching your library...`,
          [{ text: 'OK' }]
        );
      } else {
        // Gemini AI couldn't find books, but we can still show the extracted text
        console.log('📖 Gemini AI search found no matches, using raw text for search');
        if (onTextExtracted) {
          onTextExtracted(extractedText);
        }

        Alert.alert(
          'Text Extracted',
          `Couldn't identify a book title from the scan.\n\nSearching with extracted text: "${extractedText.substring(0, 50)}${extractedText.length > 50 ? '...' : ''}"`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('📷 OCR Error:', error);
      Alert.alert(
        'Scan Failed',
        'Failed to process the image. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as const,
      includeBase64: false,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        Alert.alert('Camera Error', response.errorMessage);
        return;
      }
      if (response.assets && response.assets[0].uri) {
        processImage(response.assets[0].uri);
      }
    });
  };

  const openGallery = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as const,
      includeBase64: false,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        Alert.alert('Gallery Error', response.errorMessage);
        return;
      }
      if (response.assets && response.assets[0].uri) {
        processImage(response.assets[0].uri);
      }
    });
  };

  const showOptions = () => {
    Alert.alert(
      'Scan Book',
      'Choose how to scan the book',
      [
        { text: '📸 Take Photo', onPress: openCamera },
        { text: '🖼️ Choose from Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  if (isProcessing) {
    return (
      <View style={[styles.processingContainer, style]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.processingText}>Scanning...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={showOptions}
      style={[styles.scannerButton, style]}
      disabled={isProcessing}
    >
      <Image source={require('../../assets/icons/scanner.png')} style={styles.scannerIcon} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  scannerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerIcon: {
    width: 20,
    height: 20,
    tintColor: '#000000',
  },
  processingContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 2,
  },
});