import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

interface VoiceDebugProps {
  isRecording: boolean;
  recordedText: string;
  isTranscribing: boolean;
}

/**
 * Debug component to show voice recognition state
 * Remove this component in production
 */
export const VoiceDebug: React.FC<VoiceDebugProps> = ({
  isRecording,
  recordedText,
  isTranscribing,
}) => {
  if (__DEV__) {
    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>🐛 Voice Debug</Text>
        <Text style={styles.debugText}>
          Recording: {isRecording ? '🔴 YES' : '⚪ NO'}
        </Text>
        <Text style={styles.debugText}>
          Transcribing: {isTranscribing ? '⏳ YES' : '✅ NO'}
        </Text>
        <Text style={styles.debugText}>
          Text: {recordedText || '(empty)'}
        </Text>
        <Text style={styles.debugHint}>
          Tap mic → Speak → Tap stop → Check if text appears above
        </Text>
      </View>
    );
  }
  return null;
};

const styles = StyleSheet.create({
  debugContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  debugHint: {
    fontSize: 11,
    color: '#856404',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
