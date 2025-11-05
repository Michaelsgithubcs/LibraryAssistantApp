import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash2, User, Mail, Phone, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  membershipType: "student" | "faculty" | "staff" | "public";
  joinDate: string;
  status: "active" | "suspended" | "expired";
  booksIssued: number;
  fines: number;
}

export const MemberManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [members] = useState<Member[]>([
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@email.com",
      phone: "+1-555-0123",
      membershipType: "student",
      joinDate: "2023-09-01",
      status: "active",
      booksIssued: 2,
      fines: 0,
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane.smith@email.com",
      phone: "+1-555-0124",
      membershipType: "faculty",
      joinDate: "2023-08-15",
      status: "active",
      booksIssued: 5,
      fines: 15.50,
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike.johnson@email.com",
      phone: "+1-555-0125",
      membershipType: "staff",
      joinDate: "2023-07-10",
      status: "suspended",
      booksIssued: 1,
      fines: 25.00,
    },
  ]);

  const filteredMembers = members
    .filter(member =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm)
    )
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const getStatusColor = (status: Member["status"]) => {
    switch (status) {
      case "active": return "default";
      case "suspended": return "destructive";
      case "expired": return "secondary";
      default: return "default";
    }
  };

  const getMembershipColor = (type: Member["membershipType"]) => {
    switch (type) {
      case "student": return "blue";
      case "faculty": return "green";
      case "staff": return "purple";
      case "public": return "gray";
      default: return "gray";
    }
  };

  const handleAddMember = () => {
    toast({
      title: "Member Added",
      description: "New member has been successfully added to the system.",
    });
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Member Management</h2>
          <p className="text-muted-foreground">Manage library members and their accounts</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
              <DialogDescription>
                Create a new library member account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Enter member's full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="member@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+1-555-0123" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Membership Type</Label>
                <select className="w-full p-2 border rounded-md">
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="staff">Staff</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddMember} className="flex-1">
                  Add Member
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{member.name}</h3>
                      <div className="flex items-center gap-4 text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span>{member.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{member.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-8 flex items-center gap-4">
                    <Badge variant={getStatusColor(member.status)}>
                      {member.status}
                    </Badge>
                    <Badge variant="outline" className={`text-${getMembershipColor(member.membershipType)}-600`}>
                      {member.membershipType}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Joined: {member.joinDate}</span>
                    </div>
                  </div>
                  <div className="ml-8 text-sm">
                    <span className="text-muted-foreground">
                      Books Issued: <span className="font-medium">{member.booksIssued}</span> • 
                      Fines: <span className={`font-medium ${member.fines > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${member.fines.toFixed(2)}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={member.status === "active" ? "text-orange-600" : "text-green-600"}
                  >
                    {member.status === "active" ? "Suspend" : "Activate"}
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && searchTerm && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No members found matching your search.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};