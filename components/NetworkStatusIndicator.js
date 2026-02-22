import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import { checkConnectivity } from '../utils/networkHelper';

const NetworkStatusIndicator = () => {
  const { theme, isDark } = useThemeContext();
  const [isOnline, setIsOnline] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const hideTimerRef = useRef(null);

  useEffect(() => {
    let interval;
    
    const checkNetworkStatus = async () => {
      const online = await checkConnectivity();
      
      if (online !== isOnline) {
        setIsOnline(online);
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setShowIndicator(true);
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true })
        ]).start();
        hideTimerRef.current = setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.95, duration: 220, useNativeDriver: true })
          ]).start(() => setShowIndicator(false));
        }, 2000);
      }
    };

    // Verificar a cada 6 segundos
    interval = setInterval(checkNetworkStatus, 6000);
    
    // Verificação inicial
    checkNetworkStatus();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isOnline, opacity, scale]);

  if (!showIndicator) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        opacity,
        transform: [{ scale }],
      }}
    >
      <View
        style={{
          backgroundColor: 'rgba(0,0,0,0.65)',
          borderRadius: 14,
          paddingVertical: 16,
          paddingHorizontal: 18,
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 160,
        }}
      >
        <Ionicons 
          name={isOnline ? "wifi-outline" : "wifi-off"}
          size={40}
          color="#fff"
        />
        <Text style={{
          color: '#fff',
          fontSize: 14,
          marginTop: 8,
          fontWeight: '600',
        }}>
          {isOnline ? 'Conectado' : 'Sem Wi‑Fi'}
        </Text>
      </View>
    </Animated.View>
  );
};

export default NetworkStatusIndicator;
