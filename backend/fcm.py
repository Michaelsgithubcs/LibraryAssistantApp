import os
import json
import requests
from typing import Dict, Any

from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]
PROJECT_ID = os.environ.get('FCM_PROJECT_ID')


def get_access_token() -> str:
    key_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    if not key_path or not PROJECT_ID:
        raise RuntimeError('FCM v1 is not configured: missing GOOGLE_APPLICATION_CREDENTIALS or FCM_PROJECT_ID')

    creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
    creds.refresh(Request())
    return creds.token


def send_fcm_v1(device_token: str, title: str, body: str, data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Send a message via FCM HTTP v1 API.

    Raises an exception on HTTP error.
    """
    token = get_access_token()
    url = f'https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send'
    message = {
        'message': {
            'token': device_token,
            'notification': {'title': title, 'body': body},
            'data': {k: str(v) for k, v in (data or {}).items()},
            'android': {
                'priority': 'high',
                'notification': {
                    'channel_id': 'library-notifications',
                    'priority': 'high',
                    'default_vibrate_timings': True,
                    'default_sound': True
                }
            }
        }
    }
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json; UTF-8'}
    resp = requests.post(url, headers=headers, json=message, timeout=10)
    resp.raise_for_status()
    return resp.json()


if __name__ == '__main__':
    # Simple CLI tester
    import sys
    if len(sys.argv) < 4:
        print('Usage: python backend/fcm.py DEVICE_TOKEN "Title" "Body"')
        sys.exit(2)
    dev = sys.argv[1]
    title = sys.argv[2]
    body = sys.argv[3]
    print(send_fcm_v1(dev, title, body))
