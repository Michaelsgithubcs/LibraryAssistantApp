# Voice Recording Feature - Setup Guide

## Overview
The BookChatScreen now has voice recording with speech-to-text transcription, allowing users to speak their questions instead of typing them. The feature uses native device APIs (100% free).

## What Was Added

### 1. **VoiceRecorder Component** (`LibraryApp/src/components/VoiceRecorder.tsx`)
- Microphone button with visual feedback
- Animated waveform bars that respond to voice levels
- Pulsing animation during recording
- Uses native iOS Speech Framework and Android Speech Recognizer (free)

### 2. **Integration in BookChatScreen** (`LibraryApp/src/screens/BookChatScreen.tsx`)
- Voice button added next to the text input
- Flow: 
  1. User taps mic → recording starts with waveform animation
  2. "Transcribing..." message appears in chat as sent bubble
  3. Speech is transcribed in background
  4. "Transcribing..." is replaced with actual transcribed text
  5. Text is automatically sent to AI chatbot
  6. AI response appears as usual

### 3. **Dependencies**
- `react-native-voice@^3.2.4` - Speech recognition (updated from 0.3.0)
- `react-native-reanimated@^3.6.1` - Smooth animations (new)

### 4. **Permissions**
**iOS** (`ios/LibraryApp/Info.plist`):
- `NSMicrophoneUsageDescription` - Access to microphone
- `NSSpeechRecognitionUsageDescription` - Access to speech recognition

**Android** (`android/app/src/main/AndroidManifest.xml`):
- `RECORD_AUDIO` - Record audio permission
- `BLUETOOTH` - For Bluetooth microphones
- `BLUETOOTH_ADMIN` - Manage Bluetooth
- `BLUETOOTH_CONNECT` - Connect to Bluetooth devices

## How to Build & Test

### iOS
```bash
cd LibraryApp/ios
pod install
cd ..
npm run ios
# or
npx react-native run-ios
```

### Android
```bash
cd LibraryApp
npm run android
# or
npx react-native run-android
```

**Note**: Microphone permissions will be requested on first use.

## Testing the Feature

1. Open the app and navigate to any book chat
2. Look for the microphone button next to the text input (between input and "Ask" button)
3. Tap the microphone button to start recording
4. You'll see:
   - Red pulsing mic button
   - Animated waveform bars above the button
   - "Tap to stop" text below
   - "Transcribing..." message in the chat
5. Speak your question clearly
6. Tap the mic button again to stop recording
7. Watch as:
   - "Transcribing..." is replaced with your transcribed text
   - The text is sent to the AI automatically
   - AI responds as usual

## Troubleshooting

### iOS Issues
- **Permission denied**: Check Info.plist has microphone and speech recognition keys
- **Not working in simulator**: iOS simulator may not support speech recognition - test on real device
- **No audio detected**: Make sure microphone is not muted

### Android Issues
- **Permission denied**: Check AndroidManifest.xml has RECORD_AUDIO permission
- **Not working**: Ensure Google app is installed (provides speech recognition)
- **Language issues**: Default is set to 'en-US'. Change in `VoiceRecorder.tsx` line 138

### General Issues
- **No transcription**: Make sure device has internet connection (required for accurate transcription)
- **Poor accuracy**: Speak clearly, reduce background noise
- **Button disabled**: Wait for current transcription/AI response to complete

## Customization

### Change Language
Edit `LibraryApp/src/components/VoiceRecorder.tsx`:
```typescript
await Voice.start('en-US'); // Change to 'es-ES', 'fr-FR', etc.
```

### Change Button Colors
Edit `LibraryApp/src/components/VoiceRecorder.tsx` styles:
```typescript
micButton: {
  borderColor: colors.primary, // Change border color
},
micButtonRecording: {
  backgroundColor: colors.danger, // Change recording color
},
```

### Adjust Waveform Animation
Edit `LibraryApp/src/components/VoiceRecorder.tsx`:
```typescript
const waveAnimations = useRef([
  new Animated.Value(0.3),
  new Animated.Value(0.5),
  // Add more bars or change initial values
]).current;
```

## Cost & Limits

- **100% FREE** - Uses built-in device APIs
- **No API keys needed**
- **No usage limits**
- **Works offline** on newer devices (iOS 10+, Android 8+)
- Falls back to cloud recognition on older devices (still free)

## Browser/Web Version

If you want this feature in the web app (`src/components/`), it would need:
- Web Speech API (browser-based, free)
- Different implementation for browser compatibility
- Let me know if you want me to implement this too!
