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
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/admin/members');
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Error:', error);
      setMembers([]);
    }
    setLoading(false);
  };

  const filteredMembers = members.filter(member =>
    member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addMember = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/signup', {
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
      const response = await fetch(`http://localhost:5001/api/admin/members/${selectedMember.id}`, {
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
      const response = await fetch(`http://localhost:5001/api/admin/members/${selectedMember.id}/suspend`, {
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
      const response = await fetch(`http://localhost:5001/api/admin/members/${memberId}/unsuspend`, {
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
      const response = await fetch(`http://localhost:5001/api/admin/members/${memberId}`, {
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
        <div>
          <h2 className="text-3xl font-bold">Member Management</h2>
          <p className="text-muted-foreground">Manage library members</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by username or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <h4 className="font-semibold">{member.username}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{member.email}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline">{member.role}</Badge>
                        <Badge variant={member.status === "active" ? "default" : "destructive"}>
                          {member.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Joined: {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                        {member.role !== 'admin' && (
                          <span className="text-xs text-muted-foreground">
                            Books: {member.books_issued || 0}
                          </span>
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
                      setSelectedMember(member);
                      setEditMember({
                        username: member.username,
                        email: member.email,
                        password: "",
                        role: member.role
                      });
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMember(member);
                      if (member.status === "suspended") {
                        unsuspendMember(member.id);
                      } else {
                        setShowSuspendDialog(true);
                      }
                    }}
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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

      {/* Edit Member Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input
                value={editMember.username}
                onChange={(e) => setEditMember({ ...editMember, username: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editMember.email}
                onChange={(e) => setEditMember({ ...editMember, email: e.target.value })}
              />
            </div>
            <div>
              <Label>New Password (leave blank to keep current)</Label>
              <Input
                type="password"
                value={editMember.password}
                onChange={(e) => setEditMember({ ...editMember, password: e.target.value })}
              />
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
              <Button onClick={handleEditMember}>Update Member</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Member Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Member</DialogTitle>
            <DialogDescription>Choose suspension duration for {selectedMember?.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Suspension Duration</Label>
              <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_month">1 Month</SelectItem>
                  <SelectItem value="2_months">2 Months</SelectItem>
                  <SelectItem value="3_months">3 Months</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={suspendMember}>Suspend Member</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};