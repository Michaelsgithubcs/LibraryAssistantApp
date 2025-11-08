#!/usr/bin/env python3
"""Quick test runner for FCM v1 helper. Usage:
   SERVICE_ACCOUNT_JSON='...' FCM_PROJECT_ID=... python3 backend/bin/test_fcm.py DEVICE_TOKEN
"""
import os
import sys
from backend import fcm


def main():
    if len(sys.argv) < 2:
        print('Usage: test_fcm.py DEVICE_TOKEN')
        return
    token = sys.argv[1]
    title = 'FCM v1 test'
    body = 'This is a test message from backend/fcm.py'
    try:
        resp = fcm.send_fcm_v1(token, title, body, {'test': '1'})
        print('Send OK:', resp)
    except Exception as e:
        print('Send failed:', e)


if __name__ == '__main__':
    main()
