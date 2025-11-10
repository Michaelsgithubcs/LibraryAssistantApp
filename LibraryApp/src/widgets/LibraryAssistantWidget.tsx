import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface LibraryAssistantWidgetProps {
  lastConversation?: string;
  unreadCount?: number;
}

const LibraryAssistantWidget: React.FC<LibraryAssistantWidgetProps> = ({
  lastConversation = '',
  unreadCount = 0
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.widgetButton}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🤖</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount.toString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Library Assistant</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {lastConversation || 'Ask me anything!'}
          </Text>
        </View>

        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>→</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    minHeight: 80,
  },
  widgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    width: '100%',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  icon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  arrowContainer: {
    marginLeft: 8,
  },
  arrow: {
    fontSize: 16,
    color: '#bdc3c7',
  },
});

export default LibraryAssistantWidget;