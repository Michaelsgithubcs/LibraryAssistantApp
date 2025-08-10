#!/usr/bin/env python3
"""
Library Management System Backend
Run this script to start the Flask server with SQLite database
"""

import os
import sys
from app import app, init_db

def main():
    print("🚀 Starting Library Management System Backend...")
    print("📚 Initializing database...")
    
    # Initialize database
    init_db()
    print("✅ Database initialized successfully!")
    
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