import sqlite3
from datetime import datetime, timedelta

# Connect to the database
conn = sqlite3.connect('library.db')
cursor = conn.cursor()

# Delete approved/rejected notifications older than 12 hours
# This removes the old UTC notifications that are causing duplicates
cutoff_time = datetime.now() - timedelta(hours=12)
cutoff_timestamp = cutoff_time.isoformat()

print(f"Deleting approved/rejected notifications older than {cutoff_timestamp}")

cursor.execute('''
    DELETE FROM notifications 
    WHERE (type = 'reservation_approved' OR type = 'reservation_rejected')
    AND created_at < ?
''', (cutoff_timestamp,))

deleted_count = cursor.rowcount
conn.commit()
conn.close()

print(f"Deleted {deleted_count} old notifications")
