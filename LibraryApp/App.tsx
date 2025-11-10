import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Text, View, TouchableOpacity, AppState } from 'react-native';
import HomeIcon from './assets/icons/home.svg';
import HomeIconFilled from './assets/icons/home-clicked.svg';
import BooksIcon from './assets/icons/book.svg';
import BooksIconFilled from './assets/icons/book-clicked.svg';
import StoreIcon from './assets/icons/store.svg';
import StoreIconFilled from './assets/icons/store-clicked.svg';
import BellIcon from './assets/icons/notifications.svg';
import BellIconFilled from './assets/icons/notifications-clicked.svg';
import MoreIcon from './assets/icons/more.svg';
import MoreIconFilled from './assets/icons/more-clicked.svg';

import { Provider } from 'react-redux';
import { store } from './src/store';
import { useAuth } from './src/hooks/useAuth';
import { LoginScreen } from './src/screens/LoginScreen';
import { AccountRequestScreen } from './src/screens/AccountRequestScreen';
import { useNotifications, NotificationContext } from './src/components/NotificationProvider';
import NotificationProvider from './src/components/NotificationProvider';

// Define LoginScreen props type
interface LoginScreenProps {
  onLogin: (user: any) => void;  // Matches the LoginScreen implementation
}
import { DashboardScreen } from './src/screens/DashboardScreen';
import { MyBooksScreen } from './src/screens/MyBooksScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { FinesScreen } from './src/screens/FinesScreen';
import { EbookStoreScreen } from './src/screens/EbookStoreScreen';
import { ChatbotScreen } from './src/screens/ChatbotScreen';
import { BookChatScreen } from './src/screens/BookChatScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { OverdueBooksScreen } from './src/screens/OverdueBooksScreen';
import { BorrowedBooksScreen } from './src/screens/BorrowedBooksScreen';
import { ReservationsScreen } from './src/screens/ReservationsScreen';

import { colors } from './src/styles/colors';
import { useDispatch, useSelector } from 'react-redux';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Notification header button component
const NotificationHeaderButton = ({ onPress }: { onPress: () => void }) => {
  // For now, we'll use a placeholder for the badge count
  const unreadCount = 0;
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={{
        marginRight: 16,
        position: 'relative',
        padding: 4,
      }}
    >
      {unreadCount > 0 ? (
        <BellIconFilled width={24} height={24} />
      ) : (
        <BellIcon width={24} height={24} />
      )}
      {unreadCount > 0 && (
        <View
          style={{
            position: 'absolute',
            right: -4,
            top: -4,
            backgroundColor: colors.success,
            borderRadius: 8,
            width: 16,
            height: 16,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Notification Tab Icon Component that properly subscribes to Redux
const NotificationTabIcon = ({ size, focused }: { size?: number; focused: boolean }) => {
  // Connect directly to Redux store
  const unreadCount = useSelector((state: any) => state.notifications.unreadCount);
  
  return (
    <View style={{ alignItems: 'center', position: 'relative' }}>
      {focused ? (
        <BellIconFilled width={size ?? 24} height={size ?? 24} />
      ) : (
        <BellIcon width={size ?? 24} height={size ?? 24} />
      )}
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute',
          top: -2,
          right: -4,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.success,
          borderWidth: 1,
          borderColor: colors.surface,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 1,
          elevation: 2,
        }} />
      )}
    </View>
  );
};

const TabNavigator = ({ user }: { user: any }) => {
  const DashboardComponent = React.useCallback((props: any) => <DashboardScreen {...props} user={user} />, [user]);
  const MyBooksComponent = React.useCallback((props: any) => <MyBooksScreen {...props} user={user} />, [user]);
  const NotificationsComponent = React.useCallback((props: any) => <NotificationsScreen {...props} user={user} />, [user]);
  const EbookStoreComponent = React.useCallback((props: any) => <EbookStoreScreen {...props} user={user} />, [user]);
  const MoreComponent = React.useCallback((props: any) => <MoreScreen {...props} user={user} />, [user]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.primary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.primary,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardComponent}
        options={{ 
          title: 'Home',
          tabBarLabel: () => (
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Home</Text>
          ),
          tabBarIcon: ({ size, focused }) => (
            <View style={{ alignItems: 'center' }}>
              {focused ? (
                <HomeIconFilled width={size ?? 24} height={size ?? 24} />
              ) : (
                <HomeIcon width={size ?? 24} height={size ?? 24} />
              )}
            </View>
          ),
        }}
      />
      
      <Tab.Screen 
        name="MyBooks" 
        component={MyBooksComponent}
        options={{ 
          title: 'Books',
          tabBarLabel: () => (
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Books</Text>
          ),
          tabBarIcon: ({ size, focused }) => (
            <View style={{ alignItems: 'center' }}>
              {focused ? (
                <BooksIconFilled width={size ?? 24} height={size ?? 24} />
              ) : (
                <BooksIcon width={size ?? 24} height={size ?? 24} />
              )}
            </View>
          ),
        }}
      />
      
      <Tab.Screen 
        name="EStore" 
        component={EbookStoreComponent}
        options={{ 
          title: 'EStore',
          tabBarLabel: () => (
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>EStore</Text>
          ),
          tabBarIcon: ({ size, focused }) => (
            <View style={{ alignItems: 'center' }}>
              {focused ? (
                <StoreIconFilled width={size ?? 24} height={size ?? 24} />
              ) : (
                <StoreIcon width={size ?? 24} height={size ?? 24} />
              )}
            </View>
          ),
        }}
      />
      
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsComponent}
        options={{ 
          title: 'Notifications',
          tabBarLabel: () => (
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Notifications</Text>
          ),
          tabBarIcon: ({ size, focused }) => (
            <NotificationTabIcon size={size} focused={focused} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="More" 
        component={MoreComponent}
        options={{ 
          title: 'More',
          tabBarLabel: () => (
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>More</Text>
          ),
          tabBarIcon: ({ size, focused }) => (
            <View style={{ alignItems: 'center' }}>
              {focused ? (
                <MoreIconFilled width={size ?? 24} height={size ?? 24} />
              ) : (
                <MoreIcon width={size ?? 24} height={size ?? 24} />
              )}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Removed NotificationManager component - moved logic directly to AppContent

const MainNavigator = ({ user }: { user: any }) => {
  const dispatch = useDispatch();
  const previousNotificationIds = React.useRef<Set<number>>(new Set());

  // Global notification polling - works across all screens
  React.useEffect(() => {
    if (!user) return;

    const pollNotifications = async () => {
      try {
        const { notificationApi } = await import('./src/services/api');
        const NotificationService = require('./src/services/NotificationService').default;
        const { setUnreadCount } = await import('./src/store/slices/notificationSlice');
        
        const list = await notificationApi.getUserNotifications(user.id);
        const unread = Array.isArray(list) ? list.filter((n: any) => n.is_read === 0).length : 0;
        dispatch(setUnreadCount(unread));
        
        // Check for new notifications and trigger push notifications
        if (Array.isArray(list)) {
          const isFirstLoad = previousNotificationIds.current.size === 0;
          
          list.forEach((notification: any) => {
            const notifId = notification.id;
            
            if (!previousNotificationIds.current.has(notifId)) {
              previousNotificationIds.current.add(notifId);
              
              // Only trigger push notification if this is NOT the first load
              if (!isFirstLoad) {
                NotificationService.showLocalNotification({
                  title: notification.title || 'Library Notification',
                  message: notification.message || '',
                  data: {
                    type: notification.type || 'info',
                    notificationId: notifId,
                    ...(notification.data ? JSON.parse(notification.data) : {})
                  }
                });
                
                console.log(`🔔 Push notification sent: ${notification.title}`);
              }
            }
          });
        }
      } catch (e) {
        console.log('Error polling notifications:', e);
      }
    };

    // Poll immediately on mount
    pollNotifications();

    // Then poll every 5 seconds
    const interval = setInterval(pollNotifications, 5000);

    return () => clearInterval(interval);
  }, [user, dispatch]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text.inverse,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        options={{ headerShown: false }}
      >
        {() => <TabNavigator user={user} />}
      </Stack.Screen>
      <Stack.Screen 
        name="BookChat" 
        options={{ title: 'Book Discussion' }}
        component={BookChatScreen as any}
      />
      <Stack.Screen 
        name="EbookStore" 
        options={{ title: 'Ebook Store' }}
      >
        {(props) => <EbookStoreScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen 
        name="Chatbot" 
        options={{ title: 'Library Assistant' }}
      >
        {(props) => <ChatbotScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen 
        name="OverdueBooks" 
        options={{ title: 'Overdue Books' }}
      >
        {(props) => <OverdueBooksScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen 
        name="Fines" 
        options={{ title: 'My Fines' }}
      >
        {(props) => <FinesScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen 
        name="Reservations" 
        options={{ title: 'Reservations' }}
      >
        {(props) => <ReservationsScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen 
        name="BorrowedBooks" 
        options={{ title: 'Books Borrowed' }}
      >
        {(props) => <BorrowedBooksScreen {...props} user={user} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const AppContent = () => {
  // Remove the navigation key remounting that causes conflicts
  const { user, loading, authStateVersion } = useAuth();
  const [isNotificationVisible, setIsNotificationVisible] = React.useState(false);
  
  // Track previous auth state to detect changes
  const prevUserRef = React.useRef(user);
  
  React.useEffect(() => {
    if (prevUserRef.current !== user) {
      console.log('User state changed:', user ? 'Logged in' : 'Logged out');
      prevUserRef.current = user;
    }
  }, [user, authStateVersion]); // Add authStateVersion to dependencies
  
  // Create a ref to hold the notification service
  const notificationServiceRef = React.useRef<any>(null);
  
  // Handle app state changes directly without using notification context
  React.useEffect(() => {
    // Import notification service directly to avoid circular dependencies
    const NotificationService = require('./src/services/NotificationService').default;
    notificationServiceRef.current = NotificationService;
    
    // Reset badge count on app startup
    NotificationService.resetBadgeCount();
    
    // Add AppState listener
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('App came to foreground, resetting notification badges');
        NotificationService.resetBadgeCount();
      }
    });
    
    // Clean up on unmount
    return () => {
      appStateSubscription.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NotificationProvider>
      <NavigationContainer key={`nav-${authStateVersion}`}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            // Authenticated screens
            <>
              <Stack.Screen 
                name="Main" 
                children={() => <MainNavigator user={user} />}
                options={{
                  headerShown: false
                }}
              />
              <Stack.Screen 
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="AccountRequest"
                component={AccountRequestScreen}
                options={{ 
                  headerShown: true,
                  title: 'Request Account',
                  headerBackTitle: 'Back'
                }}
              />
            </>
          ) : (
            // Unauthenticated screens
            <>
              <Stack.Screen 
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="AccountRequest"
                component={AccountRequestScreen}
                options={{ 
                  headerShown: true,
                  title: 'Request Account',
                  headerBackTitle: 'Back'
                }}
              />
            </>
          )}
        </Stack.Navigator>
        
        {/* Notification Modal */}
        {isNotificationVisible && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 10,
              width: '90%',
              maxHeight: '80%',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Notifications</Text>
                <TouchableOpacity onPress={() => setIsNotificationVisible(false)}>
                  <Text style={{ fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              </View>
              {user ? (
                <View style={{ flex: 1 }}>
                  <NotificationsScreen 
                    user={user}
                    navigation={{
                      navigate: () => {},
                      goBack: () => {},
                      addListener: () => () => {},
                      isFocused: () => true,
                      canGoBack: () => true,
                      dispatch: () => {},
                      reset: () => {},
                      setParams: () => {},
                      setOptions: () => {},
                      getState: () => ({
                        routes: [],
                        index: 0,
                        routeNames: [],
                        type: 'stack',
                        key: 'stack',
                        stale: false
                      } as any),
                      getId: () => '1',
                      getParent: () => undefined,
                    }}
                  />
                </View>
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text>Please log in to view notifications</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </NavigationContainer>
    </NotificationProvider>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;