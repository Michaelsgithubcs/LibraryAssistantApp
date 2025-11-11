import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ViewStyle, TextStyle, GestureResponderEvent, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Markdown from 'react-native-markdown-display';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { User } from '../types';
import { apiClient, askLibraryAssistant } from '../services/api';
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
  const [currentRecommendations, setCurrentRecommendations] = useState<any[]>([]);
  const [currentSearchResults, setCurrentSearchResults] = useState<any[]>([]);
  const [currentComparisonResults, setCurrentComparisonResults] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Create refs for message animations
  const messageAnimations = useRef<{[key: string]: Animated.Value}>({})
  const syncIntervalRef = useRef<any>(null);

  // Initialize and sync messages from database
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const welcomeMsg: Message = {
          id: '1',
          text: `Hello ${user.username}! 👋 I'm your Library Assistant. I can help you with:\n\n• Finding books and authors\n• Library policies and hours\n• Account information\n• Reading recommendations\n• General library questions\n\nWhat would you like to know?`,
          isUser: false,
          timestamp: new Date()
        };
        
        // Try to load from database first (primary source of truth)
        try {
          // Get or create conversation
          const conversations = await apiClient.getConversations(user.id);
          let conversation = conversations.find((c: any) => c.conversation_type === 'library');
          
          if (!conversation) {
            // Create new conversation and save welcome message
            conversation = await apiClient.createConversation(
              user.id,
              'library',
              undefined,
              'Library Assistant Chat'
            );
            await apiClient.saveMessage(
              conversation.id,
              user.id,
              welcomeMsg.text,
              false,
              undefined
            );
          }
          
          setConversationId(conversation.id);

          // Load messages from database
          const dbMessages = await apiClient.getMessages(conversation.id);
          if (dbMessages.length > 0) {
            const parsed: Message[] = dbMessages.map((m: any) => ({
              id: m.id.toString(),
              text: m.message_text,
              isUser: m.is_user_message,
              timestamp: new Date(m.created_at),
            }));
            setMessages(parsed);
            console.log(`Loaded ${parsed.length} messages from database`);
          } else {
            // No messages yet, show welcome
            setMessages([welcomeMsg]);
          }
        } catch (apiError) {
          // API not available - fallback to local storage
          console.log('Database unavailable, using local storage');
          const key = `chat:library:${user.id}`;
          const raw = await AsyncStorage.getItem(key);
          
          if (raw) {
            const parsed: Message[] = JSON.parse(raw).map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }));
            setMessages(parsed);
          } else {
            setMessages([welcomeMsg]);
          }
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        // Final fallback
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

  // Sync messages every 5 seconds to keep all devices in sync
  useEffect(() => {
    if (!conversationId) return;

    const syncMessages = async () => {
      try {
        const dbMessages = await apiClient.getMessages(conversationId);
        const parsed: Message[] = dbMessages.map((m: any) => ({
          id: m.id.toString(),
          text: m.message_text,
          isUser: m.is_user_message,
          timestamp: new Date(m.created_at),
        }));
        
        // Only update if messages changed
        setMessages(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
            console.log('Messages synced from database');
            return parsed;
          }
          return prev;
        });
      } catch (error) {
        console.log('Sync failed, will retry');
      }
    };

    // Start syncing every 5 seconds
    syncIntervalRef.current = setInterval(syncMessages, 5000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const generateResponse = async (userMessage: string): Promise<string> => {
    try {
      // Use the AI-powered library assistant
      const response = await askLibraryAssistant(user.id, userMessage);

      // Store recommendations if available
      if (response.has_recommendations && response.recommendations.length > 0) {
        setCurrentRecommendations(response.recommendations);
      } else {
        setCurrentRecommendations([]);
      }

      // Store search results if available
      if (response.search_results && response.search_results.length > 0) {
        setCurrentSearchResults(response.search_results);
      } else {
        setCurrentSearchResults([]);
      }

      // Store comparison results if available
      if (response.comparison_results && response.comparison_results.length > 0) {
        setCurrentComparisonResults(response.comparison_results);
      } else {
        setCurrentComparisonResults([]);
      }

      return response.answer;
    } catch (error) {
      console.error('Error getting AI response:', error);

      // Fallback to basic responses if AI fails
      const message = userMessage.toLowerCase();

      // Library hours
      if (message.includes('hour') || message.includes('open') || message.includes('close')) {
        return "� Library Hours:\n\nMonday - Friday: 8:00 AM - 8:00 PM\nSaturday: 9:00 AM - 6:00 PM\nSunday: 12:00 PM - 5:00 PM\n\nWe're closed on public holidays. You can return books 24/7 using our book drop box!";
      }

      // Default fallback
      return "I'm currently experiencing some technical difficulties, but I'm here to help! Please try your question again in a moment, or feel free to ask about:\n\n• Book recommendations\n• Library hours and policies\n• Your account information\n• Reading suggestions";
    }
  };

  const saveToLocalStorage = async (messagesToSave: Message[]) => {
    try {
      const key = `chat:library:${user.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  };

  const saveMessageToDatabase = async (messageText: string, isUserMessage: boolean) => {
    if (!conversationId) return;
    
    try {
      await apiClient.saveMessage(
        conversationId,
        user.id,
        messageText,
        isUserMessage,
        undefined
      );
      console.log(`Message saved to database (user: ${isUserMessage})`);
    } catch (error) {
      console.error('Failed to save message to database:', error);
      // Fallback to local storage only
      saveToLocalStorage(messages);
    }
  };

  const handleVoiceTranscriptionStart = () => {
    // Don't show "Transcribing..." immediately - just clear reply state
    setReplyingTo(null);
  };

  const handleVoiceTranscriptionComplete = async (transcribedText: string) => {
    if (!transcribedText.trim()) {
      return;
    }

    // Show "Transcribing..." message briefly AFTER speech ends
    const messageId = `transcribing-${Date.now()}`;
    const transcribingMessage: Message = {
      id: messageId,
      text: 'Transcribing...',
      isUser: true,
      timestamp: new Date(),
    };
    
    setTranscribingMessageId(messageId);
    setMessages(prev => [...prev, transcribingMessage]);
    setIsTranscribing(true);

    // Wait a moment to show transcribing status
    await new Promise<void>(resolve => setTimeout(() => resolve(), 300));

    // Replace "Transcribing..." with the actual transcribed text
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId
          ? { ...m, text: transcribedText }
          : m
      )
    );
    
    // Clear transcribing state immediately after replacing text
    setIsTranscribing(false);
    setTranscribingMessageId(null);

    // Send the transcribed text to the AI (will be saved to database)
    await sendVoiceMessage(transcribedText);
  };

  const sendVoiceMessage = async (messageText: string) => {
    setIsTyping(true);

    // Save user message to database
    await saveMessageToDatabase(messageText, true);

    // Simulate typing delay
    setTimeout(async () => {
      try {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: await generateResponse(messageText),
          isUser: false,
          timestamp: new Date(),
        };

        // Update UI immediately
        setMessages(prev => {
          const updated = [...prev, botResponse];
          saveToLocalStorage(updated);
          return updated;
        });

        // Save bot response to database
        await saveMessageToDatabase(botResponse.text, false);
      } catch (error) {
        console.error('Error in sendVoiceMessage:', error);
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date(),
        };

        setMessages(prev => {
          const updated = [...prev, errorResponse];
          saveToLocalStorage(updated);
          return updated;
        });

        await saveMessageToDatabase(errorResponse.text, false);
      } finally {
        setIsTyping(false);
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

    // Update UI immediately
    setMessages(prev => {
      const updated = [...prev, userMessage];
      saveToLocalStorage(updated);
      return updated;
    });

    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(true);
    setReplyingTo(null);

    // Save user message to database
    await saveMessageToDatabase(messageText, true);

    // Simulate typing delay
    setTimeout(async () => {
      try {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: await generateResponse(messageText),
          isUser: false,
          timestamp: new Date(),
          replyTo: userMessage
        };

        // Update UI immediately
        setMessages(prev => {
          const updated = [...prev, botResponse];
          saveToLocalStorage(updated);
          return updated;
        });

        // Save bot response to database
        await saveMessageToDatabase(botResponse.text, false);
      } catch (error) {
        console.error('Error in sendMessage:', error);
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date(),
          replyTo: userMessage
        };

        setMessages(prev => {
          const updated = [...prev, errorResponse];
          saveToLocalStorage(updated);
          return updated;
        });

        await saveMessageToDatabase(errorResponse.text, false);
      } finally {
        setIsTyping(false);
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 70 : 0}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
                      <Markdown style={message.isUser ? markdownStylesUser : markdownStylesBot}>
                        {message.text}
                      </Markdown>
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

        {/* Book Recommendations Display */}
        {currentRecommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>📚 Recommended for You</Text>
            {currentRecommendations.map((book, index) => (
              <TouchableOpacity
                key={`rec-${index}`}
                style={styles.recommendationCard}
                onPress={() => {
                  // Navigate to book details or add to conversation
                  const bookQuery = `Tell me more about "${book.title}" by ${book.author}`;
                  setInputText(bookQuery);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.recommendationContent}>
                  <View style={styles.recommendationText}>
                    <Text style={styles.recommendationBookTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={styles.recommendationBookAuthor} numberOfLines={1}>
                      by {book.author}
                    </Text>
                    <Text style={styles.recommendationBookCategory}>
                      {book.category}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.recommendationAction}
                    onPress={() => {
                      const reserveQuery = `How can I reserve "${book.title}"?`;
                      setInputText(reserveQuery);
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.recommendationActionText}>Reserve</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.clearRecommendations}
              onPress={() => setCurrentRecommendations([])}
              activeOpacity={0.6}
            >
              <Text style={styles.clearRecommendationsText}>Hide recommendations</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Book Search Results Display */}
        {currentSearchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>🔍 Search Results</Text>
            {currentSearchResults.map((book, index) => (
              <TouchableOpacity
                key={`search-${index}`}
                style={styles.searchResultCard}
                onPress={() => {
                  const bookQuery = `Tell me more about "${book.title}" by ${book.author}`;
                  setInputText(bookQuery);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.searchResultContent}>
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultBookTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={styles.searchResultBookAuthor} numberOfLines={1}>
                      by {book.author}
                    </Text>
                    <Text style={styles.searchResultBookCategory}>
                      {book.category}
                    </Text>
                    <Text style={styles.searchResultAvailability}>
                      {book.available_copies} of {book.total_copies} available
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.searchResultAction}
                    onPress={() => {
                      const reserveQuery = `How can I reserve "${book.title}"?`;
                      setInputText(reserveQuery);
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.searchResultActionText}>Reserve</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.clearSearchResults}
              onPress={() => setCurrentSearchResults([])}
              activeOpacity={0.6}
            >
              <Text style={styles.clearSearchResultsText}>Hide search results</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Book Comparison Results Display */}
        {currentComparisonResults.length > 0 && (
          <View style={styles.comparisonResultsContainer}>
            <Text style={styles.comparisonResultsTitle}>⚖️ Book Comparison</Text>
            {currentComparisonResults.map((book, index) => (
              <View key={`compare-${index}`} style={styles.comparisonResultCard}>
                <View style={styles.comparisonResultHeader}>
                  <Text style={styles.comparisonResultNumber}>{index + 1}</Text>
                  <View style={styles.comparisonResultText}>
                    <Text style={styles.comparisonResultBookTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={styles.comparisonResultBookAuthor} numberOfLines={1}>
                      by {book.author}
                    </Text>
                  </View>
                </View>
                <View style={styles.comparisonResultDetails}>
                  <Text style={styles.comparisonResultCategory}>
                    📂 {book.category}
                  </Text>
                  <Text style={styles.comparisonResultDate}>
                    📅 {book.publish_date || 'Unknown'}
                  </Text>
                  <Text style={styles.comparisonResultAvailability}>
                    📊 {book.available_copies}/{book.total_copies} available
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.comparisonResultAction}
                  onPress={() => {
                    const compareQuery = `Compare "${book.title}" with the other books`;
                    setInputText(compareQuery);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.comparisonResultActionText}>Compare</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.clearComparisonResults}
              onPress={() => setCurrentComparisonResults([])}
              activeOpacity={0.6}
            >
              <Text style={styles.clearComparisonResultsText}>Hide comparison</Text>
            </TouchableOpacity>
          </View>
        )}

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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingHorizontal: 4 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[commonStyles.textMuted, { fontSize: 12 }]}>Replying to:</Text>
                <Text style={[commonStyles.textMuted, { fontSize: 12, fontStyle: 'italic' }]} numberOfLines={2}>{replyingTo.text}</Text>
              </View>
                            <Button
                title="Cancel"
                variant="outline"
                style={{ height: 40, minHeight: 40, paddingHorizontal: 8, paddingVertical: 4 }}
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
  
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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

  // Recommendations Styles
  recommendationsContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },

  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },

  recommendationCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },

  recommendationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  recommendationText: {
    flex: 1,
  },

  recommendationBookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },

  recommendationBookAuthor: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },

  recommendationBookCategory: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },

  recommendationAction: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  recommendationActionText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },

  clearRecommendations: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },

  clearRecommendationsText: {
    fontSize: 14,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },

  // Search Results Styles
  searchResultsContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },

  searchResultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },

  searchResultCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchResultText: {
    flex: 1,
  },

  searchResultBookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },

  searchResultBookAuthor: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },

  searchResultBookCategory: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 4,
  },

  searchResultAvailability: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },

  searchResultAction: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  searchResultActionText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },

  clearSearchResults: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },

  clearSearchResultsText: {
    fontSize: 14,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },

  // Comparison Results Styles
  comparisonResultsContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },

  comparisonResultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },

  comparisonResultCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  comparisonResultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  comparisonResultNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 12,
    minWidth: 24,
  },

  comparisonResultText: {
    flex: 1,
  },

  comparisonResultBookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },

  comparisonResultBookAuthor: {
    fontSize: 14,
    color: colors.text.secondary,
  },

  comparisonResultDetails: {
    marginBottom: 12,
  },

  comparisonResultCategory: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 4,
  },

  comparisonResultDate: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },

  comparisonResultAvailability: {
    fontSize: 14,
    color: colors.success,
  },

  comparisonResultAction: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },

  comparisonResultActionText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },

  clearComparisonResults: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },

  clearComparisonResultsText: {
    fontSize: 14,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },
});

const markdownStylesBot = StyleSheet.create({
  body: {
    color: colors.text.primary,
    fontSize: 15,
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

const markdownStylesUser = StyleSheet.create({
  body: {
    color: colors.text.inverse,
    fontSize: 15,
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
    color: colors.text.inverse,
  },
  paragraph: {
    marginBottom: 6,
  },
  code_inline: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
});