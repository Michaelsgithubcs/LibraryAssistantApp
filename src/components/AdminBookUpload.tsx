import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, Plus } from "lucide-react";

export const AdminBookUpload = () => {
  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    category: "",
    description: "",
    reading_time_minutes: 0,
    total_copies: 1,
    available_copies: 1,
    publish_date: "",
  });
  const [loading, setLoading] = useState(false);

  const categories = ["Fiction", "Non-Fiction", "Romance", "Mystery", "Sci-Fi", "Biography", "Poetry", "Fantasy", "Dystopian"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("https://libraryassistantapp.onrender.com/api/admin/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookData),
      });

      if (response.ok) {
        alert("Book added successfully!");
        setBookData({
          title: "",
          author: "",
          category: "",
          description: "",
          reading_time_minutes: 0,
          total_copies: 1,
          available_copies: 1,
          publish_date: "",
        });
      } else {
        alert("Failed to add book");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to add book");
    }

    setLoading(false);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Book
        </CardTitle>
        <CardDescription>Upload a new book to the library system</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={bookData.title}
                onChange={(e) => setBookData({ ...bookData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author *</Label>
              <Input
                id="author"
                value={bookData.author}
                onChange={(e) => setBookData({ ...bookData, author: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={bookData.category} onValueChange={(value) => setBookData({ ...bookData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={bookData.description}
              onChange={(e) => setBookData({ ...bookData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publish_date">Publish Date *</Label>
              <Input
                id="publish_date"
                type="date"
                value={bookData.publish_date}
                onChange={(e) => setBookData({ ...bookData, publish_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reading_time">Reading Time (minutes)</Label>
              <Input
                id="reading_time"
                type="number"
                value={bookData.reading_time_minutes}
                onChange={(e) => setBookData({ ...bookData, reading_time_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="copies">Number of Copies</Label>
              <Input
                id="copies"
                type="number"
                min="1"
                value={bookData.total_copies}
                onChange={(e) => {
                  const copies = parseInt(e.target.value) || 1;
                  setBookData({ ...bookData, total_copies: copies, available_copies: copies });
                }}
              />
            </div>
          </div>



          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding Book..." : "Add Book"}
            <Upload className="h-4 w-4 ml-2" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};