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

### � Library Management
- **Book Search & Discovery**: Advanced search functionality with filters for genre, author, publication date, and availability
- **Reservation System**: Reserve books that are currently checked out and receive notifications when they become available
- **E-Book Integration**: Seamlessly browse, borrow, and read e-books directly within the application
- **Borrowing History**: View your complete borrowing history and currently checked out items
- **Fine Management**: Track and pay overdue fines directly through the application

### 🔔 Smart Notifications
- **Due Date Reminders**: Receive timely notifications about upcoming book due dates
- **Reservation Alerts**: Get notified when reserved books become available for checkout
- **New Arrivals**: Custom alerts about new books that match your reading preferences
- **Event Notifications**: Stay informed about library events, reading clubs, and author visits

## 🧠 Machine Learning Recommendations System

The LibraryApp features a sophisticated recommendation engine powered by multiple machine learning approaches implemented in `recommendation_service.py`:

### Content-Based Filtering
- Analyzes book metadata including titles, authors, genres, and descriptions
- Utilizes TF-IDF (Term Frequency-Inverse Document Frequency) vectorization from scikit-learn to identify thematic similarities
- Creates feature vectors from combined book metadata (title, author, category, description)
- Calculates cosine similarity between book vectors to find content similarities
- Recommends books with similar content features to those you've previously enjoyed
- Particularly effective for users with specific genre preferences or niche interests

### Collaborative Filtering
- User-based approach identifies readers with similar borrowing and rating patterns
- Calculates similarity between users based on their rating patterns
- Finds books that similar users rated highly (≥4) but the target user hasn't read
- Weighs recommendations by both similarity scores and rating values
- Handles sparse data gracefully when users have few common books
- Only recommends books with high ratings from similar users to ensure quality

### Hybrid Recommendation Approach
- Combines both content-based and collaborative filtering techniques for more robust recommendations
- Employs a weighted algorithm (60% collaborative, 40% content-based) to balance between approaches
- Returns detailed book information along with recommendation scores
- Prioritizes books that score highly across both recommendation methods
- Includes fallback mechanisms when either approach has insufficient data
- Returns book details including availability, enabling practical recommendation implementation

## � Security & Privacy

- **User Authentication**: Secure login using email/password with optional biometric authentication
- **Data Encryption**: All sensitive user data and borrowing history is encrypted
- **Privacy Controls**: Users can opt in/out of recommendation features and data collection
- **GDPR Compliant**: Conforms to international data protection standards

## 📱 App Structure

### User Flows
- **Authentication**: Login, signup, password recovery
- **Discovery**: Browse collections, search for books, explore recommendations
- **Management**: Reserve, borrow, return, and renew books
- **E-Reading**: Access and read e-books within the app
- **Settings**: Configure notification preferences, privacy settings, and account details

### Screens
- **Dashboard**: Overview of current borrows, due dates, and personalized recommendations
- **Book Search**: Find books by title, author, genre, or availability
- **My Books**: Track borrowed books and reading progress
- **E-Book Store**: Browse and access digital book collection
- **Notifications**: View all system notifications and alerts
- **Library Assistant**: Chat interface for library-related queries
- **More**: Access to settings, profile, fines management, and additional features

## � Mobile App Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/3e22da45-d368-4ae8-8fd9-7c3ffc48af73" alt="Dashboard" width="250"/>
  <img src="https://github.com/user-attachments/assets/6076e3a1-0b41-4801-8fc5-60e16cd9b5fd" alt="Book Details" width="250"/>
  <img src="https://github.com/user-attachments/assets/ed60ef0f-d0ba-4350-b044-c49bfa9b2767" alt="E-Book Store" width="250"/>
</p>

## �️ Technology Stack

### Frontend (Mobile App)
- **React Native**: Cross-platform mobile application framework
- **Redux**: State management across the application
- **AsyncStorage**: Local data persistence
- **React Navigation**: Navigation management between screens

### Backend
- **Python**: Backend service implementation
- **Flask**: REST API framework for communication between app and server
- **SQLite**: Local database for book and user information
- **scikit-learn**: Machine learning library for recommendation algorithms
- **Google Generative AI**: Integration for chatbot functionality

### API Endpoints

#### Books & Reading
- `GET /api/books` - Retrieve books with optional filters for title, author, category
- `POST /api/books/<id>/rate` - Submit a rating and optional review for a book
- `POST /api/books/<id>/purchase` - Record an e-book purchase
- `POST /api/books/<id>/reserve` - Reserve a physical book for borrowing
- `POST /api/reading-progress` - Update a user's reading progress on a book

#### AI & Recommendations
- `GET /api/recommendations/<user_id>` - Get personalized book recommendations using ML algorithms
  - Query params: `type` (ml, content, collaborative) and `limit` (number of results)
- `POST /api/ai/assistant` - General library assistance chatbot using Google Generative AI
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

## 📱 App Features in Detail

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

For questions or support, please email [support@libraryapp.com](mailto:support@libraryapp.com)

---

Made with ❤️ for modern libraries and book lovers everywhere
