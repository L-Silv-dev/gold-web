import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VideoProgressIndicator = ({ 
  totalVideos, 
  currentIndex, 
  visible = true 
}) => {
  const progressAnims = useRef(
    Array.from({ length: totalVideos }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Reset all progress bars
    progressAnims.forEach((anim, index) => {
      if (index < currentIndex) {
        // Videos anteriores - completos
        anim.setValue(1);
      } else if (index === currentIndex) {
        // Video atual - animar progresso
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: 1,
          duration: 15000, // 15 segundos por vídeo (ajustar conforme necessário)
          useNativeDriver: false,
        }).start();
      } else {
        // Videos futuros - vazios
        anim.setValue(0);
      }
    });
  }, [currentIndex, progressAnims]);

  if (!visible || totalVideos <= 1) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 20,
      left: 10,
      right: 10,
      flexDirection: 'row',
      gap: 4,
      zIndex: 100,
    }}>
      {progressAnims.map((anim, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              backgroundColor: '#fff',
              width: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
      ))}
    </View>
  );
};

export default VideoProgressIndicator;