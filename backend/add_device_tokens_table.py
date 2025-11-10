import sqlite3
from datetime import datetime

# Connect to the database
conn = sqlite3.connect('library.db')
cursor = conn.cursor()

# Create device_tokens table if it doesn't exist
cursor.execute('''
    CREATE TABLE IF NOT EXISTS device_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        platform TEXT NOT NULL,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, token)
    )
''')

# Create indexes for better performance
cursor.execute('CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_device_tokens_last_seen ON device_tokens(last_seen)')

conn.commit()
conn.close()

print("Device tokens table created/verified successfully!")