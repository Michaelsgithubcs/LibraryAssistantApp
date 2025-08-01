import { useState } from "react";
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

export const LibraryChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your Library Assistant. I can help you find books, check availability, answer questions about library policies, and more. How can I assist you today?",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");

  const quickQuestions = [
    "How do I reserve a book?",
    "Show me the ebook store",
    "What are the library hours?",
    "How do I pay my fines?",
    "How to rate books?",
    "How to find books by genre?",
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

    // Simulate bot response
    setTimeout(() => {
      const botResponse = generateBotResponse(inputMessage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);

    setInputMessage("");
  };

  const generateBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes("ebook") || input.includes("store") || input.includes("digital")) {
      return "Our ebook store has a great collection! We have both free and paid ebooks across many categories like Fiction, Romance, Mystery, Sci-Fi, Poetry, and more. You can purchase books with Rands (ZAR), rate books, and read them instantly. Would you like me to show you some popular categories or help you find something specific?";
    }
    
    if (input.includes("reserve") || input.includes("book")) {
      return "To reserve a book, you can search for it in our catalog and click the 'Reserve' button. For ebooks, you can purchase and download them immediately! Reserved physical books will be held for you for 3 days once they become available. You'll receive a notification when your reserved book is ready for pickup.";
    }
    
    if (input.includes("hours") || input.includes("time")) {
      return "Our library is open:\n• Monday-Friday: 8:00 AM - 9:00 PM\n• Saturday: 9:00 AM - 6:00 PM\n• Sunday: 12:00 PM - 5:00 PM\n\nWe're closed on major holidays. Our ebook store is available 24/7 online!";
    }
    
    if (input.includes("borrow") || input.includes("how many")) {
      return "You can borrow up to:\n• Students: 5 books for 2 weeks\n• Faculty/Staff: 10 books for 4 weeks\n• Public members: 3 books for 2 weeks\n\nBooks can be renewed once if no one else has reserved them. Ebooks you purchase are yours to keep forever!";
    }
    
    if (input.includes("renew")) {
      return "You can renew your books online through your account, by calling us, or by visiting the library. Books can be renewed once for the same loan period, provided no one else has reserved them. You can also track your reading progress and mark books as completed.";
    }
    
    if (input.includes("fine") || input.includes("fee") || input.includes("pay")) {
      return "Late fees are:\n• Books: R2.50 per day\n• Magazines: R1.25 per day\n• DVDs: R5.00 per day\n\nMaximum fine per item is R50. You can pay fines online using the 'Pay Fine' button in your dashboard, at the library, or by phone. We accept various payment methods and all amounts are in South African Rands (ZAR).";
    }
    
    if (input.includes("genre") || input.includes("category")) {
      return "You can browse books by genre using our catalog filters. We have sections for Fiction, Non-fiction, Mystery, Romance, Science Fiction, Biography, History, Poetry, and more. Our ebook store also has the same categories with both free and paid options. Use the 'Advanced Search' option to filter by genre, author, or subject.";
    }
    
    if (input.includes("rate") || input.includes("rating") || input.includes("review")) {
      return "You can rate and review books in our ebook store! This helps other readers discover great books. You can give a 1-5 star rating and write a review. Your ratings and reviews are visible to other users.";
    }
    
    if (input.includes("chat") || input.includes("discuss")) {
      return "You can chat about specific books using our book discussion feature! When you're reading a book, click the chat button to discuss themes, characters, plot analysis, and get insights. It's a great way to enhance your reading experience.";
    }
    
    if (input.includes("hello") || input.includes("hi")) {
      return "Hello! I'm here to help you with any library-related questions. Feel free to ask about book searches, ebook store, library policies, hours, fines payment, or anything else you need assistance with.";
    }
    
    return "I understand you're asking about library services. I can help with physical books, our ebook store, fines payment, book discussions, ratings, and more. For specific issues you might want to speak with our librarians at the front desk. Is there anything else I can help clarify?";
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
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
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat with Library Assistant
              </CardTitle>
              <CardDescription>Ask questions about books, policies, or library services</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 pr-4 mb-4">
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