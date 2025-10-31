import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Bot, User } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: string;
}

interface LibraryChatbotProps {
  user?: { id: number; username: string; role: string };
}

export const LibraryChatbot = ({ user }: LibraryChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: `Hello${user ? ` ${user.username}` : ''}! I'm your Library Assistant. I can help you find books, check your account, answer questions about library policies, and more. How can I assist you today?`,
      sender: "bot",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [libraryData, setLibraryData] = useState({ books: [], userBooks: [], userFines: [] });
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchLibraryData();
    }
  }, [user]);

  const fetchLibraryData = async () => {
    try {
      const [booksRes, userBooksRes, finesRes] = await Promise.all([
        fetch('https://libraryassistantapp.onrender.com/api/books'),
        user ? fetch(`https://libraryassistantapp.onrender.com/api/user/${user.id}/issued-books`) : Promise.resolve({ ok: false }),
        user ? fetch(`https://libraryassistantapp.onrender.com/api/user/${user.id}/fines`) : Promise.resolve({ ok: false })
      ]);
      
      const books = booksRes.ok ? await booksRes.json() : [];
      const userBooks = userBooksRes.ok ? await userBooksRes.json() : [];
      const userFines = finesRes.ok ? await finesRes.json() : [];
      
      setLibraryData({ books, userBooks, userFines });
    } catch (error) {
      console.error('Error fetching library data:', error);
    }
  };

  const quickQuestions = user ? [
    "Show my issued books",
    "Check my fines",
    "Find books by author",
    "How do I reserve a book?",
    "What are the library hours?",
    "Show available books",
  ] : [
    "How do I reserve a book?",
    "What are the library hours?",
    "How to find books?",
    "Library policies",
    "Contact information",
    "How to register?",
  ];

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simulate bot response with typing effect
    setTimeout(() => {
      const botResponse = generateBotResponse(inputMessage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString(),
      };
      setIsTyping(false);
      setMessages(prev => [...prev, botMessage]);
      setTimeout(scrollToBottom, 100);
    }, 1500);

    setInputMessage("");
    setTimeout(scrollToBottom, 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const generateBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    // Personal account queries
    if (user && (input.includes("my books") || input.includes("issued books") || input.includes("show my"))) {
      if (libraryData.userBooks.length > 0) {
        const booksList = libraryData.userBooks.map(book => `• ${book.title} by ${book.author} (Due: ${new Date(book.due_date).toLocaleDateString()})`).join('\n');
        return `Here are your currently issued books:\n\n${booksList}\n\nYou can view reading progress and chat about these books in the 'My Books' section.`;
      }
      return "You don't have any books currently issued. Visit 'Book Search' to find and reserve books!";
    }
    
    if (user && (input.includes("my fines") || input.includes("check fines") || input.includes("owe"))) {
      if (libraryData.userFines.length > 0) {
        const totalFines = libraryData.userFines.reduce((sum, fine) => sum + (fine.damageFine || 0) + (fine.overdueFine || 0), 0);
        return `You have ${libraryData.userFines.length} outstanding fine(s) totaling R${totalFines.toFixed(2)}. Visit 'My Fines' to view details and pay. The library accepts cash payments.`;
      }
      return "Great news! You have no outstanding fines. Keep up the good work returning books on time!";
    }
    
    // Book search queries
    if (input.includes("find") || input.includes("search") || input.includes("author") || input.includes("available books")) {
      const availableBooks = libraryData.books.filter(book => book.available_copies > 0).slice(0, 5);
      if (availableBooks.length > 0) {
        const booksList = availableBooks.map(book => `• ${book.title} by ${book.author} (${book.available_copies} copies available)`).join('\n');
        return `Here are some available books:\n\n${booksList}\n\nWe have ${libraryData.books.length} total books in our collection. Use 'Book Search' to find specific titles or authors.`;
      }
      return "Use the 'Book Search' feature to find books by title, author, or ISBN. You can also browse by category!";
    }
    
    if (input.includes("ebook") || input.includes("store") || input.includes("digital")) {
      return "Our ebook store connects to Open Library with thousands of free books! You can find classics, literature, and more. All books are completely free to read or download. Visit the 'Ebook Store' to browse by category or search for specific titles.";
    }
    
    if (input.includes("reserve") || input.includes("how to reserve")) {
      return "To reserve a book:\n1. Go to 'Book Search'\n2. Find your desired book\n3. Click 'Reserve' if available\n4. The book will be issued to you immediately\n\nYou can track your books in 'My Books' section with AI-powered reading progress!";
    }
    
    if (input.includes("hours") || input.includes("time") || input.includes("open")) {
      return "Library Hours:\n• Monday-Friday: 8:00 AM - 9:00 PM\n• Saturday: 9:00 AM - 6:00 PM\n• Sunday: 12:00 PM - 5:00 PM\n\nClosed on major holidays. Online services (Ebook Store, account management) are available 24/7!";
    }
    
    if (input.includes("fine") || input.includes("fee") || input.includes("pay")) {
      return "Library Fines:\n• Overdue books: Varies by issue (set when book is issued)\n• Damage fines: Based on damage assessment\n\nPayment: The library only accepts cash payments. Visit 'My Fines' to see your outstanding amounts and pay at the library desk.";
    }
    
    if (input.includes("policy") || input.includes("rules")) {
      return "Key Library Policies:\n• Return books by due date to avoid fines\n• Maximum renewal: Once per book\n• Report damage immediately\n• Respect other users and library property\n• No food or drinks near books\n\nFor complete policies, ask our librarians at the front desk.";
    }
    
    if (input.includes("register") || input.includes("sign up") || input.includes("account")) {
      return "To register for a library account:\n1. Visit the library with valid ID\n2. Fill out membership form\n3. Provide contact information\n4. Receive your library credentials\n\nOnce registered, you can access all digital services and borrow physical books!";
    }
    
    if (input.includes("hello") || input.includes("hi")) {
      return `Hello${user ? ` ${user.username}` : ''}! I'm here to help with your library needs. I can check your account, help find books, explain policies, and more. What would you like to know?`;
    }
    
    return "I can help you with:\n• Checking your issued books and fines\n• Finding and reserving books\n• Library hours and policies\n• Ebook store information\n• Account management\n\nWhat specific information do you need?";
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    
    // Auto-send the question
    const userMessage: Message = {
      id: Date.now().toString(),
      content: question,
      sender: "user",
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setTimeout(scrollToBottom, 100);

    // Simulate bot response with typing effect
    setTimeout(() => {
      const botResponse = generateBotResponse(question);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString(),
      };
      setIsTyping(false);
      setMessages(prev => [...prev, botMessage]);
      setTimeout(scrollToBottom, 100);
    }, 1500);

    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Library Assistant</h2>
        <p className="text-muted-foreground">Get instant help with library services and book recommendations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat with Library Assistant
              </CardTitle>
              <CardDescription>
                {user ? `Personalized help for ${user.username} - Ask about your books, fines, or library services` : 'Ask questions about books, policies, or library services'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 pr-4 mb-4 h-0" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {message.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={`p-3 rounded-lg ${
                          message.sender === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-secondary text-secondary-foreground'
                        }`}>
                          <p className="whitespace-pre-line">{message.content}</p>
                          <p className={`text-xs mt-1 opacity-70`}>
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex gap-3 max-w-[80%]">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Input
                  placeholder="Type your question here..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Questions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Questions</CardTitle>
              <CardDescription>Click on any question to get instant answers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-3 whitespace-normal"
                    onClick={() => handleQuickQuestion(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Contact Library</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">(555) 123-4567</p>
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">help@library.edu</p>
              </div>
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">123 Library St, City, State 12345</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};