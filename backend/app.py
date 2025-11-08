from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import sys
from datetime import datetime, timedelta
try:
    from zoneinfo import ZoneInfo
    TZ_JHB = ZoneInfo("Africa/Johannesburg")
except Exception:
    TZ_JHB = None
import hashlib
import secrets
import google.generativeai as genai
# Lazy import recommendation services
# from recommendation_service import RecommendationService
# from ml_recommendation_service import MLRecommendationService
import requests
try:
    # prefer the HTTP v1 FCM helper if available
    from backend.fcm import send_fcm_v1, get_access_token
    FCM_V1_AVAILABLE = True
except Exception:
    send_fcm_v1 = None
    FCM_V1_AVAILABLE = False

app = Flask(__name__)
CORS(app)
app.secret_key = secrets.token_hex(16)

# Database path: allow overriding via env var so we can attach a Persistent Disk on Render
DATABASE = os.environ.get('DATABASE_PATH', 'library.db')
# Ensure directory exists if a directory component is present
db_dir = os.path.dirname(DATABASE)
if db_dir:
    os.makedirs(db_dir, exist_ok=True)

print(f"[Startup] Using database at: {os.path.abspath(DATABASE)}")

# Configure Gemini API key from env if present
GENAI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

# FCM server key for sending push notifications (optional)
FCM_SERVER_KEY = os.environ.get('FCM_SERVER_KEY')

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

    # Fine payments table (records individual payments for audit/history)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS fine_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fine_id INTEGER,
            payment_type TEXT,
            amount DECIMAL(10,2) DEFAULT 0,
            paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paid_by INTEGER,
            FOREIGN KEY (fine_id) REFERENCES book_issues (id),
            FOREIGN KEY (paid_by) REFERENCES users (id)
        )
    ''')

    # Device tokens table - stores push tokens for user's devices
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS device_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            token TEXT,
            platform TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, token),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
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
    
    # Account requests table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS account_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL,
            password TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_at TIMESTAMP,
            approved_by INTEGER,
            FOREIGN KEY (approved_by) REFERENCES users (id)
        )
    ''')
    
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


def send_fcm(token: str, title: str, message: str, data: dict = None) -> bool:
    """Send a push notification to a single device token via FCM (legacy API).
    This is a best-effort helper — if no FCM_SERVER_KEY is configured it will
    simply return False so the server can fallback to storing an in-app
    notification only.
    """
    if not FCM_SERVER_KEY:
        print('[Push] FCM server key not configured; skipping push send')
        return False

    payload = {
        'to': token,
        'notification': {
            'title': title,
            'body': message,
        },
        'data': data or {}
    }

    headers = {
        'Authorization': f'key={FCM_SERVER_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        # If v1 helper is available and credentials are set, use it
        if FCM_V1_AVAILABLE and os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') and os.environ.get('FCM_PROJECT_ID'):
            try:
                send_fcm_v1(token, title, message, data or {})
                print(f'[Push] Sent FCM v1 push to token (truncated): {str(token)[:10]}...')
                return True
            except Exception as e:
                print(f'[Push] FCM v1 send failed, falling back to legacy: {e}')

        resp = requests.post('https://fcm.googleapis.com/fcm/send', json=payload, headers=headers, timeout=5)
        if resp.status_code >= 200 and resp.status_code < 300:
            print(f'[Push] Sent FCM push to token (truncated): {token[:10]}...')
            return True
        else:
            print(f'[Push] FCM send failed: {resp.status_code} {resp.text}')
            return False
    except Exception as e:
        print(f'[Push] Exception when sending FCM: {e}')
        return False


def send_push_to_user(user_id: int, title: str, message: str, data: dict = None):
    """Fetch device tokens for a user and attempt to send a push to each.
    Falls back silently if no tokens are present or sending fails.
    """
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('SELECT token, platform FROM device_tokens WHERE user_id = ?', (user_id,))
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            print(f'[Push] No device tokens for user {user_id}')
            return False

        sent_any = False
        for token, platform in rows:
            ok = send_fcm(token, title, message, data or {})
            sent_any = sent_any or ok

        return sent_any
    except Exception as e:
        print(f'[Push] Error while sending push to user {user_id}: {e}')
        return False

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
    
    query += ' GROUP BY b.id ORDER BY b.created_at DESC'
    
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

# ============ ADMIN/DIAGNOSTICS (SAFE) ============
@app.route('/api/admin/db-info', methods=['GET'])
def db_info():
    """Return database path and basic table counts to verify persistence after deploys."""
    path = os.path.abspath(DATABASE)
    exists = os.path.exists(DATABASE)
    size = os.path.getsize(DATABASE) if exists else 0
    info = {
        'database_path': path,
        'exists': exists,
        'size_bytes': size,
        'tables': {}
    }
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        for name in ['books', 'book_reservations', 'notifications', 'users', 'issues']:
            try:
                cursor.execute(f'SELECT COUNT(1) FROM {name}')
                info['tables'][name] = cursor.fetchone()[0]
            except Exception:
                info['tables'][name] = None
        conn.close()
    except Exception as e:
        info['error'] = str(e)
    return jsonify(info)

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

# Account Request Endpoints
@app.route('/api/account-requests', methods=['POST'])
def create_account_request():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Check if username or email already exists in users or pending requests
    cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Username or email already exists'}), 400
    
    cursor.execute('SELECT id FROM account_requests WHERE username = ? OR email = ? AND status = "pending"', (username, email))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Account request with this username or email is already pending'}), 400
    
    # Hash the password
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    
    # Insert account request
    cursor.execute('''
        INSERT INTO account_requests (username, email, password, status)
        VALUES (?, ?, ?, 'pending')
    ''', (username, email, hashed_password))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Account request submitted successfully'}), 201

@app.route('/api/account-requests', methods=['GET'])
def get_account_requests():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, username, email, status, requested_at
        FROM account_requests
        WHERE status = 'pending'
        ORDER BY requested_at DESC
    ''')
    requests_data = cursor.fetchall()
    
    request_list = []
    for req in requests_data:
        request_list.append({
            'id': req[0],
            'username': req[1],
            'email': req[2],
            'status': req[3],
            'requested_at': req[4]
        })
    
    conn.close()
    return jsonify(request_list)

@app.route('/api/account-requests/<int:request_id>/approve', methods=['POST'])
def approve_account_request(request_id):
    data = request.json
    approved_by = data.get('approved_by')  # Admin user ID
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Get the account request details
    cursor.execute('SELECT username, email, password FROM account_requests WHERE id = ? AND status = "pending"', (request_id,))
    request_data = cursor.fetchone()
    
    if not request_data:
        conn.close()
        return jsonify({'error': 'Account request not found or already processed'}), 404
    
    username, email, password = request_data
    
    # Check if username or email already exists in users table
    cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Username or email already exists'}), 400
    
    # Create the user account
    cursor.execute('''
        INSERT INTO users (username, email, password, role)
        VALUES (?, ?, ?, 'user')
    ''', (username, email, password))
    
    # Update the request status
    cursor.execute('''
        UPDATE account_requests 
        SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ?
        WHERE id = ?
    ''', (approved_by, request_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Account request approved successfully'}), 200

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
    
    # Get total fine amounts plus overdue fines.
    # Note: damage fines (fine_amount) can exist on returned records too, so sum them across all rows.
    # Overdue fines are calculated only for issued rows where the due_date is past and overdue fee per day > 0.
    cursor.execute('''
        SELECT
            COALESCE(SUM(CASE WHEN bi.fine_amount IS NOT NULL THEN bi.fine_amount ELSE 0 END), 0) as damage_total,
            COALESCE(SUM(
                CASE
                    WHEN bi.status = 'issued' AND bi.due_date < date('now') AND COALESCE(bi.overdue_fee_per_day, 0) > 0
                    THEN (julianday('now') - julianday(bi.due_date)) * bi.overdue_fee_per_day
                    ELSE 0
                END
            ), 0) as overdue_total
        FROM book_issues bi
    ''')
    result = cursor.fetchone()
    damage_total = float(result[0] or 0)
    overdue_total = float(result[1] or 0)

    # Subtract any recorded overdue payments from the overdue total so remaining reflects payments made
    cursor.execute("SELECT COALESCE(SUM(amount),0) FROM fine_payments WHERE payment_type = 'overdue'")
    paid_overdue_total = float(cursor.fetchone()[0] or 0)
    overdue_total = max(0.0, overdue_total - paid_overdue_total)
    total_amount = damage_total + overdue_total
    conn.close()
    return jsonify({
        'amount': damage_total + overdue_total,
        'damage_total': damage_total,
        'overdue_total': overdue_total
    })

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
        WHERE (
            bi.fine_amount > 0
            OR (
                bi.status = 'issued'
                AND bi.due_date < date('now')
                AND COALESCE(bi.overdue_fee_per_day, 0) > 0
            )
        )
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
                # subtract any overdue payments already made for this fine
                cursor.execute('SELECT COALESCE(SUM(amount),0) FROM fine_payments WHERE fine_id = ? AND payment_type = "overdue"', (fine[0],))
                paid_overdue = float(cursor.fetchone()[0] or 0)
                overdue_fine = max(0.0, overdue_fine - paid_overdue)
        
        fine_list.append({
            'id': fine[0],
            'memberName': fine[1],
            'memberEmail': fine[2],
            'bookTitle': fine[3],
            'bookAuthor': fine[4],
            # damageFine should reflect any remaining damage amount stored in bi.fine_amount
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
        WHERE bi.user_id = ? AND (
            bi.fine_amount > 0
            OR (
                bi.status = 'issued'
                AND bi.due_date < date('now')
                AND COALESCE(bi.overdue_fee_per_day, 0) > 0
            )
        )
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
                # subtract any overdue payments already made for this fine
                cursor.execute('SELECT COALESCE(SUM(amount),0) FROM fine_payments WHERE fine_id = ? AND payment_type = "overdue"', (fine[0],))
                paid_overdue = float(cursor.fetchone()[0] or 0)
                overdue_fine = max(0.0, overdue_fine - paid_overdue)
        
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


@app.route('/api/admin/fines/paid', methods=['GET'])
def get_admin_paid_fines():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT fp.id, fp.fine_id, fp.payment_type, fp.amount, fp.paid_at, fp.paid_by,
               bi.user_id, u.username, u.email,
               b.title, b.author
        FROM fine_payments fp
        JOIN book_issues bi ON fp.fine_id = bi.id
        JOIN users u ON bi.user_id = u.id
        JOIN books b ON bi.book_id = b.id
        ORDER BY fp.paid_at DESC
    ''')

    rows = cursor.fetchall()
    result = []
    for r in rows:
        result.append({
            'paymentId': r[0],
            'fineId': r[1],
            'type': r[2],
            'amount': float(r[3] or 0),
            'paidAt': r[4],
            'paidBy': r[5],
            'userId': r[6],
            'username': r[7],
            'email': r[8],
            'bookTitle': r[9],
            'bookAuthor': r[10]
        })

    conn.close()
    return jsonify(result)


@app.route('/api/user/<int:user_id>/fines/paid', methods=['GET'])
def get_user_paid_fines(user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT fp.id, fp.fine_id, fp.payment_type, fp.amount, fp.paid_at,
               b.title, b.author
        FROM fine_payments fp
        JOIN book_issues bi ON fp.fine_id = bi.id
        JOIN books b ON bi.book_id = b.id
        WHERE bi.user_id = ?
        ORDER BY fp.paid_at DESC
    ''', (user_id,))

    rows = cursor.fetchall()
    result = []
    for r in rows:
        result.append({
            'paymentId': r[0],
            'fineId': r[1],
            'type': r[2],
            'amount': float(r[3] or 0),
            'paidAt': r[4],
            'bookTitle': r[5],
            'bookAuthor': r[6]
        })

    conn.close()
    return jsonify(result)

@app.route('/api/admin/fines/<int:fine_id>/pay-damage', methods=['POST'])
def pay_damage_fine(fine_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Get current damage fine amount
    cursor.execute('SELECT fine_amount, user_id FROM book_issues WHERE id = ?', (fine_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Fine not found'}), 404
    current_fine_amount = float(row[0] or 0)
    paid_by = request.json.get('paid_by') if request.json else None
    requested_amount = None
    if request.json:
        try:
            requested_amount = float(request.json.get('amount')) if request.json.get('amount') is not None else None
        except Exception:
            requested_amount = None

    # If no amount specified, default to full outstanding fine
    amount_to_pay = current_fine_amount if requested_amount is None else min(requested_amount, current_fine_amount)

    paid_amount = 0.0
    if amount_to_pay and amount_to_pay > 0:
        paid_amount = round(amount_to_pay, 2)
        cursor.execute('INSERT INTO fine_payments (fine_id, payment_type, amount, paid_by) VALUES (?, ?, ?, ?)',
                       (fine_id, 'damage', paid_amount, paid_by))

        # reduce outstanding fine_amount on the issue row
        remaining = max(0.0, current_fine_amount - paid_amount)
        cursor.execute('UPDATE book_issues SET fine_amount = ? WHERE id = ?', (remaining, fine_id))

    conn.commit()
    conn.close()

    return jsonify({'message': 'Damage payment recorded', 'paid_amount': paid_amount, 'remaining': max(0.0, current_fine_amount - paid_amount)})

@app.route('/api/admin/fines/<int:fine_id>/pay-overdue', methods=['POST'])
def pay_overdue_fine(fine_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Get current overdue fee per day and due_date/status
    cursor.execute('SELECT overdue_fee_per_day, due_date, status FROM book_issues WHERE id = ?', (fine_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Fine not found'}), 404

    overdue_fee_per_day = float(row[0] or 0)
    due_date = row[1]
    status = row[2]
    paid_by = request.json.get('paid_by') if request.json else None

    overdue_amount = 0
    if status == 'issued' and due_date:
        from datetime import datetime
        due = datetime.strptime(due_date, '%Y-%m-%d').date()
        today = datetime.now().date()
        if today > due and overdue_fee_per_day > 0:
            days_overdue = (today - due).days
            overdue_amount = days_overdue * overdue_fee_per_day

    # Determine requested amount (for partial payments)
    requested_amount = None
    if request.json:
        try:
            requested_amount = float(request.json.get('amount')) if request.json.get('amount') is not None else None
        except Exception:
            requested_amount = None

    amount_to_pay = overdue_amount if requested_amount is None else min(requested_amount, overdue_amount)
    paid_amount = 0.0
    if amount_to_pay and amount_to_pay > 0:
        paid_amount = round(amount_to_pay, 2)
        cursor.execute('INSERT INTO fine_payments (fine_id, payment_type, amount, paid_by) VALUES (?, ?, ?, ?)',
                       (fine_id, 'overdue', paid_amount, paid_by))

    # If fully paid, zero out overdue_fee_per_day so it no longer accrues; otherwise leave accrual running
    if paid_amount >= overdue_amount and overdue_amount > 0:
        cursor.execute('UPDATE book_issues SET overdue_fee_per_day = 0 WHERE id = ?', (fine_id,))

    conn.commit()
    conn.close()

    return jsonify({'message': 'Overdue payment recorded', 'paid_amount': paid_amount, 'remaining': max(0.0, overdue_amount - paid_amount)})

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
        SELECT br.id, br.status, br.rejection_reason, b.title, b.author, b.id, br.requested_at, br.approved_at
        FROM book_reservations br
        JOIN books b ON br.book_id = b.id
        WHERE br.user_id = ? AND br.status = 'pending'
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
            'book_author': res[4],
            'book_id': res[5],
            'requested_at': res[6],
            'approved_at': res[7]
        })
    
    conn.close()
    return jsonify(reservation_list)

@app.route('/api/user/<int:user_id>/reservations/all', methods=['GET'])
def get_user_reservations_all(user_id):
    """Return complete reservation history for a user (pending, approved, rejected), latest first."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT br.id, br.status, br.rejection_reason, b.title, b.author, b.id, br.requested_at, br.approved_at
        FROM book_reservations br
        JOIN books b ON br.book_id = b.id
        WHERE br.user_id = ?
        ORDER BY br.requested_at DESC
    ''', (user_id,))
    rows = cursor.fetchall()

    result = []
    for res in rows:
        result.append({
            'id': res[0],
            'status': res[1],
            'rejection_reason': res[2],
            'book_title': res[3],
            'book_author': res[4],
            'book_id': res[5],
            'requested_at': res[6],
            'approved_at': res[7]
        })

    conn.close()
    return jsonify(result)

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
        
        # Update reservation status with local timestamp
        local_timestamp = (datetime.now(TZ_JHB).isoformat() if TZ_JHB else datetime.now().isoformat())
        cursor.execute('''
            UPDATE book_reservations 
            SET status = 'approved', approved_at = ?, approved_by = ?, viewed = 0
            WHERE id = ?
        ''', (local_timestamp, admin_id, request_id))
        
        # Get reservation details for notification
        cursor.execute('''
            SELECT br.user_id, b.title, b.id
            FROM book_reservations br
            JOIN books b ON br.book_id = b.id
            WHERE br.id = ?
        ''', (request_id,))
        reservation_info = cursor.fetchone()
        
        if reservation_info:
            user_id, book_title, book_id = reservation_info
            # Create notification for user
            cursor.execute('''
                INSERT INTO notifications (user_id, type, title, message, data, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                'reservation_approved',
                'Reservation Approved',
                f'Your reservation for "{book_title}" has been approved. Please collect it within 3 days.',
                f'{{"reservationId": {request_id}, "bookTitle": "{book_title}", "bookId": {book_id}, "timestamp": "{local_timestamp}"}}',
                local_timestamp
            ))
            # Best-effort: attempt to send a push to the user's devices
            try:
                send_push_to_user(user_id, 'Reservation Approved', f'Your reservation for "{book_title}" has been approved. Please collect it within 3 days.', {"reservationId": request_id, "bookTitle": book_title, "bookId": book_id, "timestamp": local_timestamp})
            except Exception as e:
                print(f'[Push] reservation approved push error: {e}')
        
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
        local_timestamp = (datetime.now(TZ_JHB).isoformat() if TZ_JHB else datetime.now().isoformat())
        cursor.execute('UPDATE book_reservations SET status = "rejected", rejection_reason = ?, approved_at = ?, viewed = 0 WHERE id = ?', (reason, local_timestamp, request_id))
        
        # Get reservation details for notification
        cursor.execute('''
            SELECT br.user_id, b.title, b.id
            FROM book_reservations br
            JOIN books b ON br.book_id = b.id
            WHERE br.id = ?
        ''', (request_id,))
        reservation_info = cursor.fetchone()
        
        if reservation_info:
            user_id, book_title, book_id = reservation_info
            # Create notification for user
            cursor.execute('''
                INSERT INTO notifications (user_id, type, title, message, data, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                'reservation_rejected',
                'Reservation Rejected',
                f'Your reservation for "{book_title}" was rejected. Reason: {reason}',
                f'{{"reservationId": {request_id}, "bookTitle": "{book_title}", "bookId": {book_id}, "timestamp": "{local_timestamp}"}}',
                local_timestamp
            ))
            try:
                send_push_to_user(user_id, 'Reservation Rejected', f'Your reservation for "{book_title}" was rejected. Reason: {reason}', {"reservationId": request_id, "bookTitle": book_title, "bookId": book_id, "timestamp": local_timestamp})
            except Exception as e:
                print(f'[Push] reservation rejected push error: {e}')
        
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
        # Get user_id before deleting the reservation
        cursor.execute('SELECT user_id FROM book_reservations WHERE id = ? AND status = "pending"', (reservation_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return jsonify({'error': 'Reservation not found or cannot be cancelled'}), 404
        
        user_id = result[0]
        
        # Delete the reservation
        cursor.execute('DELETE FROM book_reservations WHERE id = ? AND status = "pending"', (reservation_id,))
        
        # Delete related notification(s) - delete any 'reservation' type for this user
        cursor.execute('''
            DELETE FROM notifications 
            WHERE user_id = ? 
            AND type = 'reservation'
        ''', (user_id,))
        
        print(f'Deleted {cursor.rowcount} reservation notification(s) for user {user_id}')
        
        conn.commit()
        conn.close()
        return jsonify({'message': 'Reservation and related notifications cancelled successfully'})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# ============ NOTIFICATIONS API ============
@app.route('/api/users/<int:user_id>/notifications', methods=['GET'])
def get_user_notifications(user_id):
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT id, type, title, message, data, is_read, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
        ''', (user_id,))
        
        notifications = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(notifications)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>/notifications', methods=['POST'])
def create_notification(user_id):
    data = request.json
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO notifications (user_id, type, title, message, data, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            data.get('type'),
            data.get('title'),
            data.get('message'),
            data.get('data', ''),
            data.get('timestamp', (datetime.now(TZ_JHB).isoformat() if TZ_JHB else datetime.now().isoformat()))
        ))
        
        notification_id = cursor.lastrowid
        # Attempt to send a push notification to the user's devices (best-effort)
        try:
            # data.get('data') may be a dict or a JSON string; pass a dict when possible
            payload_data = data.get('data', {}) if isinstance(data.get('data', {}), dict) else {}
            send_push_to_user(user_id, data.get('title', ''), data.get('message', ''), payload_data)
        except Exception as e:
            print(f'[Push] create_notification push error: {e}')
        conn.commit()
        conn.close()
        return jsonify({'id': notification_id, 'message': 'Notification created successfully'})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500


@app.route('/api/users/<int:user_id>/device-tokens', methods=['POST'])
def register_device_token(user_id):
    data = request.json or {}
    token = data.get('token')
    platform = data.get('platform', '')

    if not token:
        return jsonify({'error': 'Missing token'}), 400

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    try:
        # Try to insert; if token already exists for user, update last_seen
        try:
            cursor.execute('''
                INSERT INTO device_tokens (user_id, token, platform, last_seen)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', (user_id, token, platform))
        except sqlite3.IntegrityError:
            cursor.execute('''
                UPDATE device_tokens SET last_seen = CURRENT_TIMESTAMP, platform = ?
                WHERE user_id = ? AND token = ?
            ''', (platform, user_id, token))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Device token registered'})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        cursor.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', (notification_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Notification marked as read'})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>/notifications/mark-all-read', methods=['PUT'])
def mark_all_notifications_read(user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        cursor.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', (user_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'All notifications marked as read'})
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

# Lazy initialization of recommendation services
recommendation_service = None
ml_recommendation_service = None

def get_recommendation_service():
    global recommendation_service
    if recommendation_service is None:
        from recommendation_service import RecommendationService
        recommendation_service = RecommendationService(DATABASE)
    return recommendation_service

def get_ml_recommendation_service():
    global ml_recommendation_service
    if ml_recommendation_service is None:
        from ml_recommendation_service import MLRecommendationService
        ml_recommendation_service = MLRecommendationService(DATABASE)
    return ml_recommendation_service

@app.route('/api/ai/assistant', methods=['POST'])
def ai_book_assistant():
    if not GENAI_API_KEY:
        return jsonify({'error': 'AI features are not configured'}), 503
        
    data = request.get_json()
    user_message = data.get('message', '')
    
    try:
        import requests as req
        
        # Use REST API directly with gemini-2.0-flash (available model)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GENAI_API_KEY}"
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": f"You are a helpful library assistant. Answer the following question about books or library services in a friendly and informative way.\n\nUser: {user_message}\n\nAssistant:"
                }]
            }]
        }
        
        api_response = req.post(url, json=payload)
        api_response.raise_for_status()
        result = api_response.json()
        
        response_text = result['candidates'][0]['content']['parts'][0]['text']
        
        return jsonify({
            'response': response_text,
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
            ml_recs = get_ml_recommendation_service().get_recommendations(user_id, limit)
            # Extract content-based recommendations as the main recommendation list
            recommendations = ml_recs.get('content_based', [])
        else:
            # For legacy recommendation types, we need to filter here
            if rec_type == 'collaborative':
                recommendations = get_recommendation_service().collaborative_filtering(user_id, limit * 2)
            elif rec_type == 'content':
                recommendations = get_recommendation_service().content_based_filtering(user_id, limit * 2)
            else:  # hybrid
                recommendations = get_recommendation_service().hybrid_recommendation(user_id, limit * 2)
            
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
        similar_books = get_ml_recommendation_service().get_similar_books(book_id, limit)
        
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
            import requests as req
            
            # Use REST API directly with gemini-2.0-flash (available model)
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
            
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            payload = {
                "contents": [{
                    "parts": [{"text": full_prompt}]
                }]
            }
            
            api_response = req.post(url, json=payload)
            api_response.raise_for_status()
            result = api_response.json()
            
            text = result['candidates'][0]['content']['parts'][0]['text']
            print("Received response from Gemini API")
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

@app.route('/api/admin/cleanup-old-notifications', methods=['POST'])
def cleanup_old_notifications():
    """Delete approved/rejected notifications older than 12 hours to fix UTC duplicates"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cutoff_time = datetime.now() - timedelta(hours=12)
    cutoff_timestamp = cutoff_time.isoformat()
    
    cursor.execute('''
        DELETE FROM notifications 
        WHERE (type = 'reservation_approved' OR type = 'reservation_rejected')
        AND created_at < ?
    ''', (cutoff_timestamp,))
    
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'deleted_count': deleted_count,
        'cutoff_time': cutoff_timestamp
    })

@app.route('/api/admin/init-notifications-table', methods=['POST'])
def init_notifications_table():
    """Create notifications table if it doesn't exist"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        # Create notifications table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                data TEXT,
                is_read BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)')
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Notifications table created/verified successfully'
        })
    except Exception as e:
        conn.close()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== CHAT HISTORY ENDPOINTS ====================

@app.route('/api/chat/conversations', methods=['GET'])
def get_conversations():
    """Get all chat conversations for a user"""
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT c.*, b.title as book_title, b.author as book_author,
                   (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) as message_count
            FROM chat_conversations c
            LEFT JOIN books b ON c.book_id = b.id
            WHERE c.user_id = ?
            ORDER BY c.last_message_at DESC
        ''', (user_id,))
        
        conversations = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(conversations)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/conversations', methods=['POST'])
def create_conversation():
    """Create or get existing conversation"""
    data = request.json
    user_id = data.get('user_id')
    book_id = data.get('book_id')
    conversation_type = data.get('conversation_type', 'library')
    
    if not user_id or conversation_type not in ['book', 'library']:
        return jsonify({'error': 'Invalid parameters'}), 400
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Check if conversation already exists
        if conversation_type == 'book' and book_id:
            cursor.execute('''
                SELECT * FROM chat_conversations 
                WHERE user_id = ? AND book_id = ? AND conversation_type = 'book'
            ''', (user_id, book_id))
        else:
            cursor.execute('''
                SELECT * FROM chat_conversations 
                WHERE user_id = ? AND conversation_type = 'library' AND book_id IS NULL
            ''', (user_id,))
        
        existing = cursor.fetchone()
        
        if existing:
            conversation_id = existing['id']
        else:
            # Create new conversation
            title = data.get('title', 'New Conversation')
            cursor.execute('''
                INSERT INTO chat_conversations (user_id, book_id, conversation_type, title)
                VALUES (?, ?, ?, ?)
            ''', (user_id, book_id, conversation_type, title))
            conn.commit()
            conversation_id = cursor.lastrowid
        
        # Get the conversation
        cursor.execute('SELECT * FROM chat_conversations WHERE id = ?', (conversation_id,))
        conversation = dict(cursor.fetchone())
        
        conn.close()
        return jsonify(conversation)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/messages/<int:conversation_id>', methods=['GET'])
def get_messages(conversation_id):
    """Get all messages in a conversation"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT m.*, u.username,
                   reply.message_text as reply_to_text
            FROM chat_messages m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN chat_messages reply ON m.reply_to_id = reply.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        ''', (conversation_id,))
        
        messages = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(messages)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/messages', methods=['POST'])
def save_message():
    """Save a chat message"""
    data = request.json
    conversation_id = data.get('conversation_id')
    user_id = data.get('user_id')
    message_text = data.get('message_text')
    is_user_message = data.get('is_user_message', True)
    reply_to_id = data.get('reply_to_id')
    
    if not conversation_id or not user_id or not message_text:
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Insert message
        cursor.execute('''
            INSERT INTO chat_messages (conversation_id, user_id, message_text, is_user_message, reply_to_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (conversation_id, user_id, message_text, is_user_message, reply_to_id))
        
        message_id = cursor.lastrowid
        
        # Update conversation last_message_at
        cursor.execute('''
            UPDATE chat_conversations 
            SET last_message_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (conversation_id,))
        
        conn.commit()
        
        # Get the saved message
        cursor.execute('''
            SELECT m.*, u.username
            FROM chat_messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.id = ?
        ''', (message_id,))
        
        message = dict(cursor.fetchone())
        conn.close()
        return jsonify(message)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/conversations/<int:conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    """Delete a conversation and all its messages"""
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        # Verify ownership
        cursor.execute('SELECT user_id FROM chat_conversations WHERE id = ?', (conversation_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Conversation not found'}), 404
        
        if row[0] != user_id:
            conn.close()
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Delete conversation (messages will cascade delete)
        cursor.execute('DELETE FROM chat_conversations WHERE id = ?', (conversation_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Conversation deleted'})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Bind to Render's provided PORT when deployed; fall back to local dev defaults
    port = int(os.environ.get('PORT', '5001'))
    host = '0.0.0.0' if os.environ.get('PORT') else '127.0.0.1'
    debug = not bool(os.environ.get('PORT'))
    print(f"[Startup] Running on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)