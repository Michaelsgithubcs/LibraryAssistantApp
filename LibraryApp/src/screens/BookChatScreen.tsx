import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Animated, Image } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Markdown from 'react-native-markdown-display';
import Svg, { Path } from 'react-native-svg';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { IssuedBook, User } from '../types';
import { askBookAssistant, apiClient } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BookChatScreenProps {
  route: {
    params: {
      book: IssuedBook;
      user?: User;
    };
  };
  navigation: any;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  replyTo?: Message;
}

export const BookChatScreen: React.FC<BookChatScreenProps> = ({ route, navigation }) => {
  const { book, user } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribingMessageId, setTranscribingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const translateXRefs = useRef<Animated.Value[]>([]);

  useEffect(() => {
    navigation.setOptions({
      title: `Chat: ${book.title}`,
      headerTitleStyle: { fontSize: 16 }
    });
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        // Get user from storage if not passed
        let currentUser = user;
        if (!currentUser) {
          const userStr = await AsyncStorage.getItem('user');
          if (userStr) {
            currentUser = JSON.parse(userStr);
          }
        }

        // Always use local storage for chat history (API endpoints may not be available)
        const key = `chat:${book.id}`;
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const parsed: Message[] = JSON.parse(raw).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(parsed);
        } else {
          setWelcomeMessage();
        }

        // Try to create conversation in database (optional - will fail silently if API not available)
        if (currentUser) {
          try {
            const conversation = await apiClient.createConversation(
              currentUser.id,
              'book',
              parseInt(book.id),
              `${book.title} Discussion`
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
            }
          } catch (apiError) {
            // API not available - continue with local storage
            console.log('Using local storage for chat history');
          }
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        setWelcomeMessage();
      }
    };
    loadHistory();
  }, [book.id]);

  const setWelcomeMessage = () => {
    setMessages([
      {
        id: 'welcome',
        text: `📖 Welcome to your book discussion for "${book.title}" by ${book.author}!\n\nI can help you with:\n• Character analysis and development\n• Plot discussions and themes\n• Chapter summaries\n• Reading comprehension\n• Discussion questions\n• And more...\n\nWhat would you like to explore about this book?`,
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const generateBookResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    const bookTitle = book.title.toLowerCase();
    
    // Character analysis
    if (message.includes('character') || message.includes('protagonist') || message.includes('main character')) {
      return `🎭 Character Analysis for "${book.title}":\n\nGreat question about the characters! Here are some discussion points:\n\n• What motivates the main character's actions?\n• How do they change throughout the story?\n• What relationships are most important to them?\n• What internal conflicts do they face?\n\nWhich specific character would you like to discuss further? I can help you analyze their development, relationships, or role in the story.`;
    }
    
    // Plot and themes
    if (message.includes('plot') || message.includes('story') || message.includes('theme')) {
      return `📚 Plot & Themes in "${book.title}":\n\nLet's explore the deeper elements:\n\n• What is the central conflict or tension?\n• How does the setting influence the story?\n• What major themes can you identify?\n• How do events build toward the climax?\n\nThemes often include love, power, identity, justice, or coming-of-age. What themes do you notice in this book? I can help you analyze how they're developed.`;
    }
    
    // Chapter summaries
    if (message.includes('chapter') || message.includes('summary') || message.includes('recap')) {
      return `📝 Chapter Discussion for "${book.title}":\n\nI'd love to help with chapter analysis! Here's how we can approach it:\n\n• Key events and turning points\n• Character development moments\n• Important dialogue or quotes\n• Foreshadowing and symbolism\n\nWhich chapter are you currently reading or would like to discuss? I can help break down the important elements and their significance to the overall story.`;
    }
    
    // Reading comprehension
    if (message.includes('understand') || message.includes('confus') || message.includes('explain') || message.includes('mean')) {
      return `🤔 Reading Comprehension Help:\n\nI'm here to help clarify anything confusing! Literature can be complex, and it's normal to need clarification.\n\n• Break down complex passages\n• Explain literary devices and symbolism\n• Clarify character motivations\n• Discuss historical or cultural context\n\nWhat specific part of "${book.title}" would you like me to help explain? Feel free to share a quote or describe the scene you're having trouble with.`;
    }
    
    // Discussion questions
    if (message.includes('discuss') || message.includes('question') || message.includes('book club')) {
      return `💬 Discussion Questions for "${book.title}":\n\nHere are some thought-provoking questions:\n\n• What did you think of the ending? Was it satisfying?\n• Which character did you relate to most and why?\n• What would you have done differently if you were the protagonist?\n• How does this book connect to current events or your own life?\n• What emotions did this book evoke in you?\n\nPick any of these to dive deeper, or let me know what aspect of the book you'd most like to discuss!`;
    }
    
    // Quotes and analysis
    if (message.includes('quote') || message.includes('passage') || message.includes('line')) {
      return `📖 Quote Analysis for "${book.title}":\n\nLiterary quotes can reveal so much about themes and characters! \n\n• What makes certain lines memorable?\n• How do quotes reveal character personality?\n• What literary devices are being used?\n• How do key quotes connect to major themes?\n\nDo you have a specific quote from the book you'd like to analyze? Share it with me and I'll help break down its significance and literary techniques.`;
    }
    
    // Default book-specific responses
    const bookResponses = [
      `That's an interesting perspective on "${book.title}"! Can you tell me more about what specifically caught your attention?`,
      `Great observation about the book! What do you think the author was trying to convey with that element?`,
      `I love discussing "${book.title}"! That's a thoughtful point. How do you think it connects to the overall message of the story?`,
      `Excellent question about the book! Let's explore that together. What's your initial interpretation of that aspect?`
    ];
    
    return bookResponses[Math.floor(Math.random() * bookResponses.length)];
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

    // Now send the transcribed text to the AI
    await sendVoiceMessage(transcribedText);
  };

  const sendVoiceMessage = async (messageText: string) => {
    setIsTyping(true);

    try {
      // Try to save user message to database if we have a conversation (optional)
      if (conversationId) {
        try {
          const userStr = await AsyncStorage.getItem('user');
          const currentUser = user || (userStr ? JSON.parse(userStr) : null);
          if (currentUser) {
            await apiClient.saveMessage(
              conversationId,
              currentUser.id,
              messageText,
              true,
              undefined
            );
          }
        } catch (apiError) {
          // API not available - continue anyway
          console.log('Could not save message to database, using local storage');
        }
      }

      const answer = await askBookAssistant(
        {
          title: book.title,
          author: book.author,
          description: '',
          category: '',
        },
        messageText
      );

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: answer,
        isUser: false,
        timestamp: new Date(),
        replyTo: undefined,
      };
      setMessages(prev => {
        const updated = [...prev, botResponse];
        // Save to local storage
        saveToLocalStorage(updated);
        return updated;
      });

      // Try to save bot response to database if we have a conversation (optional)
      if (conversationId) {
        try {
          const userStr = await AsyncStorage.getItem('user');
          const currentUser = user || (userStr ? JSON.parse(userStr) : null);
          if (currentUser) {
            await apiClient.saveMessage(
              conversationId,
              currentUser.id,
              botResponse.text,
              false,
              undefined
            );
          }
        } catch (apiError) {
          // API not available - continue anyway
          console.log('Could not save response to database, using local storage');
        }
      }
    } catch (e) {
      console.error('Error sending voice message:', e);
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I could not fetch an answer right now. Please try again.',
        isUser: false,
        timestamp: new Date(),
        replyTo: undefined,
      };
      setMessages(prev => {
        const updated = [...prev, botResponse];
        // Save to local storage
        saveToLocalStorage(updated);
        return updated;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
      replyTo: replyingTo || undefined,
    };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      // Save to local storage immediately
      saveToLocalStorage(updated);
      return updated;
    });
    setInputText('');
    setReplyingTo(null);
    setIsTyping(true);

    try {
      // Try to save user message to database if we have a conversation (optional)
      if (conversationId) {
        try {
          const userStr = await AsyncStorage.getItem('user');
          const currentUser = user || (userStr ? JSON.parse(userStr) : null);
          if (currentUser) {
            await apiClient.saveMessage(
              conversationId,
              currentUser.id,
              userMessage.text,
              true,
              undefined
            );
          }
        } catch (apiError) {
          // API not available - continue anyway
          console.log('Could not save message to database, using local storage');
        }
      }

      const answer = await askBookAssistant(
        {
          title: book.title,
          author: book.author,
          description: '',
          category: '',
        },
        inputText.trim()
      );

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: answer,
        isUser: false,
        timestamp: new Date(),
        replyTo: undefined,
      };
      setMessages(prev => {
        const updated = [...prev, botResponse];
        // Save to local storage
        saveToLocalStorage(updated);
        return updated;
      });

      // Try to save bot response to database if we have a conversation (optional)
      if (conversationId) {
        try {
          const userStr = await AsyncStorage.getItem('user');
          const currentUser = user || (userStr ? JSON.parse(userStr) : null);
          if (currentUser) {
            await apiClient.saveMessage(
              conversationId,
              currentUser.id,
              botResponse.text,
              false,
              undefined
            );
          }
        } catch (apiError) {
          // API not available - continue anyway
          console.log('Could not save response to database, using local storage');
        }
      }
    } catch (e) {
      console.error('Error in sendMessage:', e);
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I could not fetch an answer right now. Please try again.',
        isUser: false,
        timestamp: new Date(),
        replyTo: undefined,
      };
      setMessages(prev => {
        const updated = [...prev, botResponse];
        // Save to local storage
        saveToLocalStorage(updated);
        return updated;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const saveToLocalStorage = async (messagesToSave: Message[]) => {
    try {
      const key = `chat:${book.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  };

  const formatTime = (date: Date) => {
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
        {/* Use a ref array to store Animated.Value for each message */}
        {messages.map((message, idx) => {
          if (!translateXRefs.current[idx]) {
            translateXRefs.current[idx] = new Animated.Value(0);
          }
          const translateX = translateXRefs.current[idx];
          const onGestureEvent = Animated.event(
            [{ nativeEvent: { translationX: translateX } }],
            { useNativeDriver: true }
          );
          const onHandlerStateChange = (event: { nativeEvent: { state: number; translationX: number } }) => {
            const { state, translationX: dragX } = event.nativeEvent;
            if (state === 5 /* GestureState.END */) {
              if (dragX > 60) {
                setReplyingTo(message);
                Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
              } else {
                Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
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
                  onLongPress={() => setReplyingTo(message)}
                  activeOpacity={0.85}
                >
                  <Card style={{
                    ...styles.messageBubble,
                    ...(message.isUser ? styles.userBubble : styles.botBubble)
                  }}>
                    {message.replyTo && (
                      <View style={{ marginBottom: 2, paddingLeft: 6, borderLeftWidth: 2, borderLeftColor: colors.primary, opacity: 0.7 }}>
                        <Text style={[commonStyles.textMuted, { fontSize: 12, fontStyle: 'italic' }]} numberOfLines={1}>
                          {message.replyTo.text}
                        </Text>
                      </View>
                    )}
                    {message.isUser ? (
                      <Text style={[commonStyles.text, styles.userText]}>{message.text}</Text>
                    ) : (
                      <Markdown style={markdownStyles}>{message.text}</Markdown>
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
                        onPress={() => setReplyingTo(message)}
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
                Book Assistant is analyzing...
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <Card style={styles.inputCard}>
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
                placeholder={replyingTo ? "Reply to this message..." : "Ask Librant"}
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!isRecording}
                style={[styles.textInput, styles.textInputBorder]}
                containerStyle={{ flex: 1, margin: 0 }}
              />
              <View style={styles.inputButtonsWrapper}>
                <VoiceRecorder
                  onTranscriptionStart={handleVoiceTranscriptionStart}
                  onTranscriptionComplete={handleVoiceTranscriptionComplete}
                  onRecordingStateChange={setIsRecording}
                  disabled={isTyping || isTranscribing}
                />
                {!isRecording && (
                  <TouchableOpacity
                    onPress={sendMessage}
                    disabled={!inputText.trim() || isTyping || isTranscribing}
                    activeOpacity={0.7}
                    style={styles.sendIconButton}
                  >
                    <Image
                      source={require('../../assets/icons/send.png')}
                      style={[
                        styles.sendIcon,
                        (!inputText.trim() || isTyping || isTranscribing) && styles.sendIconDisabled
                      ]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
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
    maxWidth: '85%',
    margin: 0,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  
  userBubble: {
    backgroundColor: colors.primary,
  },
  
  botBubble: {
    backgroundColor: '#F8FAFC',
  },
  
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
  },
  
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
  },
  
  textInput: {
    maxHeight: 100,
    minHeight: 48,
    paddingRight: 80, // Make space for mic + send buttons (28px each + gap)
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
  },
  
  textInputBorder: {
    borderColor: '#000000', // Black border
    borderWidth: 1,
  },
  
  inputButtonsWrapper: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  sendIconButton: {
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  sendIcon: {
    width: 28,
    height: 28,
    tintColor: colors.primary,
  },
  
  sendIconDisabled: {
    opacity: 0.3,
  },
  
  sendButton: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 22,
  },
  bullet_list: {
    marginVertical: 6,
  },
  ordered_list: {
    marginVertical: 6,
  },
  list_item: {
    marginVertical: 2,
  },
  strong: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  paragraph: {
    marginBottom: 6,
  },
  code_inline: {
    backgroundColor: '#EEF2F7',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
});