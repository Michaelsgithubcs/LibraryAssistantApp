#!/usr/bin/env python3
"""
Library Management System Backend
Run this script to start the Flask server with SQLite database
"""

import os
import sys
import subprocess
from app import app, init_db

def main():
    print("🚀 Starting Library Management System Backend...")
    print("📚 Initializing database...")
    
    # Initialize database
    init_db()
    print("✅ Database initialized successfully!")
    
    # Initialize ML recommendation system
    print("\n🧠 Initializing ML recommendation system...")
    init_ml_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "init_ml_recommendations.py")
    try:
        result = subprocess.run(["python3", init_ml_script], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ ML recommendation system initialized successfully!")
        else:
            print(f"⚠️  ML recommendation system initialization warning: {result.stderr}")
            print("⚠️  Continuing with basic recommendations only.")
    except Exception as e:
        print(f"⚠️  Error initializing ML recommendation system: {e}")
        print("⚠️  Continuing with basic recommendations only.")
    
    print("🌐 Starting Flask server...")
    print("📍 Server will be available at: http://localhost:5000 or 5001")
    print("🔗 API endpoints:")
    print("   - GET  /api/books - Get all books")
    print("   - GET  /api/categories - Get book categories")
    print("   - POST /api/books/<id>/rate - Rate a book")
    print("   - POST /api/books/<id>/purchase - Purchase a book")
    print("   - POST /api/reading-progress - Update reading progress")
    print("   - POST /api/fines/<id>/pay - Pay a fine")
    print("\n💡 Make sure XAMPP is running for full database functionality")
    print("🛑 Press Ctrl+C to stop the server\n")
    
    try:
        print("⚠️  Port 5000 is in use. Starting on port 5001...")
        app.run(debug=True, host='0.0.0.0', port=5001)
    except OSError as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()