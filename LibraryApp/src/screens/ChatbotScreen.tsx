import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ViewStyle, TextStyle, GestureResponderEvent, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User } from '../types';
import { apiClient } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

import { Animated } from 'react-native';
import { PanGestureHandler, State as GestureState } from 'react-native-gesture-handler';

export const ChatbotScreen: React.FC<ChatbotScreenProps> = ({ user, navigation }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribingMessageId, setTranscribingMessageId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Create refs for message animations
  const messageAnimations = useRef<{[key: string]: Animated.Value}>({})

  useEffect(() => {
    const loadHistory = async () => {
      try {
        // Load from local storage first
        const key = `chat:library:${user.id}`;
        const raw = await AsyncStorage.getItem(key);
        
        const welcomeMsg: Message = {
          id: '1',
          text: `Hello ${user.username}! 👋 I'm your Library Assistant. I can help you with:\n\n• Finding books and authors\n• Library policies and hours\n• Account information\n• Reading recommendations\n• General library questions\n\nWhat would you like to know?`,
          isUser: false,
          timestamp: new Date()
        };
        
        if (raw) {
          const parsed: Message[] = JSON.parse(raw).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(parsed);
        } else {
          setMessages([welcomeMsg]);
          // Save to local storage
          await AsyncStorage.setItem(key, JSON.stringify([welcomeMsg]));
        }

        // Try to create conversation in database (optional - fails silently if API unavailable)
        try {
          const conversation = await apiClient.createConversation(
            user.id,
            'library',
            undefined,
            'Library Assistant Chat'
          );
          setConversationId(conversation.id);

          // Try to load messages from database
          const dbMessages = await apiClient.getMessages(conversation.id);
          if (dbMessages.length > 0) {
            const parsed: Message[] = dbMessages.map((m: any) => ({
              id: m.id.toString(),
              text: m.message_text,
              isUser: m.is_user_message,
              timestamp: new Date(m.created_at),
            }));
            setMessages(parsed);
            // Update local storage
            await AsyncStorage.setItem(key, JSON.stringify(parsed));
          }
        } catch (apiError) {
          // API not available - continue with local storage
          console.log('Using local storage for library chat history');
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        // Fallback to local welcome message
        setMessages([{
          id: '1',
          text: `Hello ${user.username}! 👋 I'm your Library Assistant. I can help you with:\n\n• Finding books and authors\n• Library policies and hours\n• Account information\n• Reading recommendations\n• General library questions\n\nWhat would you like to know?`,
          isUser: false,
          timestamp: new Date()
        }]);
      }
    };
    loadHistory();
  }, [user.id]);

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

  const saveToLocalStorage = async (messagesToSave: Message[]) => {
    try {
      const key = `chat:library:${user.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  };

  const handleVoiceTranscriptionStart = () => {
    // Create a "Transcribing..." message
    const transcribingMessage: Message = {
      id: `transcribing-${Date.now()}`,
      text: 'Transcribing...',
      isUser: true,
      timestamp: new Date(),
      replyTo: replyingTo || undefined,
    };
    
    setTranscribingMessageId(transcribingMessage.id);
    setMessages(prev => [...prev, transcribingMessage]);
    setIsTranscribing(true);
    setReplyingTo(null);
  };

  const handleVoiceTranscriptionComplete = async (transcribedText: string) => {
    if (!transcribedText.trim()) {
      // Remove the "Transcribing..." message if no text
      setMessages(prev => prev.filter(m => m.id !== transcribingMessageId));
      setIsTranscribing(false);
      setTranscribingMessageId(null);
      return;
    }

    // Replace "Transcribing..." with the actual transcribed text
    setMessages(prev =>
      prev.map(m =>
        m.id === transcribingMessageId
          ? { ...m, text: transcribedText }
          : m
      )
    );
    setIsTranscribing(false);
    setTranscribingMessageId(null);

    // Save to local storage
    const updatedMessages = messages.map(m =>
      m.id === transcribingMessageId
        ? { ...m, text: transcribedText }
        : m
    );
    saveToLocalStorage(updatedMessages);

    // Now send the transcribed text to the AI
    await sendVoiceMessage(transcribedText);
  };

  const sendVoiceMessage = async (messageText: string) => {
    setIsTyping(true);

    // Save user message to database (optional)
    if (conversationId) {
      try {
        await apiClient.saveMessage(
          conversationId,
          user.id,
          messageText,
          true,
          undefined
        );
      } catch (error) {
        console.log('Could not save to database, using local storage');
      }
    }

    // Simulate typing delay
    setTimeout(async () => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateResponse(messageText),
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => {
        const updated = [...prev, botResponse];
        saveToLocalStorage(updated);
        return updated;
      });
      setIsTyping(false);

      // Save bot response to database (optional)
      if (conversationId) {
        try {
          await apiClient.saveMessage(
            conversationId,
            user.id,
            botResponse.text,
            false,
            undefined
          );
        } catch (error) {
          console.log('Could not save to database, using local storage');
        }
      }
    }, 1500);
  };

  const sendMessage = async (): Promise<void> => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
      replyTo: replyingTo || undefined
    };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      saveToLocalStorage(updated);
      return updated;
    });
    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(true);
    setReplyingTo(null);

    // Save user message to database (optional)
    if (conversationId) {
      try {
        await apiClient.saveMessage(
          conversationId,
          user.id,
          userMessage.text,
          true,
          undefined
        );
      } catch (error) {
        console.log('Could not save to database, using local storage');
      }
    }

    // Simulate typing delay
    setTimeout(async () => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateResponse(messageText),
        isUser: false,
        timestamp: new Date(),
        replyTo: userMessage
      };

      setMessages(prev => {
        const updated = [...prev, botResponse];
        saveToLocalStorage(updated);
        return updated;
      });
      setIsTyping(false);

      // Save bot response to database (optional)
      if (conversationId) {
        try {
          await apiClient.saveMessage(
            conversationId,
            user.id,
            botResponse.text,
            false,
            undefined
          );
        } catch (error) {
          console.log('Could not save to database, using local storage');
        }
      }
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
        {/* Rendering messages: {messages.length} */}
        {messages.map((message, idx) => {
          // Ensure we have an animation value for this message
          if (!messageAnimations.current[message.id]) {
            messageAnimations.current[message.id] = new Animated.Value(0);
          }
          // Get the animation value from the ref
          const translateX = messageAnimations.current[message.id];

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
                    {/* Rendering Card for {message.id} */}
                    {message.replyTo && (
                      <View style={{ marginBottom: 2, paddingLeft: 6, borderLeftWidth: 2, borderLeftColor: colors.primary, opacity: 0.7 }}>
                        <Text style={[commonStyles.textMuted, { fontSize: 12, fontStyle: 'italic' }]} numberOfLines={1}>
                          {message.replyTo.text}
                        </Text>
                      </View>
                    )}
                    {message.isUser && message.text === 'Transcribing...' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.userText, { fontSize: 15, color: colors.text.muted }]}>
                          {message.text}
                        </Text>
                        <ActivityIndicator size="small" color={colors.text.muted} />
                      </View>
                    ) : (
                      <Text style={[
                        message.isUser ? styles.userText : styles.botText,
                        { fontSize: 15 }
                      ]}>
                        {message.text}
                      </Text>
                    )}
                    <Text style={[
                      commonStyles.textMuted,
                      styles.timestamp,
                      message.isUser && styles.userTimestamp
                    ]}>
                      {formatTime(message.timestamp)}
                    </Text>
                    {!message.isUser && (
                      <TouchableOpacity
                        onPress={() => {
                          console.log('Reply button pressed for message', message.id);
                          setReplyingTo(message);
                        }}
                        style={{ marginTop: 8, alignSelf: 'flex-end', padding: 4 }}
                        activeOpacity={0.6}
                      >
                        <Svg width={20} height={20} viewBox="0 0 640 640">
                          <Path
                            d="M364.2 82.4C376.2 87.4 384 99 384 112L384 192L432 192C529.2 192 608 270.8 608 368C608 481.3 526.5 531.9 507.8 542.1C505.3 543.5 502.5 544 499.7 544C488.8 544 480 535.1 480 524.3C480 516.8 484.3 509.9 489.8 504.8C499.2 496 512 478.4 512 448.1C512 395.1 469 352.1 416 352.1L384 352.1L384 432.1C384 445 376.2 456.7 364.2 461.7C352.2 466.7 338.5 463.9 329.3 454.8L169.3 294.8C156.8 282.3 156.8 262 169.3 249.5L329.3 89.5C338.5 80.3 352.2 77.6 364.2 82.6zM237.6 87.1C247 96.5 247 111.7 237.6 121L86.6 272L237.6 422.9C247 432.3 247 447.5 237.6 456.8C228.2 466.1 213 466.2 203.7 456.8L42 295.2C35.6 289.2 32 280.8 32 272C32 263.2 35.6 254.8 42 248.8L203.6 87.1C213 77.7 228.2 77.7 237.5 87.1z"
                            fill={colors.primary}
                          />
                        </Svg>
                      </TouchableOpacity>
                    )}
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
            <View style={styles.inputWrapper}>
              <Input
                placeholder={replyingTo ? "Reply to this message..." : "Enquire"}
                value={inputText}
                onChangeText={setInputText}
                multiline
                style={[styles.textInput, styles.textInputBorder]}
                containerStyle={{ flex: 1, margin: 0 }}
              />
              <View style={styles.inputButtonsWrapper}>
                <VoiceRecorder
                  onTranscriptionStart={handleVoiceTranscriptionStart}
                  onTranscriptionComplete={handleVoiceTranscriptionComplete}
                  disabled={isTyping || isTranscribing}
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={!inputText.trim() || isTyping}
                  activeOpacity={0.7}
                  style={styles.sendIconButton}
                >
                  <Image
                    source={require('../../assets/icons/send.png')}
                    style={[
                      styles.sendIcon,
                      (!inputText.trim() || isTyping) && styles.sendIconDisabled
                    ]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>
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
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    marginBottom: 8,
  },
  
  inputCard: {
    margin: 16,
    marginBottom: 8,
  } as ViewStyle,
  
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingBottom: 4,
  },
  
  inputWrapper: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  
  textInput: {
    maxHeight: 100,
    minHeight: 48,
    paddingRight: 50,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
  } as TextStyle,
  
  textInputBorder: {
    borderColor: '#000000',
    borderWidth: 1,
  } as TextStyle,
  
  inputButtonsWrapper: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  
  sendIconButton: {
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  
  sendIcon: {
    width: 28,
    height: 28,
    tintColor: colors.primary,
  } as any,
  
  sendIconDisabled: {
    opacity: 0.3,
  } as any,
  
  sendButton: {
    height: 40,
    minHeight: 40,
    paddingVertical: 0,
  } as ViewStyle,
});