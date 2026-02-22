import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, ActivityIndicator, ScrollView, SafeAreaView, Dimensions, TouchableOpacity, RefreshControl, TextInput, Alert, FlatList, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import ModernVideoPlayer from '../components/ModernVideoPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../styles/AppStyles';
import { useThemeContext } from '../contexts/ThemeContext';
import usePostsSupabase from '../hooks/usePostsSupabase';
import { togglePostLike, deletePost } from '../services/postService';
import { countCommentsByPostId } from '../services/commentService';
import { supabase } from '../utils/supabase';
import { useToast } from '../contexts/ToastContext';
import { useUserContext } from '../contexts/UserContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import CommentsModal from '../components/CommentsModal';
import SharePostModal from '../components/SharePostModal';
import VideoFullScreenModal from '../components/VideoFullScreenModal';
import VideoTouchOverlay from '../components/VideoTouchOverlay';

import { registerForPushNotificationsAsync, scheduleLocalNotification } from '../utils/notifications';

const HomeScreen = ({ refreshKey = 0, setCurrentScreen }) => {
  const navigation = useNavigation();
  const { theme, isDark } = useThemeContext();
  const { profileImage } = useUserContext();
  const { posts, loading, fetchPosts } = usePostsSupabase(refreshKey);
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  
  // Função de diagnóstico de notificações
  const handleTestNotification = async () => {
    try {
      Alert.alert(
        'Diagnóstico de Notificações',
        'Iniciando teste...',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Testar Local',
            onPress: async () => {
              try {
                await scheduleLocalNotification(
                  'Teste de Notificação',
                  'Se você está vendo isso, as notificações locais estão funcionando!',
                  { data: 'teste' }
                );
                showToast('Notificação agendada. Verifique se apareceu.', 'success');
              } catch (e) {
                showToast(`Falha na notificação local: ${e.message}`, 'error');
              }
            }
          },
          {
            text: 'Verificar Token',
            onPress: async () => {
               const token = await registerForPushNotificationsAsync();
               showToast(token ? `Token obtido: ${token.substring(0, 10)}...` : 'Token não obtido (null)', token ? 'info' : 'error');
            }
          }
        ]
      );
    } catch (e) {
      console.error(e);
    }
  };
  const [imageLoading, setImageLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [likingPosts, setLikingPosts] = useState(new Set());
  const [postsState, setPostsState] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [playingVideos, setPlayingVideos] = useState({}); // Controla quais vídeos estão reproduzindo
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  
  // Share state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [postToShare, setPostToShare] = useState(null);
  const [commentsCount, setCommentsCount] = useState({});
  const videoRefs = useRef({}); // Referências para os componentes de vídeo
  
  // Video fullscreen state
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [allVideos, setAllVideos] = useState([]);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);

  // Buscar usuário atual ao carregar o componente
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  // Atualizar posts quando a tela receber foco
  useFocusEffect(
    React.useCallback(() => {
      fetchPosts(true);
    }, [fetchPosts])
  );

  // Sincronizar posts do hook com estado local e carregar contagem de comentários
  useEffect(() => {
    setPostsState(posts);
    
    // Extrair todos os vídeos para o modal fullscreen
    const videos = posts.filter(post => 
      post.type === 'video' && 
      post.post_videos && 
      post.post_videos.length > 0
    );
    setAllVideos(videos);
    
    // Carregar contagem de comentários para cada post
    const loadCommentsCount = async () => {
      const counts = {};
      for (const post of posts) {
        const { data: count } = await countCommentsByPostId(post.id);
        counts[post.id] = count || 0;
      }
      setCommentsCount(prev => ({
        ...prev,
        ...counts
      }));
    };
    
    loadCommentsCount();
  }, [posts]);

  // Cleanup: pausar todos os vídeos quando o componente for desmontado
  useEffect(() => {
    return () => {
      // Pausar todos os vídeos ao desmontar
      Object.values(videoRefs.current).forEach(ref => {
        if (ref && ref.pauseAsync) {
          ref.pauseAsync().catch(console.error);
        }
      });
    };
  }, []);

  // Usar apenas as postagens reais do banco de dados
  const displayPosts = postsState || [];

  // Função para curtir/descurtir post
  // Função para abrir o modal de comentários
  const openCommentsModal = (postId) => {
    setSelectedPostId(postId);
    setCommentsModalVisible(true);
  };

  const handleShare = (post) => {
    setPostToShare(post);
    setShareModalVisible(true);
  };

  // Função para abrir vídeo em tela cheia
  const openVideoFullScreen = (postId) => {
    const videoIndex = allVideos.findIndex(video => video.id === postId);
    if (videoIndex !== -1) {
      setSelectedVideoIndex(videoIndex);
      setVideoModalVisible(true);
    }
  };

  // Função para lidar com a exclusão de um post
  const handleDeletePost = async (postId) => {
    // Mostrar alerta de confirmação
    Alert.alert(
      "Excluir Publicação",
      "Tem certeza que deseja excluir esta publicação?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Excluir", 
          onPress: async () => {
            try {
              const { data, error } = await deletePost(postId);
              
              if (error) {
                showToast(error.message || "Ocorreu um erro ao excluir a publicação.", 'error');
                return;
              }
              
              // Remover o post da lista localmente
              setPostsState(prevPosts => prevPosts.filter(post => post.id !== postId));
              
              showToast("Publicação excluída com sucesso!", 'success');
            } catch (error) {
              console.error("Erro ao excluir post:", error);
              showToast("Ocorreu um erro ao excluir a publicação.", 'error');
            }
          }
        }
      ]
    );
  };

  const handleLike = async (postId, currentLiked, currentLikeCount) => {
    // Verificar se já está processando
    if (likingPosts.has(postId)) {
      return;
    }

    // Atualizar UI imediatamente (otimista)
    setPostsState(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              is_liked: !currentLiked,
              like_count: currentLiked ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1
            }
          : post
      )
    );

    setLikingPosts(prev => new Set(prev).add(postId));

    try {
      const { data, error } = await togglePostLike(postId);
      
      if (error) {
        // Reverter mudança em caso de erro
        setPostsState(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  is_liked: currentLiked,
                  like_count: currentLikeCount
                }
              : post
          )
        );
        showToast("Não foi possível atualizar seu like. Tente novamente.", 'error');
      } else if (data) {
        // Atualizar com dados reais do servidor
        setPostsState(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  is_liked: data.is_liked,
                  like_count: data.like_count
                }
              : post
          )
        );
      }
    } catch (error) {
      // Reverter mudança em caso de erro
      setPostsState(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                is_liked: currentLiked,
                like_count: currentLikeCount
              }
            : post
        )
      );
      console.error('Erro ao curtir post:', error);
    } finally {
      setLikingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  // Filtrar postagens baseado na pesquisa
  const getFilteredPosts = () => {
    if (!searchQuery.trim()) {
      return displayPosts;
    }
    
    const query = searchQuery.toLowerCase();
    return displayPosts.filter(post => 
      (post.content && post.content.toLowerCase().includes(query)) ||
      (post.description && post.description.toLowerCase().includes(query)) ||
      (post.author && post.author.toLowerCase().includes(query))
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Recarregar posts
    if (fetchPosts) {
      await fetchPosts();
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleImageLoad = (postId) => {
    setImageLoading(prev => ({ ...prev, [postId]: false }));
  };

  const handleImageLoadStart = (postId) => {
    setImageLoading(prev => ({ ...prev, [postId]: true }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>
        {/* Header com Perfil */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 15,
          paddingTop: 15,
          paddingBottom: 5,
          backgroundColor: theme.background,
        }}>
          <TouchableOpacity 
            onPress={() => setCurrentScreen && setCurrentScreen('profile')}
            style={{
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.primary || theme.icon,
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
              marginRight: 12,
              borderWidth: 1,
              borderColor: theme.border
            }}>
              {profileImage ? (
                <Image 
                  source={{ uri: typeof profileImage === 'string' ? profileImage : null }} 
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={20} color={theme.background} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Barra de pesquisa minimalista */}
        {/* Barra de pesquisa com tema claro/escuro */}
        <View style={{
          paddingTop: 10,
          paddingBottom: 15,
          paddingHorizontal: 15,
          backgroundColor: theme.background,
          borderBottomWidth: 1,
          borderBottomColor: theme.border || (isDark ? '#333' : '#e2e8f0'),
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          }}>
            <Ionicons 
              name="search" 
              size={18} 
              color={theme.textSecondary || theme.text} 
              style={{ marginRight: 8, opacity: 0.7 }}
            />
            <TextInput
              style={{
                flex: 1,
                fontSize: 15,
                color: theme.text,
                fontWeight: '400',
                paddingVertical: 2,
              }}
              placeholder="Pesquisar..."
              placeholderTextColor={theme.textSecondary ? `${theme.textSecondary}90` : `${theme.text}80`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              selectionColor={theme.primary || '#007AFF'}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={{
                  padding: 4,
                  borderRadius: 12,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  marginLeft: 4,
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="close" 
                  size={16} 
                  color={theme.textSecondary || theme.text} 
                  style={{ opacity: 0.8 }}
                />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Indicador de resultados da pesquisa - simplificado */}
          {searchQuery.length > 0 && (
            <Text style={{
              color: theme.textSecondary || theme.text,
              fontSize: 11,
              opacity: 0.7,
              textAlign: 'center',
              marginTop: 4,
            }}>
              {getFilteredPosts().length} resultado{getFilteredPosts().length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <ScrollView 
          contentContainerStyle={[{ paddingBottom: 100, paddingTop: 20, minHeight: '100%' }]}
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          scrollEnabled={true}
          directionalLockEnabled={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          decelerationRate="normal"
          style={{ flex: 1, width: '100%' }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary || theme.icon]}
              tintColor={theme.primary || theme.icon}
            />
          }
        >

          {loading ? (
            <View style={{ 
              alignItems: 'center', 
              marginTop: 60,
              paddingHorizontal: 20
            }}>
              <View style={{
                backgroundColor: theme.card,
                borderRadius: 20,
                padding: 30,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.1,
                shadowRadius: 8,
                elevation: 6,
              }}>
                <ActivityIndicator color={theme.primary || theme.icon} size="large" />
                <Text style={{ 
                  color: theme.text, 
                  marginTop: 15,
                  fontSize: 16,
                  fontWeight: '500'
                }}>
                  Carregando postagens...
                </Text>
              </View>
            </View>
          ) : displayPosts.length === 0 ? (
            <View style={{ 
              alignItems: 'center', 
              marginTop: 60,
              paddingHorizontal: 20
            }}>
              <View style={{
                backgroundColor: theme.card,
                borderRadius: 20,
                padding: 40,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.1,
                shadowRadius: 8,
                elevation: 6,
              }}>
                <Ionicons 
                  name="document-text-outline" 
                  size={48} 
                  color={theme.textSecondary || theme.text} 
                  style={{ opacity: 0.5, marginBottom: 15 }}
                />
                <Text style={{ 
                  color: theme.text, 
                  textAlign: 'center', 
                  fontSize: 18,
                  fontWeight: '600',
                  marginBottom: 8
                }}>
                  Nenhuma postagem ainda
                </Text>
                <Text style={{ 
                  color: theme.textSecondary || theme.text, 
                  textAlign: 'center', 
                  opacity: 0.7,
                  fontSize: 14,
                  lineHeight: 20
                }}>
                  Seja o primeiro a compartilhar algo interessante!
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ width: '100%', minHeight: '100%' }}>
              {getFilteredPosts().map((item, index) => (
                <View 
                  key={item.id || index} 
                  style={{ 
                    backgroundColor: theme.card, 
                    marginBottom: 1, 
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#333' : '#eee',
                  }}
                >
                  {(() => {
                    const hasMedia = (item.type === 'video' && item.post_videos && item.post_videos.length > 0) || 
                                     (item.image_url || (item.post_images && item.post_images.length > 0));
                    
  const PostHeader = () => (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 15,
                        backgroundColor: 'transparent',
                      }}>
                         <TouchableOpacity 
                           style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                           onPress={() => {
                             if (currentUser && item.author_id === currentUser.id) {
                               setCurrentScreen('profile');
                             } else {
                               navigation.navigate('UserProfile', { userId: item.author_id });
                             }
                           }}
                         >
                           <View style={{
                             width: 40,
                             height: 40,
                             borderRadius: 20,
                             backgroundColor: theme.primary || theme.icon,
                             justifyContent: 'center',
                             alignItems: 'center',
                             marginRight: 10,
                             overflow: 'hidden',
                             borderWidth: 1,
                             borderColor: theme.border || 'rgba(0,0,0,0.1)'
                           }}>
                             {item.author_avatar ? (
                               <Image 
                                 source={{ uri: item.author_avatar }} 
                                 style={{ width: '100%', height: '100%' }}
                                 resizeMode="cover"
                               />
                             ) : (
                               <Text style={{
                                 color: theme.background,
                                 fontSize: 16,
                                 fontWeight: '700'
                               }}>
                                 {item.author ? item.author.charAt(0).toUpperCase() : 'S'}
                               </Text>
                             )}
                           </View>
                           <View style={{ flex: 1 }}>
                             <Text style={{
                               color: theme.text,
                               fontSize: 16,
                               fontWeight: '600',
                               marginBottom: 2
                             }}>
                               {item.author || 'Sistema'}
                             </Text>
                             <Text style={{
                               color: theme.textSecondary || theme.text,
                               fontSize: 12,
                               opacity: 0.7
                             }}>
                               {new Date(item.created_at).toLocaleDateString('pt-BR', {
                                 day: 'numeric',
                                 month: 'short',
                                 hour: '2-digit',
                                 minute: '2-digit'
                               })}
                             </Text>
                           </View>
                         </TouchableOpacity>
                         {currentUser && item.author_id === currentUser.id && (
                           <TouchableOpacity 
                             onPress={() => handleDeletePost(item.id)}
                             style={{
                               width: 32,
                               height: 32,
                               borderRadius: 16,
                               backgroundColor: theme.background,
                               justifyContent: 'center',
                               alignItems: 'center',
                             }}
                           >
                             <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                           </TouchableOpacity>
                         )}
                      </View>
                    );

                    return (
                      <>
                        <PostHeader />
                      </>
                    );
                  })()}

                  {/* Vídeos do post - Carousel */}
                  {(item.type === 'video' && item.post_videos && item.post_videos.length > 0) && (
                    <View style={{ position: 'relative' }}>
                      {(() => {
                        // Ordenar vídeos por video_order
                        const videos = item.post_videos
                          .sort((a, b) => (a.video_order || 0) - (b.video_order || 0));
                        
                        if (videos.length === 0) return null;

                        return (
                          <View>
                            <FlatList
                              data={videos}
                              horizontal
                              pagingEnabled
                              showsHorizontalScrollIndicator={false}
                              keyExtractor={(video, index) => `${item.id}-video-${video.id || index}`}
                              renderItem={({ item: video, index }) => {
                                const videoKey = `${item.id}-${video.id || index}`;
                                const isPlaying = playingVideos[videoKey];
                                
                                return (
                                  <VideoTouchOverlay
                                    onPress={() => openVideoFullScreen(item.id)}
                                    onDoubleTap={() => handleLike(
                                      item.id, 
                                      item.is_liked || false, 
                                      item.like_count || 0
                                    )}
                                    style={{ width: SCREEN_WIDTH, backgroundColor: '#000' }}
                                  >
                                  {Platform.OS === 'web' ? (
                                    (() => {
                                      const vw = typeof window !== 'undefined' ? window.innerWidth : SCREEN_WIDTH;
                                      const w = Math.min(640, Math.max(280, Math.floor(vw * 0.8)));
                                      const h = Math.floor(w * 9 / 16);
                                      return (
                                        <TouchableOpacity activeOpacity={0.9} onPress={() => { try { window.open(video.video_url, '_blank', 'noopener'); } catch {} }}>
                                          <View style={{ width: w, height: h, borderRadius: 10, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                                            <Ionicons name="play" size={Math.max(24, Math.floor(w * 0.07))} color="#fff" />
                                          </View>
                                        </TouchableOpacity>
                                      );
                                    })()
                                  ) : (
                                    <ModernVideoPlayer
                                      source={{ uri: video.video_url }}
                                      style={{ 
                                        width: '100%', 
                                        height: SCREEN_WIDTH * 1.25,
                                      }}
                                      resizeMode={ResizeMode.COVER}
                                      isLooping={true}
                                      shouldPlay={true}
                                      initialMuted={true}
                                      showMuteButton={video.has_audio !== false}
                                    />
                                  )}

                                    {/* Ícone de Play Centralizado para indicar interatividade */}
                                    <View style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      zIndex: 1,
                                      pointerEvents: 'none'
                                    }}>
                                      <View style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                        borderRadius: 30,
                                        width: 60,
                                        height: 60,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderWidth: 2,
                                        borderColor: 'rgba(255, 255, 255, 0.5)'
                                      }}>
                                        <Ionicons name="play" size={30} color="#fff" style={{ marginLeft: 4 }} />
                                      </View>
                                    </View>

                                    {/* Caption do vídeo */}
                                    {video.caption && (
                                      <View style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        padding: 12,
                                        zIndex: 1,
                                      }}>
                                        <Text style={{ 
                                          color: '#fff', 
                                          fontSize: 14,
                                          lineHeight: 20
                                        }}>
                                          {video.caption}
                                        </Text>
                                      </View>
                                    )}
                                    
                                    {/* Indicador de áudio */}
                                    {video.has_audio === false && (
                                      <View style={{
                                        position: 'absolute',
                                        top: 10,
                                        left: 10,
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        borderRadius: 20,
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        zIndex: 3,
                                      }}>
                                        <Ionicons name="volume-mute" size={16} color="#fff" />
                                        <Text style={{ 
                                          color: '#fff', 
                                          fontSize: 12,
                                          marginLeft: 4
                                        }}>
                                          Sem áudio
                                        </Text>
                                      </View>
                                    )}
                                  </VideoTouchOverlay>
                                );
                              }}
                            />
                            {/* Indicador de múltiplos vídeos */}
                            {videos.length > 1 && (
                              <View style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                borderRadius: 12,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                zIndex: 2
                              }}>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                                  {videos.length} vídeo{videos.length > 1 ? 's' : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {/* Imagens do post - Carousel */}
                  {(item.image_url || (item.post_images && item.post_images.length > 0)) && (
                    <View style={{ position: 'relative' }}>
                      {(() => {
                        // Determinar quais imagens mostrar
                        const images = item.post_images && item.post_images.length > 0
                          ? item.post_images.sort((a, b) => a.image_order - b.image_order).map(img => img.image_url)
                          : item.image_url ? [item.image_url] : [];
                        
                        if (images.length === 0) return null;

                        return (
                          <View>
                            <FlatList
                              data={images}
                              horizontal
                              pagingEnabled
                              showsHorizontalScrollIndicator={false}
                              keyExtractor={(img, index) => `${item.id}-img-${index}`}
                              renderItem={({ item: imageUrl, index }) => (
                                <VideoTouchOverlay
                                  onDoubleTap={() => handleLike(
                                    item.id, 
                                    item.is_liked || false, 
                                    item.like_count || 0
                                  )}
                                  style={{ width: SCREEN_WIDTH, position: 'relative' }}
                                >
                                  {imageLoading[`${item.id}-${index}`] && (
                                    <View style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      backgroundColor: theme.background,
                                      zIndex: 1
                                    }}>
                                      <ActivityIndicator color={theme.primary || theme.icon} size="small" />
                                    </View>
                                  )}
                                  <Image 
                                    source={{ uri: imageUrl }} 
                                    style={{ 
                                      width: '100%', 
                                      height: SCREEN_WIDTH * 1.25,
                                      backgroundColor: theme.background
                                    }} 
                                    resizeMode="cover"
                                    onLoadStart={() => handleImageLoadStart(`${item.id}-${index}`)}
                                    onLoad={() => handleImageLoad(`${item.id}-${index}`)}
                                    onError={() => handleImageLoad(`${item.id}-${index}`)}
                                  />
                                </VideoTouchOverlay>
                              )}
                            />
                            {/* Indicador de múltiplas imagens */}
                            {images.length > 1 && (
                              <View style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                borderRadius: 12,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                zIndex: 2
                              }}>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                                  {images.length} fotos
                                </Text>
                              </View>
                            )}
                            {/* Indicadores de página (dots) */}
                            {images.length > 1 && (
                              <View style={{
                                position: 'absolute',
                                bottom: 10,
                                left: 0,
                                right: 0,
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 6,
                                zIndex: 2
                              }}>
                                {images.map((_, index) => (
                                  <View
                                    key={index}
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: 3,
                                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                    }}
                                  />
                                ))}
                              </View>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {/* Conteúdo do post */}
                  {(() => {
                    const showContent = item.content && item.content !== 'Publicação com fotos' && item.content !== 'Publicação com vídeo';
                    const showDescription = !!item.description;
                    const hasAnyContent = showContent || showDescription;
                    const hasMedia = (item.image_url || (item.post_images && item.post_images.length > 0)) || 
                                     (item.type === 'video' && item.post_videos && item.post_videos.length > 0);
                    
                    return (
                      <View style={{ 
                        padding: 18, 
                        paddingTop: hasMedia ? 16 : 0,
                        paddingBottom: hasAnyContent ? 18 : 12
                      }}>
                        {showContent && (
                          <Text style={{ 
                            color: theme.text, 
                            fontSize: 16, 
                            lineHeight: 24,
                            marginBottom: showDescription ? 8 : 0,
                            fontWeight: '500'
                          }}>
                            {item.content}
                          </Text>
                        )}
                        {showDescription && (
                          <Text style={{ 
                            color: theme.textSecondary || theme.text, 
                            fontSize: 14, 
                            opacity: 0.8,
                            lineHeight: 20,
                          }}>
                            {item.description}
                          </Text>
                        )}

                        {/* Actions do post */}
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: hasAnyContent ? 16 : 0,
                          paddingTop: hasAnyContent ? 12 : 0,
                          borderTopWidth: hasAnyContent ? 0.5 : 0,
                          borderTopColor: isDark ? '#333' : '#e2e8f0'
                        }}>
                      <TouchableOpacity 
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginRight: 24
                        }}
                        onPress={() => handleLike(
                          item.id, 
                          item.is_liked || false, 
                          item.like_count || 0
                        )}
                        disabled={likingPosts.has(item.id)}
                      >
                        <Ionicons 
                          name={item.is_liked ? "heart" : "heart-outline"} 
                          size={22} 
                          color={item.is_liked ? "#FF3040" : (theme.textSecondary || theme.text)} 
                          style={{ marginRight: 6 }}
                        />
                        {(item.like_count || 0) > 0 && (
                          <Text style={{
                            color: item.is_liked ? "#FF3040" : (theme.textSecondary || theme.text),
                            fontSize: 14,
                            fontWeight: item.is_liked ? '600' : '400'
                          }}>
                            {item.like_count}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginRight: 24
                        }}
                        onPress={() => openCommentsModal(item.id)}
                      >
                        <Ionicons 
                          name="chatbubble-outline" 
                          size={20} 
                          color={theme.textSecondary || theme.text} 
                          style={{ marginRight: 4 }}
                        />
                        {(commentsCount[item.id] || 0) > 0 && (
                          <Text style={{
                            color: theme.textSecondary || theme.text,
                            fontSize: 14,
                            marginLeft: 2
                          }}>
                            {commentsCount[item.id]}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{
                          alignItems: 'center'
                        }}
                        onPress={() => handleShare(item)}
                      >
                        <Ionicons name="share-outline" size={20} color={theme.textSecondary || theme.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })()}
                </View>
              ))}
              
              {/* Footer */}
              <View style={{ 
                alignItems: 'center', 
                marginTop: 10, 
                marginBottom: 40,
                paddingHorizontal: 20
              }}>
                <View style={{
                  backgroundColor: theme.card,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.3 : 0.05,
                  shadowRadius: 4,
                  elevation: 3,
                }}>
                  <Text style={{ 
                    color: theme.textSecondary || theme.text, 
                    fontSize: 12, 
                    opacity: 0.7,
                    fontWeight: '500',
                    textAlign: 'center'
                  }}>
                    🎉 Você está em dia com todas as postagens!
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Modal de Comentários */}
      <CommentsModal
        visible={commentsModalVisible}
        onClose={() => setCommentsModalVisible(false)}
        postId={selectedPostId}
      />

      <SharePostModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        post={postToShare || {}}
      />

      {/* Modal de Vídeo em Tela Cheia */}
      <VideoFullScreenModal
        visible={videoModalVisible}
        onClose={() => setVideoModalVisible(false)}
        videos={allVideos}
        initialIndex={selectedVideoIndex}
        setCurrentScreen={setCurrentScreen}
        navigation={navigation}
      />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
