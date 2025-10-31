import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchFines();
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

  const filteredFines = fines.filter(fine =>
    fine.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fine.memberEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fine.bookTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPendingFines = fines
    .reduce((sum, fine) => sum + (fine.damageFine || 0) + (fine.overdueFine || 0), 0);

  const handlePayDamage = async (fineId: string) => {
    try {
      const response = await fetch(`https://libraryassistantapp.onrender.com/api/admin/fines/${fineId}/pay-damage`, {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Damage fine paid successfully!');
        fetchFines();
      } else {
        alert('Failed to pay damage fine');
      }
    } catch (error) {
      alert('Failed to pay damage fine');
    }
  };

  const handlePayOverdue = async (fineId: string) => {
    try {
      const response = await fetch(`https://libraryassistantapp.onrender.com/api/admin/fines/${fineId}/pay-overdue`, {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Overdue fine paid successfully!');
        fetchFines();
      } else {
        alert('Failed to pay overdue fine');
      }
    } catch (error) {
      alert('Failed to pay overdue fine');
    }
  };

  const calculateDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return <div className="p-4">Loading fines...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">
          {user.role === 'admin' ? 'Fines Management' : 'My Fines'}
        </h2>
        <p className="text-muted-foreground">
          {user.role === 'admin' ? 'Manage library fines and penalties' : 'View and pay your library fines'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Fines</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R{(totalPendingFines || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {fines.filter(f => f.status === "issued").length} outstanding fines
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

      {/* Fines List */}
      <Card>
        <CardHeader>
          <CardTitle>All Fines ({filteredFines.length})</CardTitle>
          <CardDescription>Complete list of library fines and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredFines.map((fine) => {
              const daysOverdue = calculateDaysOverdue(fine.dueDate);
              
              return (
                <div key={fine.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-semibold">{fine.bookTitle}</h4>
                        <p className="text-sm text-muted-foreground">by {fine.bookAuthor}</p>
                        <div className="space-y-1">
                          {fine.overdueFine > 0 && (
                            <p className="text-sm font-medium text-orange-600">
                              Overdue Fine: R{fine.overdueFine.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {fine.damageDescription && (
                      <div className="ml-8 mr-4 p-2 bg-red-50 border-l-4 border-r-4 border-red-200 rounded">
                        <div className="flex items-center gap-2 text-red-700">
                          <span className="font-medium">Damage Report:</span>
                        </div>
                        <p className="text-sm text-red-600 mt-1">{fine.damageDescription}</p>
                        {fine.damageFine > 0 && (
                          <p className="text-sm font-medium text-red-600 mt-1">
                            Damage Fine: R{fine.damageFine.toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground ml-8">
                      {user.role === 'admin' && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{fine.memberName} ({fine.memberEmail})</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {new Date(fine.dueDate).toLocaleDateString()}</span>
                      </div>
                      {daysOverdue > 0 && (
                        <span className="text-red-600">
                          {daysOverdue} days overdue
                        </span>
                      )}

                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    {user.role === 'admin' && (
                      <>
                        {fine.damageFine > 0 && (
                          <Button 
                            size="sm"
                            onClick={() => handlePayDamage(fine.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Pay Damage
                          </Button>
                        )}
                        {fine.overdueFine > 0 && (
                          <Button 
                            size="sm"
                            onClick={() => handlePayOverdue(fine.id)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Pay Overdue (R{fine.overdueFine.toFixed(2)})
                          </Button>
                        )}
                      </>
                    )}
                    {user.role === 'user' && (fine.damageFine > 0 || fine.overdueFine > 0) && (
                      <Button 
                        size="sm"
                        onClick={() => alert('The library only accepts cash payments')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Pay Fine
                      </Button>
                    )}
                    {fine.damageFine === 0 && fine.overdueFine === 0 && (
                      <Button variant="outline" size="sm" disabled>
                        All Paid
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {filteredFines.length === 0 && fines.length > 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No fines match your search.</p>
            </div>
          )}
          
          {fines.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No fines found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};