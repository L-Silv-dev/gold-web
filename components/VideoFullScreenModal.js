import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  Dimensions,
  TouchableOpacity,
  Text,
  StatusBar,
  SafeAreaView,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import ModernVideoPlayer from './ModernVideoPlayer';
import VideoProgressIndicator from './VideoProgressIndicator';
import { useThemeContext } from '../contexts/ThemeContext';
import { useUserContext } from '../contexts/UserContext';
import { togglePostLike, deletePost } from '../services/postService';
import { countCommentsByPostId } from '../services/commentService';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../utils/supabase';
import useVideoFullScreen from '../hooks/useVideoFullScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VideoFullScreenModal = ({ 
  visible, 
  onClose, 
  videos = [], 
  initialIndex = 0,
  onVideoChange,
  setCurrentScreen,
  navigation
}) => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef(null);

  // Usar hook personalizado para gerenciar estado dos vídeos
  const {
    videosState,
    commentsCount,
    likingPosts,
    currentIndex,
    setCurrentIndex,
    updateVideoState,
    removeVideo,
    setLiking
  } = useVideoFullScreen(videos);

  // Buscar usuário atual
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (initialIndex !== currentIndex) {
      setCurrentIndex(initialIndex);
    }
    if (flatListRef.current && initialIndex >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false
        });
      }, 100);
    }
  }, [visible, initialIndex, currentIndex]);

  // Carregar contagem de comentários
  const loadCommentsCount = async (videoList) => {
    const counts = {};
    for (const video of videoList) {
      const { data: count } = await countCommentsByPostId(video.id);
      counts[video.id] = count || 0;
    }
    setCommentsCount(counts);
  };

  

  // Função para curtir/descurtir post
  const handleLike = async (postId, currentLiked, currentLikeCount) => {
    if (likingPosts.has(postId)) return;

    // Atualizar UI imediatamente (otimista)
    updateVideoState(postId, {
      is_liked: !currentLiked,
      like_count: currentLiked ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1
    });

    setLiking(postId, true);

    try {
      const { data, error } = await togglePostLike(postId);
      
      if (error) {
        // Reverter mudança em caso de erro
        updateVideoState(postId, {
          is_liked: currentLiked,
          like_count: currentLikeCount
        });
        showToast("Não foi possível atualizar seu like. Tente novamente.", 'error');
      } else if (data) {
        // Atualizar com dados reais do servidor
        updateVideoState(postId, {
          is_liked: data.is_liked,
          like_count: data.like_count
        });
      }
    } catch (error) {
      // Reverter mudança em caso de erro
      updateVideoState(postId, {
        is_liked: currentLiked,
        like_count: currentLikeCount
      });
      console.error('Erro ao curtir post:', error);
    } finally {
      setLiking(postId, false);
    }
  };

  // Função para excluir post
  const handleDeletePost = async (postId) => {
    Alert.alert(
      "Excluir Vídeo",
      "Tem certeza que deseja excluir este vídeo?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          onPress: async () => {
            try {
              const { data, error } = await deletePost(postId);
              
              if (error) {
                showToast(error.message || "Ocorreu um erro ao excluir o vídeo.", 'error');
                return;
              }
              
              // Remover o vídeo da lista localmente
              removeVideo(postId);
              
              // Se não há mais vídeos, fechar o modal
              if (videosState.length <= 1) {
                onClose();
              }
              
              showToast("Vídeo excluído com sucesso!", 'success');
            } catch (error) {
              console.error("Erro ao excluir vídeo:", error);
              showToast("Ocorreu um erro ao excluir o vídeo.", 'error');
            }
          }
        }
      ]
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      setCurrentIndex(newIndex);
      if (onVideoChange) {
        onVideoChange(newIndex);
      }
    }
  }).current;

  // Função para alternar visibilidade dos controles
  const toggleControls = () => {
    const newShowControls = !showControls;
    setShowControls(newShowControls);
    
    Animated.timing(controlsOpacity, {
      toValue: newShowControls ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Auto-hide dos controles após 3 segundos
  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => {
        setShowControls(false);
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showControls, controlsOpacity]);

  // Mostrar controles quando o modal abrir
  useEffect(() => {
    if (visible) {
      setShowControls(true);
      controlsOpacity.setValue(1);
    }
  }, [visible]);

  const renderVideoItem = ({ item: video, index }) => {
    const isCurrentVideo = index === currentIndex;
    
    return (
      <PanGestureHandler
        onHandlerStateChange={(event) => {
          if (event.nativeEvent.state === State.END) {
            const { translationX, velocityX } = event.nativeEvent;
            
            // Detectar swipe horizontal para fechar
            if (Math.abs(translationX) > 100 && Math.abs(velocityX) > 500) {
              onClose();
            }
          }
        }}
      >
        <View style={{ 
          width: SCREEN_WIDTH, 
          height: SCREEN_HEIGHT,
          backgroundColor: '#000',
          position: 'relative'
        }}>
          {/* Área tocável para mostrar/esconder controles */}
          <TouchableOpacity 
            activeOpacity={1}
            onPress={toggleControls}
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
              justifyContent: 'center', // Centralizar verticalmente
              backgroundColor: '#000', // Garantir fundo preto
            }}
          >
            {/* Player de vídeo */}
            <ModernVideoPlayer
              source={{ uri: video.post_videos?.[0]?.video_url || video.video_url }}
              style={{ 
                width: '100%', 
                height: '70%', // Aumentando as barras pretas (30% de espaço)
                alignSelf: 'center',
              }}
              resizeMode={ResizeMode.COVER}
              isLooping={true}
              shouldPlay={isCurrentVideo}
              showMuteButton={false} // Vamos usar nosso próprio botão
              initialMuted={false}
            />
          </TouchableOpacity>
          
          {/* Informações do autor, botões e controles movidos para fora do FlatList para ficarem fixos */}
        </View>
      </PanGestureHandler>
    );
  };

  // Vídeo atual para os controles fixos
  const currentVideo = videosState[currentIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Indicador de progresso dos vídeos */}
        <VideoProgressIndicator
          totalVideos={videosState.length}
          currentIndex={currentIndex}
          visible={showControls}
        />
        
        <FlatList
          ref={flatListRef}
          data={videosState}
          renderItem={renderVideoItem}
          keyExtractor={(item, index) => `video-${item.id || index}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50
          }}
          getItemLayout={(data, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
          initialScrollIndex={initialIndex}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ 
                index: info.index, 
                animated: false 
              });
            });
          }}
        />

        {/* Botões de ação lateral - Fixos na tela e sobrepondo tudo */}
        
        {/* Botão de fechar/voltar - SEMPRE visível, independente do vídeo carregar */}
        <TouchableOpacity 
          style={{
            position: 'absolute',
            top: 50,
            left: 20,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 20,
            padding: 10,
            zIndex: 1001, // Z-index superior a tudo
            elevation: 1001,
          }}
          onPress={onClose}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {currentVideo && (
          <>
            {/* Indicador de posição */}
            <View style={{
              position: 'absolute',
              top: 50,
              right: 20,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 15,
              paddingHorizontal: 12,
              paddingVertical: 6,
              zIndex: 1000,
            }}>
              <Text style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: '600',
              }}>
                {currentIndex + 1} / {videosState.length}
              </Text>
            </View>

            {/* Informações do autor */}
            <View
              style={{
                position: 'absolute',
                bottom: 20,
                left: 0,
                right: 80, // Dar espaço para os botões laterais
                paddingHorizontal: 20,
                justifyContent: 'flex-end',
                zIndex: 1000,
                elevation: 1000,
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  onPress={() => {
                    if (currentUser && currentVideo.author_id === currentUser.id) {
                      onClose();
                      setCurrentScreen('profile');
                    } else {
                      onClose();
                      navigation.navigate('UserProfile', { userId: currentVideo.author_id });
                    }
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: theme.primary || '#007AFF',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.3)'
                  }}>
                    {currentVideo.author_avatar ? (
                      <Image 
                        source={{ uri: currentVideo.author_avatar }} 
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: '700'
                      }}>
                        {currentVideo.author ? currentVideo.author.charAt(0).toUpperCase() : 'S'}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: '600',
                      marginBottom: 2,
                    }}>
                      {currentVideo.author || 'Sistema'}
                    </Text>
                    <Text style={{
                      color: '#eee',
                      fontSize: 12,
                      opacity: 0.8,
                    }}>
                      {new Date(currentVideo.created_at).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {(currentVideo.content || currentVideo.description) && (
                <Text style={{
                  color: '#fff',
                  fontSize: 14,
                  lineHeight: 20,
                  marginBottom: 16,
                }}>
                  {currentVideo.content || currentVideo.description}
                </Text>
              )}
            </View>

            {/* Instruções de uso */}
            {currentIndex === 0 && (
              <View style={{
                position: 'absolute',
                top: 100,
                left: 20,
                right: 20,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 10,
                padding: 12,
                zIndex: 1000,
              }}>
                <Text style={{
                  color: '#fff',
                  fontSize: 12,
                  textAlign: 'center',
                  opacity: 0.8,
                }}>
                  Deslize para cima/baixo para navegar • Toque para mostrar/ocultar controles
                </Text>
              </View>
            )}
          </>
        )}

        {/* Botões de ação lateral - Fixos na tela e sobrepondo tudo */}
        {currentVideo && (
            <View style={{
              position: 'absolute',
              right: 15,
              bottom: 50, // Ajustado para não sobrepor o perfil e estar visível
              justifyContent: 'flex-end',
              alignItems: 'center',
              zIndex: 999, // Z-index máximo absoluto
              elevation: 999,
              paddingBottom: 20,
              backgroundColor: 'transparent'
            }}>
              {/* Botão de curtir */}
              <TouchableOpacity 
                style={{
                  alignItems: 'center',
                  marginBottom: 20,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: 25,
                  padding: 12,
                }}
                onPress={() => handleLike(
                  currentVideo.id, 
                  currentVideo.is_liked || false, 
                  currentVideo.like_count || 0
                )}
                disabled={likingPosts && likingPosts.has(currentVideo.id)}
              >
                <Ionicons 
                  name={currentVideo.is_liked ? "heart" : "heart-outline"} 
                  size={28} 
                  color={currentVideo.is_liked ? "#FF3040" : "#fff"} 
                />
                {(currentVideo.like_count || 0) > 0 && (
                  <Text style={{
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: '600',
                    marginTop: 4,
                  }}>
                    {currentVideo.like_count}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Botão de comentários */}
              <TouchableOpacity 
                style={{
                  alignItems: 'center',
                  marginBottom: 20,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: 25,
                  padding: 12,
                }}
                onPress={() => {
                  showToast('Comentários em breve!', 'info');
                }}
              >
                <Ionicons 
                  name="chatbubble-outline" 
                  size={26} 
                  color="#fff" 
                />
                {(commentsCount && commentsCount[currentVideo.id] || 0) > 0 && (
                  <Text style={{
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: '600',
                    marginTop: 4,
                  }}>
                    {commentsCount[currentVideo.id]}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Botão de compartilhar */}
              <TouchableOpacity 
                style={{
                  alignItems: 'center',
                  marginBottom: 20,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: 25,
                  padding: 12,
                }}
                onPress={() => {
                  showToast('Compartilhamento em breve!', 'info');
                }}
              >
                <Ionicons name="share-outline" size={26} color="#fff" />
              </TouchableOpacity>

              {/* Botão de excluir (apenas para o autor) */}
              {currentUser && currentVideo.author_id === currentUser.id && (
                <TouchableOpacity 
                  style={{
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,59,48,0.8)',
                    borderRadius: 25,
                    padding: 12,
                  }}
                  onPress={() => handleDeletePost(currentVideo.id)}
                >
                  <Ionicons name="trash-outline" size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
        )}
      </View>
    </Modal>
  );
};

export default VideoFullScreenModal;
