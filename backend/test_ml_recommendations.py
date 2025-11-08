#!/usr/bin/env python3
"""
Test the ML recommendation system
This script runs a quick test of the ML recommendation system to verify it's working correctly
"""
import os
import sys
import json
from ml_recommendation_service import MLRecommendationService

# Path to the database file
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "library.db")

def test_ml_recommendations():
    """Test the ML recommendation system"""
    print("Testing ML recommendation system...\n")
    
    # Initialize ML recommendation service
    ml_service = MLRecommendationService(DB_PATH)
    
    # Get some test users
    conn = ml_service.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username FROM users LIMIT 5")
    test_users = cursor.fetchall()
    
    if not test_users:
        print("No users found in the database. Please make sure the database is initialized.")
        return False
    
    print(f"Testing with {len(test_users)} users:\n")
    
    for user_id, username in test_users:
        print(f"User {username} (ID: {user_id}):")
        
        # Get recommendations
        print("  ML Recommendations:")
        try:
            recommendations = ml_service.get_recommendations(user_id, n=5)
            
            # Print content-based recommendations
            print("    Content-based recommendations:")
            if not recommendations['content_based']:
                print("      No content-based recommendations available")
            else:
                for i, rec in enumerate(recommendations['content_based'][:3], 1):
                    print(f"      {i}. {rec.get('title')} by {rec.get('author')} (Category: {rec.get('category')})")
            
            # Print popular recommendations
            print("    Popular books:")
            if not recommendations['popular']:
                print("      No popular books available")
            else:
                for i, rec in enumerate(recommendations['popular'][:3], 1):
                    print(f"      {i}. {rec.get('title')} by {rec.get('author')} (Category: {rec.get('category')})")
                    
        except Exception as e:
            print(f"    Error getting recommendations: {e}")
        
        # Test similar books feature
        print("  Similar Books Test:")
        try:
            # Get a random book the user has interacted with
            user_history = ml_service.get_user_history(user_id)
            if user_history:
                test_book_id = user_history[0]  # Use the first book
                
                # Get book details
                conn = ml_service.get_db_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT title, author FROM books WHERE id = ?", (test_book_id,))
                book_info = cursor.fetchone()
                
                if book_info:
                    book_title, book_author = book_info
                    print(f"    Finding books similar to: {book_title} by {book_author}")
                    
                    similar_books = ml_service.get_similar_books(test_book_id, 3)
                    if similar_books:
                        for i, book in enumerate(similar_books, 1):
                            print(f"      {i}. {book['title']} by {book['author']}")
                    else:
                        print("      No similar books found")
                else:
                    print("    Could not retrieve book details")
            else:
                print("    User has no borrowing history")
        except Exception as e:
            print(f"    Error getting similar books: {e}")
        
        print()
    
    # Test a random book for similar books
    print("Testing similar books for a random book:")
    try:
        conn = ml_service.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, author FROM books ORDER BY RANDOM() LIMIT 1")
        random_book = cursor.fetchone()
        conn.close()
        
        if random_book:
            book_id, book_title, book_author = random_book
            print(f"  Finding books similar to: {book_title} by {book_author}")
            
            similar_books = ml_service.get_similar_books(book_id, 3)
            if similar_books:
                for i, book in enumerate(similar_books, 1):
                    print(f"    {i}. {book['title']} by {book['author']}")
            else:
                print("    No similar books found")
        else:
            print("  No books found in database")
    except Exception as e:
        print(f"  Error finding similar books: {e}")
    
    print("\nML recommendation system test complete!")
    return True

if __name__ == "__main__":
    if not test_ml_recommendations():
        sys.exit(1)
