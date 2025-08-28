# ML Recommendations Troubleshooting Guide

This guide will help you verify if ML recommendations are working in the mobile app.

## 1. Check the Backend API

First, let's check if the backend is correctly generating ML recommendations:

```bash
# Start the backend server if not already running
cd backend
python start.py

# In a separate terminal, test the recommendation endpoint directly
curl http://localhost:5001/api/recommendations/1?type=ml
```

If the API returns a JSON response with recommendations, the backend is working.

## 2. Debug the Mobile App

### Check the API Connection

1. Make sure the API_BASE in `LibraryApp/src/services/api.ts` is pointing to the correct server address.
   - For Android emulator: `http://10.0.2.2:5001/api`
   - For iOS simulator: `http://localhost:5001/api`
   - For physical device: Use your computer's IP address

### Add Debug Statements

1. Add the following code to the top of `fetchMLRecommendations()` function to check API connectivity:

```typescript
// Debug API connectivity
try {
  const testResponse = await fetch(`${API_BASE}/books`);
  console.log(`API test connection: ${testResponse.ok ? 'Success' : 'Failed'}`);
} catch (error) {
  console.error('Cannot connect to API server:', error);
}
```

## 3. Test User Data

ML recommendations require user borrowing history. Use these steps to ensure you have test data:

1. Login as an existing user or create a new one
2. Borrow at least 3-5 books to create borrowing history
3. Return to the dashboard and try the refresh button

## 4. Common Issues & Solutions

### No Recommendations Found

**Issue:** "Using random book recommendations instead" message appears.

**Solutions:**
- Check if the user has borrowing history (borrow some books first)
- Verify the backend server is running
- Check if the backend recommendation service can find similar books

### Already Borrowed Books Still Show

**Issue:** Books you've already borrowed still appear in recommendations.

**Solution:**
We've updated the client-side filtering. Restart the app completely to see the changes take effect.

### Recommendations Don't Update

**Issue:** Clicking the refresh button doesn't change recommendations.

**Solution:**
We've improved the refresh button to be more visible and added clearer feedback.
The button now shows "Refresh" text next to the icon.

## 5. Verifying the Changes

After applying all fixes:

1. The refresh button should be clearly visible with the word "Refresh" next to the icon
2. Clicking it should show an alert message while loading recommendations
3. You should see personalized book recommendations based on your borrowing history
4. Books you've already borrowed should not appear in recommendations
5. Pulling down to refresh the page should NOT change the ML recommendations
