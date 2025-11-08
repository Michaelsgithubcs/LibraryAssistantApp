#!/usr/bin/env python3
"""Validate Google service account credentials for FCM HTTP v1.

Usage:
  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
  export FCM_PROJECT_ID=librant-e3990
  python3 backend/bin/validate_fcm.py

This script attempts to load the service account key and fetch an OAuth2 access
token with the firebase.messaging scope. It prints the access token on success
or a clear error message on failure.
"""
import os
import sys
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]


def main():
    key_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    project = os.environ.get('FCM_PROJECT_ID')

    if not project:
        print('ERROR: FCM_PROJECT_ID is not set. Export it and retry.')
        sys.exit(2)

    if not key_path or not os.path.exists(key_path):
        print('ERROR: GOOGLE_APPLICATION_CREDENTIALS is not set or file does not exist.')
        print('Set SERVICE_ACCOUNT_JSON or write the JSON to a file and set GOOGLE_APPLICATION_CREDENTIALS to its path.')
        sys.exit(2)

    try:
        creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
        creds.refresh(Request())
        token = creds.token
        if token:
            print('OK: obtained access token (truncated):', token[:80] + '...')
            print('FCM Project ID:', project)
            print('You can now run: python3 backend/bin/test_fcm.py <DEVICE_TOKEN>')
            sys.exit(0)
        else:
            print('ERROR: token was empty after refresh')
            sys.exit(1)
    except Exception as e:
        print('ERROR: failed to obtain access token:', e)
        sys.exit(1)


if __name__ == '__main__':
    main()
