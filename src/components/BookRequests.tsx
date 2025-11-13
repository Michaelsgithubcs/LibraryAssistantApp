import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User, Calendar, Check, Clock } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

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
      const response = await fetch(`${API_BASE_URL}/admin/checkouts`);
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
      const response = await fetch(`${API_BASE_URL}/admin/checkouts/${checkoutId}/complete`, {
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
          <p className="text-muted-foreground">Loading approved check outs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Check Out</h2>
          <p className="text-muted-foreground">Manage approved check outs waiting for pickup</p>
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