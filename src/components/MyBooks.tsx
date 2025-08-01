import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MessageCircle, Calendar } from "lucide-react";
import { BookChatbot } from "./BookChatbot";

interface MyBooksProps {
  user: { id: number; username: string; role: string };
}

export const MyBooks = ({ user }: MyBooksProps) => {
  const [myBooks, setMyBooks] = useState([]);
  const [reservationStatus, setReservationStatus] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);

  useEffect(() => {
    fetchMyBooks();
    fetchReservationStatus();
  }, []);

  const fetchMyBooks = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/user/${user.id}/issued-books`);
      if (response.ok) {
        const data = await response.json();
        setMyBooks(data);
      }
    } catch (error) {
      console.error('Error fetching my books:', error);
    }
  };

  const fetchReservationStatus = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/user/${user.id}/reservations`);
      if (response.ok) {
        const data = await response.json();
        setReservationStatus(data);
      }
    } catch (error) {
      console.error('Error fetching reservation status:', error);
    }
  };

  const calculateFinishTime = (estimatedMinutes: number, progress: number) => {
    const remainingMinutes = estimatedMinutes * (1 - progress / 100);
    const daysToFinish = Math.ceil(remainingMinutes / 120); // 2 hours = 120 minutes per day
    return daysToFinish;
  };

  const markAsRead = async (bookId: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/user/${user.id}/books/${bookId}/mark-read`, {
        method: 'POST'
      });
      if (response.ok) {
        alert('Book marked as read!');
        fetchMyBooks();
        fetchReservationStatus();
      }
    } catch (error) {
      console.error('Mark read error:', error);
    }
  };

  const openBookChat = (book) => {
    setSelectedBook(book);
    setShowChatbot(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">My Books</h2>
        <p className="text-muted-foreground">Books you have checked out - Progress powered by AI</p>
      </div>

      {/* Reservation Status */}
      {reservationStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reservation Status</CardTitle>
            <CardDescription>Updates on your book reservation requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reservationStatus.map((status) => (
                <div key={status.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    status.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="font-medium">{status.book_title} by {status.book_author}</p>
                    <p className={`text-sm ${
                      status.status === 'approved' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {status.status === 'approved' ? 'Approved - Book issued to you!' : `Rejected${status.rejection_reason ? ': ' + status.rejection_reason : ''}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Currently Reading</CardTitle>
          <CardDescription>Your issued books with AI-powered reading progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {myBooks.map((book) => {
              const daysToFinish = calculateFinishTime(book.reading_time_minutes || 180, book.reading_progress || 0);
              return (
                <div key={book.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{book.title}</h4>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Issued: {new Date(book.issue_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Due: {new Date(book.due_date).toLocaleDateString()}
                      </div>
                      <Badge variant={book.status === "overdue" ? "destructive" : "secondary"}>
                        {book.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{book.reading_time_minutes || 180}min read</span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs">Progress: {book.reading_progress || 0}% • {daysToFinish} days to finish</span>
                        <Badge variant="outline" className="text-xs">Powered by AI</Badge>
                      </div>
                      <Progress value={book.reading_progress || 0} className="h-2" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openBookChat(book)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                      {(book.reading_progress || 0) < 100 ? (
                        <Button 
                          size="sm"
                          onClick={() => markAsRead(book.id)}
                        >
                          Mark Read
                        </Button>
                      ) : (
                        <Badge variant="secondary">Completed</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {myBooks.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No books currently checked out.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {showChatbot && selectedBook && (
        <BookChatbot 
          book={selectedBook} 
          onClose={() => setShowChatbot(false)} 
        />
      )}
    </div>
  );
};