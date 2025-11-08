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
        ("Thinking, Fast and Slow", "Daniel Kahneman", "9780374533557", "Psychology", "A book about the two systems that drive the way we think.", 16.00, 1, 1, "thinking.jpg", None, 4, 4, 512, "2011-01-01"),
        ("The Power of Habit", "Charles Duhigg", "9780812981605", "Psychology", "A book about the science of habit formation.", 11.99, 1, 1, "habit.jpg", None, 3, 3, 371, "2012-01-01"),
        ("The Immortal Life of Henrietta Lacks", "Rebecca Skloot", "9781400052189", "Science", "A book about the woman behind the HeLa cell line.", 16.00, 1, 1, "hela.jpg", None, 4, 4, 381, "2010-01-01"),
        ("The Gene: An Intimate History", "Siddhartha Mukherjee", "9781476733500", "Science", "A book about the history of genetics.", 20.00, 1, 1, "gene.jpg", None, 3, 3, 592, "2016-01-01"),
        ("The Hidden Life of Trees", "Peter Wohlleben", "9781771642484", "Nature", "A book about the secret life of trees.", 18.95, 1, 1, "trees.jpg", None, 4, 4, 288, "2015-01-01"),
        ("The Body: A Guide for Occupants", "Bill Bryson", "9780385539302", "Science", "A book about the human body.", 18.99, 1, 1, "body.jpg", None, 5, 5, 450, "2019-01-01"),
        ("Astrophysics for People in a Hurry", "Neil deGrasse Tyson", "9780393609394", "Science", "A book about the universe.", 18.99, 1, 1, "astrophysics.jpg", None, 3, 3, 224, "2017-01-01"),
        ("The Order of Time", "Carlo Rovelli", "9780735216105", "Science", "A book about the nature of time.", 16.00, 1, 1, "time2.jpg", None, 4, 4, 240, "2017-01-01"),
        ("The Hidden Life of the Mind", "Mariano Sigman", "9780062671389", "Neuroscience", "A book about how our brain works.", 15.99, 1, 1, "mind.jpg", None, 3, 3, 320, "2017-01-01"),
        ("The Disappearing Spoon", "Sam Kean", "9780316051644", "Science", "A book about the periodic table.", 16.99, 1, 1, "spoon.jpg", None, 4, 4, 391, "2010-01-01"),
        
        # Fun Books (15)
        ("The Hitchhiker's Guide to the Galaxy", "Douglas Adams", "9780345391803", "Science Fiction", "A comedy science fiction series.", 7.99, 1, 1, "hitchhikers.jpg", None, 6, 6, 200, "1979-01-01"),
        ("Good Omens", "Terry Pratchett & Neil Gaiman", "9780060853983", "Fantasy", "A comedy about the birth of the son of Satan.", 9.99, 1, 1, "goodomens.jpg", None, 5, 5, 320, "1990-01-01"),
        ("The Princess Bride", "William Goldman", "9780156035217", "Fantasy", "A tale of true love and high adventure.", 8.99, 1, 1, "princessbride.jpg", None, 5, 5, 300, "1973-01-01"),
        ("The Martian", "Andy Weir", "9780553418026", "Science Fiction", "An astronaut becomes stranded on Mars.", 9.99, 1, 1, "martian.jpg", None, 4, 4, 350, "2011-01-01"),
        ("The Hobbit", "J.R.R. Tolkien", "9780547928227", "Fantasy", "A fantasy novel about a hobbit's journey.", 10.99, 1, 1, "hobbit.jpg", None, 5, 5, 310, "1937-01-01"),
        ("The Hunger Games", "Suzanne Collins", "9780439023481", "Dystopian", "A dystopian novel about a fight to the death.", 8.99, 1, 1, "hungergames.jpg", None, 5, 5, 374, "2008-01-01"),
        ("The Da Vinci Code", "Dan Brown", "9780307474278", "Thriller", "A mystery thriller about a conspiracy within the Catholic Church.", 9.99, 1, 1, "davinci.jpg", None, 4, 4, 489, "2003-01-01"),
        ("The Alchemist", "Paulo Coelho", "9780062315007", "Fiction", "A novel about a shepherd boy's journey to find treasure.", 9.99, 1, 1, "alchemist.jpg", None, 5, 5, 208, "1988-01-01"),
        ("The Book Thief", "Markus Zusak", "9780375842207", "Historical Fiction", "A novel about a girl who steals books in Nazi Germany.", 12.99, 1, 1, "bookthief.jpg", None, 4, 4, 552, "2005-01-01"),
        ("The Fault in Our Stars", "John Green", "9780142424179", "Young Adult", "A novel about two teenagers with cancer who fall in love.", 9.99, 1, 1, "fault.jpg", None, 5, 5, 313, "2012-01-01"),
        ("The Kite Runner", "Khaled Hosseini", "9781594631931", "Fiction", "A novel about friendship and redemption in Afghanistan.", 10.99, 1, 1, "kite.jpg", None, 4, 4, 371, "2003-01-01"),
        ("The Help", "Kathryn Stockett", "9780425232200", "Historical Fiction", "A novel about African American maids in the 1960s.", 9.99, 1, 1, "help.jpg", None, 5, 5, 522, "2009-01-01"),
        ("The Girl on the Train", "Paula Hawkins", "9781594634024", "Thriller", "A psychological thriller about a woman who becomes involved in a missing person's case.", 12.99, 1, 1, "girltrain.jpg", None, 4, 4, 336, "2015-01-01"),
        ("Gone Girl", "Gillian Flynn", "9780307588371", "Thriller", "A psychological thriller about a woman who disappears on her fifth wedding anniversary.", 9.99, 1, 1, "gonegirl.jpg", None, 5, 5, 415, "2012-01-01"),
        ("The Silent Patient", "Alex Michaelides", "9781250301697", "Thriller", "A psychological thriller about a woman who shoots her husband and then stops speaking.", 12.99, 1, 1, "silent.jpg", None, 4, 4, 336, "2019-01-01"),
        
        # Poetry Collections (5)
        ("The Complete Sonnets and Poems", "William Shakespeare", "9780199535798", "Poetry", "The complete collection of Shakespeare's sonnets and other poems.", 12.99, 1, 1, "sonnets.jpg", None, 4, 4, 750, "1609-01-01"),
        ("Milk and Honey", "Rupi Kaur", "9781449474256", "Poetry", "A collection of poetry and prose about survival, love, and healing.", 14.99, 1, 1, "milk.jpg", None, 5, 5, 208, "2014-01-01"),
        ("The Sun and Her Flowers", "Rupi Kaur", "9781449486792", "Poetry", "A collection of poetry about growth and healing.", 14.99, 1, 1, "sunflowers.jpg", None, 4, 4, 256, "2017-01-01"),
        ("The Essential Rumi", "Jalal al-Din Rumi", "9780062509598", "Poetry", "A collection of Rumi's most beloved poems.", 16.99, 1, 1, "rumi.jpg", None, 5, 5, 320, "1995-01-01"),
        ("Leaves of Grass", "Walt Whitman", "9780140421995", "Poetry", "A collection of poetry celebrating nature, humanity, and the American experience.", 10.99, 1, 1, "leaves.jpg", None, 4, 4, 512, "1855-01-01"),
        
        # Shakespeare's Works (10)
        ("Hamlet", "William Shakespeare", "9780743477109", "Drama", "The tragedy of the Prince of Denmark.", 9.99, 1, 0, "hamlet.jpg", None, 5, 5, 300, "1603-01-01"),
        ("Macbeth", "William Shakespeare", "9780743477109", "Drama", "A tragedy about the corrupting power of unchecked ambition.", 8.99, 1, 0, "macbeth.jpg", None, 4, 4, 250, "1606-01-01"),
        ("Romeo and Juliet", "William Shakespeare", "9780743477116", "Tragedy", "The tragic love story of two young star-crossed lovers.", 8.50, 1, 0, "romeo.jpg", None, 6, 6, 280, "1597-01-01"),
        ("Othello", "William Shakespeare", "9780743477550", "Tragedy", "A tragedy about jealousy and betrayal.", 9.25, 1, 0, "othello.jpg", None, 4, 4, 320, "1603-01-01"),
        ("King Lear", "William Shakespeare", "9780743482769", "Tragedy", "A tragedy about aging, power, and madness.", 9.50, 1, 0, "lear.jpg", None, 3, 3, 350, "1606-01-01"),
        ("A Midsummer Night's Dream", "William Shakespeare", "9780743477543", "Comedy", "A romantic comedy about the adventures of four young lovers.", 8.75, 1, 0, "midsummer.jpg", None, 5, 5, 200, "1595-01-01"),
        ("The Tempest", "William Shakespeare", "9780743482837", "Romance", "A play about magic, betrayal, love and forgiveness.", 9.00, 1, 0, "tempest.jpg", None, 4, 4, 240, "1611-01-01"),
        ("Julius Caesar", "William Shakespeare", "9780743482745", "History", "A tragedy about the conspiracy against the Roman dictator.", 8.50, 1, 0, "caesar.jpg", None, 4, 4, 260, "1599-01-01"),
        ("The Taming of the Shrew", "William Shakespeare", "9780743477574", "Comedy", "A comedy about the courtship of a headstrong woman.", 8.25, 1, 0, "shrew.jpg", None, 3, 3, 280, "1592-01-01"),
        ("Twelfth Night", "William Shakespeare", "9780743482776", "Comedy", "A romantic comedy about mistaken identity.", 8.50, 1, 0, "twelfth.jpg", None, 5, 5, 220, "1601-01-01")
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
