import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, AlertTriangle, Plus } from "lucide-react";
import { useState, useEffect } from "react";

interface AdminDashboardProps {
  onNavigate?: (view: string) => void;
  user: { id: number; username: string; role: string };
}

export const AdminDashboard = ({ onNavigate, user }: AdminDashboardProps) => {
  const [stats, setStats] = useState({
    totalBooks: 0,
    availableBooks: 0,
    activeMembers: 0,
    overdueBooks: 0,
    totalFines: 0,
    newMembers: 0,
  });
  const [recentBooks, setRecentBooks] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchRecentBooks();
  }, []);

  const fetchStats = async () => {
    try {
      const booksResponse = await fetch('http://localhost:5001/api/books');
      const books = await booksResponse.json();
      
      const membersResponse = await fetch('http://localhost:5001/api/admin/members');
      const members = membersResponse.ok ? await membersResponse.json() : [];
      
      const overdueResponse = await fetch('http://localhost:5001/api/admin/overdue-count');
      const overdueData = overdueResponse.ok ? await overdueResponse.json() : { count: 0 };
      
      const finesResponse = await fetch('http://localhost:5001/api/admin/fines-count');
      const finesData = finesResponse.ok ? await finesResponse.json() : { amount: 0 };
      
      const activeMembers = members.filter(m => m.status === 'active').length;
      
      setStats({
        totalBooks: books.length,
        availableBooks: books.filter(b => b.available_copies > 0).length,
        activeMembers: activeMembers,
        overdueBooks: overdueData.count,
        totalFines: finesData.amount,
        newMembers: 8
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalBooks: 0,
        availableBooks: 0,
        activeMembers: 3,
        overdueBooks: 23,
        newMembers: 8
      });
    }
  };

  const fetchRecentBooks = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/books');
      const books = await response.json();
      setRecentBooks(books.slice(0, 3));
    } catch (error) {
      console.error('Error fetching recent books:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h2>
        <p className="text-muted-foreground">Overview of library operations and statistics</p>
      </div>

      <div className="space-y-6">

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => onNavigate?.('books')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBooks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableBooks} available
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => onNavigate?.('members')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newMembers} new this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Overdue Books Alert */}
        <Card className="cursor-pointer hover:bg-muted/50 border-red-200" onClick={() => onNavigate?.('issuing')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Overdue Books Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 mb-2">{stats.overdueBooks}</div>
            <p className="text-sm text-muted-foreground">
              Books are overdue from all users. Click to view and manage overdue books.
            </p>
          </CardContent>
        </Card>

        {/* Total Fines */}
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => onNavigate?.('fines')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fines</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 mb-2">R{stats.totalFines.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">
              Outstanding amount from all users. Click to view and manage fines.
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Recent Book Uploads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Book Uploads</CardTitle>
          <CardDescription>Books you've recently added to the library</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentBooks.length > 0 ? (
              recentBooks.map((book) => (
                <div key={book.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{book.title}</h4>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-secondary px-2 py-1 rounded">{book.category}</span>
                      <span className="text-xs text-muted-foreground">
                        {book.is_free ? 'Free' : `R${book.price}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No books uploaded yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};