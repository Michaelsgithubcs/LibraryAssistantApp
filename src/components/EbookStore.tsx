import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Star, Search, ShoppingCart, Download, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";

interface EbookStoreProps {
  user: { id: number; username: string; role: string };
}

export const EbookStore = ({ user }: EbookStoreProps) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState("");

  const categories = ["Fiction", "Non-Fiction", "Romance", "Mystery", "Sci-Fi", "Biography", "Poetry"];

  const [ebooks, setEbooks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEbooks('fiction');
  }, []);

  const fetchEbooks = async (query = 'fiction') => {
    setLoading(true);
    try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        const formattedBooks = data.docs?.map(item => ({
          id: item.key,
          title: item.title || 'Unknown Title',
          author: item.author_name?.join(', ') || 'Unknown Author',
          category: item.subject?.[0] || 'General',
          price: 0,
          currency: 'FREE',
          isFree: item.ia ? true : false,
          rating: item.ratings_average || 0,
          ratingCount: item.ratings_count || 0,
          description: item.first_sentence?.join(' ') || item.subtitle || 'Available on Open Library.',
          coverImage: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : '/placeholder.svg',
          readLink: `https://openlibrary.org${item.key}`,
          downloadLink: item.ia ? `https://archive.org/details/${item.ia[0]}` : null,
          pageCount: item.number_of_pages_median || 200,
          publishedDate: item.first_publish_year,
          isbn: item.isbn?.[0]
        })) || [];
        setEbooks(formattedBooks);
      }
    } catch (error) {
      console.error('Error fetching ebooks:', error);
    }
    setLoading(false);
  };

  const filteredBooks = ebooks.filter(book => {
    const matchesCategory = selectedCategory === "all" || book.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch = searchTerm === '' || 
                         book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSearch = () => {
    if (searchTerm.trim()) {
      fetchEbooks(searchTerm);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    if (category !== 'all') {
      fetchEbooks(category);
    } else {
      fetchEbooks('fiction');
    }
  };

  const readBook = (book) => {
    if (book.downloadLink) {
      window.open(book.downloadLink, '_blank');
    } else if (book.readLink) {
      window.open(book.readLink, '_blank');
    } else {
      alert('Book not available for reading');
    }
  };

  const openRatingDialog = (book) => {
    setSelectedBook(book);
    setShowRatingDialog(true);
  };

  const submitRating = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/books/${selectedBook.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          rating: userRating,
          review: userReview
        })
      });
      
      if (response.ok) {
        alert('Rating submitted successfully!');
        setShowRatingDialog(false);
        setUserRating(0);
        setUserReview("");
      } else {
        alert('Failed to submit rating');
      }
    } catch (error) {
      console.error('Rating error:', error);
      alert('Failed to submit rating');
    }
  };

  const renderStars = (rating, interactive = false, onRate = null) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={interactive ? () => onRate(star) : undefined}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Ebook Store</h2>
        <p className="text-muted-foreground">Discover and purchase digital books and poetry collections</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search books, authors, ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="h-4 w-4 mr-2" />
          {loading ? 'Searching...' : 'Search'}
        </Button>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}\n          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>Loading books...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map((book) => (
          <Card key={book.id} className="overflow-hidden">
            <div className="aspect-[3/4] bg-muted relative">
              <img 
                src={book.coverImage} 
                alt={book.title}
                className="w-full h-full object-cover"
              />
              {book.isFree && (
                <Badge className="absolute top-2 right-2 bg-green-600">
                  Free
                </Badge>
              )}
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
              <CardDescription>{book.author}</CardDescription>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{book.category}</Badge>
                <span className="text-sm text-muted-foreground">{book.pageCount} pages</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {book.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderStars(book.rating)}
                  <span className="text-sm text-muted-foreground">
                    ({book.ratingCount})
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openRatingDialog(book)}
                >
                  Rate
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">
                  {book.isFree ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    <span className="text-blue-600">View Details</span>
                  )}
                </div>
                <Button 
                  onClick={() => readBook(book)}
                  className={`flex items-center gap-2 ${book.isFree ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {book.isFree ? (
                    <>
                      <Download className="h-4 w-4" />
                      Download
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      View Book
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Book</DialogTitle>
            <DialogDescription>
              Share your thoughts about "{selectedBook?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Your Rating</label>
              <div className="mt-2">
                {renderStars(userRating, true, setUserRating)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Review (Optional)</label>
              <Textarea
                placeholder="Write your review..."
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRatingDialog(false)}>
                Cancel
              </Button>
              <Button onClick={submitRating} disabled={userRating === 0}>
                Submit Rating
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};