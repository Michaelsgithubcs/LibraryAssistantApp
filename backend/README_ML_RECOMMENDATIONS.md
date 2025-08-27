# ML Recommendation Service for Library Assistant App

This module provides machine learning-based book recommendations for the Library Assistant App.

## Features

- **Content-Based Recommendations**: Recommends books similar to those a user has previously borrowed based on book features such as title, author, category, and description.
- **Popularity-Based Recommendations**: Recommends popular books based on borrow count.
- **Similar Books Recommendation**: Finds books similar to a given book using TF-IDF and cosine similarity.

## Architecture

The recommendation system uses a hybrid approach combining multiple recommendation strategies:

1. **Content-Based Filtering**:
   - Uses TF-IDF vectorization to convert book text features into numerical vectors
   - Calculates similarity between books using cosine similarity
   - Recommends books similar to those the user has previously interacted with

2. **Popularity-Based Filtering**:
   - Recommends books with the highest borrow counts
   - Used as a fallback when user history is not available

## API

### `MLRecommendationService`

The main class that provides recommendation functionality.

#### Constructor

```python
ml_service = MLRecommendationService(db_path)
```

- `db_path`: Path to the SQLite database file

#### Methods

- **get_recommendations(user_id, n=10)**
  - Returns book recommendations for a user
  - Parameters:
    - `user_id`: User ID to generate recommendations for
    - `n`: Number of recommendations to return
  - Returns:
    - Dictionary with 'content_based' and 'popular' recommendation lists

- **get_similar_books(book_id, n=5)**
  - Returns books similar to the specified book
  - Parameters:
    - `book_id`: Book ID to find similar books for
    - `n`: Number of similar books to return
  - Returns:
    - List of book dictionaries with details

- **get_popular_books(n=10)**
  - Returns the most popular books based on borrow count
  - Parameters:
    - `n`: Number of popular books to return
  - Returns:
    - List of book dictionaries with details

## Integration with Flask App

The ML Recommendation Service is integrated with the Flask app and exposed through these endpoints:

1. **`/api/recommendations/<int:user_id>`**
   - GET request to retrieve recommendations for a user
   - Query parameters:
     - `type`: Recommendation type ('ml', 'collaborative', 'content', 'hybrid')
     - `limit`: Number of recommendations to return (default: 5)
   - Response: JSON with recommended books

2. **`/api/similar-books/<int:book_id>`**
   - GET request to retrieve books similar to a specified book
   - Query parameters:
     - `limit`: Number of similar books to return (default: 5)
   - Response: JSON with similar books

## Testing

Run the test script to verify that the ML recommendation service is working correctly:

```bash
python test_ml_recommendations.py
```

This script tests:
- Content-based recommendations for users
- Popularity-based recommendations
- Similar book recommendations

## Dependencies

- numpy
- pandas
- scikit-learn (for TF-IDF vectorization and cosine similarity)
- SQLite3 (for database access)

## Future Improvements

- Collaborative filtering when more user interaction data is available
- Contextual recommendations based on time, location, or user activity
- A/B testing framework to evaluate different recommendation algorithms
- Integration of external book metadata for improved recommendations
