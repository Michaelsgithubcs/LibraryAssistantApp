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
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    APSCHEDULER_AVAILABLE = True
    print("[Startup] APScheduler initialized successfully")
except ImportError:
    BackgroundScheduler = None
    IntervalTrigger = None
    APSCHEDULER_AVAILABLE = False
    print("[Startup] APScheduler not available - automated tasks disabled")
# Lazy import recommendation services
try:
    from recommendation_service import RecommendationService
    from ml_recommendation_service import MLRecommendationService
    RECOMMENDATION_SERVICES_AVAILABLE = True
    print("[Startup] Recommendation services initialized successfully")
except ImportError as e:
    print(f"[Startup] Recommendation services not available: {e}")
    RecommendationService = None
    MLRecommendationService = None
    RECOMMENDATION_SERVICES_AVAILABLE = False
import requests
try:
    # prefer the HTTP v1 FCM helper if available
    import sys
    import os
    # Add current directory to path to ensure fcm module can be found
    sys.path.insert(0, os.path.dirname(__file__))
    from fcm import send_fcm_v1, get_access_token
    FCM_V1_AVAILABLE = True
    print("[Startup] FCM v1 initialized successfully")
except Exception as e:
    print(f"[Startup] FCM v1 initialization failed: {e}")
    send_fcm_v1 = None
    FCM_V1_AVAILABLE = False

# Database configuration for Render (PostgreSQL) or local (SQLite)
DATABASE_URL = os.environ.get('DATABASE_URL')  # Render PostgreSQL
DATABASE_PATH = os.environ.get('DATABASE_PATH', 'library.db')  # Local SQLite fallback

if DATABASE_URL:
    # Use PostgreSQL for Render deployment
    try:
        import psycopg2
        import psycopg2.extras
        USE_POSTGRESQL = True
        print("[Startup] Using PostgreSQL database (Render)")
    except ImportError:
        print("[Startup] PostgreSQL not available, falling back to SQLite")
        USE_POSTGRESQL = False
else:
    # Use SQLite for local development
    USE_POSTGRESQL = False
    print("[Startup] Using SQLite database (Local)")

# Legacy SQLite setup (commented out but kept for reference)
# DATABASE = os.environ.get('DATABASE_PATH', 'library.db')
# db_dir = os.path.dirname(DATABASE)
# if db_dir:
#     os.makedirs(db_dir, exist_ok=True)
# print(f"[Startup] Using database at: {os.path.abspath(DATABASE)}")

app = Flask(__name__)
CORS(app)
app.secret_key = secrets.token_hex(16)

# Scheduler will be initialized after function definitions

# Database connection functions
def get_db_connection():
    """Get database connection - supports both PostgreSQL (Render) and SQLite (local)"""
    if USE_POSTGRESQL and DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    else:
        # Local SQLite fallback
        return sqlite3.connect(DATABASE_PATH)

def get_db_cursor(conn):
    """Get database cursor with appropriate settings"""
    if USE_POSTGRESQL:
        return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    else:
        cursor = conn.cursor()
        cursor.row_factory = sqlite3.Row  # Enable column access by name
        return cursor

# Configure Gemini API key from env if present
GENAI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

# FCM server key for sending push notifications (optional)
FCM_SERVER_KEY = os.environ.get('FCM_SERVER_KEY')

def init_db():
    conn = get_db_connection()
    cursor = get_db_cursor(conn)
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
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
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            isbn TEXT UNIQUE,
            category TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10,2) DEFAULT 0,
            is_free BOOLEAN DEFAULT true,
            is_ebook BOOLEAN DEFAULT false,
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
        if USE_POSTGRESQL:
            cursor.execute("ALTER TABLE books ADD COLUMN IF NOT EXISTS publish_date DATE")
        else:
            cursor.execute('ALTER TABLE books ADD COLUMN publish_date DATE')
    except Exception:
        pass  # Column already exists
    
    # Book ratings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS book_ratings (
            id SERIAL PRIMARY KEY,
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
            id SERIAL PRIMARY KEY,
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
        if USE_POSTGRESQL:
            cursor.execute("ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS overdue_fee_per_day DECIMAL(10,2) DEFAULT 5.00")
            cursor.execute("ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS damage_description TEXT")
        else:
            cursor.execute('ALTER TABLE book_issues ADD COLUMN overdue_fee_per_day DECIMAL(10,2) DEFAULT 5.00')
            cursor.execute('ALTER TABLE book_issues ADD COLUMN damage_description TEXT')
    except Exception:
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
    
    # Book checkouts table (for approved reservations ready for pickup)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS book_checkouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reservation_id INTEGER NOT NULL,
            book_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending_checkout' CHECK(status IN ('pending_checkout', 'completed', 'expired')),
            checkout_deadline TIMESTAMP NOT NULL,
            approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            viewed BOOLEAN DEFAULT 0,
            FOREIGN KEY (reservation_id) REFERENCES book_reservations (id),
            FOREIGN KEY (book_id) REFERENCES books (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
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
    
    # Notifications table for persistent user notifications
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
    
    # Chat conversations table (for organizing chats)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            book_id INTEGER,
            conversation_type TEXT NOT NULL CHECK(conversation_type IN ('book', 'library')),
            title TEXT,
            last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (book_id) REFERENCES books (id)
        )
    ''')
    
    # Chat messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            message_text TEXT NOT NULL,
            is_user_message BOOLEAN DEFAULT 1,
            reply_to_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES chat_conversations (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (reply_to_id) REFERENCES chat_messages (id)
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
        print(f'[Push] Attempting to send push to user {user_id}: "{title}"')
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('SELECT token, platform FROM device_tokens WHERE user_id = ?', (user_id,))
        rows = cursor.fetchall()
        conn.close()

        print(f'[Push] Found {len(rows)} device tokens for user {user_id}')
        if not rows:
            print(f'[Push] No device tokens for user {user_id}')
            return False

        sent_any = False
        for token, platform in rows:
            print(f'[Push] Sending to {platform} device: {token[:20]}...')
            ok = send_fcm(token, title, message, data or {})
            print(f'[Push] Send result for {platform}: {ok}')
            sent_any = sent_any or ok

        print(f'[Push] Push sending completed for user {user_id}, success: {sent_any}')
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

        # Check if book exists and get availability
        cursor.execute('SELECT title, available_copies, total_copies FROM books WHERE id = ?', (book_id,))
        book = cursor.fetchone()

        if not book:
            conn.close()
            return jsonify({'error': 'Book not found'}), 404

        book_title, available_copies, total_copies = book

        # Check if user already has pending request for this book
        cursor.execute('SELECT id FROM book_reservations WHERE book_id = ? AND user_id = ? AND (status = "pending" OR status = "approved_checkout")', (book_id, user_id))
        existing = cursor.fetchone()

        if existing:
            conn.close()
            return jsonify({'error': 'You already have a pending request or approved checkout for this book'}), 400

        # Automated approval logic
        if available_copies > 0:
            # Auto-approve: create reservation and checkout record
            conn.execute('BEGIN')
            try:
                cursor.execute('''
                    INSERT INTO book_reservations (book_id, user_id, status)
                    VALUES (?, ?, 'approved_checkout')
                ''', (book_id, user_id))

                reservation_id = cursor.lastrowid

                # Calculate checkout deadline (2 days from now)
                from datetime import datetime, timedelta
                checkout_deadline = (datetime.now() + timedelta(days=2)).isoformat()

                # Create checkout record
                cursor.execute('''
                    INSERT INTO book_checkouts (reservation_id, book_id, user_id, status, checkout_deadline, approved_at)
                    VALUES (?, ?, ?, 'pending_checkout', ?, ?)
                ''', (reservation_id, book_id, user_id, checkout_deadline, datetime.now().isoformat()))

                # Update book availability
                cursor.execute('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', (book_id,))

                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            
            # Send notification to user
            send_push_to_user(user_id, 'Reservation Approved', f'Your reservation for "{book_title}" has been approved! Please collect it within 2 days.', {
                'type': 'reservation_approved',
                'book_id': book_id,
                'book_title': book_title,
                'checkout_deadline': checkout_deadline
            })
            
            conn.close()

            return jsonify({
                'status': 'approved_checkout',
                'message': f'Reservation approved! Please collect "{book_title}" within 2 days.',
                'checkout_deadline': checkout_deadline
            })

        else:
            # Auto-reject: book not available
            cursor.execute('''
                INSERT INTO book_reservations (book_id, user_id, status, rejection_reason)
                VALUES (?, ?, 'rejected', 'Book currently unavailable')
            ''', (book_id, user_id))

            # Send notification to user
            send_push_to_user(user_id, 'Reservation Rejected', f'Sorry, "{book_title}" is currently unavailable.', {
                'type': 'reservation_rejected',
                'book_id': book_id,
                'book_title': book_title,
                'reason': 'Book currently unavailable'
            })

            conn.commit()
            conn.close()

            return jsonify({
                'status': 'rejected',
                'reason': 'Book currently unavailable',
                'message': f'Sorry, "{book_title}" is currently unavailable.'
            })

    except Exception as e:
        print(f'Reserve error: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/reservations/<int:reservation_id>/approve', methods=['POST'], endpoint='approve_reservation_legacy')
def approve_reservation(reservation_id):
    data = request.json
    approved_by = data.get('approved_by')  # Admin user ID

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    try:
        # Get reservation details
        cursor.execute('''
            SELECT br.book_id, br.user_id, b.title
            FROM book_reservations br
            JOIN books b ON br.book_id = b.id
            WHERE br.id = ? AND br.status = 'pending'
        ''', (reservation_id,))
        reservation = cursor.fetchone()

        if not reservation:
            conn.close()
            return jsonify({'error': 'Reservation not found or already processed'}), 404

        book_id, user_id, book_title = reservation

        # Update reservation status
        cursor.execute('''
            UPDATE book_reservations
            SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ?
            WHERE id = ?
        ''', (approved_by, reservation_id))

        conn.commit()

        # Send push notification to user
        notification_title = "📚 Reservation Approved!"
        notification_message = f"Your reservation for '{book_title}' has been approved. You can now issue this book."
        send_push_to_user(user_id, notification_title, notification_message, {
            'type': 'reservation_approved',
            'book_id': book_id,
            'reservation_id': reservation_id
        })

        conn.close()
        return jsonify({'message': 'Reservation approved successfully'})

    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/reservations/<int:reservation_id>/reject', methods=['POST'], endpoint='reject_reservation_legacy')
def reject_reservation(reservation_id):
    data = request.json
    approved_by = data.get('approved_by')  # Admin user ID
    rejection_reason = data.get('rejection_reason', '')

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    try:
        # Get reservation details
        cursor.execute('''
            SELECT br.book_id, br.user_id, b.title
            FROM book_reservations br
            JOIN books b ON br.book_id = b.id
            WHERE br.id = ? AND br.status = 'pending'
        ''', (reservation_id,))
        reservation = cursor.fetchone()

        if not reservation:
            conn.close()
            return jsonify({'error': 'Reservation not found or already processed'}), 404

        book_id, user_id, book_title = reservation

        # Update reservation status
        cursor.execute('''
            UPDATE book_reservations
            SET status = 'rejected', approved_at = CURRENT_TIMESTAMP, approved_by = ?, rejection_reason = ?
            WHERE id = ?
        ''', (approved_by, rejection_reason, reservation_id))

        conn.commit()

        # Send push notification to user
        notification_title = "❌ Reservation Rejected"
        notification_message = f"Your reservation for '{book_title}' has been rejected."
        if rejection_reason:
            notification_message += f" Reason: {rejection_reason}"
        send_push_to_user(user_id, notification_title, notification_message, {
            'type': 'reservation_rejected',
            'book_id': book_id,
            'reservation_id': reservation_id,
            'rejection_reason': rejection_reason
        })

        conn.close()
        return jsonify({'message': 'Reservation rejected successfully'})

    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/reservations', methods=['GET'])
def get_reservations():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT br.id, b.title as book_title, b.author as book_author,
               u.username as user_name, u.email as user_email,
               br.status, br.requested_at, br.approved_at, br.rejection_reason
        FROM book_reservations br
        JOIN books b ON br.book_id = b.id
        JOIN users u ON br.user_id = u.id
        ORDER BY br.requested_at DESC
    ''')
    reservations = cursor.fetchall()

    reservation_list = []
    for res in reservations:
        reservation_list.append({
            'id': res[0],
            'book_title': res[1],
            'book_author': res[2],
            'user_name': res[3],
            'user_email': res[4],
            'status': res[5],
            'requested_at': res[6],
            'approved_at': res[7],
            'rejection_reason': res[8] or ''
        })

    conn.close()
    return jsonify(reservation_list)

@app.route('/api/admin/checkouts', methods=['GET'])
def get_checkouts():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT bc.id, b.title as book_title, b.author as book_author,
               u.username as user_name, u.email as user_email,
               bc.status, bc.checkout_deadline, bc.approved_at, bc.completed_at
        FROM book_checkouts bc
        JOIN books b ON bc.book_id = b.id
        JOIN users u ON bc.user_id = u.id
        WHERE bc.status = 'pending_checkout'
        ORDER BY bc.approved_at DESC
    ''')
    checkouts = cursor.fetchall()

    checkout_list = []
    for checkout in checkouts:
        checkout_list.append({
            'id': checkout[0],
            'book_title': checkout[1],
            'book_author': checkout[2],
            'user_name': checkout[3],
            'user_email': checkout[4],
            'status': checkout[5],
            'checkout_deadline': checkout[6],
            'approved_at': checkout[7],
            'completed_at': checkout[8]
        })

    conn.close()
    return jsonify(checkout_list)

@app.route('/api/admin/checkouts/<int:checkout_id>/complete', methods=['POST'])
def complete_checkout(checkout_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        # Get checkout details
        cursor.execute('SELECT book_id, user_id FROM book_checkouts WHERE id = ?', (checkout_id,))
        checkout = cursor.fetchone()
        
        if not checkout:
            conn.close()
            return jsonify({'error': 'Checkout not found'}), 404
            
        book_id, user_id = checkout
        
        # Update checkout status
        cursor.execute('''
            UPDATE book_checkouts 
            SET status = 'completed', completed_at = datetime('now')
            WHERE id = ?
        ''', (checkout_id,))
        
        # Update reservation status to checked_out
        cursor.execute('''
            UPDATE book_reservations 
            SET status = 'checked_out'
            WHERE id = (SELECT reservation_id FROM book_checkouts WHERE id = ?)
        ''', (checkout_id,))
        
        # Note: available_copies was already decreased when reservation was approved
        # Do not decrease again
        
        # Create book issue record
        cursor.execute('''
            INSERT INTO book_issues (book_id, user_id, issue_date, due_date, status)
            VALUES (?, ?, datetime('now'), datetime('now', '+30 days'), 'issued')
        ''', (book_id, user_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Checkout completed successfully'})
    except Exception as e:
        conn.rollback()
        conn.close()
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
    
    # Send push notification to user about book issuance
    book_title = book[0] if book else "Book"
    notification_title = "📚 Book Issued Successfully!"
    notification_message = f"'{book_title}' has been issued to you. Due date: {due_date.strftime('%Y-%m-%d')}"
    send_push_to_user(user_id, notification_title, notification_message, {
        'type': 'book_issued',
        'book_id': book_id,
        'issue_id': issue_id,
        'due_date': due_date.strftime('%Y-%m-%d')
    })
    
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

@app.route('/api/admin/issued-books/count', methods=['GET'])
def get_issued_books_count():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM book_checkouts WHERE status = "pending_checkout"')
    count = cursor.fetchone()[0]
    
    conn.close()
    return jsonify({'count': count})

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
        
        # Send push notification to user about book return
        cursor.execute('SELECT title FROM books WHERE id = ?', (book_id,))
        book_title_result = cursor.fetchone()
        book_title = book_title_result[0] if book_title_result else "Book"
        
        notification_title = "📖 Book Returned Successfully!"
        notification_message = f"'{book_title}' has been marked as returned. Thank you for using our library!"
        send_push_to_user(user_id, notification_title, notification_message, {
            'type': 'book_returned',
            'book_id': book_id,
            'issue_id': issue_id
        })
    
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

@app.route('/api/admin/reservation-requests/<int:request_id>/approve', methods=['POST'], endpoint='approve_reservation_request')
def approve_reservation_request(request_id):
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

@app.route('/api/admin/reservation-requests/<int:request_id>/reject', methods=['POST'], endpoint='reject_reservation_request')
def reject_reservation_request(request_id):
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
        # Get reservation details before deleting
        cursor.execute('SELECT user_id, status, book_id FROM book_reservations WHERE id = ?', (reservation_id,))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return jsonify({'error': 'Reservation not found'}), 404
        
        user_id, status, book_id = result
        
        # Only allow cancelling pending or approved reservations
        if status not in ['pending', 'approved', 'approved_checkout']:
            conn.close()
            return jsonify({'error': 'Reservation cannot be cancelled'}), 400
        
        # If approved, also cancel the associated checkout
        if status in ['approved', 'approved_checkout']:
            cursor.execute('DELETE FROM book_checkouts WHERE reservation_id = ?', (reservation_id,))
            # Return the book copy to available
            cursor.execute('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', (book_id,))
        
        # Delete the reservation
        cursor.execute('DELETE FROM book_reservations WHERE id = ?', (reservation_id,))
        
        # Delete related notification(s)
        cursor.execute('''
            DELETE FROM notifications 
            WHERE user_id = ? 
            AND type = 'reservation'
        ''', (user_id,))
        
        print(f'Cancelled {status} reservation {reservation_id} for user {user_id}')
        
        conn.commit()
        conn.close()
        return jsonify({'message': 'Reservation cancelled successfully'})
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

@app.route('/api/debug/device-tokens/<int:user_id>', methods=['GET'])
def debug_device_tokens(user_id):
    """Debug endpoint to check device tokens for a user"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM device_tokens WHERE user_id = ?', (user_id,))
        count = cursor.fetchone()[0]

        cursor.execute('SELECT token, platform, last_seen FROM device_tokens WHERE user_id = ? ORDER BY last_seen DESC LIMIT 5', (user_id,))
        tokens = cursor.fetchall()
        conn.close()

        return jsonify({
            'user_id': user_id,
            'token_count': count,
            'recent_tokens': [{'platform': t[1], 'last_seen': t[2], 'token_preview': t[0][:20] + '...'} for t in tokens]
        })
    except Exception as e:
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
        
        # Use REST API directly with gemini-1.5-flash (available model)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GENAI_API_KEY}"
        
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
        limit = min(int(request.args.get('limit', '5')), 20)  # Cap at 20 to prevent memory issues
        
        print(f"Getting {rec_type} recommendations for user {user_id}, limit {limit}", file=sys.stderr)
        
        if rec_type == 'ml':
            try:
                # Use the new ML-based recommendation service
                ml_recs = get_ml_recommendation_service().get_recommendations(user_id, limit)
                # Extract content-based recommendations as the main recommendation list
                recommendations = ml_recs.get('content_based', [])
            except Exception as ml_error:
                print(f"ML recommendation service failed: {str(ml_error)}", file=sys.stderr)
                # Fallback to basic collaborative filtering
                try:
                    recommendations = get_recommendation_service().collaborative_filtering(user_id, limit)
                    print("Fallback to collaborative filtering successful", file=sys.stderr)
                except Exception as collab_error:
                    print(f"Collaborative filtering also failed: {str(collab_error)}", file=sys.stderr)
                    # Final fallback: return some popular books from database
                    conn = sqlite3.connect(DATABASE)
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT id, title, author, category, description, cover_image 
                        FROM books 
                        ORDER BY total_copies DESC 
                        LIMIT ?
                    """, (limit,))
                    popular_books = cursor.fetchall()
                    conn.close()
                    
                    recommendations = [{
                        'id': book[0],
                        'title': book[1],
                        'author': book[2],
                        'category': book[3],
                        'description': book[4],
                        'cover_image': book[5]
                    } for book in popular_books]
                    print("Using popular books as final fallback", file=sys.stderr)
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
            
            # Use REST API directly with gemini-1.5-flash (stable and widely available)
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            
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
            
            # Provide more specific error messages
            error_msg = str(ai_error).lower()
            if 'api key' in error_msg or 'unauthorized' in error_msg:
                return jsonify({
                    'error': 'AI service not configured: Invalid or missing API key',
                    'details': 'Please check that GEMINI_API_KEY is properly set in environment variables'
                }), 500
            elif 'model' in error_msg or 'not found' in error_msg:
                return jsonify({
                    'error': 'AI model unavailable',
                    'details': 'The requested AI model is not available. Please try again later.'
                }), 503
            elif 'quota' in error_msg or 'rate limit' in error_msg:
                return jsonify({
                    'error': 'AI service quota exceeded',
                    'details': 'AI service is temporarily unavailable due to quota limits. Please try again later.'
                }), 429
            else:
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

@app.route('/api/ai/library-assistant', methods=['POST'])
def ai_library_assistant():
    """
    AI-powered library assistant that can answer questions about:
    - Book recommendations and search
    - Library policies and services
    - User account information
    - Reading suggestions based on preferences
    - General library inquiries
    """
    try:
        print("Library Assistant AI endpoint called")

        # Check for API key
        api_key = os.getenv('GENAI_API_KEY') or os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("Error: No API key found")
            return jsonify({'error': 'AI not configured: Missing API key'}), 500

        # Configure Gemini AI
        try:
            genai.configure(api_key=api_key)
        except Exception as config_error:
            print(f"Error configuring GenAI: {str(config_error)}")
            return jsonify({'error': f'Failed to configure AI: {str(config_error)}'}), 500

        data = request.json or {}
        user_id = data.get('user_id')
        question = data.get('question', '').strip()

        if not question:
            return jsonify({'error': 'question is required'}), 400

        # Get user context if available
        user_context = ""
        ml_recommendations = []

        if user_id:
            try:
                # Get user borrowing history for personalized recommendations
                ml_service = MLRecommendationService('library.db')
                user_history = ml_service.get_user_history(user_id)

                if user_history:
                    # Get user's borrowed books for context
                    conn = sqlite3.connect('library.db')
                    cursor = conn.cursor()

                    placeholders = ','.join('?' * len(user_history))
                    cursor.execute(f"""
                        SELECT title, author, category
                        FROM books
                        WHERE id IN ({placeholders})
                        ORDER BY title
                    """, user_history)

                    borrowed_books = cursor.fetchall()
                    conn.close()

                    if borrowed_books:
                        user_context = "\n\nUser's Reading History:\n" + "\n".join([
                            f"- {title} by {author} ({category})"
                            for title, author, category in borrowed_books[:10]  # Limit to 10 most recent
                        ])

                        # Get personalized recommendations
                        recommendations = ml_service.content_based_recommendations(user_id, 5)
                        if recommendations:
                            ml_recommendations = recommendations

            except Exception as e:
                print(f"Error getting user context: {str(e)}")
                # Continue without user context

        # Get user account information if user_id is provided
        user_account_info = ""
        if user_id:
            try:
                conn = sqlite3.connect('library.db')
                cursor = conn.cursor()

                # Get user's current borrowed books
                cursor.execute("""
                    SELECT b.title, b.author, bi.due_date, bi.issue_date,
                           CASE WHEN bi.due_date < date('now') THEN 1 ELSE 0 END as is_overdue
                    FROM book_issues bi
                    JOIN books b ON bi.book_id = b.id
                    WHERE bi.user_id = ? AND bi.return_date IS NULL
                    ORDER BY bi.due_date
                """, (user_id,))

                borrowed_books = cursor.fetchall()

                if borrowed_books:
                    user_account_info += f"\n\nYour Current Loans ({len(borrowed_books)} books):\n"
                    overdue_count = 0
                    for title, author, due_date, issue_date, is_overdue in borrowed_books:
                        status = "⚠️ OVERDUE" if is_overdue else "✅ On time"
                        if is_overdue:
                            overdue_count += 1
                        user_account_info += f"• {title} by {author} (Due: {due_date}) - {status}\n"

                    if overdue_count > 0:
                        user_account_info += f"\n⚠️ You have {overdue_count} overdue book(s). Please return them to avoid fines."

                # Get user's fines
                cursor.execute("""
                    SELECT SUM(amount) as total_fines, COUNT(*) as fine_count
                    FROM fines
                    WHERE user_id = ? AND paid = 0
                """, (user_id,))

                fine_info = cursor.fetchone()
                if fine_info and fine_info[0]:
                    user_account_info += f"\n\n💰 Outstanding Fines: R{fine_info[0]:.2f} ({fine_info[1]} items)"
                    user_account_info += "\n   Fines accrue at R5 per day for overdue books."

                # Get user's reservation count
                cursor.execute("""
                    SELECT COUNT(*) as reservation_count
                    FROM reservations
                    WHERE user_id = ? AND status = 'pending'
                """, (user_id,))

                reservation_info = cursor.fetchone()
                if reservation_info and reservation_info[0] > 0:
                    user_account_info += f"\n\n📋 Active Reservations: {reservation_info[0]}"
                    user_account_info += "\n   You can have up to 5 active reservations."

                # Get user's total borrowing history
                cursor.execute("""
                    SELECT COUNT(*) as total_borrowed
                    FROM book_issues
                    WHERE user_id = ?
                """, (user_id,))

                history_info = cursor.fetchone()
                if history_info and history_info[0] > 0:
                    user_account_info += f"\n\n📚 Total Books Borrowed: {history_info[0]}"

                conn.close()

            except Exception as e:
                print(f"Error getting user account info: {str(e)}")

        # Get current library stats for context
        library_stats = ""
        book_search_results = []
        
        try:
            conn = sqlite3.connect('library.db')
            cursor = conn.cursor()

            # Get total books, available books, etc.
            cursor.execute("""
                SELECT
                    COUNT(*) as total_books,
                    SUM(available_copies) as available_copies,
                    COUNT(CASE WHEN available_copies > 0 THEN 1 END) as available_titles
                FROM books
            """)
            stats = cursor.fetchone()

            if stats:
                library_stats = f"""
Library Statistics:
- Total book titles: {stats[2] or 0}
- Total book copies: {stats[0] or 0}
- Currently available copies: {stats[1] or 0}
"""

            # Get popular categories
            cursor.execute("""
                SELECT category, COUNT(*) as count
                FROM books
                GROUP BY category
                ORDER BY count DESC
                LIMIT 5
            """)
            categories = cursor.fetchall()

            if categories:
                library_stats += "\nPopular Categories:\n" + "\n".join([
                    f"- {cat}: {count} books" for cat, count in categories
                ])

            # Check if the question is about book search
            question_lower = question.lower()
            if any(keyword in question_lower for keyword in ['find', 'search', 'looking for', 'have', 'available', 'books about', 'books by']):
                # Extract potential search terms
                search_terms = []
                
                # Look for book titles in quotes
                import re
                title_matches = re.findall(r'"([^"]*)"', question)
                if title_matches:
                    search_terms.extend(title_matches)
                
                # Look for author names (common patterns)
                author_patterns = [
                    r'by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',  # "by First Last"
                    r'([A-Z][a-z]+\s+[A-Z][a-z]+)',       # Any "First Last" pattern
                ]
                
                for pattern in author_patterns:
                    matches = re.findall(pattern, question)
                    search_terms.extend(matches)
                
                # If no specific terms found, use the whole question for fuzzy search
                if not search_terms:
                    search_terms = [question.replace('find', '').replace('search', '').replace('looking for', '').strip()]
                
                # Perform book search
                for term in search_terms[:3]:  # Limit to 3 search terms
                    term = term.strip()
                    if len(term) < 3:  # Skip very short terms
                        continue
                        
                    cursor.execute("""
                        SELECT id, title, author, category, description, available_copies, total_copies
                        FROM books 
                        WHERE (title LIKE ? OR author LIKE ? OR category LIKE ? OR description LIKE ?)
                        AND available_copies > 0
                        ORDER BY 
                            CASE 
                                WHEN title LIKE ? THEN 1
                                WHEN author LIKE ? THEN 2
                                ELSE 3
                            END,
                            title
                        LIMIT 5
                    """, (f'%{term}%', f'%{term}%', f'%{term}%', f'%{term}%', f'%{term}%', f'%{term}%'))
                    
                    results = cursor.fetchall()
                    for result in results:
                        book_search_results.append({
                            'id': result[0],
                            'title': result[1],
                            'author': result[2],
                            'category': result[3],
                            'description': result[4] or 'No description available',
                            'available_copies': result[5],
                            'total_copies': result[6]
                        })
                    
                    # If we found results, break
                    if book_search_results:
                        break
                
                # Remove duplicates
                seen = set()
                unique_results = []
                for book in book_search_results:
                    book_key = (book['title'], book['author'])
                    if book_key not in seen:
                        seen.add(book_key)
                        unique_results.append(book)
                
                book_search_results = unique_results[:5]  # Limit to 5 results

            # Check if user is asking to compare books
            comparison_results = []
            question_lower = question.lower()
            if any(keyword in question_lower for keyword in ['compare', 'vs', 'versus', 'difference between', 'similar to', 'like']):
                # Extract book titles to compare
                compare_titles = []
                
                # Look for quoted titles
                import re
                title_matches = re.findall(r'"([^"]*)"', question)
                compare_titles.extend(title_matches)
                
                # Look for common comparison patterns
                if ' vs ' in question_lower:
                    parts = question_lower.split(' vs ')
                    compare_titles.extend([part.strip() for part in parts])
                elif ' versus ' in question_lower:
                    parts = question_lower.split(' versus ')
                    compare_titles.extend([part.strip() for part in parts])
                elif ' compared to ' in question_lower:
                    parts = question_lower.split(' compared to ')
                    compare_titles.extend([part.strip() for part in parts])
                
                # Find books in database for comparison
                if len(compare_titles) >= 2:
                    try:
                        conn = sqlite3.connect('library.db')
                        cursor = conn.cursor()
                        
                        for title in compare_titles[:3]:  # Compare up to 3 books
                            title = title.strip()
                            if len(title) < 3:
                                continue
                                
                            cursor.execute("""
                                SELECT id, title, author, category, description, publish_date,
                                       available_copies, total_copies
                                FROM books 
                                WHERE title LIKE ? OR author LIKE ?
                                LIMIT 1
                            """, (f'%{title}%', f'%{title}%'))
                            
                            book_result = cursor.fetchone()
                            if book_result:
                                comparison_results.append({
                                    'id': book_result[0],
                                    'title': book_result[1],
                                    'author': book_result[2],
                                    'category': book_result[3],
                                    'description': book_result[4] or 'No description available',
                                    'publish_date': book_result[5],
                                    'available_copies': book_result[6],
                                    'total_copies': book_result[7]
                                })
                        
                        conn.close()
                        
                    except Exception as e:
                        print(f"Error getting comparison books: {str(e)}")

            conn.close()

        except Exception as e:
            print(f"Error getting library stats or search results: {str(e)}")

        # Create comprehensive system prompt
        system_prompt = f"""You are an intelligent Library Assistant AI with access to real library data and machine learning recommendations.

Your capabilities include:
1. **Book Search & Discovery**: Help users find books by title, author, genre, or keywords
2. **Personalized Recommendations**: Suggest books based on reading history and preferences
3. **Library Services**: Explain policies, hours, fines, reservations, and procedures
4. **Reading Guidance**: Provide insights, summaries, and discussion points
5. **Account Assistance**: Help with borrowing history, due dates, and account management

{library_stats}

Always provide helpful, accurate information. If you don't have specific data, acknowledge limitations but still assist where possible.
Be conversational and engaging while being informative.
For recommendations, consider the user's reading history when available.
"""

        # Add user context and ML recommendations to the prompt
        enhanced_context = f"{system_prompt}{user_context}{user_account_info}"

        if ml_recommendations:
            enhanced_context += f"\n\nPersonalized Recommendations Available:\n"
            for rec in ml_recommendations[:3]:
                enhanced_context += f"- {rec['title']} by {rec['author']} ({rec['category']})\n"

        # Create the user prompt
        user_prompt = f"User Question: {question}"

        print("Sending request to Gemini API for library assistant...")

        # Use Gemini API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

        full_prompt = f"{enhanced_context}\n\n{user_prompt}"

        payload = {
            "contents": [{
                "parts": [{"text": full_prompt}]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 1000,
                "topP": 0.8,
                "topK": 40
            }
        }

        response = requests.post(url, json=payload, timeout=15)
        response.raise_for_status()

        result = response.json()
        if 'candidates' in result and result['candidates']:
            ai_response = result['candidates'][0]['content']['parts'][0]['text'].strip()

            # Post-process response to add interactive elements
            enhanced_response = ai_response

            # Add book search results if available
            if book_search_results:
                enhanced_response += f"\n\n📚 I found these books that match your search:\n"
                for i, book in enumerate(book_search_results[:3], 1):
                    enhanced_response += f"\n{i}. **{book['title']}** by {book['author']}\n"
                    enhanced_response += f"   Category: {book['category']}\n"
                    enhanced_response += f"   Available: {book['available_copies']} of {book['total_copies']} copies\n"
                
                if len(book_search_results) > 3:
                    enhanced_response += f"\n   ... and {len(book_search_results) - 3} more results"
                
                enhanced_response += "\n\n💡 You can ask me to reserve any of these books!"

            # Add book comparison results if available
            if comparison_results and len(comparison_results) >= 2:
                enhanced_response += f"\n\n⚖️ Book Comparison ({len(comparison_results)} books):\n"
                for i, book in enumerate(comparison_results, 1):
                    enhanced_response += f"\n{i}. **{book['title']}** by {book['author']}\n"
                    enhanced_response += f"   Category: {book['category']}\n"
                    enhanced_response += f"   Published: {book['publish_date'] or 'Unknown'}\n"
                    enhanced_response += f"   Available: {book['available_copies']} of {book['total_copies']} copies\n"
                
                enhanced_response += "\n💡 I can help you compare these books in terms of themes, writing style, or popularity!"

            # Add book search suggestions if relevant
            elif any(keyword in question.lower() for keyword in ['find', 'search', 'looking for', 'recommend']):
                enhanced_response += "\n\n💡 Tip: You can also use the Book Search feature in the app to browse available books!"

            return jsonify({
                'answer': enhanced_response,
                'has_recommendations': len(ml_recommendations) > 0,
                'recommendations': ml_recommendations[:3] if ml_recommendations else [],
                'search_results': book_search_results[:5] if book_search_results else [],
                'comparison_results': comparison_results[:3] if comparison_results else []
            })

        else:
            return jsonify({'error': 'No response generated from AI'}), 500

    except Exception as e:
        print(f"Error in library assistant AI: {str(e)}")
        import traceback
        traceback.print_exc()

        # Provide helpful fallback responses
        question_lower = question.lower()

        if 'recommend' in question_lower or 'suggest' in question_lower:
            return jsonify({
                'answer': "I'd love to recommend some great books! While I'm currently experiencing technical difficulties, here are some popular choices:\n\n📚 **Fiction**: 'The Seven Husbands of Evelyn Hugo' by Taylor Jenkins Reid\n📖 **Mystery**: 'The Thursday Murder Club' by Richard Osman\n🚀 **Sci-Fi**: 'Project Hail Mary' by Andy Weir\n\nPlease try again in a moment for personalized recommendations based on your reading history!",
                'has_recommendations': False,
                'recommendations': []
            })

        elif 'hour' in question_lower or 'open' in question_lower:
            return jsonify({
                'answer': "📅 **Library Hours**:\n\n• Monday - Friday: 8:00 AM - 8:00 PM\n• Saturday: 9:00 AM - 6:00 PM\n• Sunday: 12:00 PM - 5:00 PM\n\nWe're closed on public holidays. Please try your question again for more detailed information!",
                'has_recommendations': False,
                'recommendations': []
            })

        else:
            return jsonify({
                'answer': "I'm sorry, but I'm currently experiencing connectivity issues. Please try your question again in a moment. I'm here to help with book recommendations, library information, and reading guidance!",
                'has_recommendations': False,
                'recommendations': []
            })

def process_expired_checkouts():
    """Process checkouts that have expired (2 days old) and return books to available"""
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()

        # Find expired checkouts
        current_time = datetime.now().isoformat()
        cursor.execute('''
            SELECT bc.id, bc.reservation_id, bc.book_id, bc.user_id, b.title
            FROM book_checkouts bc
            JOIN books b ON bc.book_id = b.id
            WHERE bc.status = 'pending_checkout'
            AND bc.checkout_deadline < ?
        ''', (current_time,))

        expired_checkouts = cursor.fetchall()

        for checkout in expired_checkouts:
            checkout_id, reservation_id, book_id, user_id, book_title = checkout

            # Update checkout status to expired
            cursor.execute('''
                UPDATE book_checkouts
                SET status = 'expired', viewed = 0
                WHERE id = ?
            ''', (checkout_id,))

            # Update reservation status to expired
            cursor.execute('''
                UPDATE book_reservations
                SET status = 'expired', rejection_reason = 'checkout deadline expired'
                WHERE id = ?
            ''', (reservation_id,))

            # Create notification for user
            local_timestamp = (datetime.now(TZ_JHB).isoformat() if TZ_JHB else datetime.now().isoformat())
            cursor.execute('''
                INSERT INTO notifications (user_id, type, title, message, data, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                'checkout_expired',
                'Checkout Expired',
                f'Your checkout deadline for "{book_title}" has expired. The book is now available for others.',
                f'{{"bookId": {book_id}, "bookTitle": "{book_title}", "timestamp": "{local_timestamp}"}}',
                local_timestamp
            ))

        if expired_checkouts:
            print(f'Processed {len(expired_checkouts)} expired checkouts')

        conn.commit()
        conn.close()

    except Exception as e:
        print(f'Error processing expired checkouts: {e}')

# Initialize background scheduler for automated tasks (if available)
if APSCHEDULER_AVAILABLE:
    scheduler = BackgroundScheduler()
    scheduler.start()

    # Schedule expired checkout processing every hour
    scheduler.add_job(
        func=process_expired_checkouts,
        trigger=IntervalTrigger(hours=1),
        id='process_expired_checkouts',
        name='Process expired checkouts every hour',
        replace_existing=True
    )

    print("[Startup] Background scheduler initialized with expired checkout processing")
else:
    scheduler = None
    print("[Startup] Background scheduler not available - manual processing only")

import atexit

# Ensure scheduler shuts down properly on app exit (if available)
if APSCHEDULER_AVAILABLE and scheduler:
    atexit.register(lambda: scheduler.shutdown())

if __name__ == '__main__':
    # Bind to Render's provided PORT when deployed; fall back to local dev defaults
    port = int(os.environ.get('PORT', '5001'))
    host = '0.0.0.0' if os.environ.get('PORT') else '127.0.0.1'
    debug = not bool(os.environ.get('PORT'))
    print(f"[Startup] Running on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)