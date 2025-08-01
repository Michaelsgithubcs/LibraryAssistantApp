import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BookOpen, User, Calendar, Search, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IssuedBook {
  id: string;
  bookTitle: string;
  bookId: string;
  memberName: string;
  memberId: string;
  issueDate: string;
  dueDate: string;
  status: "issued" | "overdue" | "returned";
}

export const BookIssuing = () => {
  const [bookId, setBookId] = useState("");
  const [memberId, setMemberId] = useState("");
  const { toast } = useToast();
  
  const [issuedBooks] = useState<IssuedBook[]>([
    {
      id: "1",
      bookTitle: "The Great Gatsby",
      bookId: "B001",
      memberName: "John Doe",
      memberId: "M001",
      issueDate: "2024-01-15",
      dueDate: "2024-02-15",
      status: "issued",
    },
    {
      id: "2",
      bookTitle: "To Kill a Mockingbird",
      bookId: "B002",
      memberName: "Jane Smith",
      memberId: "M002",
      issueDate: "2024-01-10",
      dueDate: "2024-02-10",
      status: "overdue",
    },
    {
      id: "3",
      bookTitle: "1984",
      bookId: "B003",
      memberName: "Mike Johnson",
      memberId: "M003",
      issueDate: "2024-01-20",
      dueDate: "2024-02-20",
      status: "issued",
    },
  ]);

  const handleIssueBook = () => {
    if (!bookId || !memberId) {
      toast({
        title: "Missing Information",
        description: "Please enter both Book ID and Member ID",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Book Issued Successfully",
      description: `Book ${bookId} has been issued to member ${memberId}`,
    });
    setBookId("");
    setMemberId("");
  };

  const handleReturnBook = (bookTitle: string) => {
    toast({
      title: "Book Returned",
      description: `"${bookTitle}" has been returned successfully`,
    });
  };

  const getStatusColor = (status: IssuedBook["status"]) => {
    switch (status) {
      case "issued": return "default";
      case "overdue": return "destructive";
      case "returned": return "secondary";
      default: return "default";
    }
  };

  const getStatusIcon = (status: IssuedBook["status"]) => {
    switch (status) {
      case "issued": return <BookOpen className="h-4 w-4" />;
      case "overdue": return <AlertCircle className="h-4 w-4" />;
      case "returned": return <CheckCircle className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Book Issue & Return</h2>
        <p className="text-muted-foreground">Manage book issuance and returns</p>
      </div>

      {/* Issue New Book */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Issue New Book
          </CardTitle>
          <CardDescription>Issue a book to a library member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bookId">Book ID / ISBN</Label>
              <Input
                id="bookId"
                placeholder="Enter book ID or scan ISBN"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberId">Member ID</Label>
              <Input
                id="memberId"
                placeholder="Enter member ID"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleIssueBook} className="w-full">
                Issue Book
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Book Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="Search by title or ISBN..." />
              <Button variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Member Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="Search by name or member ID..." />
              <Button variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currently Issued Books */}
      <Card>
        <CardHeader>
          <CardTitle>Currently Issued Books</CardTitle>
          <CardDescription>Books that are currently checked out</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {issuedBooks.filter(book => book.status !== "returned").map((book) => (
              <div key={book.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(book.status)}
                    <div>
                      <h4 className="font-semibold">{book.bookTitle}</h4>
                      <p className="text-sm text-muted-foreground">Book ID: {book.bookId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground ml-7">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{book.memberName} ({book.memberId})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {book.dueDate}</span>
                    </div>
                    <Badge variant={getStatusColor(book.status)}>
                      {book.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={book.status === "returned"}
                  >
                    Renew
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleReturnBook(book.bookTitle)}
                    disabled={book.status === "returned"}
                  >
                    Return
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};