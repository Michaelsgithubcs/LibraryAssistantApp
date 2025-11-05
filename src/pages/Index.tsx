import React, { useState } from "react";
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
import { BookRequests } from "@/components/BookRequests";
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
  const [requestCount, setRequestCount] = useState(0);
  const [accountRequestCount, setAccountRequestCount] = useState(0);
  const [userReservationStatus, setUserReservationStatus] = useState({ hasApproved: false, hasRejected: false });

  // Fetch request count for admin
  const fetchRequestCount = async () => {
    if (currentUser?.role === 'admin') {
      try {
        const response = await fetch('https://libraryassistantapp.onrender.com/api/admin/reservation-requests/count');
        if (response.ok) {
          const data = await response.json();
          setRequestCount(data.count);
        }
      } catch (error) {
        console.error('Error fetching request count:', error);
      }
    }
  };

  // Fetch account request count for admin (pending member account requests)
  const fetchAccountRequestCount = async () => {
    if (currentUser?.role === 'admin') {
      try {
        const response = await fetch('https://libraryassistantapp.onrender.com/api/account-requests');
        console.debug('fetchAccountRequestCount status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.debug('fetchAccountRequestCount data length:', Array.isArray(data) ? data.length : 'not-array');
          setAccountRequestCount(Array.isArray(data) ? data.length : 0);
        } else {
          console.warn('fetchAccountRequestCount non-ok response', response.status);
        }
      } catch (error) {
        console.error('Error fetching account request count:', error);
      }
    }
  };

  // Fetch user reservation status
  const fetchUserReservationStatus = async () => {
    if (currentUser?.role === 'user') {
      try {
        const response = await fetch(`https://libraryassistantapp.onrender.com/api/user-reservations/${currentUser.id}`);
        if (response.ok) {
          const data = await response.json();
          const hasApproved = data.some((req: any) => req.status === 'approved');
          const hasRejected = data.some((req: any) => req.status === 'rejected');
          setUserReservationStatus({ hasApproved, hasRejected });
        }
      } catch (error) {
        console.error('Error fetching user reservations:', error);
      }
    }
  };

  React.useEffect(() => {
    fetchRequestCount();
    fetchAccountRequestCount();
    fetchUserReservationStatus();
    const interval = setInterval(() => {
      fetchRequestCount();
      fetchAccountRequestCount();
      fetchUserReservationStatus();
    }, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [currentUser]);

  // Refresh count when navigating to/from requests page
  React.useEffect(() => {
    if (currentView === 'requests') {
      fetchRequestCount();
    }
    if (currentView === 'mybooks' && currentUser?.role === 'user') {
      // Mark reservations as viewed
      fetch(`https://libraryassistantapp.onrender.com/api/user-reservations/${currentUser.id}/mark-viewed`, {
        method: 'POST'
      }).then(() => {
        setUserReservationStatus({ hasApproved: false, hasRejected: false });
      });
    }
  }, [currentView]);

  const handleLogin = (user: CurrentUser) => {
    if (user.role === 'user') {
      alert('This web interface is for administrators only. Please use the mobile app for user access.');
      return;
    }
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

      case "requests":
        return currentUser.role === "admin" ? <BookRequests user={currentUser} /> : null;
      case "upload":
        return currentUser.role === "admin" ? <AdminBookUpload /> : null;
      case "members":
        return currentUser.role === "admin" ? <EnhancedMemberManagement /> : null;
      case "issuing":
        return currentUser.role === "admin" ? <IssueReturn /> : null;
      case "fines":
        return <FinesManagement user={currentUser} />;

      case "admin":
        return <AdminDashboard onNavigate={setCurrentView} user={currentUser} />;
      default:
        return <AdminDashboard onNavigate={setCurrentView} user={currentUser} />;
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
            {currentUser.role === "admin" && (
              <Button
                variant={currentView === "requests" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setCurrentView("requests")}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Book Requests
                {requestCount > 0 && (
                  <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
                )}
              </Button>
            )}


            {currentUser.role === "admin" && (
              <>
                <div className="relative w-full">
                  <Button
                    variant={currentView === "members" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setCurrentView("members")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Member Management
                  </Button>
                  {accountRequestCount > 0 && (
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full"></span>
                  )}
                </div>
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
              Fines Management
            </Button>


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
