# 📚 LibraryApp - Intelligent Library Management System

A modern, AI-powered library management solution that transforms traditional libraries into smart, interactive learning hubs. This mobile application allows users to manage both physical and digital collections while providing an enriched reading experience through advanced AI features and personalized recommendations.

<p align="center">
  <img src="https://github.com/user-attachments/assets/3e22da45-d368-4ae8-8fd9-7c3ffc48af73" alt="Dashboard" width="250"/>
  <img src="https://github.com/user-attachments/assets/6076e3a1-0b41-4801-8fc5-60e16cd9b5fd" alt="Book Details" width="250"/>
  <img src="https://github.com/user-attachments/assets/ed60ef0f-d0ba-4350-b044-c49bfa9b2767" alt="E-Book Store" width="250"/>
</p>

## 🌟 Key Features

### � User Experience
- **Personalized Dashboard**: Track borrowed books, due dates, reading progress, and manage your library account from one centralized interface
- **Digital & Physical Collections**: Seamlessly browse and manage both e-book and physical book collections
- **Smart Categories**: Intuitive categorization including Fiction, Non-Fiction, Romance, Mystery, Sci-Fi, Poetry, and Biography
- **Reading Analytics**: Track reading habits, completion rates, and reading streaks
- **Community Engagement**: Rate books, write reviews, and see what others in your community are reading



### 🤖 AI-Powered Features
- **Smart Recommendations**: Machine learning algorithms suggest books based on your reading history, preferences, and community trends
- **Library Assistant Chatbot**: Natural language processing chatbot that answers questions about library services, hours, book availability, and more
- **Content-Based Filtering**: Receive personalized book recommendations based on the content and themes of books you've previously enjoyed
- **Collaborative Filtering**: Discover books based on preferences of users with similar reading tastes and patterns


# Librant: AI-Powered Library Management System

  - Query params: `type` (ml, content, collaborative) and `limit` (number of results)

---

## 🏗️ Project Structure

```
LibraryAssistantApp/
├── backend/         # Python Flask backend, ML, DB
├── src/            # Admin web dashboard (Vite/React)
├── LibraryApp/     # React Native mobile app (Android/iOS)
├── public/         # Static assets for web
└── ...             # Docs, configs, deployment
```

---

## � Mobile App (React Native)
- User login, account request, and profile management
- Dashboard: borrowed books, due dates, reading stats, ML-powered recommendations
- Book search, e-book reading, borrowing/reservation, and fine management
- AI-powered chat assistant for library and book queries
- Push notifications for due dates, reservations, and events
- Built with: React Native, Redux, AsyncStorage, React Navigation

## 🖥️ Admin Web Dashboard (Vite/React)
- Manage books, members, reservations, and fines
- Approve/reject account requests and book reservations
- Real-time dashboard: overdue books, new members, requests, and stats
- ML recommendations and chatbot management
- Built with: React, shadcn/ui, Tailwind, lucide-react, Vite

## 🧠 Backend (Python/Flask)
- REST API for all app/web features
- SQLite database (easy to swap for Postgres)
- ML recommendation engine: content-based, collaborative, hybrid
- Google Generative AI integration for chatbots
- Smart notifications, fine/payment logic, and admin endpoints
- Deployable to Render with persistent disk

## 🤖 Machine Learning & AI
- Content-based filtering: TF-IDF + cosine similarity on book metadata
- Collaborative filtering: user borrowing/rating patterns
- Hybrid: weighted blend for robust recommendations
- Popularity fallback for new users
- Google Gemini/GPT for chat assistant

## 🔔 Notifications
- Push notifications (mobile): due dates, reservations, events
- In-app notification center (mobile)
- Admin web: real-time request indicators

## 🔒 Security & Privacy
- Secure login, password hashing, and session management
- Data encryption and privacy controls
- GDPR compliant

---

## 🚀 Quickstart

### 1. Clone & Install
```bash
git clone https://github.com/Michaelsgithubcs/LibraryAssistantApp.git
cd LibraryAssistantApp
# Mobile app deps
cd LibraryApp && npm install
# Backend deps
cd ../backend && pip install -r requirements.txt
```

### 2. Run Backend (Flask)
```bash
cd backend
python app.py
# or
python start.py
```
Backend runs at http://localhost:5000 (or on Render cloud)

### 3. Run Mobile App (React Native)
```bash
cd ../LibraryApp
npx react-native start
# In another terminal:
npx react-native run-android   # or run-ios
```

### 4. Run Admin Web (Vite/React)
```bash
cd ../
- `POST /api/ai/assistant` - General library assistance chatbot using Google Generative AI
npm run dev
# Visit http://localhost:8080
```

---

## 🗄️ Database Schema (SQLite)
- Users, books, book_issues, reading_progress, purchases, book_reservations, fines, notifications, ML features
- See `backend/schema.sql` for full schema

---

## 🔬 ML Recommendation System
- `/backend/ml_recommendation_service.py` and `/backend/recommendation_service.py`
- Content-based: TF-IDF on title/author/category/description
- Collaborative: user-book matrix, cosine similarity
- Hybrid: weighted blend, fallback to popularity
- Exposed via `/api/recommendations/<user_id>?type=ml|content|collaborative|hybrid`

---

## 🌐 API Overview
- Auth: `/api/auth/login`, `/api/auth/signup`, `/api/account-requests`
- Books: `/api/books`, `/api/categories`, `/api/books/<id>/rate`, `/api/books/<id>/purchase`, `/api/books/<id>/reserve`
- Recommendations: `/api/recommendations/<user_id>`
- Notifications: `/api/notifications`, push/in-app
- Admin: `/api/admin/members`, `/api/admin/books`, `/api/admin/overdue-count`, `/api/admin/reservation-requests`, `/api/account-requests`
- See backend/app.py for all endpoints

---

## ☁️ Deployment (Render)
- Use root `render.yaml` for one-click deploy with persistent disk
- Set `DATABASE_PATH=/var/data/library.db` for data persistence
- Diagnostics: `/api/admin/db-info` endpoint

---

## 🛠️ Tech Stack
- Mobile: React Native, Redux, AsyncStorage, React Navigation
- Web: React, Vite, shadcn/ui, Tailwind, lucide-react
- Backend: Python, Flask, SQLite, scikit-learn, pandas, numpy, Google Generative AI
- Notifications: react-native-push-notification, PushNotificationIOS

---

## 📂 Key Files & Directories
- `backend/app.py` — Flask API
- `backend/ml_recommendation_service.py` — ML engine
- `backend/schema.sql` — DB schema
- `src/` — Admin web dashboard
- `LibraryApp/` — Mobile app (Android/iOS)
- `LibraryApp/src/screens/` — Mobile screens (Dashboard, BookChat, Login, AccountRequest, etc.)
- `LibraryApp/src/services/api.ts` — Mobile API client
- `LibraryApp/src/store/` — Redux store

---

## 👥 Contributors
- Michael Ndlovu — Lead Developer

## 📧 Contact
For questions or support, email [mikendlovumx@gmail.com]

---

Made with ❤️ for modern libraries and book lovers everywhere.
- `POST /api/ai/book-assistant` - Book-specific assistance for discussions and study help

#### User & Authentication
- `POST /api/auth/login` - Authenticate user and receive session token
- `POST /api/auth/signup` - Create a new user account
- `GET /api/users` - Get user information (with authentication)

#### Library Management
- `GET /api/categories` - Get all book categories
- `GET /api/overdue-books` - List books that are overdue
- `POST /api/fines/<id>/pay` - Process payment for library fines

#### Administrative
- `GET /api/admin/overdue-count` - Get count of overdue books
- `POST /api/admin/books` - Add a new book to the library
- `PUT /api/admin/books/<id>` - Update book information
- `DELETE /api/admin/books/<id>` - Remove a book from the library
- `GET /api/admin/members` - List all library members
- `PUT /api/admin/members/<id>` - Update member information
- `POST /api/admin/members/<id>/suspend` - Suspend a member
- `POST /api/admin/members/<id>/unsuspend` - Reinstate a suspended member


### Admin Web Interface Screenshots
<img width="1470" height="956" alt="Screenshot 2025-08-25 at 10 50 20" src="https://github.com/user-attachments/assets/c66c64f5-97be-4cff-a64a-77e530ee4a83" />
<img width="1470" height="956" alt="Screenshot 2025-08-25 at 10 50 30" src="https://github.com/user-attachments/assets/435644f4-3e9a-4184-b4bc-c429513c5d72" />

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Python 3.8+ (for backend services)
- npm or yarn package manager
- iOS or Android development environment

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Michaelsgithubcs/LibraryAssistantApp.git
```

2. Install frontend dependencies:
```bash
cd LibraryAssistantApp/LibraryApp
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
pip install -r requirements.txt
```

4. Start the backend server:
```bash
python app.py
```

5. Run the mobile application:
```bash
cd ../LibraryApp
npx react-native run-ios  # For iOS
# OR
npx react-native run-android  # For Android
```

## ☁️ Deployment (Render) with Persistent Database

To ensure your notifications, reservations, and all data survive redeploys, deploy the backend with a persistent disk and point the app to it via `DATABASE_PATH`.

### One-click Blueprint
- Use the root `render.yaml` in this repository (at the project root, not the one under `backend/`). It:
  - Creates a Python web service
  - Installs backend requirements
  - Starts the Flask app
  - Attaches a persistent disk mounted at `/var/data`
  - Sets `DATABASE_PATH=/var/data/library.db`

On Render:
- New > Blueprint > Connect this repo > pick `render.yaml` (root)
- After deploy, open your service Logs and verify:
  - `[Startup] Using database at: /var/data/library.db`
  - `[Startup] Running on 0.0.0.0:<PORT>`

### Verify persistence
- Call the diagnostics endpoint on your deployed URL:
  - `GET /api/admin/db-info`
  - It returns the absolute database path, existence, size in bytes, and simple table counts. Example fields:
    - `database_path`: should be `/var/data/library.db`
    - `exists`: `true`
    - `size_bytes`: non-zero after first writes
    - `tables`: counts for `books`, `book_reservations`, `notifications`, `users`, etc.

If `database_path` points to a path inside the app folder (e.g., `/opt/render/.../backend/library.db`) instead of `/var/data/library.db`, your service isn’t using the persistent disk. Redeploy using the root `render.yaml` (or set the `DATABASE_PATH` env var and attach a disk manually in the Render UI).

Note: There are two `render.yaml` files in this repo. Prefer the one at the project root which includes the disk setup. The file under `backend/` is legacy and does not configure persistence.

### Optional: Restore or seed data
- If you have a backup (e.g., `backend/library_backup_*.db`) you want to use in production, replace `/var/data/library.db` with your backup file. You can do this via a one-off shell in the service or by a temporary deploy step.

## � Project Structure

```
LibraryAssistantApp/
├── src/
│   ├── components/
│   │   ├── AdminBookUpload.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── BookChatbot.tsx
│   │   ├── BookIssuing.tsx
│   │   ├── BookRequests.tsx
│   │   ├── BookSearch.tsx
│   │   ├── EbookStore.tsx
│   │   ├── EnhancedMemberManagement.tsx
│   │   ├── FinesManagement.tsx
│   │   ├── IssueReturn.tsx
│   │   ├── LibraryChatbot.tsx
│   │   ├── Login.tsx
│   │   ├── MemberManagement.tsx
│   │   ├── MyBooks.tsx
│   │   └── UserDashboard.tsx
│   ├── pages/
│   │   ├── Index.tsx
│   │   └── NotFound.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   └── lib/
│       ├── api.ts
│       └── utils.ts
├── backend/
│   ├── app.py                      # Main Flask application
│   ├── recommendation_service.py   # ML-based recommendation engine
│   ├── populate_db.py              # Database initialization script
│   ├── schema.sql                  # Database schema
│   └── requirements.txt            # Python dependencies
├── LibraryApp/                     # Mobile app (React Native)
│   ├── App.tsx                     # Main app component
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── context/                # React Context providers
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── screens/                # App screens
│   │   │   ├── BookChatScreen.tsx  # Book discussion AI
│   │   │   └── NotificationsScreen.tsx
│   │   ├── services/               # API services
│   │   └── store/                  # State management
│   ├── ios/                        # iOS-specific files
│   └── android/                    # Android-specific files
└── public/                         # Static assets
    ├── books.png
    ├── home.png
    ├── more.png
    ├── notifications.png
    └── store.png
```

## �📱 App Features in Detail

### Authentication
- Secure login/logout functionality
- User session management
- Profile settings and preferences

### Dashboard
- Overview of borrowed books with due dates
- Personalized book recommendations
- Reading statistics and progress

### Book Search
- Filter by title, author, genre, availability
- Advanced search with multiple criteria
- Book details including synopsis and availability

### My Books
- Currently borrowed books with due dates
- Reading history and past borrowings
- E-book access and reading progress

### Library Assistant
- AI-powered chat interface for library queries
- Information about library services and hours
- Book recommendations and availability checks

### E-Book Store
- Browse digital collection by category
- Preview and borrow e-books
- Reading interface with bookmarking capabilities

### Notifications
- Due date reminders
- Reservation alerts
- System announcements
- Custom notification preferences

### Fines Management
- View outstanding fines
- Payment history
- Fine calculation details

## � Future Enhancements

- **Reading Groups**: Create and join virtual reading clubs
- **Gamification**: Achievement badges and reading challenges
- **Advanced Analytics**: Deeper insights into reading habits and preferences
- **Multi-language Support**: Internationalization for global accessibility
- **Audiobook Integration**: Support for browsing and listening to audiobooks
- **AR Book Finder**: Use augmented reality to locate books within physical library spaces

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributors

- Michael Ndlovu - Lead Developer

## 📧 Contact

For questions or support, please email [mikendlovumx@gmail.com]

---

Made with ❤️ for modern libraries and book lovers everywhere
