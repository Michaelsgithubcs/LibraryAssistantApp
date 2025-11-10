import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated, Easing, Image } from 'react-native';
import Voice from '@react-native-voice/voice';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../styles/colors';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onTranscriptionStart: () => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscriptionComplete,
  onTranscriptionStart,
  onRecordingStateChange,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedText, setRecordedText] = useState<string>('');
  const recordedTextRef = useRef<string>(''); // Use ref to access latest value in callbacks
  
  // Animation values for 3 waveform bars (original design)
  const waveAnimations = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.5),
    new Animated.Value(0.4),
  ]).current;

  // Pulsing animation for mic button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Set up voice event listeners
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechVolumeChanged = onSpeechVolumeChanged;

    return () => {
      // Cleanup
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Animate waveform bars
      animateWaveform();
    } else {
      // Reset animations
      pulseAnim.setValue(1);
      waveAnimations.forEach(anim => anim.setValue(0.3));
    }
  }, [isRecording]);

  const animateWaveform = () => {
    const animations = waveAnimations.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.8 + Math.random() * 0.2,
            duration: 300 + Math.random() * 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.2,
            duration: 300 + Math.random() * 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    });

    Animated.stagger(50, animations).start();
  };

  const onSpeechStart = (e: any) => {
    console.log('Speech started', e);
  };

  const onSpeechEnd = async (e: any) => {
    console.log('Speech ended - auto-sending recording');
    
    // Wait a bit for final results
    await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
    
    // Stop recording and send
    try {
      await Voice.stop();
      setIsRecording(false);
      onRecordingStateChange?.(false);
      
      const finalText = recordedTextRef.current.trim();
      console.log('Sending transcription on speech end:', finalText);
      
      if (finalText) {
        onTranscriptionComplete(finalText);
      }
      
      // Reset
      setRecordedText('');
      recordedTextRef.current = '';
    } catch (error) {
      console.error('Error in onSpeechEnd:', error);
      setIsRecording(false);
      onRecordingStateChange?.(false);
    }
  };

  const onSpeechResults = (e: any) => {
    console.log('Speech results received:', e);
    if (e.value && e.value.length > 0) {
      const transcribedText = e.value[0];
      console.log('Transcribed text:', transcribedText);
      setRecordedText(transcribedText);
      recordedTextRef.current = transcribedText; // Update ref immediately
    }
  };

  const onSpeechError = (e: any) => {
    console.error('Speech error', e);
    setIsRecording(false);
  };

  const onSpeechVolumeChanged = (e: any) => {
    // Update waveform based on voice level - make bars move with volume
    if (e.value && isRecording) {
      const level = Math.min(e.value / 10, 1);
      // Animate all bars based on volume
      waveAnimations.forEach((anim, index) => {
        Animated.timing(anim, {
          toValue: level > 0.1 ? 0.5 + level * 0.5 : 0.3,
          duration: 100,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const startRecording = async () => {
    try {
      console.log('🎤 Starting voice recording...');
      setIsRecording(true);
      setRecordedText('');
      recordedTextRef.current = '';
      onTranscriptionStart();
      onRecordingStateChange?.(true);
      
      const isAvailable = await Voice.isAvailable();
      console.log('Voice recognition available:', isAvailable);
      
      await Voice.start('en-US');
      console.log('✅ Voice.start() called successfully');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setIsRecording(false);
      onRecordingStateChange?.(false);
    }
  };

  const cancelRecording = async () => {
    try {
      console.log('🚫 Cancelling recording...');
      await Voice.stop();
      await Voice.cancel();
      setIsRecording(false);
      setRecordedText('');
      recordedTextRef.current = '';
      onRecordingStateChange?.(false);
      console.log('Recording cancelled');
    } catch (error) {
      console.error('Error cancelling recording:', error);
      setIsRecording(false);
      onRecordingStateChange?.(false);
    }
  };

  const handleMicPress = () => {
    if (disabled) return;
    startRecording();
  };

  const handleWaveformPress = () => {
    // Tapping waveform cancels the recording
    cancelRecording();
  };

  return (
    <View style={styles.container}>
      {isRecording ? (
        // Show waveform when recording - tap to cancel
        <TouchableOpacity 
          onPress={handleWaveformPress}
          activeOpacity={0.7}
          style={styles.waveformContainer}
        >
          {waveAnimations.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveBar,
                {
                  transform: [{ scaleY: anim }],
                },
              ]}
            />
          ))}
        </TouchableOpacity>
      ) : (
        // Show mic button when not recording
        <TouchableOpacity
          onPress={handleMicPress}
          disabled={disabled}
          activeOpacity={0.7}
          style={styles.iconButton}
        >
          <Svg width={28} height={28} viewBox="0 0 384 512">
            <Path
              d="M192 0C139 0 96 43 96 96V256c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM64 216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 89.1 66.2 162.7 152 174.4V464H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H216V430.4c85.8-11.7 152-85.3 152-174.4V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 70.7-57.3 128-128 128s-128-57.3-128-128V216z"
              fill={disabled ? colors.text.muted : colors.primary}
            />
          </Svg>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  
  iconButton: {
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  iconImage: {
    width: 28,
    height: 28,
    tintColor: colors.primary,
  },
  
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  
  waveBar: {
    width: 3,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
});
