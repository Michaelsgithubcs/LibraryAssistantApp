import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, BookOpen, User, Calendar, Edit, Trash2, UserPlus, MessageCircle, CreditCard, AlertTriangle, Clock, Star } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { BookChatbot } from "./BookChatbot";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  availableCopies: number;
  totalCopies: number;
  publishDate: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface BookSearchProps {
  user: { id: number; username: string; role: string };
}

export const BookSearch = ({ user }: BookSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [issuingBook, setIssuingBook] = useState<Book | null>(null);
  const [selectedUser, setSelectedUser] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [overdueFee, setOverdueFee] = useState("");


  const categories = ["Fiction", "Non-Fiction", "Romance", "Mystery", "Sci-Fi", "Biography", "Poetry", "Fantasy", "Dystopian"];

  useEffect(() => {
    fetchBooks();
    if (user.role === 'admin') {
      fetchUsers();
    }
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/books');
      if (response.ok) {
        const data = await response.json();
        const formattedBooks = data.map(book => ({
          id: book.id.toString(),
          title: book.title,
          author: book.author,
          isbn: book.isbn || 'Auto-generated',
          category: book.category,
          description: book.description || '',
          availableCopies: book.available_copies,
          totalCopies: book.total_copies,
          publishDate: book.publish_date || ''
        }));
        setBooks(formattedBooks);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.isbn.includes(searchTerm)
  );

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const handleEditBook = async () => {
    if (!editingBook) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/admin/books/${editingBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingBook.title,
          author: editingBook.author,
          category: editingBook.category,
          description: editingBook.description,
          total_copies: editingBook.totalCopies,
          available_copies: editingBook.availableCopies,
          publish_date: editingBook.publishDate
        })
      });
      
      if (response.ok) {
        alert('Book updated successfully!');
        fetchBooks();
        setEditingBook(null);
      } else {
        alert('Failed to update book');
      }
    } catch (error) {
      console.error('Edit error:', error);
      alert('Failed to update book');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/admin/books/${bookId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('Book deleted successfully!');
        fetchBooks();
      } else {
        alert('Failed to delete book');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete book');
    }
  };

  const handleIssueBook = async () => {
    if (!issuingBook || !selectedUser || !dueDate) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/admin/books/${issuingBook.id}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: parseInt(selectedUser),
          due_date: dueDate,
          overdue_fee: parseFloat(overdueFee)
        })
      });
      
      if (response.ok) {
        alert('Book issued successfully!');
        fetchBooks();
        setIssuingBook(null);
        setSelectedUser("");
        setDueDate("");
        setOverdueFee("");
      } else {
        alert('Failed to issue book');
      }
    } catch (error) {
      console.error('Issue error:', error);
      alert('Failed to issue book');
    }
  };

  const reserveBook = async (bookId: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/books/${bookId}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(result.message || 'Reservation request sent!');
        fetchBooks();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to reserve book');
      }
    } catch (error) {
      console.error('Reserve error:', error);
      alert('Failed to reserve book');
    }
  };



  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Book Search</h2>
        <p className="text-muted-foreground">Search for physical library books by title, author, or ISBN</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Library Books
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredBooks.map((book) => (
          <Card key={book.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{book.title}</h3>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{book.author}</span>
                        <Calendar className="h-4 w-4 ml-2" />
                        <span>{book.publishDate ? new Date(book.publishDate).getFullYear() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-8">
                    <p className="text-sm text-muted-foreground">ISBN: {book.isbn}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="secondary">{book.category}</Badge>
                      <span className="text-sm">
                        Available: {book.availableCopies}/{book.totalCopies}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {user.role !== 'admin' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={book.availableCopies === 0}
                      onClick={() => reserveBook(book.id)}
                    >
                      Reserve
                    </Button>
                  )}
                  {user.role === 'admin' && (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setEditingBook(book)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Book</DialogTitle>
                          </DialogHeader>
                          {editingBook && (
                            <div className="space-y-4">
                              <div>
                                <Label>Title</Label>
                                <Input
                                  value={editingBook.title}
                                  onChange={(e) => setEditingBook({...editingBook, title: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label>Author</Label>
                                <Input
                                  value={editingBook.author}
                                  onChange={(e) => setEditingBook({...editingBook, author: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label>Category</Label>
                                <Select value={editingBook.category} onValueChange={(value) => setEditingBook({...editingBook, category: value})}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map((cat) => (
                                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Publish Date</Label>
                                <Input
                                  type="date"
                                  value={editingBook.publishDate}
                                  onChange={(e) => setEditingBook({...editingBook, publishDate: e.target.value})}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label>Total Copies</Label>
                                  <Input
                                    type="number"
                                    value={editingBook.totalCopies}
                                    onChange={(e) => setEditingBook({...editingBook, totalCopies: parseInt(e.target.value)})}
                                  />
                                </div>
                                <div>
                                  <Label>Available</Label>
                                  <Input
                                    type="number"
                                    value={editingBook.availableCopies}
                                    onChange={(e) => setEditingBook({...editingBook, availableCopies: parseInt(e.target.value)})}
                                  />
                                </div>
                              </div>
                              <Button onClick={handleEditBook} className="w-full">
                                Update Book
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteBook(book.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm"
                            disabled={book.availableCopies === 0}
                            onClick={() => setIssuingBook(book)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Issue Book: {issuingBook?.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Search and Select User</Label>
                              <Input
                                placeholder="Search by username or email..."
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                className="mb-2"
                              />
                              <Select value={selectedUser} onValueChange={setSelectedUser}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a user" />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredUsers.map((u) => (
                                    <SelectItem key={u.id} value={u.id.toString()}>
                                      {u.username} ({u.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Due Date</Label>
                              <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <Label>Overdue Fee (per day)</Label>
                              <Select value={overdueFee} onValueChange={setOverdueFee}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select daily overdue fee" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="5">R5 per day</SelectItem>
                                  <SelectItem value="10">R10 per day</SelectItem>
                                  <SelectItem value="15">R15 per day</SelectItem>
                                  <SelectItem value="20">R20 per day</SelectItem>
                                  <SelectItem value="25">R25 per day</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={handleIssueBook} className="w-full" disabled={!selectedUser || !dueDate || !overdueFee}>
                              Issue Book
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBooks.length === 0 && searchTerm && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No books found matching your search.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};