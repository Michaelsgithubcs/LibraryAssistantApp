# 📚 Library Assistant App - Intelligent Library Management System

A modern, AI-powered library management solution that transforms traditional libraries into smart, interactive learning hubs. Manage both physical and digital collections while providing an enriched reading experience through advanced AI features.

## 🌟 Key Features

### 📖 User Experience
- **Personalized Dashboard**: Track borrowed books, reading progress, and manage your library account in one place
- **Digital & Physical Collections**: Seamlessly browse and manage both ebook and physical book collections
- **Smart Categories**: Intuitive categorization including Fiction, Non-Fiction, Romance, Mystery, Sci-Fi, Poetry, and Biographyi
- **Reading Analytics**: Track reading habits, completion rates, and reading streaks
- **Community Engagement**: Rate books, write reviews, and see what others are reading

### 🤖 AI-Powered Book Assistant
#### 📚 Book Discussion AI
- **In-Depth Analysis**: Discuss themes, characters, and plot points with our AI
- **Chapter Summaries**: Get concise summaries of any chapter for quick refreshers
- **Character Insights**: Deep dive into character development and relationships
- **Thematic Exploration**: Analyze and discuss major themes and motifs
- **Reading Comprehension**: Get help understanding complex passages or concepts
- **Book Club Assistant**: Generate discussion questions and talking points for book clubs

#### 🧠 Smart Library Assistant
- **Natural Language Search**: Find books using conversational language
- **Reading Recommendations**: Get personalized suggestions based on your reading history
- **Research Helper**: Assist with academic research and source finding
- **Quick Answers**: Get instant responses to common library queries

### 👨‍💼 Administrative Tools
- **Comprehensive Book Management**: Full CRUD operations for all library materials
- **Member Services**: User management, membership tracking, and communication tools
- **Financial Management**: Handle fines, payments, and financial reporting
- **Circulation Desk**: Streamlined check-in/check-out system with barcode support
- **Advanced Analytics**: Gain insights into library usage, popular titles, and user engagement
    ### Admin view screenshots
    <img width="1470" height="956" alt="Screenshot 2025-08-25 at 10 50 20" src="https://github.com/user-attachments/assets/c66c64f5-97be-4cff-a64a-77e530ee4a83" />
    <img width="1470" height="956" alt="Screenshot 2025-08-25 at 10 50 30" src="https://github.com/user-attachments/assets/435644f4-3e9a-4184-b4bc-c429513c5d72" />


## 🛠 Technology Stack

### Frontend
- **React 18** with **TypeScript** for type-safe development
- **Vite** for lightning-fast development and building
- **Tailwind CSS** for responsive, utility-first styling
- **shadcn/ui** for beautiful, accessible components
- **React Query** for efficient data fetching and state management
- **Framer Motion** for smooth animations and transitions

### Backend
- **Python Flask** for the main API server
- **SQLAlchemy** as the ORM for database operations
- **PostgreSQL** for primary data storage
- **MongoDB** for flexible document storage where needed
- **JWT** for secure authentication
- **OpenAI API** for AI-powered features
- **Stripe** for secure payment processing
- **Google Books API** for book metadata and covers
- **ISBNdb** for book information and metadata

### Book Store API
- **RESTful endpoints** for book search and retrieval
- **Advanced search** with filters for genre, author, publication date, etc.
- **Inventory management** for both digital and physical books
- **User wishlist** and reading list functionality
- **Real-time availability** for physical copies

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- MongoDB instance
- OpenAI API key (for AI features)
- Stripe account (for payment processing)

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/learnly-library-aid.git

# Install dependencies
cd learnly-library-aid
npm install

# Set up environment variables
cp .env.example .env.local
# Edit the .env.local file with your configuration

# Start the development server
npm run dev
```

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
