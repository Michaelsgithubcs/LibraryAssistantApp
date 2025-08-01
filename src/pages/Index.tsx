import { useState } from "react";
import { BookSearch } from "@/components/BookSearch";
import { EnhancedMemberManagement } from "@/components/EnhancedMemberManagement";
import { IssueReturn } from "@/components/IssueReturn";
import { FinesManagement } from "@/components/FinesManagement";
import { LibraryChatbot } from "@/components/LibraryChatbot";
import { AdminDashboard } from "@/components/AdminDashboard";
import { UserDashboard } from "@/components/UserDashboard";
import { Login } from "@/components/Login";
import { AdminBookUpload } from "@/components/AdminBookUpload";
import { EbookStore } from "@/components/EbookStore";
import { MyBooks } from "@/components/MyBooks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Users, CreditCard, MessageSquare, Settings, User, LogOut, ShoppingCart } from "lucide-react";

interface CurrentUser {
  id: number;
  username: string;
  role: string;
}

const Index = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case "books":
        return <BookSearch user={currentUser} />;
      case "mybooks":
        return currentUser.role === "user" ? <MyBooks user={currentUser} /> : null;
      case "ebooks":
        return currentUser.role === "user" ? <EbookStore user={currentUser} /> : null;
      case "upload":
        return currentUser.role === "admin" ? <AdminBookUpload /> : null;
      case "members":
        return currentUser.role === "admin" ? <EnhancedMemberManagement /> : null;
      case "issuing":
        return currentUser.role === "admin" ? <IssueReturn /> : null;
      case "fines":
        return <FinesManagement user={currentUser} />;
      case "chatbot":
        return <LibraryChatbot />;
      case "admin":
        return <AdminDashboard onNavigate={setCurrentView} user={currentUser} />;
      default:
        return currentUser.role === "admin" ? <AdminDashboard onNavigate={setCurrentView} user={currentUser} /> : <UserDashboard user={currentUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Library Management System</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {currentUser.username} ({currentUser.role})
            </span>
            <Button
              variant="outline"
              onClick={handleLogout}
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-card border-r min-h-screen p-4">
          <div className="space-y-2">
            <Button
              variant={currentView === "dashboard" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setCurrentView("dashboard")}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            {currentUser.role === "admin" && (
              <Button
                variant={currentView === "upload" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setCurrentView("upload")}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Add Books
              </Button>
            )}
            <Button
              variant={currentView === "books" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setCurrentView("books")}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Book Search
            </Button>
            {currentUser.role === "user" && (
              <Button
                variant={currentView === "mybooks" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setCurrentView("mybooks")}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                My Books
              </Button>
            )}

            {currentUser.role === "admin" && (
              <>
                <Button
                  variant={currentView === "members" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setCurrentView("members")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Member Management
                </Button>
                <Button
                  variant={currentView === "issuing" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setCurrentView("issuing")}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Issued Books
                </Button>
              </>
            )}
            <Button
              variant={currentView === "fines" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setCurrentView("fines")}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {currentUser.role === "admin" ? "Fines Management" : "My Fines"}
            </Button>
            {currentUser.role === "user" && (
              <Button
                variant={currentView === "chatbot" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setCurrentView("chatbot")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Library Assistant
              </Button>
            )}
            {currentUser.role === "user" && (
              <Button
                variant={currentView === "ebooks" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setCurrentView("ebooks")}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ebook Store
              </Button>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
