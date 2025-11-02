"""
WSGI configuration for PythonAnywhere deployment
Copy this content to your WSGI configuration file in PythonAnywhere
"""
import sys
import os

# IMPORTANT: Replace 'YOUR_USERNAME' with your actual PythonAnywhere username
project_home = '/home/YOUR_USERNAME/LibraryAssistantApp/backend'
if project_home not in sys.path:
    sys.path = [project_home] + sys.path

# Set environment variables
os.environ['GEMINI_API_KEY'] = 'AIzaSyChLLHZIavtONHKrjvqWXAniHunhN-1ZXE'

# Change to project directory
os.chdir(project_home)

# Import Flask app
from app import app as application
