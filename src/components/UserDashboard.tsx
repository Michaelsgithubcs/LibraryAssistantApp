import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, AlertTriangle, Calendar, ShoppingCart, MessageCircle, CreditCard, BookMarked } from "lucide-react";
import { useState, useEffect } from "react";
import { BookChatbot } from "./BookChatbot";

interface UserDashboardProps {
  user: { id: number; username: string; role: string };
  activeTab?: string;
}

export const UserDashboard = ({ user, activeTab = "dashboard" }: UserDashboardProps) => {
  const [selectedBook, setSelectedBook] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);

  const [userStats, setUserStats] = useState({
    booksOverdue: 0,
    totalFines: 0,
    reservations: 0,
  });



  const [bookSuggestions, setBookSuggestions] = useState([]);

  useEffect(() => {
    fetchSuggestions();
    if (user.role === 'user') {
      fetchUserStats();
    }
  }, []);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/books');
      if (response.ok) {
        const data = await response.json();
        setBookSuggestions(data.slice(0, 2).map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          category: book.category,
          estimatedTime: book.reading_time_minutes
        })));
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const [overdueRes, finesRes, reservationsRes] = await Promise.all([
        fetch(`http://localhost:5001/api/user/${user.id}/overdue-books`),
        fetch(`http://localhost:5001/api/user/${user.id}/fines`),
        fetch(`http://localhost:5001/api/user/${user.id}/reservations`)
      ]);
      
      const overdueData = overdueRes.ok ? await overdueRes.json() : [];
      const finesData = finesRes.ok ? await finesRes.json() : [];
      const reservationsData = reservationsRes.ok ? await reservationsRes.json() : [];
      
      const totalFines = finesData.reduce((sum, fine) => sum + (fine.damageFine || 0) + (fine.overdueFine || 0), 0);
      
      setUserStats({
        booksOverdue: overdueData.length,
        totalFines: totalFines,
        reservations: reservationsData.length
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const reserveBook = async (bookId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/books/${bookId}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      
      if (response.ok) {
        alert('Book reserved successfully!');
      } else {
        alert('Failed to reserve book');
      }
    } catch (error) {
      console.error('Reserve error:', error);
      alert('Failed to reserve book');
    }
  };





  const openBookChat = (book) => {
    setSelectedBook(book);
    setShowChatbot(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">My Library Dashboard</h2>
        <p className="text-muted-foreground">Welcome back! Here's your library activity overview</p>
      </div>

      <div className="w-full">

        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Books</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{userStats.booksOverdue}</div>
                <p className="text-xs text-muted-foreground">Please return soon</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Fines</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">R{(userStats.totalFines || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Outstanding amount</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reservations</CardTitle>
                <BookMarked className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.reservations}</div>
                <p className="text-xs text-muted-foreground">Books on hold</p>
              </CardContent>
            </Card>
          </div>

          {user.role === 'user' && (
            <>
              {/* Book Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommended for You</CardTitle>
                  <CardDescription>Books you might enjoy based on your reading history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookSuggestions.map((book) => (
                      <div key={book.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-semibold">{book.title}</h4>
                          <p className="text-sm text-muted-foreground">{book.author}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{book.category}</Badge>
                            <span className="text-xs text-muted-foreground">{book.estimatedTime}min</span>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => reserveBook(book.id)}>Reserve</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {showChatbot && selectedBook && (
        <BookChatbot 
          book={selectedBook} 
          onClose={() => setShowChatbot(false)} 
        />
      )}
    </div>
  );
};