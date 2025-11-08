# Library Management System Backend

A Python Flask backend with SQLite builddatabase for the library management system, featuring advanced machine learning recommendations.

## Features

- **Book Management**: CRUD operations for books and ebooks
- **User Management**: User accounts and authentication
- **Ebook Store**: Digital book purchases with ZAR currency
- **Reading Progress**: Track reading completion
- **Fine Management**: Handle library fines and payments
- **Categories**: Organize books by genres
- **ML-powered Recommendations**: Advanced book recommendations using multiple ML algorithms

## Setup Instructions

### Prerequisites
- Python 3.7+
- XAMPP (optional, for advanced database management)

### Installation

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the server**:
   ```bash
   python start.py
   ```

   Or directly:
   ```bash
   python app.py
   ```

4. **Server will be available at**: `http://localhost:5000`

### Persistence and Deployment
- The backend reads the database path from the `DATABASE_PATH` environment variable. If unset, it defaults to `library.db` in the current directory.
- For production (e.g., Render), attach a persistent disk and set `DATABASE_PATH` to a file on that disk, such as `/var/data/library.db`.
- On startup, the server logs the database path in use: `[Startup] Using database at: <abs_path>`.

### Diagnostics
- A safe read-only diagnostics endpoint is available to verify persistence configuration:
  - `GET /api/admin/db-info` → returns the absolute database path, whether it exists, file size in bytes, and simple table counts.
  - Use this after deployment to confirm the DB points to your persistent disk.

## API Endpoints

### Books
- `GET /api/books` - Get all books (with optional category and ebook filters)
- `GET /api/categories` - Get all book categories

### Recommendations
- `GET /api/recommendations?user_id=1&limit=10&method=ml` - Get book recommendations
  - Available methods:
    - `ml` (default): Machine learning recommendations
    - `collaborative`: Collaborative filtering
    - `content`: Content-based filtering
    - `hybrid`: Hybrid recommendations

### Purchases
- `POST /api/books/<book_id>/purchase` - Purchase an ebook
  ```json
  {
    "user_id": 1
  }
  ```

### Reading Progress
- `POST /api/reading-progress` - Update reading progress
  ```json
  {
    "book_id": 1,
    "user_id": 1,
    "progress_percentage": 75
  }
  ```

### Fines
- `POST /api/fines/<fine_id>/pay` - Pay a fine

## Database Schema

### Tables
- **users**: User accounts and roles
- **books**: Book information including ebooks
- **book_issues**: Book borrowing records
- **reading_progress**: Reading completion tracking
- **purchases**: Ebook purchase records
- **user_interactions**: User interaction data for ML recommendations
- **book_features**: Pre-computed book features for recommendation algorithms
- **user_features**: Pre-computed user features for personalization

### Sample Data
The database is automatically populated with sample books including:
- The Great Gatsby (Free)
- To Kill a Mockingbird (R25.99)
- 1984 (Free)
- Pride and Prejudice (R19.99)
- The Catcher in the Rye (R22.50)

## Currency
All prices are in South African Rands (ZAR).

## Development

### Adding New Books
Books can be added directly to the database or through the admin interface (to be implemented).

### CORS
CORS is enabled for frontend integration.

### Error Handling
The API includes proper error handling and returns appropriate HTTP status codes.

## Machine Learning Recommendation System

The system uses multiple advanced ML algorithms to provide personalized book recommendations through the `MLRecommendationService` class.

### Recommendation Features

- **Content-Based Recommendations**: Recommends books similar to those a user has previously borrowed based on title, author, category, and description
- **Popularity-Based Recommendations**: Recommends popular books based on borrow count
- **Similar Books Recommendation**: Finds books similar to a given book using TF-IDF and cosine similarity

### Architecture

The recommendation system uses a hybrid approach combining multiple recommendation strategies:

1. **Content-Based Filtering**:
   - Uses TF-IDF vectorization to convert book text features into numerical vectors
   - Calculates similarity between books using cosine similarity
   - Recommends books similar to those the user has previously interacted with

2. **Popularity-Based Filtering**:
   - Recommends books with the highest borrow counts
   - Used as a fallback when user history is not available

3. **Future Enhancements** (In Development):
   - Collaborative filtering with implicit feedback
   - Matrix factorization for identifying hidden patterns
   - Contextual bandits to balance exploration/exploitation
   - Learning-to-rank for optimal recommendation ordering

### API Endpoints

- **`/api/recommendations/<int:user_id>`**: Get personalized recommendations for a user
  - Query parameters:
    - `type`: Recommendation type ('ml', 'collaborative', 'content', 'hybrid')
    - `limit`: Number of recommendations to return

- **`/api/similar-books/<int:book_id>`**: Get books similar to a specific book
  - Query parameters:
    - `limit`: Number of similar books to return

### Initialization

The ML recommendation system is automatically initialized when starting the server with `python start.py`. 
It will:
1. Update the database schema to support ML features if needed
2. Generate sample interaction data if needed
3. Build and cache initial ML models

To manually initialize or test the ML system:
```bash
python init_ml_recommendations.py  # Initialize ML system
python test_ml_recommendations.py  # Test recommendation functionality
```

## ML Recommendation Service API

The `MLRecommendationService` class provides these key methods:

- **get_recommendations(user_id, n=10)**
  - Returns book recommendations for a user as a dictionary with 'content_based' and 'popular' recommendation lists

- **get_similar_books(book_id, n=5)**
  - Returns books similar to the specified book

- **get_popular_books(n=10)**
  - Returns the most popular books based on borrow count

## Dependencies

- Flask and Flask-CORS for the web API
- NumPy and Pandas for data manipulation
- scikit-learn for TF-IDF vectorization and cosine similarity calculations
- SQLite3 for database access
- Google Generative AI (optional, for chatbot features)

## Troubleshooting

1. **Port already in use**: Change the port in `app.py` or kill the process using port 5000
2. **Database issues**: Delete `library.db` and restart to recreate the database
3. **Import errors**: Make sure all dependencies are installed with `pip install -r requirements.txt`
4. **ML recommendations not working**: Check that scikit-learn and pandas are installed, or run `init_ml_recommendations.py` manually
5. **Similar books not working**: Verify the book ID exists in the database