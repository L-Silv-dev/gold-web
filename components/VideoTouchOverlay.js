import React, { useState, useRef } from 'react';
import { View, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VideoTouchOverlay = ({ onPress, onDoubleTap, children, style, centerSize = 0.6 }) => {
  const [showIcon, setShowIcon] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const handlePressIn = () => {
    setShowIcon(true);
    
    // Animação de entrada
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    // Animação de saída
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.8,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowIcon(false);
      scaleAnim.setValue(0);
    });
  };

  const isInCenter = (x, y) => {
    const { width, height } = layout;
    if (width === 0 || height === 0) return true;
    const centerW = width * centerSize;
    const centerH = height * centerSize;
    const left = (width - centerW) / 2;
    const top = (height - centerH) / 2;
    return x >= left && x <= left + centerW && y >= top && y <= top + centerH;
  };

  const handlePress = (e) => {
    const x = e.nativeEvent.locationX;
    const y = e.nativeEvent.locationY;
    const now = Date.now();

    if (!isInCenter(x, y)) {
      return;
    }

    // Detectar duplo toque
    if (now - lastTapRef.current.time < 300) {
      onDoubleTap && onDoubleTap();
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }

    lastTapRef.current = { time: now, x, y };
    onPress && onPress();
  };

  return (
    <View
      style={[{ position: 'relative' }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ width, height });
      }}
    >
      {children}
      
      {/* Área tocável central para expansão/duplo toque */}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={{
          position: 'absolute',
          width: `${centerSize * 100}%`,
          height: `${centerSize * 100}%`,
          left: `${(1 - centerSize) * 50}%`,
          top: `${(1 - centerSize) * 50}%`,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'transparent',
          zIndex: 2,
        }}
      >
        {/* Ícone animado de expansão */}
        {showIcon && (
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: 40,
              padding: 20,
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <Ionicons name="expand-outline" size={32} color="#fff" />
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
};

export default VideoTouchOverlay;
