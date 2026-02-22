import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Text } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const ModernVideoPlayer = ({ 
  source, 
  style, 
  resizeMode = ResizeMode.CONTAIN, 
  shouldPlay = false, 
  isLooping = true,
  showMuteButton = true,
  initialMuted = false,
  onPlaybackStatusUpdate
}) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(shouldPlay);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const [progressBarWidth, setProgressBarWidth] = useState(0);

  // Animação do ícone de play/pause
  const iconOpacity = useRef(new Animated.Value(0)).current;

  // Sincronizar com prop shouldPlay
  useEffect(() => {
    // Verificar fonte
    if (shouldPlay && (!source || (!source.uri && typeof source !== 'number'))) {
       setError('Fonte de vídeo inválida');
       return;
    }

    if (shouldPlay) {
      setIsPlaying(true);
      videoRef.current?.playAsync();
    } else {
      setIsPlaying(false);
      videoRef.current?.pauseAsync();
    }
  }, [shouldPlay, source]);

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
      showIconAnimation();
    } else {
      await videoRef.current.playAsync();
      setIsPlaying(true);
      showIconAnimation();
    }
  };

  const showIconAnimation = () => {
    setShowControls(true);
    Animated.sequence([
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(iconOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowControls(false));
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const onPlaybackStatusUpdateInternal = (status) => {
    // Atualizar estado de carregamento
    setIsLoaded(status.isLoaded);

    // Atualizar progresso
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      
      // Limpar erro se carregou com sucesso
      if (error) setError(null);
    }

    // Atualizar estado de buffering apenas se houver mudança real
    if (status.isBuffering !== isBuffering) {
      setIsBuffering(status.isBuffering);
    }
    
    // CORREÇÃO DE BUG: Spinner eterno
    // Se o vídeo estiver tocando, garantimos que o buffering é falso
    if (status.isPlaying) {
      setIsBuffering(false);
    }

    if (status.error) {
      setError(status.error);
      console.log('Video Error:', status.error);
      setIsBuffering(false); // Parar spinner em caso de erro
    }

    if (onPlaybackStatusUpdate) {
      onPlaybackStatusUpdate(status);
    }
  };

  const handleSeek = async (newPosition) => {
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(newPosition);
      setPosition(newPosition);
    }
  };

  // Formatar tempo (mm:ss)
  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Timeout de segurança para não ficar carregando infinitamente
  useEffect(() => {
    let timeout;
    if (isBuffering) {
      timeout = setTimeout(() => {
        // Se após 5 segundos ainda estiver "carregando", forçar parada do spinner
        if (isBuffering) {
             setIsBuffering(false);
        }
      }, 5000); // Reduzido para 5s
    }
    return () => clearTimeout(timeout);
  }, [isBuffering]);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={handlePlayPause}
        style={styles.touchArea}
      >
        <Video
          ref={videoRef}
          source={source}
          style={styles.video}
          resizeMode={resizeMode}
          isLooping={isLooping}
          shouldPlay={shouldPlay}
          isMuted={isMuted}
          onPlaybackStatusUpdate={onPlaybackStatusUpdateInternal}
          useNativeControls={false}
        />

        {/* Overlay de carregamento */}
        {(isBuffering || (shouldPlay && !isLoaded && !error)) && (
          <View style={styles.centerOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}

        {/* Overlay de erro */}
        {error && (
          <View style={styles.centerOverlay}>
            <Ionicons name="alert-circle" size={40} color="#ff6b6b" />
            <Text style={{ color: 'white', marginTop: 10, fontWeight: 'bold' }}>Erro ao reproduzir</Text>
            <TouchableOpacity 
              onPress={() => {
                 setError(null);
                 if (videoRef.current) videoRef.current.replayAsync();
              }}
              style={{
                marginTop: 10,
                paddingHorizontal: 15,
                paddingVertical: 8,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 20
              }}
            >
              <Text style={{ color: 'white' }}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Overlay de ícone Play/Pause */}
        <View style={[styles.centerOverlay, { pointerEvents: 'none' }]}>
          <Animated.View style={{ opacity: iconOpacity }}>
            <View style={styles.iconBackground}>
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={40} 
                color="white" 
              />
            </View>
          </Animated.View>
        </View>

        {/* Botão de Mudo */}
        {showMuteButton && (
          <TouchableOpacity 
            style={styles.muteButton} 
            onPress={toggleMute}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.muteIconContainer}>
              <Ionicons 
                name={isMuted ? "volume-mute" : "volume-high"} 
                size={20} 
                color="white" 
              />
            </View>
          </TouchableOpacity>
        )}

        {/* Barra de Progresso Simples */}
        {duration > 0 && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 30, // Área de toque aumentada
            justifyContent: 'flex-end',
            zIndex: 30,
          }}
          onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => {
                if (progressBarWidth > 0 && duration > 0) {
                  const { locationX } = e.nativeEvent;
                  const percentage = locationX / progressBarWidth;
                  const newPosition = percentage * duration;
                  handleSeek(newPosition);
                }
              }}
              style={{ width: '100%', height: '100%', justifyContent: 'flex-end' }}
            >
              {/* Fundo da barra */}
              <View style={{
                height: 3,
                backgroundColor: 'rgba(255,255,255,0.3)',
                width: '100%',
              }}>
                {/* Progresso */}
                <View style={{
                  height: '100%',
                  backgroundColor: '#fff',
                  width: `${(position / duration) * 100}%`,
                }} />
              </View>
            </TouchableOpacity>
            
            {/* Tempo decorrido (opcional, pequeno no canto) */}
            <Text style={{
              position: 'absolute',
              bottom: 8,
              left: 10,
              color: '#fff',
              fontSize: 10,
              fontWeight: 'bold',
              textShadowColor: 'rgba(0,0,0,0.7)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}>
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconBackground: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
    borderRadius: 50,
  },
  muteButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    zIndex: 20,
  },
  muteIconContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
});

export default ModernVideoPlayer;
