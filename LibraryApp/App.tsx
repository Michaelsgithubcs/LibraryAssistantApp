import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Text, View, TouchableOpacity } from 'react-native';
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
import { useNotifications } from './src/components/NotificationProvider';
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
            backgroundColor: '#FF3B30',
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
          tabBarIcon: ({ size, focused }) => {
            const { unreadCount } = useNotifications();
            return (
              <View style={{ alignItems: 'center' }}>
                {focused ? (
                  <BellIconFilled width={size ?? 24} height={size ?? 24} />
                ) : (
                  <BellIcon width={size ?? 24} height={size ?? 24} />
                )}
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: 2,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: colors.primary,
                    borderWidth: 1,
                    borderColor: colors.surface,
                  }} />
                )}
              </View>
            );
          },
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

const MainNavigator = ({ user }: { user: any }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
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
        name="BorrowedBooks" 
        options={{ title: 'Books Borrowed' }}
      >
        {(props) => <BorrowedBooksScreen {...props} user={user} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();
  const [isNotificationVisible, setIsNotificationVisible] = React.useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NotificationProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Screen 
              name="Main" 
              children={() => <MainNavigator user={user} />}
              options={{
                headerShown: false
              }}
            />
          ) : (
            <Stack.Screen name="Login">
              {() => (
                <LoginScreen 
                  onLogin={(user) => {
                    // Handle login logic here
                    console.log('Login attempt with user:', user);
                  }} 
                />
              )}
            </Stack.Screen>
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