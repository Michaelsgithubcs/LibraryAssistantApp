# PythonAnywhere Deployment Guide

## Step 1: Open Bash Console
1. Login to PythonAnywhere
2. Go to "Consoles" tab
3. Click "Bash"

## Step 2: Clone Your Repository
```bash
git clone https://github.com/Michaelsgithubcs/LibraryAssistantApp.git
cd LibraryAssistantApp/backend
```

## Step 3: Create Virtual Environment
```bash
mkvirtualenv --python=/usr/bin/python3.11 libraryapp
pip install -r requirements.txt
```

## Step 4: Setup Web App
1. Go to "Web" tab
2. Click "Add a new web app"
3. Choose "Manual configuration"
4. Select "Python 3.11"

## Step 5: Configure WSGI File
Click on WSGI configuration file and replace content with:

```python
import sys
import os

# Add your project directory to the sys.path
project_home = '/home/YOUR_USERNAME/LibraryAssistantApp/backend'
if project_home not in sys.path:
    sys.path = [project_home] + sys.path

# Set environment variables
os.environ['GEMINI_API_KEY'] = 'AIzaSyChLLHZIavtONHKrjvqWXAniHunhN-1ZXE'

# Import Flask app
from app import app as application
```

## Step 6: Configure Virtual Environment
In Web tab:
- Virtualenv: `/home/YOUR_USERNAME/.virtualenvs/libraryapp`

## Step 7: Configure Static Files (Optional)
- URL: /static/
- Directory: /home/YOUR_USERNAME/LibraryAssistantApp/backend/static

## Step 8: Reload Web App
Click the green "Reload" button

## Step 9: Test Your App
Your app will be available at:
https://YOUR_USERNAME.pythonanywhere.com

## Important Notes:
- Replace YOUR_USERNAME with your actual PythonAnywhere username
- Database file (library.db) should be in the backend folder
- Check error logs if something fails: /var/log/YOUR_USERNAME.pythonanywhere.com.error.log
