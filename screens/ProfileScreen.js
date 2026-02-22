import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserContext } from '../contexts/UserContext';
import { useThemeContext } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import OptimizedImage from '../components/OptimizedImage';
import { getUserFollowers, getUserFollowing } from '../services/userService';
import { fetchUserPosts } from '../services/postService';
import { supabase } from '../utils/supabase';

const ProfileScreen = ({
  postFilter,
  setPostFilter,
  showNewPostModalFromApp,
  setShowNewPostModalFromApp,
  showNewTextPostModalFromApp,
  setShowNewTextPostModalFromApp,
  showPostCard,
  setShowPostCard,
  postType,
  setPostType,
  onBack,
  onPressAdmin,
  setCurrentScreen,
}) => {
  const { 
    user,
    name, 
    username, 
    bio, 
    profileImage, 
    school, 
    email,
    pickImage,
    removeProfileImage,
    isLoading 
  } = useUserContext();
  
  const { theme } = useThemeContext();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = React.useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [posts, setPosts] = useState([]);

  const styles = createProfileStyles(theme);

  const textPosts = posts.filter(post => !post.type || post.type === 'text');
  const imagePosts = posts.filter(post => post.type === 'image');
  const videoPosts = posts.filter(post => post.type === 'video');

  const loadStats = async () => {
    if (!user?.id) return;
    
    try {
      const [followersResult, followingResult, postsResult] = await Promise.all([
        getUserFollowers(user.id),
        getUserFollowing(user.id),
        fetchUserPosts(user.id)
      ]);

      if (followersResult.followers) setFollowersCount(followersResult.followers.length);
      if (followingResult.following) setFollowingCount(followingResult.following.length);
      if (postsResult.data) {
        setPosts(postsResult.data);
        setPostsCount(postsResult.data.length);
      } else {
        setPosts([]);
        setPostsCount(0);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user?.id]);

  const handlePickImage = async () => {
    if (uploadingImage || isLoading) return;
    
    setUploadingImage(true);
    try {
      const result = await pickImage();
      
      if (result.error) {
        showToast(result.error || 'Não foi possível atualizar a foto de perfil. Tente novamente.', 'error');
      } else if (result.url) {
        showToast('Foto de perfil atualizada com sucesso!', 'success');
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      showToast(error.message || 'Ocorreu um erro ao atualizar a foto de perfil.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImagePress = () => {
    if (isLoading || uploadingImage) return;

    if (!profileImage) {
      handlePickImage();
      return;
    }

    Alert.alert(
      'Foto de Perfil',
      'Escolha uma opção',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Remover foto atual',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Remover foto',
              'Tem certeza que deseja remover sua foto de perfil?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { 
                  text: 'Remover', 
                  style: 'destructive',
                  onPress: async () => {
                    setUploadingImage(true);
                    try {
                      const result = await removeProfileImage();
                      if (result.error) {
                        showToast(result.error, 'error');
                      } else {
                        showToast('Foto de perfil removida com sucesso!', 'success');
                      }
                    } catch (error) {
                      showToast('Ocorreu um erro ao remover a foto.', 'error');
                    } finally {
                      setUploadingImage(false);
                    }
                  }
                }
              ]
            );
          }
        },
        {
          text: 'Alterar foto',
          onPress: handlePickImage
        }
      ]
    );
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Recarregar dados do perfil e estatísticas
    await loadStats();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [user?.id]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={onPressAdmin} 
            style={[styles.backButton, { marginTop: 10 }]}
            accessibilityLabel="Painel Administrativo"
          >
            <Ionicons name="shield-checkmark-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        
        {onBack ? (
           <Text style={[styles.headerTitle, { color: theme.text }]}>Meu Perfil</Text>
        ) : (
           <View style={{ flex: 1 }} /> // Spacer to push back button to left if no title
        )}
        
        {onBack && <View style={{ width: 40 }} />}
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.profileContainer}>
          {/* Foto de perfil */}
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={handleImagePress}
            activeOpacity={0.8}
            disabled={isLoading || uploadingImage}
          >
            {uploadingImage && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                borderRadius: 60,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 2
              }}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}
            <OptimizedImage 
              source={profileImage} 
              style={styles.profileButtonImage}
              fallbackIcon="person-circle-outline"
              fallbackSize={120}
            />
            {!uploadingImage && (
              <View style={styles.editImageOverlay}>
                <Ionicons name="camera" size={24} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Username (principal) */}
          <Text style={[styles.userName, { color: theme.text }]}>
            @{username || 'usuário'}
          </Text>

          {/* Nome completo (secundário) */}
          {name && (
            <Text style={[styles.username, { color: theme.textSecondary }]}>
              {name}
            </Text>
          )}

          {/* Email (se disponível) */}
          {email && (
            <Text style={[styles.email, { color: theme.textSecondary }]}>
              {email}
            </Text>
          )}

          {/* Escola/Instituição */}
          {school && (
            <View style={styles.schoolContainer}>
              <Ionicons name="school-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.schoolText, { color: theme.textSecondary }]}>
                {school}
              </Text>
            </View>
          )}

          {/* Bio do usuário */}
          <View style={[styles.bioContainer, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.bioText, { 
              color: bio ? theme.text : theme.textSecondary, 
              fontStyle: bio ? 'normal' : 'italic' 
            }]}>
              {bio || 'Nenhuma bio adicionada ainda...'}
            </Text>
          </View>

          {/* Estatísticas */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{postsCount}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{followersCount}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Seguidores</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{followingCount}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Seguindo</Text>
            </View>
          </View>

          <View style={styles.postsSection}>
            <Text style={[styles.postsTitle, { color: theme.text }]}>
              Postagens
            </Text>
            {postsCount === 0 ? (
              <Text style={[styles.emptyPostsText, { color: theme.textSecondary }]}>
                Nenhuma postagem ainda
              </Text>
            ) : (
              <>
                {videoPosts.length > 0 && (
                  <View style={styles.postCategorySection}>
                    <Text style={[styles.postCategoryTitle, { color: theme.text }]}>
                      Vídeos
                    </Text>
                    {videoPosts.map(post => (
                      <View
                        key={post.id}
                        style={[
                          styles.postCard,
                          { backgroundColor: theme.cardBackground, borderColor: theme.border }
                        ]}
                      >
                        {post.image_url ? (
                          <Image
                            source={{ uri: post.image_url }}
                            style={styles.postImage}
                          />
                        ) : null}
                        {post.content ? (
                          <Text style={[styles.postContent, { color: theme.text }]}>
                            {post.content}
                          </Text>
                        ) : null}
                        {post.description ? (
                          <Text style={[styles.postDescription, { color: theme.textSecondary }]}>
                            {post.description}
                          </Text>
                        ) : null}
                        {post.created_at ? (
                          <Text style={[styles.postDate, { color: theme.textSecondary }]}>
                            {new Date(post.created_at).toLocaleDateString('pt-BR')}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                {imagePosts.length > 0 && (
                  <View style={styles.postCategorySection}>
                    <Text style={[styles.postCategoryTitle, { color: theme.text }]}>
                      Fotos
                    </Text>
                    {imagePosts.map(post => (
                      <View
                        key={post.id}
                        style={[
                          styles.postCard,
                          { backgroundColor: theme.cardBackground, borderColor: theme.border }
                        ]}
                      >
                        {post.image_url ? (
                          <Image
                            source={{ uri: post.image_url }}
                            style={styles.postImage}
                          />
                        ) : null}
                        {post.content ? (
                          <Text style={[styles.postContent, { color: theme.text }]}>
                            {post.content}
                          </Text>
                        ) : null}
                        {post.description ? (
                          <Text style={[styles.postDescription, { color: theme.textSecondary }]}>
                            {post.description}
                          </Text>
                        ) : null}
                        {post.created_at ? (
                          <Text style={[styles.postDate, { color: theme.textSecondary }]}>
                            {new Date(post.created_at).toLocaleDateString('pt-BR')}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                {textPosts.length > 0 && (
                  <View style={styles.postCategorySection}>
                    <Text style={[styles.postCategoryTitle, { color: theme.text }]}>
                      Posts
                    </Text>
                    {textPosts.map(post => (
                      <View
                        key={post.id}
                        style={[
                          styles.postCard,
                          { backgroundColor: theme.cardBackground, borderColor: theme.border }
                        ]}
                      >
                        {post.image_url ? (
                          <Image
                            source={{ uri: post.image_url }}
                            style={styles.postImage}
                          />
                        ) : null}
                        {post.content ? (
                          <Text style={[styles.postContent, { color: theme.text }]}>
                            {post.content}
                          </Text>
                        ) : null}
                        {post.description ? (
                          <Text style={[styles.postDescription, { color: theme.textSecondary }]}>
                            {post.description}
                          </Text>
                        ) : null}
                        {post.created_at ? (
                          <Text style={[styles.postDate, { color: theme.textSecondary }]}>
                            {new Date(post.created_at).toLocaleDateString('pt-BR')}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createProfileStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileContainer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  profileButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  profileButtonImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    resizeMode: 'cover',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  schoolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 5,
  },
  schoolText: {
    fontSize: 14,
  },
  bioContainer: {
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
  },
  postsSection: {
    width: '100%',
    marginTop: 10,
  },
  postsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'left',
  },
  emptyPostsText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  postCategorySection: {
    width: '100%',
    marginTop: 12,
  },
  postCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'left',
  },
  postCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 8,
  },
  postContent: {
    fontSize: 15,
    marginBottom: 4,
  },
  postDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  postDate: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
});

export default ProfileScreen;
