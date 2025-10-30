#!/usr/bin/env python3
"""
Generate sample user interaction data for the library database
This will create realistic user interactions to help train the ML recommendation system
"""
import sqlite3
import random
from datetime import datetime, timedelta
import sys
import os

# Path to the database file
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "library.db")

def generate_user_interactions():
    """Generate realistic user interaction data"""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get all users
        cursor.execute("SELECT id FROM users")
        user_ids = [row[0] for row in cursor.fetchall()]
        
        if not user_ids:
            print("No users found in the database.")
            return False
            
        # Get all books
        cursor.execute("SELECT id FROM books")
        book_ids = [row[0] for row in cursor.fetchall()]
        
        if not book_ids:
            print("No books found in the database.")
            return False
        
        print(f"Found {len(user_ids)} users and {len(book_ids)} books.")
        
        # Generate loan data
        loan_count = 0
        now = datetime.now()
        
        for user_id in user_ids:
            # Each user borrows between 3 and 15 books
            num_loans = random.randint(3, 15)
            
            # Get user preferences - make each user prefer certain categories
            preferred_categories = random.sample(['Fiction', 'Non-Fiction', 'Mystery', 'Sci-Fi', 'Biography', 'History'], 
                                             random.randint(1, 3))
            
            cursor.execute("""
                SELECT id FROM books WHERE category IN ({})
            """.format(','.join(['?']*len(preferred_categories))), preferred_categories)
            
            preferred_books = [row[0] for row in cursor.fetchall()]
            
            if not preferred_books:
                preferred_books = book_ids  # Fallback if no books match preferences
            
            # Generate user's loans
            for _ in range(num_loans):
                # 70% chance to borrow from preferred categories
                book_id = random.choice(preferred_books if random.random() < 0.7 else book_ids)
                
                # Generate random dates in the past year
                days_ago = random.randint(1, 365)
                loan_date = (now - timedelta(days=days_ago)).strftime('%Y-%m-%d')
                
                # 80% of loans are returned
                is_returned = random.random() < 0.8
                return_date = None
                if is_returned:
                    # Return between 1 and 30 days after borrowing
                    loan_duration = random.randint(1, 30)
                    return_date = (now - timedelta(days=days_ago-loan_duration)).strftime('%Y-%m-%d')
                    # Ensure return date is not in the future
                    return_date = min(return_date, now.strftime('%Y-%m-%d'))
                
                # Insert the loan as user interaction
                try:
                    cursor.execute("""
                        INSERT INTO user_interactions (user_id, book_id, action_type, timestamp, interaction_data) 
                        VALUES (?, ?, ?, ?, ?)
                    """, (user_id, book_id, 'borrow', loan_date, 
                          f'{{"return_date": "{return_date}", "is_returned": {1 if is_returned else 0}}}'))
                    loan_count += 1
                except sqlite3.Error as e:
                    print(f"Error inserting loan interaction: {e}")
        
        # Generate reservation data
        reservation_count = 0
        for user_id in user_ids:
            # Each user makes between 0 and 5 reservations
            num_reservations = random.randint(0, 5)
            
            for _ in range(num_reservations):
                # Pick a random book
                book_id = random.choice(book_ids)
                
                # Generate random dates in the past 3 months
                days_ago = random.randint(1, 90)
                reservation_date = (now - timedelta(days=days_ago)).strftime('%Y-%m-%d')
                
                # Determine status
                status_options = ['pending', 'approved', 'rejected', 'completed']
                status_weights = [0.2, 0.3, 0.2, 0.3]  # Weights for each status
                status = random.choices(status_options, weights=status_weights)[0]
                
                # Insert the reservation as user interaction
                try:
                    cursor.execute("""
                        INSERT INTO user_interactions (user_id, book_id, action_type, timestamp, interaction_data) 
                        VALUES (?, ?, ?, ?, ?)
                    """, (user_id, book_id, 'reservation', reservation_date, 
                          f'{{"status": "{status}"}}'))
                    reservation_count += 1
                except sqlite3.Error as e:
                    print(f"Error inserting reservation interaction: {e}")
        
        # Generate view interactions - users viewing book details
        view_count = 0
        for user_id in user_ids:
            # Each user views between 5 and 20 books
            num_views = random.randint(5, 20)
            
            for _ in range(num_views):
                # Pick a random book
                book_id = random.choice(book_ids)
                
                # Generate random dates in the past 6 months
                days_ago = random.randint(1, 180)
                view_date = (now - timedelta(days=days_ago)).strftime('%Y-%m-%d %H:%M:%S')
                
                # Duration spent viewing (in seconds)
                view_duration = random.randint(10, 300)
                
                # Insert the view interaction
                try:
                    cursor.execute("""
                        INSERT INTO user_interactions (user_id, book_id, action_type, timestamp, interaction_data) 
                        VALUES (?, ?, ?, ?, ?)
                    """, (user_id, book_id, 'view', view_date, 
                          f'{{"duration_seconds": {view_duration}}}'))
                    view_count += 1
                except sqlite3.Error as e:
                    print(f"Error inserting view interaction: {e}")
                    
        # Generate search interactions
        search_count = 0
        search_terms = [
            "fiction", "mystery", "romance", "science", "history", 
            "fantasy", "biography", "cooking", "travel", "self-help",
            "Shakespeare", "Tolkien", "Rowling", "Austen", "Hemingway"
        ]
        
        for user_id in user_ids:
            # Each user performs between 2 and 10 searches
            num_searches = random.randint(2, 10)
            
            for _ in range(num_searches):
                # Pick random search terms
                term = random.choice(search_terms)
                
                # Generate random dates in the past 6 months
                days_ago = random.randint(1, 180)
                search_date = (now - timedelta(days=days_ago)).strftime('%Y-%m-%d %H:%M:%S')
                
                # Insert the search interaction
                try:
                    cursor.execute("""
                        INSERT INTO user_interactions (user_id, book_id, action_type, timestamp, interaction_data) 
                        VALUES (?, ?, ?, ?, ?)
                    """, (user_id, None, 'search', search_date, 
                          f'{{"query": "{term}"}}'))
                    search_count += 1
                except sqlite3.Error as e:
                    print(f"Error inserting search interaction: {e}")
                    
        # Commit changes
        conn.commit()
        
        print(f"Generated {loan_count} loans, {reservation_count} reservations, {view_count} views, and {search_count} searches.")
        conn.close()
        
        print(f"Generated {loan_count} loans and {reservation_count} reservations.")
        return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Generating user interaction data for ML recommendations...")
    if generate_user_interactions():
        print("Data generation complete!")
    else:
        print("Data generation failed.")
        sys.exit(1)
