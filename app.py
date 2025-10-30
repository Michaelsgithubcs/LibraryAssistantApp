from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import sys
from datetime import datetime, timedelta
import hashlib
import secrets
import google.generativeai as genai
from recommendation_service import RecommendationService
from ml_recommendation_service import MLRecommendationService

app = Flask(__name__)
CORS(app)
app.secret_key = secrets.token_hex(16)

DATABASE = 'library.db'

# Configure Gemini API key from env if present
GENAI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Books table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            isbn TEXT UNIQUE,
            category TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10,2) DEFAULT 0,
            is_free BOOLEAN DEFAULT 1,
            is_ebook BOOLEAN DEFAULT 0,
            cover_image TEXT,
            pdf_url TEXT,
            total_copies INTEGER DEFAULT 1,
            available_copies INTEGER DEFAULT 1,
            reading_time_minutes INTEGER DEFAULT 0,
            publish_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add publish_date column if it doesn't exist
    try:
        cursor.execute('ALTER TABLE books ADD COLUMN publish_date DATE')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Book ratings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS book_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER,
            user_id INTEGER,
            rating INTEGER CHECK(rating >= 1 AND rating <= 5),
            review TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(book_id, user_id)
        )
    ''')
    
    # Book issues table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS book_issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER,
            user_id INTEGER,
            issue_date DATE NOT NULL,
            due_date DATE NOT NULL,
            return_date DATE,
            status TEXT DEFAULT 'issued',
            fine_amount DECIMAL(10,2) DEFAULT 0,
            overdue_fee_per_day DECIMAL(10,2) DEFAULT 5.00,
            damage_description TEXT,
            FOREIGN KEY (book_id) REFERENCES books (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Add new columns if they don't exist
    try:
        cursor.execute('ALTER TABLE book_issues ADD COLUMN overdue_fee_per_day DECIMAL(10,2) DEFAULT 5.00')
        cursor.execute('ALTER TABLE book_issues ADD COLUMN damage_description TEXT')
    except sqlite3.OperationalError:
        pass
    
    # Reading progress table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reading_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER,
            user_id INTEGER,
            progress_percentage INTEGER DEFAULT 0,
            is_completed BOOLEAN DEFAULT 0,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(book_id, user_id)
        )
    ''')
    
    # Purchases table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            book_id INTEGER,
            amount DECIMAL(10,2) NOT NULL,
            currency TEXT DEFAULT 'ZAR',
            status TEXT DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (book_id) REFERENCES books (id)
        )
    ''')
    
    # Book reservations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS book_reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER,
            user_id INTEGER,
            status TEXT DEFAULT 'pending',
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_at TIMESTAMP,
            approved_by INTEGER,
            rejection_reason TEXT,
            FOREIGN KEY (book_id) REFERENCES books (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (approved_by) REFERENCES users (id)
        )
    ''')
    
    # Add rejection_reason and viewed columns if they don't exist
    try:
        cursor.execute('ALTER TABLE book_reservations ADD COLUMN rejection_reason TEXT')
    except sqlite3.OperationalError:
        pass
    
    try:
        cursor.execute('ALTER TABLE book_reservations ADD COLUMN viewed BOOLEAN DEFAULT 0')
    except sqlite3.OperationalError:
        pass
    
    # Insert admin user
    admin_password = hashlib.sha256('admin'.encode()).hexdigest()
    user_password = hashlib.sha256('user'.encode()).hexdigest()
    librarian_password = hashlib.sha256('librarian'.encode()).hexdigest()
    
    cursor.execute('''
        INSERT OR IGNORE INTO users (username, email, password, role)
        VALUES 
        ('admin', 'admin@library.com', ?, 'admin'),
        ('user', 'user@library.com', ?, 'user'),
        ('librarian', 'librarian@library.com', ?, 'admin')
    ''', (admin_password, user_password, librarian_password))
    

    
    conn.commit()
    conn.close()

# API Routes
@app.route('/api/books', methods=['GET'])
def get_books():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    category = request.args.get('category')
    is_ebook = request.args.get('is_ebook')
    
    query = '''
        SELECT b.*, 
               0 as avg_rating,
               0 as rating_count
        FROM books b
        -- Rating functionality removed
        -- LEFT JOIN book_ratings br ON b.id = br.book_id
        WHERE 1=1
    '''
    params = []
    
    if category:
        query += ' AND b.category = ?'
        params.append(category)
    
    if is_ebook:
        query += ' AND b.is_ebook = ?'
        params.append(1 if is_ebook == 'true' else 0)
    
    query += ' GROUP BY b.id ORDER BY b.title ASC'
    
    cursor.execute(query, params)
    books = cursor.fetchall()
    
    book_list = []
    for book in books:
        book_list.append({
            'id': book[0],
            'title': book[1],
            'author': book[2],
            'isbn': book[3],
            'category': book[4],
            'description': book[5],
            'price': float(book[6]) if book[6] else 0,
            'is_free': bool(book[7]),
            'is_ebook': bool(book[8]),
            'cover_image': book[9],
            'pdf_url': book[10],
            'total_copies': book[11],
            'available_copies': book[12],
            'reading_time_minutes': book[13],
            'publish_date': book[14],
            'avg_rating': round(float(book[16]), 1) if len(book) > 16 else 0,
            'rating_count': book[17] if len(book) > 17 else 0
        })
    
    conn.close()
    return jsonify(book_list)

@app.route('/api/books/<int:book_id>/rate', methods=['POST'])
def rate_book():
    # Rating functionality disabled
    return jsonify({'message': 'Rating functionality has been disabled'})

@app.route('/api/books/<int:book_id>/purchase', methods=['POST'])
def purchase_book():
    data = request.json
    book_id = request.view_args['book_id']
    user_id = data.get('user_id', 1)
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Get book price
    cursor.execute('SELECT price FROM books WHERE id = ?', (book_id,))
    book = cursor.fetchone()
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    # Record purchase
    cursor.execute('''
        INSERT INTO purchases (user_id, book_id, amount)
        VALUES (?, ?, ?)
    ''', (user_id, book_id, book[0]))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Purchase successful'})

@app.route('/api/reading-progress', methods=['POST'])
def update_reading_progress():
    data = request.json
    book_id = data.get('book_id')
    user_id = data.get('user_id', 1)
    progress = data.get('progress_percentage', 0)
    is_completed = progress >= 100
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT OR REPLACE INTO reading_progress 
        (book_id, user_id, progress_percentage, is_completed, completed_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (book_id, user_id, progress, is_completed, 
          datetime.now() if is_completed else None))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Progress updated'})

@app.route('/api/fines/<int:fine_id>/pay', methods=['POST'])
def pay_fine():
    fine_id = request.view_args['fine_id']
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE book_issues 
        SET fine_amount = 0, status = 'fine_paid'
        WHERE id = ?
    ''', (fine_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Fine paid successfully'})

@app.route('/api/categories', methods=['GET'])
def get_categories():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT DISTINCT category FROM books ORDER BY category')
    categories = [row[0] for row in cursor.fetchall()]
    
    conn.close()
    return jsonify(categories)

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json or {}
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        cursor.execute('SELECT id, username, role FROM users WHERE email = ? AND password = ?', 
                       (username, hashed_password))
        user = cursor.fetchone()
        
        conn.close()
        
        if user:
            return jsonify({
                'id': user[0],
                'username': user[1],
                'role': user[2]
            })
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        print(f'Login error: {e}')
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not all([username, email, password]):
        return jsonify({'error': 'All fields required'}), 400
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'User already exists'}), 400
    
    # Create user
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    cursor.execute('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                   (username, email, hashed_password, 'user'))
    user_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'id': user_id,
        'username': username,
        'role': 'user'
    })

@app.route('/api/members', methods=['GET'])
def get_members():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM users WHERE role = "user"')
    count = cursor.fetchone()[0]
    
    conn.close()
    return jsonify([{'id': i} for i in range(count)])

@app.route('/api/overdue-books', methods=['GET'])
def get_overdue_books():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT COUNT(*) FROM book_issues 
        WHERE status = 'issued' AND due_date < date('now')
    ''')
    count = cursor.fetchone()[0]
    
    conn.close()
    return jsonify([{'id': i} for i in range(count)])

@app.route('/api/admin/overdue-count', methods=['GET'])
def get_overdue_count():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT COUNT(*) FROM book_issues 
        WHERE status = 'issued' AND due_date < date('now')
    ''')
    count = cursor.fetchone()[0]
    
    conn.close()
    return jsonify({'count': count})

# Admin routes
@app.route('/api/admin/books', methods=['POST'])
def add_book():
    data = request.json
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Auto-generate ISBN
    import random
    isbn = f"978-{random.randint(1000000000, 9999999999)}"
    
    cursor.execute('''
        INSERT INTO books (title, author, isbn, category, description, price, is_free, is_ebook, reading_time_minutes, total_copies, available_copies, publish_date)
        VALUES (?, ?, ?, ?, ?, 0, 1, 0, ?, ?, ?, ?)
    ''', (
        data.get('title'),
        data.get('author'),
        isbn,
        data.get('category'),
        data.get('description', ''),
        data.get('reading_time_minutes', 0),
        data.get('total_copies', 1),
        data.get('available_copies', 1),
        data.get('publish_date')
    ))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Book added successfully'})

@app.route('/api/books/<int:book_id>/reserve', methods=['POST'])
def reserve_book(book_id):
    try:
        data = request.json
        user_id = data.get('user_id', 1)
        
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # Check if book exists
        cursor.execute('SELECT title FROM books WHERE id = ?', (book_id,))
        book = cursor.fetchone()
        
        if not book:
            conn.close()
            return jsonify({'error': 'Book not found'}), 404
        
        # Check if user already has pending request for this book
        cursor.execute('SELECT id FROM book_reservations WHERE book_id = ? AND user_id = ? AND status = "pending"', (book_id, user_id))
        existing = cursor.fetchone()
        
        if existing:
            conn.close()
            return jsonify({'error': 'You already have a pending request for this book'}), 400
        
        # Create reservation request
        cursor.execute('''
            INSERT INTO book_reservations (book_id, user_id, status)
            VALUES (?, ?, 'pending')
        ''', (book_id, user_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Reservation request sent to admin for approval'})
    except Exception as e:
        print(f'Reserve error: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/books/<int:book_id>', methods=['PUT'])
def edit_book(book_id):
    data = request.json
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE books SET title = ?, author = ?, category = ?, description = ?, 
                        total_copies = ?, available_copies = ?, publish_date = ?
        WHERE id = ?
    ''', (
        data.get('title'),
        data.get('author'),
        data.get('category'),
        data.get('description'),
        data.get('total_copies'),
        data.get('available_copies'),
        data.get('publish_date'),
        book_id
    ))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Book updated successfully'})

@app.route('/api/admin/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM books WHERE id = ?', (book_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Book deleted successfully'})

@app.route('/api/users', methods=['GET'])
def get_users():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, username, email, role FROM users WHERE role = "user"')
    users = cursor.fetchall()
    
    user_list = []
    for user in users:
        user_list.append({
            'id': user[0],
            'username': user[1],
            'email': user[2],
            'role': user[3]
        })
    
    conn.close()
    return jsonify(user_list)

@app.route('/api/admin/members', methods=['GET'])
def get_all_members():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Add status and suspension_end columns if they don't exist
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN status TEXT DEFAULT "active"')
        cursor.execute('ALTER TABLE users ADD COLUMN suspension_end DATE')
        conn.commit()
    except sqlite3.OperationalError:
        pass  # Columns already exist
    
    cursor.execute('''
        SELECT u.id, u.username, u.email, u.role, u.created_at,
               COALESCE(u.status, 'active') as status,
               COALESCE(u.suspension_end, '') as suspension_end,
               COUNT(bi.id) as books_issued
        FROM users u
        LEFT JOIN book_issues bi ON u.id = bi.user_id AND bi.status = 'issued'
        GROUP BY u.id
        ORDER BY u.created_at DESC
    ''')
    members = cursor.fetchall()
    
    member_list = []
    for member in members:
        member_list.append({
            'id': member[0],
            'username': member[1],
            'email': member[2],
            'role': member[3],
            'created_at': member[4],
            'status': member[5],
            'suspension_end': member[6],
            'books_issued': member[7]
        })
    
    conn.close()
    return jsonify(member_list)

@app.route('/api/admin/members/<int:member_id>', methods=['PUT'])
def edit_member(member_id):
    data = request.json
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Update member details
    if 'password' in data and data['password']:
        hashed_password = hashlib.sha256(data['password'].encode()).hexdigest()
        cursor.execute('''
            UPDATE users SET username = ?, email = ?, role = ?, password = ?
            WHERE id = ?
        ''', (data['username'], data['email'], data['role'], hashed_password, member_id))
    else:
        cursor.execute('''
            UPDATE users SET username = ?, email = ?, role = ?
            WHERE id = ?
        ''', (data['username'], data['email'], data['role'], member_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Member updated successfully'})

@app.route('/api/admin/members/<int:member_id>/suspend', methods=['POST'])
def suspend_member(member_id):
    data = request.json
    duration = data.get('duration', '1_month')
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Calculate suspension end date
    from datetime import datetime, timedelta
    if duration == '1_month':
        end_date = datetime.now() + timedelta(days=30)
    elif duration == '2_months':
        end_date = datetime.now() + timedelta(days=60)
    elif duration == '3_months':
        end_date = datetime.now() + timedelta(days=90)
    else:  # lifetime
        end_date = datetime(2099, 12, 31)
    
    # Add status and suspension_end columns if they don't exist
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN status TEXT DEFAULT "active"')
        cursor.execute('ALTER TABLE users ADD COLUMN suspension_end DATE')
    except sqlite3.OperationalError:
        pass
    
    cursor.execute('''
        UPDATE users SET status = 'suspended', suspension_end = ?
        WHERE id = ?
    ''', (end_date.date(), member_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Member suspended successfully'})

@app.route('/api/admin/members/<int:member_id>/unsuspend', methods=['POST'])
def unsuspend_member(member_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE users SET status = 'active', suspension_end = NULL
        WHERE id = ?
    ''', (member_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Member unsuspended successfully'})

@app.route('/api/admin/members/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM users WHERE id = ?', (member_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Member deleted successfully'})

@app.route('/api/admin/books/<int:book_id>/issue', methods=['POST'])
def issue_book(book_id):
    data = request.json
    user_id = data.get('user_id')
    custom_due_date = data.get('due_date')
    overdue_fee = data.get('overdue_fee', 5.00)
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Check availability
    cursor.execute('SELECT available_copies FROM books WHERE id = ?', (book_id,))
    book = cursor.fetchone()
    
    if not book or book[0] <= 0:
        conn.close()
        return jsonify({'error': 'Book not available'}), 400
    
    # Issue book
    issue_date = datetime.now().date()
    if custom_due_date:
        due_date = datetime.strptime(custom_due_date, '%Y-%m-%d').date()
    else:
        due_date = issue_date + timedelta(days=14)
    
    cursor.execute('''
        INSERT INTO book_issues (book_id, user_id, issue_date, due_date, status, overdue_fee_per_day)
        VALUES (?, ?, ?, ?, 'issued', ?)
    ''', (book_id, user_id, issue_date, due_date, overdue_fee))
    
    # Get the inserted issue ID
    issue_id = cursor.lastrowid
    
    # Update available copies
    cursor.execute('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', (book_id,))
    
    # Get book details
    cursor.execute('SELECT title, author FROM books WHERE id = ?', (book_id,))
    book = cursor.fetchone()
    
    conn.commit()
    
    # Return the issued book details
    issued_book = {
        'id': issue_id,
        'book_id': book_id,
        'title': book[0],
        'author': book[1],
        'issue_date': issue_date.strftime('%Y-%m-%d'),
        'due_date': due_date.strftime('%Y-%m-%d'),
        'status': 'issued',
        'fine_amount': 0.0,
        'reading_time_minutes': 180,  # Default reading time
        'reading_progress': 0         # Initial progress
    }
    
    conn.close()
    return jsonify(issued_book)

@app.route('/api/admin/issued-books', methods=['GET'])
def get_issued_books():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT bi.id, b.title as book_title, b.author as book_author,
               u.username as user_name, u.email as user_email,
               bi.issue_date, bi.due_date, bi.fine_amount, bi.status
        FROM book_issues bi
        JOIN books b ON bi.book_id = b.id
        JOIN users u ON bi.user_id = u.id
        WHERE bi.status = 'issued'
        ORDER BY bi.due_date ASC
    ''')
    issues = cursor.fetchall()
    
    issue_list = []
    for issue in issues:
        issue_list.append({
            'id': issue[0],
            'book_title': issue[1],
            'book_author': issue[2],
            'user_name': issue[3],
            'user_email': issue[4],
            'issue_date': issue[5],
            'due_date': issue[6],
            'fine_amount': float(issue[7]) if issue[7] else 0,
            'status': issue[8]
        })
    
    conn.close()
    return jsonify(issue_list)

@app.route('/api/admin/issues/<int:issue_id>/return', methods=['POST'])
def return_book(issue_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT book_id, user_id FROM book_issues WHERE id = ?', (issue_id,))
    book_result = cursor.fetchone()
    
    if book_result:
        book_id, user_id = book_result
        cursor.execute('UPDATE book_issues SET status = "returned", return_date = date("now") WHERE id = ?', (issue_id,))
        cursor.execute('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', (book_id,))
        
        # Add to reading history when admin marks as returned
        cursor.execute('''
            INSERT OR REPLACE INTO reading_progress 
            (book_id, user_id, progress_percentage, is_completed, completed_at)
            VALUES (?, ?, 100, 1, CURRENT_TIMESTAMP)
        ''', (book_id, user_id))
        
        conn.commit()
    
    conn.close()
    return jsonify({'message': 'Book returned successfully'})

@app.route('/api/admin/issues/<int:issue_id>/damage', methods=['POST'])
def report_damage(issue_id):
    data = request.json
    damage_amount = data.get('damage_amount', 0)
    damage_description = data.get('damage_description', '')
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE book_issues 
        SET fine_amount = fine_amount + ?, damage_description = ?
        WHERE id = ?
    ''', (damage_amount, damage_description, issue_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Damage reported successfully'})

@app.route('/api/admin/fines-count', methods=['GET'])
def get_fines_count():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Get total fine amounts plus overdue fines
    cursor.execute('''
        SELECT 
            COALESCE(SUM(bi.fine_amount), 0) as damage_total,
            COALESCE(SUM(
                CASE 
                    WHEN bi.status = 'issued' AND bi.due_date < date('now') 
                    THEN (julianday('now') - julianday(bi.due_date)) * bi.overdue_fee_per_day
                    ELSE 0 
                END
            ), 0) as overdue_total
        FROM book_issues bi
        WHERE bi.status = 'issued'
    ''')
    result = cursor.fetchone()
    total_amount = float(result[0] or 0) + float(result[1] or 0)
    
    conn.close()
    return jsonify({'amount': total_amount})

@app.route('/api/admin/fines', methods=['GET'])
def get_all_fines():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT bi.id, u.username as member_name, u.email as member_email,
               b.title as book_title, b.author as book_author,
               bi.fine_amount, bi.damage_description, bi.issue_date, bi.due_date, bi.status,
               bi.overdue_fee_per_day
        FROM book_issues bi
        JOIN books b ON bi.book_id = b.id
        JOIN users u ON bi.user_id = u.id
        WHERE (bi.fine_amount > 0 OR (bi.status = 'issued' AND bi.due_date < date('now')))
        ORDER BY bi.issue_date DESC
    ''')
    fines = cursor.fetchall()
    
    fine_list = []
    for fine in fines:
        # Calculate overdue fine
        overdue_fine = 0
        if fine[9] == 'issued' and fine[8]:  # status is issued and has due_date
            from datetime import datetime
            due_date = datetime.strptime(fine[8], '%Y-%m-%d').date()
            today = datetime.now().date()
            if today > due_date:
                days_overdue = (today - due_date).days
                overdue_fine = days_overdue * float(fine[10] or 5.00)
        
        fine_list.append({
            'id': fine[0],
            'memberName': fine[1],
            'memberEmail': fine[2],
            'bookTitle': fine[3],
            'bookAuthor': fine[4],
            'damageFine': float(fine[5]) if fine[5] else 0,
            'overdueFine': overdue_fine,
            'damageDescription': fine[6] or '',
            'issueDate': fine[7],
            'dueDate': fine[8],
            'status': fine[9]
        })
    
    conn.close()
    return jsonify(fine_list)

@app.route('/api/users/<int:user_id>/history', methods=['GET'])
def get_user_history(user_id):
    """Get user's book issue history"""
    try:
        conn = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all book issues for the user
        cursor.execute('''
            SELECT bi.id, b.id as book_id, b.title, b.author, b.cover_image,
                   bi.issue_date, bi.due_date, bi.return_date,
                   bi.status, bi.fine_amount, bi.overdue_fee_per_day
            FROM book_issues bi
            JOIN books b ON bi.book_id = b.id
            WHERE bi.user_id = ?
            ORDER BY bi.issue_date DESC
        ''', (user_id,))
        
        history = []
        for row in cursor.fetchall():
            issue = dict(row)
            issue['is_overdue'] = False
            
            # Check if book is overdue
            if issue['status'] == 'issued' and issue['due_date']:
                due_date = datetime.strptime(issue['due_date'], '%Y-%m-%d').date()
                if datetime.now().date() > due_date:
                    issue['is_overdue'] = True
                    
            # Convert decimal to float for JSON serialization
            issue['fine_amount'] = float(issue['fine_amount']) if issue['fine_amount'] else 0.0
            issue['overdue_fee_per_day'] = float(issue['overdue_fee_per_day']) if issue['overdue_fee_per_day'] else 5.0
            
            history.append(issue)
            
        return jsonify({
            'success': True,
            'history': history
        })
        
    except Exception as e:
        print(f"Error getting user history: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch history',
            'details': str(e)
        }), 500

@app.route('/api/user/<int:user_id>/fines', methods=['GET'])
def get_user_fines(user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT bi.id, u.username as member_name, u.email as member_email,
               b.title as book_title, b.author as book_author,
               bi.fine_amount, bi.damage_description, bi.issue_date, bi.due_date, bi.status,
               bi.overdue_fee_per_day
        FROM book_issues bi
        JOIN books b ON bi.book_id = b.id
        JOIN users u ON bi.user_id = u.id
        WHERE bi.user_id = ? AND (bi.fine_amount > 0 OR (bi.status = 'issued' AND bi.due_date < date('now')))
        ORDER BY bi.issue_date DESC
    ''', (user_id,))
    fines = cursor.fetchall()
    
    fine_list = []
    for fine in fines:
        # Calculate overdue fine
        overdue_fine = 0
        if fine[9] == 'issued' and fine[8]:  # status is issued and has due_date
            from datetime import datetime
            due_date = datetime.strptime(fine[8], '%Y-%m-%d').date()
            today = datetime.now().date()
            if today > due_date:
                days_overdue = (today - due_date).days
                overdue_fine = days_overdue * float(fine[10] or 5.00)
        
        fine_list.append({
            'id': fine[0],
            'memberName': fine[1],
            'memberEmail': fine[2],
            'bookTitle': fine[3],
            'bookAuthor': fine[4],
            'damageFine': float(fine[5]) if fine[5] else 0,
            'overdueFine': overdue_fine,
            'damageDescription': fine[6] or '',
            'issueDate': fine[7],
            'dueDate': fine[8],
            'status': fine[9]
        })
    
    conn.close()
    return jsonify(fine_list)

@app.route('/api/admin/fines/<int:fine_id>/pay-damage', methods=['POST'])
def pay_damage_fine(fine_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('UPDATE book_issues SET fine_amount = 0 WHERE id = ?', (fine_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Damage fine paid successfully'})

@app.route('/api/admin/fines/<int:fine_id>/pay-overdue', methods=['POST'])
def pay_overdue_fine(fine_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('UPDATE book_issues SET overdue_fee_per_day = 0 WHERE id = ?', (fine_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Overdue fine paid successfully'})

@app.route('/api/user/<int:user_id>/issued-books', methods=['GET'])
def get_user_issued_books(user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT bi.id, b.title, b.author, bi.issue_date, bi.due_date, bi.status,
               bi.fine_amount, b.reading_time_minutes,
               COALESCE(rp.progress_percentage, 0) as reading_progress
        FROM book_issues bi
        JOIN books b ON bi.book_id = b.id
        LEFT JOIN reading_progress rp ON bi.book_id = rp.book_id AND bi.user_id = rp.user_id
        WHERE bi.user_id = ? AND bi.status = 'issued'
        ORDER BY bi.issue_date DESC
    ''', (user_id,))
    books = cursor.fetchall()
    
    book_list = []
    for book in books:
        book_list.append({
            'id': book[0],
            'title': book[1],
            'author': book[2],
            'issue_date': book[3],
            'due_date': book[4],
            'status': book[5],
            'fine_amount': float(book[6]) if book[6] else 0,
            'reading_time_minutes': book[7] or 180,
            'reading_progress': book[8] or 0
        })
    
    conn.close()
    return jsonify(book_list)

@app.route('/api/user/<int:user_id>/overdue-books', methods=['GET'])
def get_user_overdue_books(user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT bi.id FROM book_issues bi
        WHERE bi.user_id = ? AND bi.status = 'issued' AND bi.due_date < date('now')
    ''', (user_id,))
    books = cursor.fetchall()
    
    conn.close()
    return jsonify([{'id': book[0]} for book in books])

@app.route('/api/user/<int:user_id>/reservations', methods=['GET'])
def get_user_reservations(user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT br.id, br.status, br.rejection_reason, b.title, b.author
        FROM book_reservations br
        JOIN books b ON br.book_id = b.id
        WHERE br.user_id = ?
        ORDER BY br.requested_at DESC
    ''', (user_id,))
    reservations = cursor.fetchall()
    
    reservation_list = []
    for res in reservations:
        reservation_list.append({
            'id': res[0],
            'status': res[1],
            'rejection_reason': res[2],
            'book_title': res[3],
            'book_author': res[4]
        })
    
    conn.close()
    return jsonify(reservation_list)

@app.route('/api/user-reservations/<int:user_id>', methods=['GET'])
def get_user_reservation_status(user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT status FROM book_reservations
            WHERE user_id = ? AND status IN ('approved', 'rejected') AND COALESCE(viewed, 0) = 0
        ''', (user_id,))
    except sqlite3.OperationalError:
        # Fallback if viewed column doesn't exist
        cursor.execute('''
            SELECT status FROM book_reservations
            WHERE user_id = ? AND status IN ('approved', 'rejected')
        ''', (user_id,))
    
    reservations = cursor.fetchall()
    status_list = [{'status': res[0]} for res in reservations]
    
    conn.close()
    return jsonify(status_list)

@app.route('/api/admin/reservation-requests', methods=['GET'])
def get_reservation_requests():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT br.id, b.title, b.author, u.username, u.email, br.requested_at, b.available_copies, br.book_id, br.user_id
        FROM book_reservations br
        JOIN books b ON br.book_id = b.id
        JOIN users u ON br.user_id = u.id
        WHERE br.status = 'pending'
        ORDER BY br.requested_at ASC
    ''')
    requests = cursor.fetchall()
    
    request_list = []
    for req in requests:
        request_list.append({
            'id': req[0],
            'book_title': req[1],
            'book_author': req[2],
            'user_name': req[3],
            'user_email': req[4],
            'requested_at': req[5],
            'available_copies': req[6],
            'book_id': req[7],
            'user_id': req[8]
        })
    
    conn.close()
    return jsonify(request_list)

@app.route('/api/admin/reservation-requests/<int:request_id>/approve', methods=['POST'])
def approve_reservation(request_id):
    data = request.json
    admin_id = data.get('admin_id', 1)
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        # Get reservation details
        cursor.execute('SELECT book_id, user_id FROM book_reservations WHERE id = ? AND status = "pending"', (request_id,))
        reservation = cursor.fetchone()
        
        if not reservation:
            return jsonify({'error': 'Reservation not found or already processed'}), 404
        
        book_id, user_id = reservation
        
        # Check availability
        cursor.execute('SELECT available_copies FROM books WHERE id = ?', (book_id,))
        book = cursor.fetchone()
        
        if not book or book[0] <= 0:
            return jsonify({'error': 'Book not available'}), 400
        
        # Issue the book
        issue_date = datetime.now().date()
        due_date = issue_date + timedelta(days=14)
        
        cursor.execute('''
            INSERT INTO book_issues (book_id, user_id, issue_date, due_date, status, overdue_fee_per_day)
            VALUES (?, ?, ?, ?, 'issued', 5.00)
        ''', (book_id, user_id, issue_date, due_date))
        
        # Update available copies
        cursor.execute('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', (book_id,))
        
        # Update reservation status
        cursor.execute('''
            UPDATE book_reservations 
            SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ?, viewed = 0
            WHERE id = ?
        ''', (admin_id, request_id))
        
        conn.commit()
        return jsonify({'message': 'Reservation approved and book issued'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/reservation-requests/<int:request_id>/reject', methods=['POST'])
def reject_reservation(request_id):
    data = request.json
    reason = data.get('reason', 'No reason provided')
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        cursor.execute('UPDATE book_reservations SET status = "rejected", rejection_reason = ?, viewed = 0 WHERE id = ?', (reason, request_id))
        conn.commit()
        return jsonify({'message': 'Reservation rejected'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/reservation-requests/count', methods=['GET'])
def get_reservation_count():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM book_reservations WHERE status = "pending"')
    count = cursor.fetchone()[0]
    
    conn.close()
    return jsonify({'count': count})

@app.route('/api/reservations/<int:reservation_id>/cancel', methods=['DELETE'])
def cancel_reservation(reservation_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM book_reservations WHERE id = ? AND status = "pending"', (reservation_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Reservation not found or cannot be cancelled'}), 404
        
        conn.commit()
        conn.close()
        return jsonify({'message': 'Reservation cancelled successfully'})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/books/<int:book_id>/mark-read', methods=['POST'])
def mark_book_as_read(book_id):
    data = request.json
    user_id = data.get('user_id')
    
    print(f'Mark as read - book_id: {book_id}, user_id: {user_id}')
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        # Update reading progress to 100%
        cursor.execute('''
            INSERT OR REPLACE INTO reading_progress 
            (book_id, user_id, progress_percentage, is_completed, completed_at)
            VALUES (?, ?, 100, 1, CURRENT_TIMESTAMP)
        ''', (book_id, user_id))
        
        print(f'Inserted reading progress - rows affected: {cursor.rowcount}')
        
        conn.commit()
        conn.close()
        return jsonify({'message': 'Book marked as read successfully'})
    except Exception as e:
        print(f'Error marking as read: {e}')
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/issues/<int:issue_id>/mark-read', methods=['POST'])
def mark_issue_as_read(issue_id):
    data = request.json
    user_id = data.get('user_id')
    
    print(f'Mark as read - issue_id: {issue_id}, user_id: {user_id}')
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        # Get the actual book_id from the issue
        cursor.execute('SELECT book_id FROM book_issues WHERE id = ?', (issue_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return jsonify({'error': 'Issue not found'}), 404
            
        book_id = result[0]
        print(f'Found book_id: {book_id} for issue_id: {issue_id}')
        
        # Update reading progress to 100%
        cursor.execute('''
            INSERT OR REPLACE INTO reading_progress 
            (book_id, user_id, progress_percentage, is_completed, completed_at)
            VALUES (?, ?, 100, 1, CURRENT_TIMESTAMP)
        ''', (book_id, user_id))
        
        print(f'Inserted reading progress - rows affected: {cursor.rowcount}')
        
        conn.commit()
        conn.close()
        return jsonify({'message': 'Book marked as read successfully'})
    except Exception as e:
        print(f'Error marking as read: {e}')
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/<int:user_id>/read-history', methods=['GET'])
def get_read_history(user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT b.id, b.title, b.author, rp.completed_at as completed_date
        FROM reading_progress rp
        JOIN books b ON rp.book_id = b.id
        WHERE rp.user_id = ? AND rp.is_completed = 1
        ORDER BY rp.completed_at DESC
    ''', (user_id,))
    
    history = cursor.fetchall()
    
    history_list = []
    for item in history:
        history_list.append({
            'id': item[0],
            'title': item[1],
            'author': item[2],
            'completed_date': item[3]
        })
    
    conn.close()
    return jsonify(history_list)

# Initialize database on import
init_db()

# Initialize recommendation services
recommendation_service = RecommendationService(DATABASE)
ml_recommendation_service = MLRecommendationService(DATABASE)

@app.route('/api/ai/assistant', methods=['POST'])
def ai_book_assistant():
    if not GENAI_API_KEY:
        return jsonify({'error': 'AI features are not configured'}), 503
        
    data = request.get_json()
    user_message = data.get('message', '')
    
    try:
        # Initialize the model
        model = genai.GenerativeModel('models/gemini-1.5-pro')
        
        # Create a chat session
        chat = model.start_chat(history=[])
        
        # Prepare the prompt
        prompt = f"""You are a helpful library assistant. Answer the following question about books or library services in a friendly and informative way.
        
        User: {user_message}
        
        Assistant:"""
        
        # Get the response
        response = chat.send_message(prompt)
        
        return jsonify({
            'response': response.text,
            'sources': []
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recommendations/<int:user_id>', methods=['GET'])
def get_recommendations(user_id):
    try:
        # Get recommendation type from query params (default: ml)
        rec_type = request.args.get('type', 'ml')
        limit = int(request.args.get('limit', '5'))
        
        if rec_type == 'ml':
            # Use the new ML-based recommendation service
            ml_recs = ml_recommendation_service.get_recommendations(user_id, limit)
            # Extract content-based recommendations as the main recommendation list
            recommendations = ml_recs.get('content_based', [])
        else:
            # For legacy recommendation types, we need to filter here
            if rec_type == 'collaborative':
                recommendations = recommendation_service.collaborative_filtering(user_id, limit * 2)
            elif rec_type == 'content':
                recommendations = recommendation_service.content_based_filtering(user_id, limit * 2)
            else:  # hybrid
                recommendations = recommendation_service.hybrid_recommendation(user_id, limit * 2)
            
            # Filter out books the user has already borrowed or purchased
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            user_books = set()
            
            # Try the user_interactions table first (our new schema)
            try:
                cursor.execute("""
                    SELECT DISTINCT book_id FROM user_interactions 
                    WHERE user_id = ? AND action_type IN ('borrow', 'purchase')
                """, (user_id,))
                user_books = {row[0] for row in cursor.fetchall()}
            except sqlite3.OperationalError:
                # If user_interactions doesn't exist, continue with empty set
                pass
            
            # Try purchases table if it exists
            try:
                cursor.execute("""
                    SELECT DISTINCT book_id FROM purchases
                    WHERE user_id = ?
                """, (user_id,))
                user_books.update({row[0] for row in cursor.fetchall()})
            except sqlite3.OperationalError:
                pass
                
            conn.close()
            
            # Remove already borrowed books from recommendations
            if isinstance(recommendations, list):
                # Handle list of dicts format
                recommendations = [r for r in recommendations if r.get('id') not in user_books][:limit]
            else:
                # Handle list of tuples format (book_id, title, score)
                recommendations = [r for r in recommendations if r[0] not in user_books][:limit]
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'type': rec_type
        })
        
    except Exception as e:
        print(f"Error in get_recommendations: {str(e)}", file=sys.stderr)
        return jsonify({
            'success': False,
            'error': 'Failed to generate recommendations',
            'details': str(e)
        }), 500

@app.route('/api/similar-books/<int:book_id>', methods=['GET'])
def get_similar_books(book_id):
    try:
        limit = int(request.args.get('limit', '5'))
        
        # Get similar books using ML recommendation service
        similar_books = ml_recommendation_service.get_similar_books(book_id, limit)
        
        return jsonify({
            'success': True,
            'similar_books': similar_books
        })
    except Exception as e:
        print(f"Error in get_similar_books: {str(e)}", file=sys.stderr)
        return jsonify({
            'success': False,
            'error': 'Failed to find similar books',
            'details': str(e)
        }), 500

@app.route('/api/ai/book-assistant', methods=['POST'])
def ai_book_assistant_v2():
    try:
        print("AI Assistant endpoint called")
        # Check for either GENAI_API_KEY or GEMINI_API_KEY
        api_key = os.getenv('GENAI_API_KEY') or os.getenv('GEMINI_API_KEY')
        print(f"API Key found: {'Yes' if api_key else 'No'}")
        
        if not api_key:
            print("Error: No API key found in environment variables")
            return jsonify({'error': 'AI not configured: Missing API key'}), 500
            
        try:
            # Configure the Google Generative AI client
            print("Configuring GenAI client...")
            genai.configure(api_key=api_key)
            print("GenAI client configured successfully")
        except Exception as config_error:
            print(f"Error configuring GenAI client: {str(config_error)}")
            return jsonify({'error': f'Failed to configure AI: {str(config_error)}'}), 500

        data = request.json or {}
        print(f"Received data: {data}")
        
        book = data.get('book')  # expects {title, author, description, category, ...}
        question = data.get('question', '').strip()
        
        if not book or not question:
            print(f"Error: Missing book or question. Book: {bool(book)}, Question: {bool(question)}")
            return jsonify({'error': 'book and question are required'}), 400

        try:
            system_prompt = (
                "You are a helpful study assistant for library books. "
                "ONLY answer questions related to the provided book context. "
                "If the user asks something off-topic, politely redirect them back to the book. "
                "Provide clear, structured, study-friendly answers: summaries, themes, characters, plot, quotes, and exam-style insights."
            )

            book_context = (
                f"Title: {book.get('title','')}\n"
                f"Author: {book.get('author','')}\n"
                f"Category: {book.get('category','')}\n"
                f"Description: {book.get('description','')}\n"
            )

            user_prompt = (
                f"Book Context:\n{book_context}\n\n"
                f"User Question (must be about this book): {question}"
            )

            print("Sending request to Gemini API...")
            model = genai.GenerativeModel('models/gemini-1.5-pro')
            
            # Combine prompts into one message
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            response = model.generate_content(full_prompt)
            print("Received response from Gemini API")

            text = response.text if hasattr(response, 'text') else str(response)
            print(f"Response text length: {len(text) if text else 0} characters")
            
            if not text or len(text.strip()) == 0:
                print("Error: Empty response from Gemini API")
                return jsonify({'error': 'AI returned an empty response'}), 500
                
            return jsonify({ 'answer': text })
            
        except Exception as ai_error:
            print(f"Error in AI processing: {str(ai_error)}")
            print(f"Error type: {type(ai_error).__name__}")
            if hasattr(ai_error, 'args'):
                print(f"Error args: {ai_error.args}")
            return jsonify({
                'error': 'AI processing failed',
                'details': str(ai_error),
                'type': type(ai_error).__name__
            }), 500
            
    except Exception as e:
        print(f"Unexpected error in AI assistant: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        if hasattr(e, 'args'):
            print(f"Error args: {e.args}")
        return jsonify({
            'error': 'AI request failed',
            'details': str(e),
            'type': type(e).__name__
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)