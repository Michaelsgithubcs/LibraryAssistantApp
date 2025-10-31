import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BookOpen, User, Calendar, Check, X } from "lucide-react";

interface BookRequest {
  id: number;
  book_title: string;
  book_author: string;
  user_name: string;
  user_email: string;
  requested_at: string;
  available_copies: number;
  book_id: number;
  user_id: number;
}

interface BookRequestsProps {
  user: { id: number; username: string; role: string };
}

export const BookRequests = ({ user }: BookRequestsProps) => {
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingRequest, setRejectingRequest] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('https://libraryassistantapp.onrender.com/api/admin/reservation-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
    setLoading(false);
  };

  const handleApprove = async (requestId: number) => {
    try {
      const response = await fetch(`https://libraryassistantapp.onrender.com/api/admin/reservation-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: user.id })
      });
      
      if (response.ok) {
        alert('Reservation approved and book issued!');
        fetchRequests();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to approve reservation');
      }
    } catch (error) {
      alert('Failed to approve reservation');
    }
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