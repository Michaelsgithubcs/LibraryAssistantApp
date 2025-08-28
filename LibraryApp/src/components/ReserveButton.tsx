import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

interface ReserveButtonProps {
  bookId: string;
  bookTitle: string;
  disabled: boolean;
  buttonText: string;
  onReserve: (bookId: string) => void;
}

export const ReserveButton: React.FC<ReserveButtonProps> = ({ 
  bookId, 
  bookTitle, 
  disabled, 
  buttonText, 
  onReserve 
}) => {
  const handlePress = () => {
    console.log(`Reserve button pressed for book ID: ${bookId} (${bookTitle})`);
    if (!disabled) {
      onReserve(bookId);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled ? styles.disabledButton : styles.activeButton
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={disabled ? styles.disabledText : styles.activeText}>
        {buttonText}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeText: {
    color: 'white',
    fontWeight: '600',
  },
  disabledText: {
    color: colors.text.secondary,
  }
});
