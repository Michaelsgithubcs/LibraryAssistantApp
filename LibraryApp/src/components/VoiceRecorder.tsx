import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated, Easing, Image, Dimensions } from 'react-native';
import Voice from 'react-native-voice';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../styles/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_BARS = 40; // Number of waveform bars

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
  
  // Animation values for waveform bars - many bars for full-width effect
  const waveAnimations = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0.2 + Math.random() * 0.3))
  ).current;

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

  const onSpeechEnd = (e: any) => {
    console.log('Speech ended', e);
    // Don't auto-stop - let user click send or stop
  };

  const onSpeechResults = (e: any) => {
    console.log('Speech results received:', e);
    if (e.value && e.value.length > 0) {
      const transcribedText = e.value[0];
      console.log('Transcribed text:', transcribedText);
      setRecordedText(transcribedText);
    }
  };

  const onSpeechError = (e: any) => {
    console.error('Speech error', e);
    setIsRecording(false);
  };

  const onSpeechVolumeChanged = (e: any) => {
    // Update waveform based on voice level
    if (e.value && isRecording) {
      const level = Math.min(e.value / 10, 1);
      // Animate random bars based on volume
      const randomBars = Array.from({ length: 5 }, () => Math.floor(Math.random() * NUM_BARS));
      randomBars.forEach(barIndex => {
        Animated.timing(waveAnimations[barIndex], {
          toValue: 0.3 + level * 0.7,
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

  const stopRecording = async () => {
    try {
      await Voice.stop();
      await Voice.cancel();
      setIsRecording(false);
      setRecordedText('');
      onRecordingStateChange?.(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      onRecordingStateChange?.(false);
    }
  };

  const sendRecording = async () => {
    try {
      console.log('Stopping recording and sending...');
      await Voice.stop();
      
      // Wait a moment for final speech results to be processed
      await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
      
      console.log('Recorded text to send:', recordedText);
      
      setIsRecording(false);
      onRecordingStateChange?.(false);
      
      // Send the recorded text
      if (recordedText.trim()) {
        console.log('Sending transcription:', recordedText);
        onTranscriptionComplete(recordedText);
      } else {
        console.log('No text recorded, sending empty');
        onTranscriptionComplete('');
      }
      setRecordedText('');
    } catch (error) {
      console.error('Error sending recording:', error);
      setIsRecording(false);
      onRecordingStateChange?.(false);
    }
  };

  const handleMicPress = () => {
    if (disabled) return;
    startRecording();
  };

  return (
    <View style={styles.container}>
      {isRecording ? (
        // Show full-width waveform with stop button on left when recording
        <View style={styles.recordingContainer}>
          <TouchableOpacity
            onPress={sendRecording}
            activeOpacity={0.7}
            style={styles.stopButton}
          >
            <View style={styles.stopSquare} />
          </TouchableOpacity>
          
          <View style={styles.waveformContainer}>
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
          </View>
        </View>
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
  },
  
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  stopSquare: {
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 2,
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
    justifyContent: 'space-between',
    flex: 1,
    height: 32,
    gap: 1,
  },
  
  waveBar: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 2,
    minHeight: 4,
    maxHeight: 32,
  },
});
