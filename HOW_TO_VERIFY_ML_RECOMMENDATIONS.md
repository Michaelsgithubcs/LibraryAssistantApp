# How to Verify ML Recommendations

This document explains how to verify that the ML recommendation system is working properly in the app.

## Visual Verification

1. **ML Score Badge**: On the Dashboard screen, ML-based recommendations will display an "ML Score" badge next to each book. This score is calculated by the ML recommendation system based on similarity to your reading history.
   - **Important**: ML scores should persist after refreshing the app or reserving a book

2. **Console Logs**: The app prints detailed logs about ML recommendations. To view them:
   - On Android: Use `adb logcat` or the Metro bundler console
   - On iOS: Check the Xcode console output

3. **Recommendation Relevance**: ML recommendations should relate to books you've previously read in terms of:
   - Similar authors
   - Similar genres/categories
   - Similar topics (based on descriptions)

## Technical Verification

If you need to verify more deeply that ML recommendations are working:

### Using React Native Debugger

1. Enable the debug menu in your app (shake device or press Cmd+D in simulator)
2. Open the JavaScript debugger
3. Check these console log statements:
   - "ML recommendations response:" - Shows raw recommendation data
   - "Using ML recommendations with scores:" - Confirms if scores were included

### Backend Testing

You can directly test the ML recommendations API:

```bash
# Test ML recommendations for a specific user
curl http://localhost:5001/api/recommendations/1?type=ml

# Expected response structure includes:
# - "content_based" field with books and scores
# - "using_ml" set to true
```

### How ML Recommendations Are Generated

1. The system analyzes your book borrowing history
2. It converts books into feature vectors using TF-IDF
3. It finds books with similar features using cosine similarity
4. Books are ranked by similarity score
5. Already borrowed books are filtered out

## Troubleshooting

If ML recommendations don't seem to be working:

1. **No borrowing history**: ML recommendations need data to work. Borrow at least 3-5 books first.
2. **No scores displayed**: Check if the backend is returning score values.
3. **Random-looking recommendations**: The app falls back to popularity-based recommendations if ML fails.
4. **Scores disappear after actions**: If ML scores disappear after reserving books or refreshing, there might be a code issue that needs fixing.

## Persistence Testing

ML recommendations should persist across various user actions:

1. **Pull-to-Refresh**: When you pull down to refresh the dashboard, ML recommendations and scores should remain unchanged.
2. **Book Reservation**: When you reserve a book, ML recommendations and scores should remain unchanged.
3. **App Reopening**: When you close and reopen the app, ML recommendations should load again with scores.

## Conclusion

When working correctly, ML recommendations should:
1. Show books related to your reading history
2. Display ML score badges with similarity scores
3. Never show books you've already borrowed
4. Improve over time as you borrow more books
5. Persist across refreshes and book reservation actions
