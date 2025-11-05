/**
 * Voice Recognition Test Script
 * 
 * This script tests the react-native-voice package installation
 * and verifies that all necessary permissions are configured.
 */

const fs = require('fs');
const path = require('path');

console.log('\n🎤 Testing Voice Recognition Setup...\n');

// Check 1: Verify react-native-voice package is installed
console.log('1️⃣ Checking react-native-voice package...');
const packageJson = require('./package.json');
if (packageJson.dependencies['react-native-voice']) {
  console.log('   ✅ react-native-voice installed:', packageJson.dependencies['react-native-voice']);
} else {
  console.log('   ❌ react-native-voice NOT found in dependencies');
  process.exit(1);
}

// Check 2: Verify Android permissions
console.log('\n2️⃣ Checking Android permissions...');
const androidManifest = fs.readFileSync(
  path.join(__dirname, 'android/app/src/main/AndroidManifest.xml'),
  'utf8'
);
if (androidManifest.includes('android.permission.RECORD_AUDIO')) {
  console.log('   ✅ RECORD_AUDIO permission configured');
} else {
  console.log('   ❌ RECORD_AUDIO permission MISSING');
}

// Check 3: Verify iOS permissions
console.log('\n3️⃣ Checking iOS permissions...');
const infoPlist = fs.readFileSync(
  path.join(__dirname, 'ios/LibraryApp/Info.plist'),
  'utf8'
);
if (infoPlist.includes('NSMicrophoneUsageDescription')) {
  console.log('   ✅ NSMicrophoneUsageDescription configured');
} else {
  console.log('   ❌ NSMicrophoneUsageDescription MISSING');
}
if (infoPlist.includes('NSSpeechRecognitionUsageDescription')) {
  console.log('   ✅ NSSpeechRecognitionUsageDescription configured');
} else {
  console.log('   ❌ NSSpeechRecognitionUsageDescription MISSING');
}

// Check 4: Verify VoiceRecorder component exists
console.log('\n4️⃣ Checking VoiceRecorder component...');
const voiceRecorderPath = path.join(__dirname, 'src/components/VoiceRecorder.tsx');
if (fs.existsSync(voiceRecorderPath)) {
  console.log('   ✅ VoiceRecorder.tsx exists');
  const content = fs.readFileSync(voiceRecorderPath, 'utf8');
  
  // Check for key functions
  if (content.includes('Voice.start')) {
    console.log('   ✅ Voice.start() implemented');
  }
  if (content.includes('onSpeechResults')) {
    console.log('   ✅ onSpeechResults handler implemented');
  }
  if (content.includes('onTranscriptionComplete')) {
    console.log('   ✅ onTranscriptionComplete callback implemented');
  }
} else {
  console.log('   ❌ VoiceRecorder.tsx NOT found');
}

// Check 5: Verify integration in chat screens
console.log('\n5️⃣ Checking chat screen integration...');
const bookChatScreen = fs.readFileSync(
  path.join(__dirname, 'src/screens/BookChatScreen.tsx'),
  'utf8'
);
const chatbotScreen = fs.readFileSync(
  path.join(__dirname, 'src/screens/ChatbotScreen.tsx'),
  'utf8'
);

if (bookChatScreen.includes('VoiceRecorder')) {
  console.log('   ✅ VoiceRecorder integrated in BookChatScreen');
}
if (bookChatScreen.includes('handleVoiceTranscriptionComplete')) {
  console.log('   ✅ Transcription handler in BookChatScreen');
}

if (chatbotScreen.includes('VoiceRecorder')) {
  console.log('   ✅ VoiceRecorder integrated in ChatbotScreen');
}
if (chatbotScreen.includes('handleVoiceTranscriptionComplete')) {
  console.log('   ✅ Transcription handler in ChatbotScreen');
}

console.log('\n✨ Voice Recognition Setup Verification Complete!\n');
console.log('📱 To test on device:');
console.log('   1. Install the APK on an Android device');
console.log('   2. Grant microphone permissions when prompted');
console.log('   3. Open either chat screen');
console.log('   4. Tap the microphone icon');
console.log('   5. Speak clearly and tap the stop button');
console.log('   6. Check console logs for "Speech results received"');
console.log('   7. Verify transcription appears in chat bubble\n');
