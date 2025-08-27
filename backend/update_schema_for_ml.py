#!/usr/bin/env python3
"""
Update the database schema to support ML recommendations
"""
import sqlite3
import os
import sys

# Path to the database file
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "library.db")

def update_schema():
    """Update the database schema to support ML recommendations"""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Drop user_interactions table if it exists to recreate it with new schema
        cursor.execute('DROP TABLE IF EXISTS user_interactions')
        
        # Create user_interactions table (for tracking user behavior)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            book_id INTEGER,  -- Nullable for global actions like searches
            action_type TEXT NOT NULL,  -- 'view', 'search', 'borrow', 'return', etc.
            timestamp DATETIME NOT NULL,
            interaction_data TEXT,  -- Optional JSON data for additional information
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (book_id) REFERENCES books(id)
        )
        ''')
        
        # Create index for faster queries
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_interactions_book ON user_interactions(book_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_interactions_action ON user_interactions(action_type)')
        
        # Check if column exists first, then add it if needed
        cursor.execute("PRAGMA table_info(books)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'reading_time_minutes' not in columns:
            cursor.execute('''
            ALTER TABLE books ADD COLUMN reading_time_minutes INTEGER DEFAULT 0
        ''')
        
        # Create book_features table for caching ML features
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS book_features (
            book_id INTEGER PRIMARY KEY,
            feature_vector TEXT,  -- JSON encoded feature vector
            last_updated DATETIME,
            FOREIGN KEY (book_id) REFERENCES books(id)
        )
        ''')
        
        # Create user_features table for caching ML features
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_features (
            user_id INTEGER PRIMARY KEY,
            feature_vector TEXT,  -- JSON encoded feature vector
            last_updated DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')
        
        # Create recommendation_logs table for tracking recommendations
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            book_id INTEGER NOT NULL,
            recommendation_time DATETIME NOT NULL,
            recommendation_type TEXT NOT NULL,  -- 'ml', 'collaborative', 'content', etc.
            score REAL,
            clicked INTEGER DEFAULT 0,  -- Whether the user clicked on the recommendation
            borrowed INTEGER DEFAULT 0,  -- Whether the user borrowed the recommended book
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (book_id) REFERENCES books(id)
        )
        ''')
        
        # Add fields to track sessions
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_start DATETIME NOT NULL,
            session_end DATETIME,
            session_data TEXT,  -- JSON encoded session data
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')
        
        # Commit changes
        conn.commit()
        conn.close()
        
        print("Database schema updated successfully!")
        return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Updating database schema for ML recommendations...")
    if update_schema():
        print("Schema update complete!")
    else:
        print("Schema update failed.")
        sys.exit(1)
