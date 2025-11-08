import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, User, Mail, Plus, Edit, Trash2, UserX } from "lucide-react";

export const EnhancedMemberManagement = () => {
  const [members, setMembers] = useState([]);
  const [accountRequests, setAccountRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [suspendDuration, setSuspendDuration] = useState("1_month");
  const [newMember, setNewMember] = useState({
    username: "",
    email: "",
    password: "",
    role: "user"
  });
  const [editMember, setEditMember] = useState({
    username: "",
    email: "",
    password: "",
    role: "user"
  });

  useEffect(() => {
    fetchMembers();
    fetchAccountRequests();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('https://libraryassistantapp.onrender.com/api/admin/members');
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Error:', error);
      setMembers([]);
    }
    setLoading(false);
  };

  const fetchAccountRequests = async () => {
    try {
      const response = await fetch('https://libraryassistantapp.onrender.com/api/account-requests');
      const data = await response.json();
      setAccountRequests(data);
    } catch (error) {
      console.error('Error fetching account requests:', error);
      setAccountRequests([]);
    }
  };

  const approveAccountRequest = async (requestId) => {
    if (!confirm('Are you sure you want to approve this account request?')) return;
    
    try {
      const response = await fetch(`https://libraryassistantapp.onrender.com/api/account-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: 1 }) // You can replace with actual admin ID
      });
      
      if (response.ok) {
        alert('Account request approved successfully!');
        fetchMembers();
        fetchAccountRequests();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to approve account request');
      }
    } catch (error) {
      alert('Failed to approve account request');
    }
  };

  const filteredMembers = members
    .filter(member =>
      member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));

  const filteredRequests = accountRequests
    .filter(request =>
      request.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));

  const allDisplayItems = [...filteredRequests.map(r => ({...r, isPending: true})), ...filteredMembers];

  const addMember = async () => {
    try {
      const response = await fetch('https://libraryassistantapp.onrender.com/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      
      if (response.ok) {
        alert('Member added successfully!');
        setShowAddDialog(false);
        setNewMember({ username: "", email: "", password: "", role: "user" });
        fetchMembers();
      } else {
        alert('Failed to add member');
      }
    } catch (error) {
      alert('Failed to add member');
    }
  };

  const handleEditMember = async () => {
    if (!selectedMember) return;
    
    try {
      const response = await fetch(`https://libraryassistantapp.onrender.com/api/admin/members/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editMember)
      });
      
      if (response.ok) {
        alert('Member updated successfully!');
        setShowEditDialog(false);
        fetchMembers();
      } else {
        alert('Failed to update member');
      }
    } catch (error) {
      alert('Failed to update member');
    }
  };

  const suspendMember = async () => {
    if (!selectedMember) return;
    
    try {
      const response = await fetch(`https://libraryassistantapp.onrender.com/api/admin/members/${selectedMember.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: suspendDuration })
      });
      
      if (response.ok) {
        alert('Member suspended successfully!');
        setShowSuspendDialog(false);
        fetchMembers();
      } else {
        alert('Failed to suspend member');
      }
    } catch (error) {
      alert('Failed to suspend member');
    }
  };

  const unsuspendMember = async (memberId) => {
    try {
      const response = await fetch(`https://libraryassistantapp.onrender.com/api/admin/members/${memberId}/unsuspend`, {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Member unsuspended successfully!');
        fetchMembers();
      } else {
        alert('Failed to unsuspend member');
      }
    } catch (error) {
      alert('Failed to unsuspend member');
    }
  };

  const deleteMember = async (memberId) => {
    if (!confirm('Are you sure you want to delete this member?')) return;
    
    try {
      const response = await fetch(`https://libraryassistantapp.onrender.com/api/admin/members/${memberId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('Member deleted successfully!');
        fetchMembers();
      } else {
        alert('Failed to delete member');
      }
    } catch (error) {
      alert('Failed to delete member');
    }
  };

  if (loading) {
    return <div className="p-4">Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative flex items-center gap-4">
          <h2 className="text-3xl font-bold">Member Management</h2>
          {/* Search input: filter members and pending account requests by username or email */}
          <div className="w-80">
            <Input
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              placeholder="Search members by username or email"
            />
          </div>
          {/* Green dot indicator moved to the sidebar (Index.tsx) */}
      </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>
      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input
                value={newMember.username}
                onChange={(e) => setNewMember({ ...newMember, username: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={newMember.password}
                onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newMember.role} onValueChange={(value) => setNewMember({ ...newMember, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={addMember}>Add Member</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Members list */}
      <div className="space-y-4">
        {allDisplayItems.map((item) => (
          <div key={`${item.isPending ? 'req' : 'mem'}-${item.id}`} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 mt-1 text-primary" />
                <div>
                  <h4 className="font-semibold">{item.username}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{item.email}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    {item.isPending ? (
                      <>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending Request</Badge>
                        <span className="text-xs text-muted-foreground">Requested: {item.requested_at ? new Date(item.requested_at).toLocaleDateString() : 'N/A'}</span>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline">{item.role}</Badge>
                        <Badge variant={item.status === "active" ? "default" : "destructive"}>{item.status}</Badge>
                        <span className="text-xs text-muted-foreground">Joined: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}</span>
                        {item.role !== 'admin' && (
                          <span className="text-xs text-muted-foreground">Books: {item.books_issued || 0}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {item.isPending ? (
                <Button className="bg-green-500 hover:bg-green-600 text-white" size="sm" onClick={() => approveAccountRequest(item.id)}>
                  <Plus className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => {
                    setSelectedMember(item);
                    setEditMember({ username: item.username, email: item.email, password: "", role: item.role });
                    setShowEditDialog(true);
                  }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setSelectedMember(item);
                    if (item.status === "suspended") {
                      unsuspendMember(item.id);
                    } else {
                      setShowSuspendDialog(true);
                    }
                  }}>
                    <UserX className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteMember(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input value={editMember.username} onChange={(e) => setEditMember({ ...editMember, username: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editMember.email} onChange={(e) => setEditMember({ ...editMember, email: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editMember.role} onValueChange={(value) => setEditMember({ ...editMember, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleEditMember}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Member Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Duration</Label>
              <Select value={suspendDuration} onValueChange={(value) => setSuspendDuration(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_month">1 Month</SelectItem>
                  <SelectItem value="6_months">6 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>Cancel</Button>
              <Button onClick={suspendMember}>Suspend</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}