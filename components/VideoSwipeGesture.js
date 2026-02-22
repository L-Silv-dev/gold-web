import React from 'react';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { View } from 'react-native';

const VideoSwipeGesture = ({ children, onSwipeUp, onSwipeDown, onTap }) => {
  const handleGestureEvent = (event) => {
    const { translationY, velocityY, state } = event.nativeEvent;
    
    if (state === State.END) {
      // Detectar swipe para cima (próximo vídeo)
      if (translationY < -50 && velocityY < -500) {
        onSwipeUp && onSwipeUp();
      }
      // Detectar swipe para baixo (vídeo anterior)
      else if (translationY > 50 && velocityY > 500) {
        onSwipeDown && onSwipeDown();
      }
      // Detectar toque simples
      else if (Math.abs(translationY) < 10 && Math.abs(velocityY) < 100) {
        onTap && onTap();
      }
    }
  };

  return (
    <PanGestureHandler onHandlerStateChange={handleGestureEvent}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </PanGestureHandler>
  );
};

export default VideoSwipeGesture;