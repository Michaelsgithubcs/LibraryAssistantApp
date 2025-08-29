# 📚 Library Assistant App - Intelligent Library Management System

A modern, comprehensive library management solution that transforms traditional libraries into smart, interactive learning hubs. This cross-platform mobile application built with React Native provides a seamless experience for both library users and administrators, featuring AI-powered recommendations, intelligent library assistance, and robust book management tools.

## 📱 App Features

### 📖 User Experience
- **Personalized Dashboard**: Track borrowed books, reading history, and manage your library account
- **Book Discovery**: Browse books by categories, authors, or through advanced search filters
- **Notifications System**: Get timely alerts about due dates, new arrivals, and library events
- **Digital & Physical Collections**: Access both ebooks and physical book information
- **Book Checkout & Return**: Manage your borrowed books with easy check-in and check-out functionality
- **Fines Management**: View, track, and pay outstanding fines

### 🧠 Machine Learning Recommendations
- **Hybrid Recommendation System**: Combines collaborative and content-based filtering techniques for superior book recommendations
- **Personalized Suggestions**: Recommends books based on your reading history, preferences, and behavior
- **Content-Based Analysis**: Analyzes book features like genre, author style, and themes to find similar books
- **Collaborative Filtering**: Identifies patterns among similar users to recommend books you might enjoy
- **TF-IDF Vectorization**: Employs advanced text analysis to understand book content and match preferences
- **Weighted Scoring**: Balances different recommendation factors for the most relevant suggestions

### 🤖 Library Assistant Chatbot
- **Natural Language Interface**: Conversational AI that understands and responds to library-related queries
- **24/7 Library Help**: Get instant answers about library policies, hours, book availability, and more
- **Library Services Information**: Learn about renewals, reservations, fines, and account management
- **Book Recommendations**: Request personalized book suggestions directly from the assistant
- **Quick Account Information**: Check your borrowed books, reservations, and membership status
- **Contextual Awareness**: The assistant remembers conversation context for more natural interactions

### 📚 Book Management
- **Personal Reading List**: Track books you're currently reading or want to read
- **Reading History**: View your complete borrowing history
- **Book Details**: Access comprehensive information including summaries, author details, and availability
- **Reservation System**: Place and manage holds on books that are currently checked out
- **Reading Progress**: Track your reading journey through the app

## 🛠️ Technical Architecture

### 📱 Mobile Application (React Native)
- **Cross-Platform**: Works seamlessly on both iOS and Android devices
- **Redux State Management**: Centralized state management for predictable app behavior
- **Navigation**: Intuitive tab-based and stack navigation with React Navigation
- **Offline Support**: Core functionality available even without an internet connection
- **Custom UI Components**: Reusable, accessible components for consistent user experience
- **Push Notifications**: Real-time alerts for important library updates

### ⚙️ Backend (Flask/Python)
- **RESTful API**: Structured endpoints for all library operations
- **SQLite Database**: Efficient data storage for library resources
- **Authentication**: Secure JWT-based authentication system
- **Machine Learning Pipeline**: Sophisticated book recommendation engine using scikit-learn
- **Data Analysis**: Tools for analyzing library usage patterns and book popularity

### 🤖 Machine Learning Recommendation System
- **TF-IDF Vectorization**: Converts book features into numerical representations
- **Cosine Similarity**: Measures similarity between books for content-based recommendations
- **User-Based Collaborative Filtering**: Identifies similar users and their preferred books
- **Hybrid Approach**: Combines multiple recommendation techniques with weighted scoring
- **Continuous Learning**: System improves as more user interaction data becomes available

## 📋 Key Components

### 💻 User Interface
- **Home Dashboard**: Overview of user's library activity and recommended books
- **Book Search**: Advanced search functionality with filters
- **My Books**: Track borrowed, reserved, and reading list books
- **Notifications**: In-app notification center with real-time updates
- **Chatbot Interface**: Conversational UI for the Library Assistant feature
- **Store**: Browse and discover new books to reserve or check out
- **Account Management**: Profile settings, preferences, and account details

### 🔐 User Authentication
- **Secure Login/Logout**: Protected access to personal library accounts
- **Session Management**: Persistent sessions with secure token storage
- **Role-Based Access**: Different permissions for users and administrators

### 📊 Data Management
- **Book Catalog**: Comprehensive database of all library holdings
- **User Profiles**: Personalized user data and preferences
- **Borrowing Records**: Complete history of book checkouts and returns
- **Notification System**: Infrastructure for timely alerts and reminders

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14.0+)
- React Native environment setup
- Python 3.8+ (for backend)
- SQLite

### Frontend Setup
```bash
# Clone the repository
git clone https://github.com/Michaelsgithubcs/LibraryAssistantApp.git

# Navigate to the React Native app directory
cd LibraryAssistantApp/LibraryApp

# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

### Backend Setup
```bash
# Navigate to backend directory
cd LibraryAssistantApp/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize the database
python reset_db.py

# Start the server
python app.py
```

## 📌 Usage Guide

### User Flow
1. **Login/Register**: Access your library account or create a new one
2. **Browse Books**: Explore the library catalog by category, popularity, or recommendations
3. **Check Out Books**: Reserve or borrow available books
4. **Manage Account**: Track borrowed books, fines, and notifications
5. **Library Assistant**: Chat with the AI assistant for help with any library-related questions

### Admin Flow
1. **Manage Books**: Add, edit, or remove books from the catalog
2. **User Management**: View and manage library member accounts
3. **Process Checkouts/Returns**: Handle book circulation
4. **Manage Fines**: Assess and collect overdue fines
5. **Analytics**: Access usage statistics and reports

## 🧪 Machine Learning Recommendation System Details

The app features a sophisticated hybrid recommendation system that combines two powerful approaches:

### Content-Based Filtering
- Analyzes book features (title, author, category, description)
- Uses TF-IDF vectorization to convert text features into numerical form
- Calculates cosine similarity between books to find similar content
- Recommends books with similar characteristics to those you've enjoyed

### Collaborative Filtering
- Identifies users with similar reading preferences
- Analyzes patterns in borrowing and rating behavior
- Finds books that similar users have enjoyed but you haven't read yet
- Prioritizes highly rated books from similar reading profiles

### Hybrid Integration
- Combines recommendations from both approaches with weighted scoring
- Content-based filtering (40%): Focuses on book feature similarity
- Collaborative filtering (60%): Emphasizes social proof and user preferences
- Produces final recommendations ranked by combined relevance score

This dual approach overcomes the limitations of each individual method, addressing both the "cold start" problem for new users and providing more diverse, serendipitous recommendations.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- **Michael Ndlovu** - Full Stack Developer & Project Lead
- Contributors welcome!

## 📞 Contact

For questions or support, please contact us at [library.assistant.app@example.com](mailto:library.assistant.app@example.com)

## 📚 AI Features in Depth

### Book Discussion AI
Our advanced AI assistant allows readers to engage in meaningful discussions about any book in the library. Whether you're looking for help understanding complex themes, analyzing character development, or exploring alternative interpretations, the AI is ready to help.

**Example Interactions:**
- "Analyze the character development of the protagonist in Chapter 5"
- "What are the main themes in this book and how are they developed?"
- "Compare and contrast the main characters in this novel"
- "Explain the significance of the ending in the context of the story"

### Smart Recommendations
Our recommendation engine uses machine learning to suggest books based on:
- Your reading history and ratings
- Similar users' preferences
- Current reading trends
- Thematic similarities between books

## 🤝 Contributing
We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments
- All the amazing open-source contributors
- The React and Vite communities
- OpenAI for their powerful language models

### Backend
- **Python Flask** REST API
- **SQLite** database (XAMPP compatible)
- **Flask-CORS** for cross-origin requests
- **JWT Authentication** (ready for implementation)

## 🚀 Quick Start

### Frontend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**: `http://localhost:5173`

### Backend Setup

1. **Navigate to backend**:
   ```bash
   cd backend
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start backend server**:
   ```bash
   python start.py
   ```

4. **Backend available at**: `http://localhost:5000`

## 📱 User Interface

### Dashboard Tabs
1. **Dashboard**: Overview, stats, and book suggestions
2. **Ebook Store**: Browse and purchase digital books
3. **My Reading**: Track current books and reading progress

### Key Components
- **UserDashboard**: Main user interface with tabs
- **EbookStore**: Digital book marketplace
- **BookChatbot**: AI-powered book discussion
- **LibraryChatbot**: General library assistant
- **FinesManagement**: Handle library fines
- **AdminDashboard**: Administrative controls

## 💰 Pricing & Currency

- **Currency**: South African Rands (ZAR)
- **Free Books**: Available for immediate download
- **Paid Books**: Range from R15.50 to R25.99
- **Fine Rates**: R2.50 per day for books

## 🗄 Database Schema

### Core Tables
- `users`: User accounts and profiles
- `books`: Physical and digital book catalog
- `book_ratings`: User ratings and reviews
- `book_issues`: Borrowing records and due dates
- `reading_progress`: Reading completion tracking
- `purchases`: Ebook purchase history

## 🔧 Development

### Adding New Features
1. **Frontend**: Add components in `src/components/`
2. **Backend**: Add routes in `backend/app.py`
3. **Database**: Update schema in `init_db()` function

### API Endpoints
- `GET /api/books` - Retrieve books with filters
- `POST /api/books/<id>/rate` - Rate a book
- `POST /api/books/<id>/purchase` - Purchase ebook
- `POST /api/reading-progress` - Update reading progress
- `POST /api/fines/<id>/pay` - Pay library fine

## 📦 Project Structure

```
learnly-library-aid-main/
├── src/
│   ├── components/
│   │   ├── UserDashboard.tsx
│   │   ├── EbookStore.tsx
│   │   ├── BookChatbot.tsx
│   │   ├── LibraryChatbot.tsx
│   │   ├── FinesManagement.tsx
│   │   └── AdminDashboard.tsx
│   ├── pages/
│   └── lib/
├── backend/
│   ├── app.py
│   ├── start.py
│   ├── requirements.txt
│   └── README.md
├── public/
│   ├── books.png
│   ├── home.png
│   ├── more.png
│   ├── notifications.png
│   └── store.png
├── LibraryApp/   # 📱 New: Mobile app (React Native)
│   ├── App.tsx
│   └── src/
│       └── screens/
│           ├── BookChatScreen.tsx
│           └── NotificationsScreen.tsx
└── ...
```

- `LibraryApp/` contains the React Native mobile app implementation.
- `public/` now contains new image assets for UI enhancements.

## 🎯 Usage Examples

### For Students/Users
1. **Browse Books**: Use categories or search functionality
2. **Purchase Ebooks**: Buy digital books with ZAR currency
3. **Track Reading**: Monitor progress and mark completion
4. **Discuss Books**: Use AI chatbot for book discussions
5. **Pay Fines**: Handle overdue book penalties online

### For Librarians/Admins
1. **Manage Inventory**: Add/edit books and ebooks
2. **Handle Fines**: Process payments and waivers
3. **User Management**: Manage member accounts
4. **Analytics**: View library usage statistics

## 📱 Mobile Application

A new **React Native mobile app** is now included in the `LibraryApp/` directory. This app provides:
- Mobile access to library resources
- Book search and chat features (see `BookChatScreen.tsx`)
- Notifications for due dates and library events (see `NotificationsScreen.tsx`)
- Seamless integration with the backend API

### Mobile App Setup

1. Navigate to the mobile app directory:
   ```bash
   cd LibraryApp
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Run the app (for iOS or Android):
   ```bash
   npx expo start
   ```

See the `LibraryApp/` README for additional configuration.

## 🔮 Future Enhancements

- **Advanced Search**: AI-powered book recommendations
- **Social Features**: Book clubs and reading groups
- **Integration**: Connect with external book APIs
- **Notifications**: Email/SMS alerts for due dates
- **Multi-language**: Support for multiple languages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation in `/backend/README.md`
- Review component code for implementation details
- Contact the development team

---

**Built with ❤️ for modern library management**
