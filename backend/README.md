# Library Management System Backend

A Python Flask backend with SQLite database for the library management system.

## Features

- **Book Management**: CRUD operations for books and ebooks
- **User Management**: User accounts and authentication
- **Ebook Store**: Digital book purchases with ZAR currency
- **Rating System**: 5-star rating and review system
- **Reading Progress**: Track reading completion
- **Fine Management**: Handle library fines and payments
- **Categories**: Organize books by genres

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

## API Endpoints

### Books
- `GET /api/books` - Get all books (with optional category and ebook filters)
- `GET /api/categories` - Get all book categories

### Ratings
- `POST /api/books/<book_id>/rate` - Rate a book
  ```json
  {
    "user_id": 1,
    "rating": 5,
    "review": "Great book!"
  }
  ```

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
- **book_ratings**: User ratings and reviews
- **book_issues**: Book borrowing records
- **reading_progress**: Reading completion tracking
- **purchases**: Ebook purchase records

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

## Troubleshooting

1. **Port already in use**: Change the port in `app.py` or kill the process using port 5000
2. **Database issues**: Delete `library.db` and restart to recreate the database
3. **Import errors**: Make sure all dependencies are installed with `pip install -r requirements.txt`