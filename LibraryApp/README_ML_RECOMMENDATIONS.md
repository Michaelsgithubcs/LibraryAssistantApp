# ML Recommendations in Mobile App

This document explains how ML recommendations are implemented in the mobile app and how to verify they are working correctly.

## How ML Recommendations Work in the Mobile App

1. **Recommendation API Integration**: 
   The mobile app fetches ML-based recommendations from the backend API endpoint `/api/recommendations/{user_id}?type=ml`.

2. **User-Triggered Recommendations**:
   - ML recommendations are NOT loaded automatically when the dashboard loads
   - There is a prominent refresh button in the "Recommended for You" section
   - Clicking the refresh button triggers a request to the ML recommendation engine
   - User will see a loading message while recommendations are being generated

3. **Already Borrowed Books Filtering**:
   - The API client filters out books that the user has already borrowed
   - This filtering happens client-side in the `getRecommendations()` method in `api.ts`
   - Already borrowed books are identified by comparing book IDs with the user's current book issues

## How to Verify ML Recommendations Are Working

1. **Check the Refresh Button**:
   - Look for a prominent refresh icon button in the "Recommended for You" section
   - The button appears as a circular icon in a light gray background
   - When pressed, it should show a loading alert and then fetch new recommendations

2. **Verify ML Algorithm Usage**:
   - After clicking the refresh button, you should see an alert indicating ML recommendations are being fetched
   - Once loaded, the recommendations should be different from the initial fallback recommendations
   - The console log will show messages about ML recommendation API calls

3. **Verify Already Borrowed Books Are Filtered**:
   - Books that appear in your "Books Borrowed" section should NOT appear in recommendations
   - The API client filters these out automatically based on user borrowing history
   - Console logs will show which book IDs were filtered out

4. **Test Page Refresh vs. Recommendation Refresh**:
   - Pull down on the screen to refresh the dashboard - this should NOT change ML recommendations
   - Only clicking the dedicated refresh button should update the ML recommendations
   - This ensures recommendations only update when explicitly requested

## Technical Implementation

The ML recommendation system uses:

1. **Content-Based Filtering**: 
   - Uses TF-IDF vectorization of book titles, authors, and descriptions
   - Calculates cosine similarity between books
   - Recommends books similar to those the user has previously borrowed

2. **API Integration**:
   - Endpoint: `/api/recommendations/{user_id}?type=ml&limit=3`
   - Located in: `/backend/app.py`
   - ML Service: `/backend/ml_recommendation_service.py`

3. **Mobile App Integration**:
   - API Client: `getRecommendations()` in `/LibraryApp/src/services/api.ts`
   - UI Component: Refresh button in `/LibraryApp/src/screens/DashboardScreen.tsx`
   - State Management: React state for `recommendedBooks` and `recommendationsLoaded`

## Troubleshooting

If recommendations aren't working as expected:

1. Check console logs for API errors
2. Verify the backend server is running
3. Make sure the API_BASE URL in api.ts points to your server address
4. Check that the user has borrowing history for content-based recommendations to work
5. If you see "Using random book recommendations instead", it means the ML service returned no results

Remember that recommendations require sufficient user data to work effectively. New users with no borrowing history will get fallback recommendations.
