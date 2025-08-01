import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, User, Calendar, AlertTriangle } from "lucide-react";

export const IssueReturn = () => {
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDamageDialog, setShowDamageDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [damageAmount, setDamageAmount] = useState("");
  const [damageDescription, setDamageDescription] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [bookSearch, setBookSearch] = useState("");

  useEffect(() => {
    fetchIssuedBooks();
  }, []);

  const fetchIssuedBooks = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/admin/issued-books');
      if (response.ok) {
        const data = await response.json();
        setIssuedBooks(data);
      }
    } catch (error) {
      console.error('Error fetching issued books:', error);
    }
    setLoading(false);
  };

  const markAsReturned = async (issueId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/admin/issues/${issueId}/return`, {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Book marked as returned successfully!');
        fetchIssuedBooks();
      } else {
        alert('Failed to mark as returned');
      }
    } catch (error) {
      alert('Failed to mark as returned');
    }
  };

  const reportDamage = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/admin/issues/${selectedIssue.id}/damage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          damage_amount: parseFloat(damageAmount),
          damage_description: damageDescription
        })
      });
      
      if (response.ok) {
        alert('Damage reported and fine added successfully!');
        setShowDamageDialog(false);
        setDamageAmount("");
        setDamageDescription("");
        fetchIssuedBooks();
      } else {
        alert('Failed to report damage');
      }
    } catch (error) {
      alert('Failed to report damage');
    }
  };

  const calculateDaysOverdue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const filteredBooks = issuedBooks.filter(issue =>
    issue.user_name.toLowerCase().includes(userSearch.toLowerCase()) &&
    issue.book_title.toLowerCase().includes(bookSearch.toLowerCase())
  );

  if (loading) {
    return <div className="p-4">Loading issued books...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Issued Books</h2>
        <p className="text-muted-foreground">Manage books currently issued to users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Issued Books</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Search by User</Label>
              <Input
                placeholder="Search by username..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            <div>
              <Label>Search by Book Title</Label>
              <Input
                placeholder="Search by book title..."
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currently Issued Books ({filteredBooks.length})</CardTitle>
          <CardDescription>Books that are currently borrowed by users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredBooks.map((issue) => {
              const daysOverdue = calculateDaysOverdue(issue.due_date);
              const isOverdue = daysOverdue > 0;
              
              return (
                <div key={issue.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-5 w-5 mt-1 text-primary" />
                      <div>
                        <h4 className="font-semibold">{issue.book_title}</h4>
                        <p className="text-sm text-muted-foreground">by {issue.book_author}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <User className="h-4 w-4" />
                          <span>{issue.user_name} ({issue.user_email})</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Issued: {new Date(issue.issue_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {new Date(issue.due_date).toLocaleDateString()}</span>
                          </div>
                          <Badge variant={isOverdue ? "destructive" : "secondary"}>
                            {isOverdue ? "overdue" : "issued"}
                          </Badge>
                          {isOverdue && (
                            <span className="text-xs text-red-600">
                              {daysOverdue} days overdue
                            </span>
                          )}
                          {issue.fine_amount > 0 && (
                            <Badge variant="destructive">
                              Fine: R{issue.fine_amount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedIssue(issue);
                        setShowDamageDialog(true);
                      }}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Report Damage
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => markAsReturned(issue.id)}
                    >
                      Mark Returned
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredBooks.length === 0 && issuedBooks.length > 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No books match your search</p>
            </div>
          )}
          {issuedBooks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No books currently issued</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Damage Report Dialog */}
      <Dialog open={showDamageDialog} onOpenChange={setShowDamageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Book Damage</DialogTitle>
            <DialogDescription>
              Report damage for "{selectedIssue?.book_title}" borrowed by {selectedIssue?.user_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Damage Description</label>
              <Input
                placeholder="Describe the damage..."
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Damage Fine Amount (ZAR)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter fine amount"
                value={damageAmount}
                onChange={(e) => setDamageAmount(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDamageDialog(false)}>
                Cancel
              </Button>
              <Button onClick={reportDamage} disabled={!damageAmount || !damageDescription}>
                Report Damage
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};