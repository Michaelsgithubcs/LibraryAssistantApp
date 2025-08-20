import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ViewStyle, TextStyle, GestureResponderEvent } from 'react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User } from '../types';

interface ChatbotScreenProps {
  user: User;
  navigation: any;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  replyTo?: Message;
}

import { TouchableOpacity, Animated } from 'react-native';
import { PanGestureHandler, State as GestureState } from 'react-native-gesture-handler';

export const ChatbotScreen: React.FC<ChatbotScreenProps> = ({ user, navigation }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello ${user.username}! 👋 I'm your Library Assistant. I can help you with:\n\n• Finding books and authors\n• Library policies and hours\n• Account information\n• Reading recommendations\n• General library questions\n\nWhat would you like to know?`,
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const generateResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Library hours
    if (message.includes('hour') || message.includes('open') || message.includes('close')) {
      return "📅 Library Hours:\n\nMonday - Friday: 8:00 AM - 8:00 PM\nSaturday: 9:00 AM - 6:00 PM\nSunday: 12:00 PM - 5:00 PM\n\nWe're closed on public holidays. You can return books 24/7 using our book drop box!";
    }
    
    // Book recommendations
    if (message.includes('recommend') || message.includes('suggest') || message.includes('good book')) {
      return "📚 Here are some popular recommendations:\n\n• Fiction: \"The Seven Husbands of Evelyn Hugo\" by Taylor Jenkins Reid\n• Mystery: \"The Thursday Murder Club\" by Richard Osman\n• Sci-Fi: \"Project Hail Mary\" by Andy Weir\n• Non-Fiction: \"Atomic Habits\" by James Clear\n\nWould you like recommendations in a specific genre? Just let me know your interests!";
    }
    
    // Fines and fees
    if (message.includes('fine') || message.includes('fee') || message.includes('overdue')) {
      return "💰 About Library Fines:\n\n• Overdue books: R5 per day\n• Lost books: Full replacement cost\n• Damaged books: Assessed individually\n\nYou can check your current fines in the 'My Fines' section. All payments must be made in cash at the front desk.";
    }
    
    // Renewals
    if (message.includes('renew') || message.includes('extend')) {
      return "🔄 Book Renewals:\n\n• Books can be renewed once if no one is waiting\n• Renewal period: 14 additional days\n• You can renew up to 3 days before the due date\n\nTo renew, visit the library or call us at (011) 123-4567. Online renewals coming soon!";
    }
    
    // Account info
    if (message.includes('account') || message.includes('profile') || message.includes('card')) {
      return `👤 Your Account Info:\n\nName: ${user.username}\nEmail: ${user.email}\nMember since: Active member\n\nYou can view your issued books and fines in the respective sections of this app. Need to update your details? Visit the front desk with ID.`;
    }
    
    // Contact info
    if (message.includes('contact') || message.includes('phone') || message.includes('address')) {
      return "📞 Contact Information:\n\nPhone: (011) 123-4567\nEmail: info@library.com\nAddress: 123 Library Street, City Center\n\nYou can also visit our website at www.library.com for more information!";
    }
    
    // Reservations
    if (message.includes('reserve') || message.includes('hold') || message.includes('request')) {
      return "📋 Book Reservations:\n\n• Search for books in the 'Book Search' section\n• Tap 'Reserve' on available books\n• Admin will approve your request\n• You'll get notified when approved\n• Pick up within 3 days of notification\n\nReservations are free and you can have up to 5 active reservations.";
    }
    
    // Default responses
    const responses = [
      "I'd be happy to help you with that! Could you provide more details about what you're looking for?",
      "That's a great question! For specific information, you might want to speak with our librarians at the front desk, or I can try to help if you give me more context.",
      "I'm here to assist you with library-related questions. Is there something specific about books, your account, or library services you'd like to know?",
      "Thanks for asking! While I try to be helpful, for the most accurate information, our library staff at the front desk are always ready to assist you in person."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const sendMessage = (): void => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
      replyTo: replyingTo || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setReplyingTo(null);

    // Simulate typing delay
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateResponse(inputText.trim()),
        isUser: false,
        timestamp: new Date(),
        replyTo: userMessage
      };

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView 
      style={commonStyles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {(() => {
          console.log('Rendering messages:', messages.length);
          return null;
        })()}
        {messages.map((message, idx) => {
          // Use a single translateX per message for swipe
          const [translateX] = useState(new Animated.Value(0));

          const onGestureEvent = Animated.event(
            [{ nativeEvent: { translationX: translateX } }],
            { useNativeDriver: true }
          );

          const onHandlerStateChange = (event: { nativeEvent: { state: number; translationX: number } }) => {
            const { state, translationX: dragX } = event.nativeEvent;
            if (state === GestureState.END) {
              if (dragX > 60) {
                console.log('Swipe-to-reply triggered for', message.id);
                setReplyingTo(message);
                Animated.spring(translateX, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start();
              } else {
                Animated.spring(translateX, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start();
              }
            }
          };

          return (
            <PanGestureHandler
              key={message.id}
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
              activeOffsetX={10}
              failOffsetY={[-10, 10]}
            >
              <Animated.View
                style={StyleSheet.flatten([
                  { transform: [{ translateX }] },
                  styles.messageContainer,
                  message.isUser ? styles.userMessage : styles.botMessage
                ])}
              >
                <TouchableOpacity
                  onLongPress={() => {
                    console.log('Long press on message', message.id);
                    setReplyingTo(message);
                  }}
                  activeOpacity={0.85}
                >
                  <Card style={{
                    ...styles.messageBubble,
                    ...(message.isUser ? styles.userBubble : styles.botBubble)
                  }}>
                    {/* DEBUG: Message bubble rendered for message.id: */}
                    {console.log('Rendering Card for', message.id)}
                    {message.replyTo && (
                      <View style={{ marginBottom: 2, paddingLeft: 6, borderLeftWidth: 2, borderLeftColor: colors.primary, opacity: 0.7 }}>
                        <Text style={[commonStyles.textMuted, { fontSize: 12, fontStyle: 'italic' }]} numberOfLines={1}>
                          {message.replyTo.text}
                        </Text>
                      </View>
                    )}
                    <Text style={[
                      message.isUser ? styles.userText : styles.botText,
                      { fontSize: 15 }
                    ]}>
                      {message.text}
                    </Text>
                    <Text style={[
                      commonStyles.textMuted,
                      styles.timestamp,
                      message.isUser && styles.userTimestamp
                    ]}>
                      {formatTime(message.timestamp)}
                    </Text>
                    <Button
                      title="Reply"
                      variant="outline"
                      style={{ marginTop: 4, alignSelf: 'flex-end', paddingHorizontal: 12, height: 28, minHeight: 28 }}
                      textStyle={{ fontSize: 12 }}
                      onPress={() => {
                        console.log('Reply button pressed for message', message.id);
                        setReplyingTo(message);
                      }}
                    />
                  </Card>
                </TouchableOpacity>
              </Animated.View>
            </PanGestureHandler>
          );
        })} 

        {isTyping && (
          <View style={[styles.messageContainer, styles.botMessage]}>
            <Card style={{
              ...styles.messageBubble,
              ...styles.botBubble
            }}>
              <Text style={[commonStyles.textSecondary, styles.typingText]}>
                Library Assistant is typing...
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <Card style={styles.inputCard as ViewStyle}>
          {replyingTo && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.textMuted, { fontSize: 12 }]}>Replying to:</Text>
                <Text style={[commonStyles.textMuted, { fontSize: 12, fontStyle: 'italic' }]} numberOfLines={2}>{replyingTo.text}</Text>
              </View>
              <Button
                title="Cancel"
                variant="outline"
                style={{ marginLeft: 8, height: 28, minHeight: 28, paddingHorizontal: 10 }}
                textStyle={{ fontSize: 12 }}
                onPress={() => setReplyingTo(null)}
              />
            </View>
          )}
          <View style={styles.inputRow}>
            <Input
              placeholder={replyingTo ? "Reply to this message..." : "Ask me anything about the library..."}
              value={inputText}
              onChangeText={setInputText}
              multiline
              style={[styles.textInput, { height: 40, minHeight: 40, maxHeight: 40, paddingVertical: 0 }]}
              containerStyle={{ flex: 1, margin: 0 }}
            />
            <Button
              title="Send"
              onPress={sendMessage}
              disabled={!inputText.trim() || isTyping}
              style={[styles.sendButton, { height: 40, minHeight: 40, paddingVertical: 0 }]}
            />
          </View>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  messagesContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  
  messageContainer: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  
  userMessage: {
    alignItems: 'flex-end',
  },
  
  botMessage: {
    alignItems: 'flex-start',
  },
  
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  } as ViewStyle,
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  } as ViewStyle,
  botBubble: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  } as ViewStyle,
  
  userText: {
    color: colors.text.inverse,
  },
  
  botText: {
    color: colors.text.primary,
  },
  
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  
  userTimestamp: {
    color: colors.text.inverse,
    opacity: 0.7,
  },
  
  typingText: {
    fontStyle: 'italic',
  },
  
  inputContainer: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  
  inputCard: {
    margin: 16,
    marginBottom: 8,
  } as ViewStyle,
  
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 0,
    height: 40,
    minHeight: 40,
    maxHeight: 40,
  } as ViewStyle,
  
  sendButton: {
    height: 40,
    minHeight: 40,
    paddingVertical: 0,
  } as ViewStyle,
});