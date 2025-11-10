#!/usr/bin/env python3
"""Test push notifications for iOS devices. Usage:
   python3 test_ios_push.py USER_ID "Title" "Message"
"""
import os
import sys
import sqlite3
from backend import fcm

def main():
    if len(sys.argv) < 4:
        print('Usage: python3 test_ios_push.py USER_ID "Title" "Message"')
        return

    user_id = int(sys.argv[1])
    title = sys.argv[2]
    message = sys.argv[3]

    # Connect to database and get device tokens for user
    conn = sqlite3.connect('backend/library.db')
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT token, platform FROM device_tokens WHERE user_id = ?', (user_id,))
        tokens = cursor.fetchall()

        if not tokens:
            print(f'No device tokens found for user {user_id}')
            return

        print(f'Found {len(tokens)} device token(s) for user {user_id}')

        # Send notification to each token
        for token, platform in tokens:
            try:
                print(f'Sending to {platform} device: {token[:20]}...')
                resp = fcm.send_fcm_v1(token, title, message, {'user_id': str(user_id), 'type': 'test'})
                print(f'Success: {resp}')
            except Exception as e:
                print(f'Failed to send to {platform} device: {e}')

    finally:
        conn.close()

if __name__ == '__main__':
    main()