#!/usr/bin/env python3
"""Test device token registration and push notification sending"""
import requests
import json

API_BASE = 'https://libraryassistantapp.onrender.com/api'

def test_device_token_registration():
    """Test registering a device token"""
    # First, let's login to get a user ID
    login_data = {
        'email': 'test@example.com',  # You'll need to use a real user
        'password': 'password'
    }

    try:
        # Login
        login_response = requests.post(f'{API_BASE}/auth/login', json=login_data)
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.status_code} - {login_response.text}")
            return None

        user_data = login_response.json()
        user_id = user_data.get('user', {}).get('id')
        if not user_id:
            print("Could not get user ID from login response")
            return None

        print(f"Logged in as user {user_id}")

        # Register a test device token
        token_data = {
            'token': 'test_ios_token_12345',  # Fake token for testing
            'platform': 'ios'
        }

        token_response = requests.post(f'{API_BASE}/users/{user_id}/device-tokens', json=token_data)
        print(f"Device token registration: {token_response.status_code} - {token_response.text}")

        return user_id

    except Exception as e:
        print(f"Error during testing: {e}")
        return None

def test_push_notification(user_id):
    """Test sending a push notification"""
    try:
        # Create a test notification
        notification_data = {
            'type': 'test',
            'title': 'Test Push Notification',
            'message': 'This is a test push notification from the backend!',
            'user_id': user_id
        }

        response = requests.post(f'{API_BASE}/users/{user_id}/notifications', json=notification_data)
        print(f"Push notification creation: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"Error sending push notification: {e}")

if __name__ == '__main__':
    print("Testing device token registration and push notifications...")
    user_id = test_device_token_registration()
    if user_id:
        test_push_notification(user_id)