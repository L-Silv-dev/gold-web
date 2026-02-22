import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Dimensions, Text } from 'react-native';
import { Ionicons, MaterialIcons, Entypo } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import { useUserContext } from '../contexts/UserContext';

const { width } = Dimensions.get('window');

export default function BottomNavigation({ setCurrentScreen, onPressAdmin, currentScreen }) {
  const { theme } = useThemeContext();
  const { unreadCount } = useUserContext();
  const SIDEBAR_WIDTH = Math.max(64, Math.min(96, Math.floor(width * 0.08)));

  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        Ionicons.loadFont?.();
        MaterialIcons.loadFont?.();
        Entypo.loadFont?.();
      } catch {}
    }
  }, []);

  // Configuração dos botões da navegação
  const isWeb = Platform.OS === 'web';
  const buttons = [
    {
      key: 'home',
      icon: <Ionicons name="home-outline" size={26} />, // Changed to home icon for clarity
      activeIcon: <Ionicons name="home" size={26} />,
      label: 'Início',
    },
    ...(isWeb ? [{
      key: 'profile',
      icon: <Ionicons name="person-circle-outline" size={26} />,
      activeIcon: <Ionicons name="person-circle" size={26} />,
      label: 'Perfil',
    }] : []),
    {
      key: 'searchUsers',
      icon: <Ionicons name="chatbubbles-outline" size={26} />,
      activeIcon: <Ionicons name="chatbubbles" size={26} />,
      label: 'Chat',
    },
    {
      key: 'books',
      icon: <Ionicons name="library-outline" size={30} />,
      activeIcon: <Ionicons name="library" size={30} />,
      label: 'PDFs',
    },
    {
      key: 'agenda',
      icon: <MaterialIcons name="calendar-today" size={26} />,
      activeIcon: <MaterialIcons name="calendar-today" size={26} />,
      label: 'Agenda',
    },
    {
      key: 'statistics',
      icon: <Entypo name="line-graph" size={26} />,
      activeIcon: <Entypo name="line-graph" size={26} />,
      label: 'Dados',
    },
    ...(isWeb ? [{
      key: 'admin',
      icon: <Ionicons name="shield-checkmark-outline" size={26} />,
      activeIcon: <Ionicons name="shield-checkmark" size={26} />,
      label: 'Admin',
      isAdminButton: true,
    }] : []),
  ];

  const containerStyle = isWeb ? [
    styles.webSidebar,
    { backgroundColor: theme.sidebar || theme.card, borderRightColor: theme.border, width: SIDEBAR_WIDTH }
  ] : [
    styles.container,
    { backgroundColor: theme.sidebar || theme.card, borderTopColor: theme.border }
  ];
  const contentStyle = isWeb ? styles.webContentContainer : styles.contentContainer;

  return (
    <View style={containerStyle} pointerEvents={Platform.OS === 'web' ? 'box-none' : 'auto'}>
      <View style={contentStyle}>
        {buttons.map(btn => {
          const isActive = btn.isAdminButton ? (currentScreen === 'admin' || currentScreen === 'adminInfo') : (currentScreen === btn.key);
          const isHighlight = btn.key === 'books';
          
          return (
            <TouchableOpacity
              key={btn.key}
              onPress={() => btn.isAdminButton ? onPressAdmin() : setCurrentScreen(btn.key)}
              style={[
                isWeb ? styles.webButton : styles.button,
                isHighlight && {
                  transform: isWeb ? undefined : [{ scale: 1.1 }],
                  backgroundColor: isWeb ? undefined : theme.background,
                  borderRadius: isWeb ? 12 : 30,
                  padding: isWeb ? 8 : 10,
                  elevation: isWeb ? 0 : 5,
                  shadowColor: isWeb ? undefined : '#000',
                  shadowOffset: isWeb ? undefined : { width: 0, height: 2 },
                  shadowOpacity: isWeb ? 0 : 0.2,
                  shadowRadius: isWeb ? 0 : 3,
                  marginTop: isWeb ? 0 : -15,
                  borderWidth: isWeb ? 0 : 1,
                  borderColor: isWeb ? undefined : theme.border
                }
              ]}
              accessibilityLabel={btn.label}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                {React.cloneElement(isActive && btn.activeIcon ? btn.activeIcon : btn.icon, {
                  color: isActive || isHighlight ? theme.primary : theme.textSecondary || theme.icon,
                })}
                
                {btn.key === 'searchUsers' && unreadCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#FF3B30', borderColor: theme.sidebar || theme.card }]} />
                )}
              </View>
              {isWeb && (
                <Text style={{ color: isActive ? theme.primary : theme.textSecondary, marginTop: 6, fontSize: 12 }}>
                  {btn.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: Platform.OS === 'ios' ? 85 : 65,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  webSidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    borderRightWidth: 1,
    zIndex: 1000,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  webContentContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    minWidth: 44,
  },
  webButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    width: '100%',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  }
});
