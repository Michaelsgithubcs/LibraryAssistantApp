import sqlite3
from datetime import datetime, timedelta

def create_connection(db_file):
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        return conn
    except sqlite3.Error as e:
        print(e)
    return conn

def add_sample_books(conn):
    books = [
        ("To Kill a Mockingbird", "Harper Lee", "9780061120084", "Fiction", "A novel about the serious issues of rape and racial inequality.", 10.99, 1, 0, "mockingbird.jpg", None, 5, 5, 300, "1960-07-11"),
        ("1984", "George Orwell", "9780451524935", "Dystopian", "A dystopian social science fiction novel and cautionary tale.", 8.99, 1, 0, "1984.jpg", None, 3, 3, 350, "1949-06-08"),
        ("Pride and Prejudice", "Jane Austen", "9780141439518", "Romance", "A romantic novel of manners that follows the character development of Elizabeth Bennet.", 7.50, 1, 0, "pride.jpg", None, 4, 4, 280, "1813-01-28"),
        ("The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", "Classic", "A story of decadence, excess, and the American Dream in the Jazz Age.", 9.99, 0, 0, "gatsby.jpg", None, 2, 2, 180, "1925-04-10"),
        ("The Hobbit", "J.R.R. Tolkien", "9780547928227", "Fantasy", "A fantasy novel about the quest of home-loving hobbit Bilbo Baggins.", 12.99, 1, 0, "hobbit.jpg", None, 6, 6, 400, "1937-09-21")
    ]
    
    sql = '''INSERT INTO books(title, author, isbn, category, description, price, is_free, is_ebook, 
                             cover_image, pdf_url, total_copies, available_copies, reading_time_minutes, publish_date)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)'''
    
    try:
        cur = conn.cursor()
        cur.executemany(sql, books)
        conn.commit()
        print(f"Added {cur.rowcount} books to the database.")
    except sqlite3.Error as e:
        print(f"Error adding books: {e}")

def add_sample_users(conn):
    users = [
        ("admin", "admin@library.com", "admin123", "admin"),
        ("john_doe", "john@example.com", "password123", "user"),
        ("jane_smith", "jane@example.com", "password123", "user")
    ]
    
    sql = '''INSERT INTO users(username, email, password, role) VALUES(?,?,?,?)'''
    
    try:
        cur = conn.cursor()
        cur.executemany(sql, users)
        conn.commit()
        print(f"Added {cur.rowcount} users to the database.")
    except sqlite3.Error as e:
        print(f"Error adding users: {e}")

def main():
    database = "library.db"
    
    # Create a database connection
    conn = create_connection(database)
    
    if conn is not None:
        print("Connected to the database.")
        
        # Add sample data
        add_sample_books(conn)
        add_sample_users(conn)
        
        # Close the connection
        conn.close()
        print("Database population complete.")
    else:
        print("Error! Cannot create the database connection.")

if __name__ == '__main__':
    main()
