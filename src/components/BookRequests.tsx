import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User, Calendar, Check, Clock } from "lucide-react";

interface Checkout {
  id: number;
  book_title: string;
  book_author: string;
  user_name: string;
  user_email: string;
  approved_at: string;
  checkout_deadline: string;
  book_id: number;
  user_id: number;
  reservation_id: number;
}

interface BookRequestsProps {
  user: { id: number; username: string; role: string };
}

export const BookRequests = ({ user }: BookRequestsProps) => {
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCheckouts();
  }, []);

  const fetchCheckouts = async () => {
    try {
      const response = await fetch('https://libraryassistantapp.onrender.com/api/admin/checkouts');
      if (response.ok) {
        const data = await response.json();
        setCheckouts(data);
      }
    } catch (error) {
      console.error('Error fetching checkouts:', error);
    }
    setLoading(false);
  };

  const handleCompleteCheckout = async (checkoutId: number) => {
    try {
      const response = await fetch(`https://libraryassistantapp.onrender.com/api/admin/checkouts/${checkoutId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ admin_id: user.id }),
      });

      if (response.ok) {
        // Refresh the checkouts list
        fetchCheckouts();
        alert('Checkout completed successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error completing checkout:', error);
      alert('Error completing checkout');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      return { text: 'Expired', urgent: true };
    } else if (diffDays > 0) {
      return { text: `${diffDays} day${diffDays > 1 ? 's' : ''} left`, urgent: false };
    } else {
      return { text: `${diffHours} hour${diffHours > 1 ? 's' : ''} left`, urgent: diffHours < 6 };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Check Out</h2>
          <p className="text-muted-foreground">Loading approved reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Check Out</h2>
        <p className="text-muted-foreground">Manage approved book reservations waiting for pickup</p>
      </div>

      <div className="grid gap-4">
        {checkouts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Checkouts</h3>
              <p className="text-muted-foreground text-center">
                All approved reservations have been processed or expired.
              </p>
            </CardContent>
          </Card>
        ) : (
          checkouts.map((checkout) => {
            const timeRemaining = getTimeRemaining(checkout.checkout_deadline);
            return (
              <Card key={checkout.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{checkout.book_title}</CardTitle>
                      <CardDescription className="text-base">by {checkout.book_author}</CardDescription>
                    </div>
                    <Badge variant={timeRemaining.urgent ? "destructive" : "secondary"} className="ml-4">
                      <Clock className="h-3 w-3 mr-1" />
                      {timeRemaining.text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{checkout.user_name}</p>
                        <p className="text-sm text-muted-foreground">{checkout.user_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Approved</p>
                        <p className="font-medium">{formatDate(checkout.approved_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCompleteCheckout(checkout.id)}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Complete Checkout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

  const handleReject = async () => {
    if (!rejectingRequest || !rejectionReason.trim()) return;
    
    try {
      const response = await fetch(`https://libraryassistantapp.onrender.com/api/admin/reservation-requests/${rejectingRequest}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      });
      
      if (response.ok) {
        alert('Reservation rejected');
        setRejectingRequest(null);
        setRejectionReason("");
        fetchRequests();
      } else {
        alert('Failed to reject reservation');
      }
    } catch (error) {
      alert('Failed to reject reservation');
    }
  };

  if (loading) {
    return <div className="p-4">Loading requests...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Book Requests</h2>
        <p className="text-muted-foreground">Manage user reservation requests</p>
      </div>

      <div className="grid gap-4">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{request.book_title}</h3>
                      <p className="text-muted-foreground">by {request.book_author}</p>
                    </div>
                  </div>
                  <div className="ml-8 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{request.user_name} ({request.user_email})</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Requested: {new Date(request.requested_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={request.available_copies > 0 ? "secondary" : "destructive"}>
                        {request.available_copies} copies available
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={request.available_copies === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setRejectingRequest(request.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Reservation Request</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Reason for rejection</Label>
                          <Textarea
                            placeholder="e.g., Book not available, damaged copy, etc."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => { setRejectingRequest(null); setRejectionReason(""); }}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}>
                            Reject Request
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {requests.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No pending reservation requests.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};