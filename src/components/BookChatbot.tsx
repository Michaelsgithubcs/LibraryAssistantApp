import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, X } from "lucide-react";
import { useState } from "react";

interface BookChatbotProps {
  book: {
    id: string;
    title: string;
    author: string;
  };
  onClose: () => void;
}

export const BookChatbot = ({ book, onClose }: BookChatbotProps) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      content: `Hi! I'm here to help you discuss "${book.title}" by ${book.author}. What would you like to talk about? I can help with themes, characters, plot analysis, or answer any questions you have about the book!`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const predefinedResponses = {
    "themes": `"${book.title}" explores several important themes including social class, the American Dream, love and obsession, and moral decay. Which theme interests you most?`,
    "characters": `The main characters in "${book.title}" each represent different aspects of society. Would you like to discuss any specific character's development or motivations?`,
    "plot": `The plot of "${book.title}" is carefully structured. Are you interested in discussing the narrative structure, key plot points, or how the story unfolds?`,
    "analysis": `There are many layers to analyze in "${book.title}". We could explore symbolism, literary devices, historical context, or the author's writing style. What interests you?`,
    "questions": `I'm here to answer any questions about "${book.title}". Feel free to ask about anything - plot details, character motivations, themes, or interpretations!`,
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = generateBotResponse(inputMessage);
      const botMessage = {
        id: messages.length + 2,
        type: "bot",
        content: botResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const generateBotResponse = (userInput: string) => {
    const input = userInput.toLowerCase();
    
    if (input.includes("theme") || input.includes("meaning")) {
      return predefinedResponses.themes;
    } else if (input.includes("character") || input.includes("protagonist")) {
      return predefinedResponses.characters;
    } else if (input.includes("plot") || input.includes("story") || input.includes("what happens")) {
      return predefinedResponses.plot;
    } else if (input.includes("analyze") || input.includes("analysis") || input.includes("symbolism")) {
      return predefinedResponses.analysis;
    } else if (input.includes("question") || input.includes("help") || input.includes("explain")) {
      return predefinedResponses.questions;
    } else {
      return `That's an interesting point about "${book.title}"! The book offers many perspectives on that topic. Could you tell me more about what specifically interests you, or would you like me to share some insights about the themes, characters, or plot?`;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Book Discussion: {book.title}
              </DialogTitle>
              <DialogDescription>
                Chat about themes, characters, and insights from this book
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.type === "bot" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {message.type === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <p className="text-sm">Typing...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            placeholder="Ask about themes, characters, plot..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!inputMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputMessage("What are the main themes?")}
          >
            Themes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputMessage("Tell me about the characters")}
          >
            Characters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputMessage("Analyze the plot structure")}
          >
            Plot Analysis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};