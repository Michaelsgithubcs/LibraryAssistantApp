import sqlite3
import os

def create_database():
    # Get the directory of this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, 'library.db')
    
    # Backup existing database if it exists
    if os.path.exists(db_path):
        os.rename(db_path, f"{db_path}.backup")
    
    # Create new database
    conn = sqlite3.connect(db_path)
    
    # Create tables
    schema_path = os.path.join(script_dir, 'schema.sql')
    with open(schema_path, 'r') as f:
        schema = f.read()
    
    conn.executescript(schema)
    conn.commit()
    
    print("New database created successfully.")
    return conn

def add_sample_data(conn):
    # Add sample users
    users = [
        ("admin", "admin@library.com", "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", "admin"),  # password: admin
        ("john_doe", "john@example.com", "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", "user"),
        ("jane_smith", "jane@example.com", "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", "user")
    ]
    
    try:
        cur = conn.cursor()
        cur.executemany("""
            INSERT INTO users (username, email, password, role)
            VALUES (?, ?, ?, ?)
        """, users)
        print(f"Added {len(users)} sample users.")
    except sqlite3.Error as e:
        print(f"Error adding users: {e}")
    
    # Add sample books
    books = [
        # Shakespeare's Works (10)
        ("Hamlet", "William Shakespeare", "", "Drama", "The tragedy of the Prince of Denmark.", 9.99, 1, 0, "hamlet.jpg", None, 5, 5, 300, "1603-01-01"),
        ("Macbeth", "William Shakespeare", "", "Drama", "A tragedy about the corrupting power of unchecked ambition.", 8.99, 1, 0, "macbeth.jpg", None, 4, 4, 250, "1606-01-01"),
        ("Romeo and Juliet", "William Shakespeare", "", "Romance", "The tragic love story of two young star-crossed lovers.", 8.50, 1, 0, "romeo.jpg", None, 6, 6, 280, "1597-01-01"),
        ("Othello", "William Shakespeare", "", "Drama", "A tragedy about jealousy and betrayal.", 9.25, 1, 0, "othello.jpg", None, 4, 4, 320, "1603-01-01"),
        ("King Lear", "William Shakespeare", "", "Tragedy", "A tragedy about aging, power, and madness.", 9.50, 1, 0, "kinglear.jpg", None, 3, 3, 350, "1606-01-01"),
        ("A Midsummer Night's Dream", "William Shakespeare", "", "Comedy", "A romantic comedy about the adventures of four young lovers.", 8.75, 1, 0, "midsummer.jpg", None, 5, 5, 200, "1595-01-01"),
        ("The Tempest", "William Shakespeare", "", "Fantasy", "A play about magic, betrayal, love and forgiveness.", 9.00, 1, 0, "tempest.jpg", None, 4, 4, 240, "1611-01-01"),
        ("Julius Caesar", "William Shakespeare", "", "History", "A tragedy about the conspiracy against the Roman dictator.", 8.50, 1, 0, "juliuscaesar.jpg", None, 4, 4, 260, "1599-01-01"),
        ("The Taming of the Shrew", "William Shakespeare", "", "Comedy", "A comedy about the courtship of a headstrong woman.", 8.25, 1, 0, "shrew.jpg", None, 3, 3, 280, "1592-01-01"),
        ("Twelfth Night", "William Shakespeare", "", "Comedy", "A romantic comedy about mistaken identity.", 8.50, 1, 0, "twelfthnight.jpg", None, 5, 5, 220, "1601-01-01"),
        
        # Educational Books (20)
        ("A Brief History of Time", "Stephen Hawking", "9780553380163", "Science", "A popular science book about cosmology.", 15.99, 1, 1, "time.jpg", None, 3, 3, 400, "1988-01-01"),
        ("Sapiens: A Brief History of Humankind", "Yuval Noah Harari", "9780062316097", "History", "A book exploring the history of human evolution.", 17.99, 1, 1, "sapiens.jpg", None, 5, 5, 450, "2011-01-01"),
        ("The Selfish Gene", "Richard Dawkins", "9780192860927", "Science", "A book on evolution that introduces the gene-centered view.", 14.99, 1, 1, "selfish.jpg", None, 4, 4, 360, "1976-01-01"),
        ("Cosmos", "Carl Sagan", "9780345539434", "Science", "A book about the evolution of the universe and civilization.", 16.99, 1, 1, "cosmos.jpg", None, 3, 3, 380, "1980-01-01"),
        ("The Structure of Scientific Revolutions", "Thomas Kuhn", "9780226458120", "Science", "A book about the history of science.", 18.99, 1, 1, "kuhn.jpg", None, 2, 2, 280, "1962-01-01"),
        
        # Fun Books (20)
        ("The Hitchhiker's Guide to the Galaxy", "Douglas Adams", "9780345391803", "Science Fiction", "A comedy science fiction series.", 7.99, 1, 1, "hitchhikers.jpg", None, 6, 6, 200, "1979-01-01"),
        ("Good Omens", "Terry Pratchett & Neil Gaiman", "9780060853983", "Fantasy", "A comedy about the birth of the son of Satan.", 9.99, 1, 1, "goodomens.jpg", None, 5, 5, 320, "1990-01-01"),
        ("The Martian", "Andy Weir", "9780553418026", "Science Fiction", "An astronaut becomes stranded on Mars.", 9.99, 1, 1, "martian.jpg", None, 4, 4, 380, "2011-01-01"),
        ("The House in the Cerulean Sea", "TJ Klune", "9781250217318", "Fantasy", "A magical island, a dangerous task, and a burning secret.", 15.99, 1, 1, "cerulean.jpg", None, 5, 5, 350, "2020-01-01")
    ]
    
    sql = '''INSERT INTO books(title, author, isbn, category, description, price, is_free, is_ebook, 
                             cover_image, pdf_url, total_copies, available_copies, reading_time_minutes, publish_date)
             VALUES(?,?,NULLIF(?,''),?,?,?,?,?,?,?,?,?,?,?)'''
    
    try:
        cur = conn.cursor()
        cur.executemany(sql, books)
        conn.commit()
        print(f"Added {cur.rowcount} books to the database.")
    except sqlite3.Error as e:
        print(f"Error adding books: {e}")

if __name__ == '__main__':
    conn = create_database()
    add_sample_data(conn)
    conn.close()
    print("Database reset complete. You can now start the backend server.")
