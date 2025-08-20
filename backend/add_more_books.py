import sqlite3
from datetime import datetime

def create_connection(db_file):
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        return conn
    except sqlite3.Error as e:
        print(e)
    return conn

def add_books(conn):
    books = [
        # Shakespeare's Works (10)
        ("Hamlet", "William Shakespeare", "", "Drama", "The tragedy of the Prince of Denmark.", 9.99, 1, 0, "hamlet.jpg", None, 5, 5, 300, "1603-01-01"),
        ("Macbeth", "William Shakespeare", "", "Drama", "A tragedy about the corrupting power of unchecked ambition.", 8.99, 1, 0, "macbeth.jpg", None, 4, 4, 250, "1606-01-01"),
        ("Romeo and Juliet", "William Shakespeare", "", "Romance", "The tragic love story of two young star-crossed lovers.", 8.50, 1, 0, "romeo.jpg", None, 6, 6, 280, "1597-01-01"),
        ("Othello", "William Shakespeare", "", "Drama", "A tragedy about jealousy and betrayal.", 9.25, 1, 0, "othello.jpg", None, 4, 4, 320, "1603-01-01"),
        ("King Lear", "William Shakespeare", "", "Drama", "A tragedy about aging, power, and madness.", 9.50, 1, 0, "lear.jpg", None, 3, 3, 350, "1606-01-01"),
        ("A Midsummer Night's Dream", "William Shakespeare", "", "Comedy", "A romantic comedy about the adventures of four young lovers.", 8.75, 1, 0, "midsummer.jpg", None, 5, 5, 200, "1595-01-01"),
        ("The Tempest", "William Shakespeare", "", "Fantasy", "A play about magic, betrayal, love and forgiveness.", 9.00, 1, 0, "tempest.jpg", None, 4, 4, 240, "1611-01-01"),
        ("Julius Caesar", "William Shakespeare", "", "History", "A tragedy about the conspiracy against the Roman dictator.", 8.50, 1, 0, "caesar.jpg", None, 4, 4, 260, "1599-01-01"),
        ("The Taming of the Shrew", "William Shakespeare", "", "Comedy", "A comedy about the courtship of a headstrong woman.", 8.25, 1, 0, "shrew.jpg", None, 3, 3, 280, "1592-01-01"),
        ("Twelfth Night", "William Shakespeare", "", "Comedy", "A romantic comedy about mistaken identity.", 8.50, 1, 0, "twelfth.jpg", None, 5, 5, 220, "1601-01-01"),
        
        # Educational Books (20)
        ("A Brief History of Time", "Stephen Hawking", "9780553380163", "Science", "A popular science book about cosmology.", 15.99, 1, 1, "time.jpg", None, 3, 3, 400, "1988-01-01"),
        ("Sapiens: A Brief History of Humankind", "Yuval Noah Harari", "9780062316097", "History", "A book exploring the history of human evolution.", 17.99, 1, 1, "sapiens.jpg", None, 5, 5, 450, "2011-01-01"),
        ("The Selfish Gene", "Richard Dawkins", "9780192860927", "Science", "A book on evolution that introduces the gene-centered view.", 14.99, 1, 1, "selfish.jpg", None, 4, 4, 360, "1976-01-01"),
        ("Cosmos", "Carl Sagan", "9780345539434", "Science", "A book about the evolution of the universe and civilization.", 16.99, 1, 1, "cosmos.jpg", None, 3, 3, 380, "1980-01-01"),
        ("The Structure of Scientific Revolutions", "Thomas Kuhn", "9780226458120", "Science", "A book about the history of science.", 18.99, 1, 1, "kuhn.jpg", None, 2, 2, 280, "1962-01-01"),
        ("Guns, Germs, and Steel", "Jared Diamond", "9780393317558", "History", "A book about the fates of human societies.", 17.50, 1, 1, "guns.jpg", None, 4, 4, 420, "1997-01-01"),
        ("The Origin of Species", "Charles Darwin", "9780451529060", "Science", "The foundation of evolutionary biology.", 12.99, 1, 1, "origin.jpg", None, 3, 3, 500, "1859-01-01"),
        ("A Short History of Nearly Everything", "Bill Bryson", "9780767908184", "Science", "A survey of scientific knowledge.", 16.99, 1, 1, "bryson.jpg", None, 5, 5, 480, "2003-01-01"),
        ("The Sixth Extinction", "Elizabeth Kolbert", "9780805092998", "Science", "An account of the major extinction events in Earth's history.", 15.99, 1, 1, "extinction.jpg", None, 3, 3, 320, "2014-01-01"),
        ("The Emperor of All Maladies", "Siddhartha Mukherjee", "9781439107959", "Science", "A biography of cancer.", 18.99, 1, 1, "cancer.jpg", None, 2, 2, 400, "2010-01-01"),
        
        # Fun Books (20)
        ("The Hitchhiker's Guide to the Galaxy", "Douglas Adams", "9780345391803", "Science Fiction", "A comedy science fiction series.", 7.99, 1, 1, "hitchhikers.jpg", None, 6, 6, 200, "1979-01-01"),
        ("Good Omens", "Terry Pratchett & Neil Gaiman", "9780060853983", "Fantasy", "A comedy about the birth of the son of Satan.", 9.99, 1, 1, "goodomens.jpg", None, 5, 5, 320, "1990-01-01"),
        ("Bossypants", "Tina Fey", "9780316056878", "Humor", "A memoir by the comedian and writer.", 12.99, 1, 1, "bossypants.jpg", None, 4, 4, 280, "2011-01-01"),
        ("The Princess Bride", "William Goldman", "9780156035217", "Fantasy", "A tale of true love and high adventure.", 8.99, 1, 1, "princessbride.jpg", None, 5, 5, 300, "1973-01-01"),
        ("The Martian", "Andy Weir", "9780553418026", "Science Fiction", "An astronaut becomes stranded on Mars.", 9.99, 1, 1, "martian.jpg", None, 4, 4, 380, "2011-01-01"),
        ("The House in the Cerulean Sea", "TJ Klune", "9781250217318", "Fantasy", "A magical island, a dangerous task, and a burning secret.", 15.99, 1, 1, "cerulean.jpg", None, 5, 5, 350, "2020-01-01"),
        ("Project Hail Mary", "Andy Weir", "9780593135204", "Science Fiction", "An astronaut must save the earth from disaster.", 14.99, 1, 1, "hailmary.jpg", None, 4, 4, 420, "2021-01-01"),
        ("The Thursday Murder Club", "Richard Osman", "9781984880987", "Mystery", "Four septuagenarians solve murders in their retirement village.", 13.99, 1, 1, "thursday.jpg", None, 5, 5, 380, "2020-01-01"),
        ("The Midnight Library", "Matt Haig", "9780525559474", "Fiction", "A library between life and death.", 14.99, 1, 1, "midnight.jpg", None, 6, 6, 300, "2020-01-01"),
        ("Anxious People", "Fredrik Backman", "9781501160837", "Fiction", "A bank robbery turns into a hostage situation.", 13.99, 1, 1, "anxious.jpg", None, 4, 4, 340, "2019-01-01")
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

def main():
    database = "library.db"
    
    # Create a database connection
    conn = create_connection(database)
    
    if conn is not None:
        print("Connected to the database.")
        
        # Add books
        add_books(conn)
        
        # Close the connection
        conn.close()
        print("Database population complete.")
    else:
        print("Error! Cannot create the database connection.")

if __name__ == '__main__':
    main()
