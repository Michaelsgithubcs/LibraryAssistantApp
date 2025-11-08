import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, User, Calendar, Clock } from "lucide-react";

interface Fine {
  id: string;
  memberName: string;
  memberEmail: string;
  bookTitle: string;
  bookAuthor: string;
  damageFine: number;
  overdueFine: number;
  damageDescription: string;
  issueDate: string;
  dueDate: string;
  status: string;
}

interface FinesManagementProps {
  user: { id: number; username: string; role: string };
}

export const FinesManagement = ({ user }: FinesManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [fines, setFines] = useState<Fine[]>([]);
  const [paidFines, setPaidFines] = useState<any[]>([]);
  const [overdueTotal, setOverdueTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentFineId, setPaymentFineId] = useState<string | null>(null);
  const [paymentFineType, setPaymentFineType] = useState<'damage' | 'overdue' | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  
  useEffect(() => {
    fetchFines();
    fetchPaidFines();
    fetchFinesSummary();
  }, [user.id, user.role]);

  const fetchFines = async () => {
    try {
      const endpoint = user.role === 'admin' 
        ? 'https://libraryassistantapp.onrender.com/api/admin/fines'
        : `https://libraryassistantapp.onrender.com/api/user/${user.id}/fines`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setFines(data);
      }
    } catch (error) {
      console.error('Error fetching fines:', error);
    }
    setLoading(false);
  };

  const fetchPaidFines = async () => {
    try {
      const endpoint = user.role === 'admin'
        ? 'https://libraryassistantapp.onrender.com/api/admin/fines/paid'
        : `https://libraryassistantapp.onrender.com/api/user/${user.id}/fines/paid`;

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setPaidFines(data);
      }
    } catch (error) {
      console.error('Error fetching paid fines:', error);
    }
  };

  // fetchFinesSummary already declared above

  const fetchFinesSummary = async () => {
    try {
      if (user.role !== 'admin') return;
      const response = await fetch('https://libraryassistantapp.onrender.com/api/admin/fines-count');
      if (response.ok) {
        const data = await response.json();
        setOverdueTotal(parseFloat((data.overdue_total || data.overdueTotal || 0).toString()));
      }
    } catch (error) {
      console.error('Error fetching fines summary:', error);
    }
  };

  // Build a flat list of fine entries so overdue and damage appear as independent list items
  const filteredFinesRaw = fines.filter(fine =>
    fine.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fine.memberEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fine.bookTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to calculate days overdue (hoisted function to avoid initialization timing issues)
  function calculateDaysOverdue(dueDate: string) {
    if (!dueDate) return 0;
    const today = new Date().getTime();
    const due = new Date(dueDate).getTime();
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  type FineEntry = {
    id: string;
    fineId: string;
    type: 'overdue' | 'damage';
    bookTitle: string;
    bookAuthor: string;
    memberName?: string;
    memberEmail?: string;
    amount: number;
    damageDescription?: string;
    dueDate?: string;
    daysOverdue?: number;
    status?: string;
  };

  const fineEntries: FineEntry[] = [];
  filteredFinesRaw.forEach((f) => {
    if (f.overdueFine > 0) {
      fineEntries.push({
        id: `${f.id}-overdue`,
        fineId: f.id,
        type: 'overdue',
        bookTitle: f.bookTitle,
        bookAuthor: f.bookAuthor,
        memberName: f.memberName,
        memberEmail: f.memberEmail,
        amount: f.overdueFine,
        dueDate: f.dueDate,
        daysOverdue: calculateDaysOverdue(f.dueDate),
        status: f.status
      });
    }
    if (f.damageFine > 0 || (f.damageDescription && f.damageDescription.length > 0)) {
      fineEntries.push({
        id: `${f.id}-damage`,
        fineId: f.id,
        type: 'damage',
        bookTitle: f.bookTitle,
        bookAuthor: f.bookAuthor,
        memberName: f.memberName,
        memberEmail: f.memberEmail,
        amount: f.damageFine || 0,
        damageDescription: f.damageDescription,
        status: f.status
      });
    }
  });

  const totalPendingFines = fines
    .reduce((sum, fine) => sum + (fine.damageFine || 0) + (fine.overdueFine || 0), 0);

  const handlePayDamage = async (fineId: string) => {
    // Open payment dialog pre-filled for damage
    setPaymentFineId(fineId);
    setPaymentFineType('damage');
    setPaymentAmount('');
    setShowPaymentDialog(true);
  };

  const handlePayOverdue = async (fineId: string) => {
    // Open payment dialog pre-filled for overdue
    setPaymentFineId(fineId);
    setPaymentFineType('overdue');
    setPaymentAmount('');
    setShowPaymentDialog(true);
  };

  const submitPayment = async () => {
    if (!paymentFineId || !paymentFineType) return;
    try {
      const body: any = { paid_by: user.id };
      if (paymentAmount && paymentAmount.trim() !== '') {
        const parsed = parseFloat(paymentAmount.replace(/,/g, '.'));
        if (isNaN(parsed) || parsed <= 0) {
          alert('Invalid payment amount');
          return;
        }
        body.amount = parsed;
      }

      const endpoint = `https://libraryassistantapp.onrender.com/api/admin/fines/${paymentFineId}/${paymentFineType === 'damage' ? 'pay-damage' : 'pay-overdue'}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const paid = (data.paid_amount || 0);
        const remaining = (data.remaining || 0);
        alert(`Recorded payment R${paid.toFixed(2)}. Remaining: R${remaining.toFixed(2)}`);
        setShowPaymentDialog(false);
        setPaymentFineId(null);
        setPaymentFineType(null);
        setPaymentAmount('');
        await fetchFines();
        await fetchPaidFines();
        await fetchFinesSummary();
      } else {
        const err = await response.text().catch(() => 'Unknown error');
        console.error('Payment failed:', response.status, err);
        alert(`Failed to record payment: ${response.status} - ${err}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to record payment (network error)');
    }
  };

  // calculateDaysOverdue is declared above

  if (loading) {
    return <div className="p-4">Loading fines...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">{user.role === 'admin' ? 'Fines Management' : 'My Fines'}</h2>
        <p className="text-muted-foreground">
          {user.role === 'admin' ? 'Manage library fines and penalties' : 'View and pay your library fines'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Fines</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R{(overdueTotal || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {fines.filter(f => f.overdueFine > 0).length} overdue charges
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Fines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by member name, email, or book title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>
      {/* Payment Dialog (used for both damage and overdue) */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {paymentFineType === 'damage' ? 'Pay damage fine' : 'Pay overdue fine'} — enter amount to record (leave blank to pay full)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount (ZAR)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount (e.g. 100.00)"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount((e as any).target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowPaymentDialog(false); setPaymentAmount(''); setPaymentFineId(null); setPaymentFineType(null); }}>
                Cancel
              </Button>
              <Button onClick={submitPayment}>
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      

      {/* Fines List */}
      <Card>
        <CardHeader>
          <CardTitle>All Fines ({fineEntries.length})</CardTitle>
          <CardDescription>Complete list of library fines and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fineEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-semibold">{entry.bookTitle}</h4>
                      <p className="text-sm text-muted-foreground">by {entry.bookAuthor}</p>
                      <div className="space-y-1">
                        {entry.type === 'overdue' && (
                          <p className="text-sm font-medium text-orange-600">Overdue Fine: R{entry.amount.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {entry.type === 'damage' && (
                    <div className="ml-8 mr-4 p-2 bg-red-50 border-l-4 border-r-4 border-red-200 rounded">
                      <div className="flex items-center gap-2 text-red-700"><span className="font-medium">Damage Report:</span></div>
                      <p className="text-sm text-red-600 mt-1">{entry.damageDescription}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-medium text-red-600">Damage Fine: R{entry.amount.toFixed(2)}</p>
                        {user.role === 'admin' && (
                          <Button size="sm" onClick={() => handlePayDamage(entry.fineId)} className="bg-red-600 hover:bg-red-700">Pay Damage</Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground ml-8">
                    {user.role === 'admin' && (
                      <div className="flex items-center gap-1"><User className="h-4 w-4" /><span>{entry.memberName} ({entry.memberEmail})</span></div>
                    )}
                    {entry.dueDate && (
                      <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>Due: {new Date(entry.dueDate || '').toLocaleDateString()}</span></div>
                    )}
                    {entry.daysOverdue && entry.daysOverdue > 0 && (<span className="text-red-600">{entry.daysOverdue} days overdue</span>)}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {entry.type === 'overdue' && user.role === 'admin' && (
                    <Button size="sm" onClick={() => handlePayOverdue(entry.fineId)} className="bg-orange-600 hover:bg-orange-700">Pay Overdue (R{entry.amount.toFixed(2)})</Button>
                  )}
                  {entry.amount === 0 && (
                    <Button variant="outline" size="sm" disabled>All Paid</Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {fineEntries.length === 0 && fines.length > 0 && (
            <div className="text-center py-8"><p className="text-muted-foreground">No fines match your search.</p></div>
          )}

          {fines.length === 0 && (
            <div className="text-center py-8"><p className="text-muted-foreground">No fines found.</p></div>
          )}
        </CardContent>
      </Card>
      {/* Paid Fines History (moved to bottom) */}
      <Card>
        <CardHeader>
          <CardTitle>Paid Fines ({paidFines.length})</CardTitle>
          <CardDescription>History of fines that have been paid</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paidFines.length > 0 ? (
              paidFines.map((p) => (
                <div key={p.paymentId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{p.bookTitle}</h4>
                    <p className="text-sm text-muted-foreground">{p.username || ''} — {p.email || ''}</p>
                    <div className="text-sm text-muted-foreground">Type: {p.type} — R{(p.amount || 0).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Paid at: {p.paidAt}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No paid fines yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};