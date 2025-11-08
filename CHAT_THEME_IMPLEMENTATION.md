# Chat Background Theme Customization - Implementation Guide

## Overview
Added theme customization feature to the Chatbot screen, allowing users to personalize their chat background with preset wallpapers, custom images from their device, or solid colors.

## What Was Implemented

### 1. ChatThemeSettings Component
**Location:** `/LibraryApp/src/components/ChatThemeSettings.tsx`

**Features:**
- ✅ Modal interface for theme selection
- ✅ 10 preset solid colors
- ✅ 3 preset wallpapers (requires actual images)
- ✅ Custom image selection from device gallery
- ✅ Theme preview before applying
- ✅ Saves theme locally per device (AsyncStorage)
- ✅ Separate themes for library chat vs book chats

**Color Options:**
1. Default (#F5F5F5 - Light Gray)
2. Ocean Blue (#E3F2FD)
3. Soft Pink (#FCE4EC)
4. Mint Green (#E8F5E9)
5. Lavender (#F3E5F5)
6. Peach (#FFF3E0)
7. Sky Blue (#E1F5FE)
8. Light Yellow (#FFFDE7)
9. Rose (#FCE4EC)
10. Cream (#FFF8E1)

### 2. ChatbotScreen Updates
**Location:** `/LibraryApp/src/screens/ChatbotScreen.tsx`

**Changes:**
- ✅ Added theme button in header (top-right)
- ✅ Dynamic background rendering (color/wallpaper/custom image)
- ✅ Theme state management
- ✅ Loads saved theme on mount
- ✅ Applies theme to chat background

### 3. Dependencies Installed
- ✅ `react-native-image-picker@^7.1.2` - For custom image selection from gallery

## Required Assets

### Images That Need to Be Added:

**1. Theme Icon:** `/LibraryApp/assets/theme.png`
- Purpose: Button icon in top-right of chatbot screen
- Recommended size: 24x24 px or 48x48 px @2x
- Format: PNG with transparency
- Style: Simple, recognizable theme/palette icon

**2. Wallpaper 1:** `/LibraryApp/assets/wallpaper1.png`
- Purpose: First preset wallpaper option
- Recommended size: 1080x1920 px (9:16 portrait ratio)
- Format: PNG or JPG
- Style: Subtle pattern, not too busy (chat messages need to be readable)

**3. Wallpaper 2:** `/LibraryApp/assets/wallpaper2.png`
- Purpose: Second preset wallpaper option
- Same specs as Wallpaper 1

**4. Wallpaper 3:** `/LibraryApp/assets/wallpaper3.png`
- Purpose: Third preset wallpaper option
- Same specs as Wallpaper 1

**Current Status:**
- ⚠️ Placeholder files created but are empty
- ⚠️ App will crash if you try to load wallpapers without actual images
- ✅ Color themes work immediately (no images needed)

## How to Add Images

### Option 1: Use Design Software
1. Create/design images in Photoshop, Figma, or similar
2. Export as PNG files
3. Replace the placeholder files in `/LibraryApp/assets/`

### Option 2: Use Stock Images
1. Download suitable wallpaper images from stock photo sites
2. Resize to recommended dimensions
3. Replace the placeholder files

### Option 3: Temporary Testing Images
You can use online tools to generate simple gradients/patterns:
```bash
# Example: Download sample images for testing
curl -o /path/to/LibraryApp/assets/wallpaper1.png https://via.placeholder.com/1080x1920/E3F2FD/000000?text=Wallpaper+1
curl -o /path/to/LibraryApp/assets/wallpaper2.png https://via.placeholder.com/1080x1920/FCE4EC/000000?text=Wallpaper+2
curl -o /path/to/LibraryApp/assets/wallpaper3.png https://via.placeholder.com/1080x1920/E8F5E9/000000?text=Wallpaper+3
curl -o /path/to/LibraryApp/assets/theme.png https://via.placeholder.com/48x48/0F172A/FFFFFF?text=T
```

## iOS Setup (Required for Image Picker)

Add to `ios/LibraryApp/Info.plist`:
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to set custom chat backgrounds</string>
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take photos for chat backgrounds</string>
```

Then run:
```bash
cd ios && pod install && cd ..
```

## Android Setup (Required for Image Picker)

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.CAMERA" />
```

## Usage

### As a User:
1. Open Chatbot or Book Chat screen
2. Tap theme icon (🎨) in top-right corner
3. Choose from:
   - **Solid Colors**: Tap any color circle
   - **Preset Wallpapers**: Tap one of 3 wallpaper previews
   - **Custom Image**: Tap "Choose from Gallery" button
4. Theme applies immediately
5. Theme persists across app restarts (saved locally)

### Theme Storage:
- **Library Chat**: Saved as `chat_theme_library` in AsyncStorage
- **Book Chats**: Saved as `chat_theme_book_{bookId}` in AsyncStorage
- Each device can have different themes (not synced to database)

## How It Works

### 1. Theme Selection Flow:
```
User taps theme button
  → Modal opens
  → User selects color/wallpaper/custom image
  → Theme saved to AsyncStorage
  → Theme applied to chat background
  → Modal closes
```

### 2. Background Rendering:
```typescript
// Solid color
if (type === 'color') → Apply backgroundColor style

// Preset wallpaper
if (type === 'wallpaper') → Load from require('../../assets/wallpaperX.png')

// Custom image
if (type === 'custom') → Load from device URI
```

### 3. Component Wrapper:
- Uses dynamic `BackgroundWrapper` component
- Switches between `View` (colors) and `ImageBackground` (wallpapers)
- Renders ScrollView with messages on top

## Testing Checklist

### Before Testing:
- [ ] Replace placeholder images with actual images
- [ ] Add iOS permissions to Info.plist
- [ ] Add Android permissions to AndroidManifest.xml
- [ ] Run `pod install` on iOS
- [ ] Rebuild the app completely

### Test Cases:
- [ ] Theme button appears in header (top-right)
- [ ] Tapping theme button opens modal
- [ ] Solid colors apply correctly
- [ ] Preset wallpapers display and apply
- [ ] Custom image picker opens
- [ ] Selected custom image applies as background
- [ ] Theme persists after closing and reopening app
- [ ] Chat messages are readable on all backgrounds
- [ ] Theme applies only to specific chat (library/book)
- [ ] Different themes for different books

## Future Enhancements

### Potential Features:
1. **Gradient Backgrounds**: Add gradient color options
2. **Theme Sharing**: Share themes across devices (database sync)
3. **Blur Effects**: Option to blur wallpapers for better readability
4. **Dark Mode Themes**: Special dark color schemes
5. **Animated Backgrounds**: Subtle animated patterns
6. **Theme Categories**: Group wallpapers by category (nature, abstract, minimal)
7. **User-Uploaded Wallpapers**: Allow users to upload and share wallpapers
8. **Message Bubble Adaptation**: Auto-adjust bubble colors based on background

### Performance Optimizations:
1. **Image Caching**: Cache custom images for faster loading
2. **Lazy Loading**: Load wallpapers on demand
3. **Compression**: Compress custom images before storing
4. **Thumbnail Previews**: Show small previews in settings

## Troubleshooting

### Issue: App crashes when selecting wallpaper
**Solution**: Replace placeholder PNG files with actual images

### Issue: Custom image picker doesn't open
**Solution**: 
- Check iOS/Android permissions are added
- Run `pod install` on iOS
- Rebuild the app completely

### Issue: Theme doesn't persist
**Solution**: Check AsyncStorage is working properly (might be simulator issue)

### Issue: Chat messages not readable on dark wallpapers
**Solution**: 
- Choose lighter wallpapers
- Add semi-transparent overlay to message bubbles (code modification)
- Increase contrast of message bubble colors

## Code Locations

**Main Files:**
- `/LibraryApp/src/components/ChatThemeSettings.tsx` - Theme settings modal
- `/LibraryApp/src/screens/ChatbotScreen.tsx` - Chatbot with theme support
- `/LibraryApp/assets/` - Theme images directory

**Key Functions:**
- `handleThemeChange()` - Applies selected theme
- `getBackgroundStyle()` - Returns style for solid color backgrounds
- `getBackgroundSource()` - Returns image source for wallpapers
- `loadTheme()` - Loads saved theme from AsyncStorage

## Notes

⚠️ **Important:** This feature is currently configured for ChatbotScreen only. To add to BookChatScreen, follow the same pattern:
1. Import `ChatThemeSettings` component
2. Add theme state management
3. Add theme button to header
4. Wrap ScrollView with BackgroundWrapper
5. Pass `chatType="book"` and `bookId` to ChatThemeSettings

✅ **Device-Specific Storage:** Themes are intentionally stored locally (not in database) so each device can have personalized settings.

🎨 **Design Tip:** When choosing wallpapers, ensure they have enough contrast with white/colored message bubbles for readability.
