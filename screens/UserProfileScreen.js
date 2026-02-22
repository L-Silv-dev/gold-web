import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import OptimizedImage from '../components/OptimizedImage';
import { 
  fetchUserProfile, 
  followUser, 
  unfollowUser, 
  checkFollowStatus, 
  getUserFollowers, 
  getUserFollowing 
} from '../services/userService';
import { fetchUserPosts } from '../services/postService';
import { supabase } from '../utils/supabase';

const UserProfileScreen = ({ route, navigation: nav, onBack, userId: propUserId }) => {
  const navigation = useNavigation() || nav;
  const userId = propUserId || route?.params?.userId || nav?.params?.userId || route?.params?.id || nav?.params?.id;
  const { theme } = useThemeContext();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followStatus, setFollowStatus] = useState(null); // 'pending', 'accepted', null
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [processingFollow, setProcessingFollow] = useState(false);

  const textPosts = posts.filter(post => !post.type || post.type === 'text');
  const imagePosts = posts.filter(post => post.type === 'image');
  const videoPosts = posts.filter(post => post.type === 'video');

  const loadProfile = async () => {
    try {
      const { profile: userProfile, error } = await fetchUserProfile(userId);
      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return;
      }
      setProfile(userProfile);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const loadFollowData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        if (user.id !== userId) {
          const { status } = await checkFollowStatus(user.id, userId);
          setFollowStatus(status);
        }
      }

      const [followersResult, followingResult] = await Promise.all([
        getUserFollowers(userId),
        getUserFollowing(userId)
      ]);

      if (followersResult.followers) setFollowersCount(followersResult.followers.length);
      if (followingResult.following) setFollowingCount(followingResult.following.length);
    } catch (error) {
      console.error('Erro ao carregar dados de seguidores:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const { data: userPosts, error } = await fetchUserPosts(userId);
      if (error) {
        console.error('Erro ao carregar posts:', error);
        return;
      }
      setPosts(userPosts || []);
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadProfile(), loadPosts(), loadFollowData()]);
    setLoading(false);
  };

  const handleFollowAction = async () => {
    if (processingFollow || !currentUserId) return;
    setProcessingFollow(true);

    try {
      if (followStatus) {
        // Se já tem status (pending ou accepted), então é unfollow
        const { success } = await unfollowUser(currentUserId, userId);
        if (success) {
          setFollowStatus(null);
          if (followStatus === 'accepted') {
            setFollowersCount(prev => Math.max(0, prev - 1));
          }
        }
      } else {
        // Seguir
        const { success, status } = await followUser(currentUserId, userId);
        if (success) {
          setFollowStatus(status || 'pending');
          // Não incrementa count imediatamente se for pending
        }
      }
    } catch (error) {
      console.error('Erro na ação de seguir:', error);
    } finally {
      setProcessingFollow(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const styles = createProfileStyles(theme);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack || (() => navigation.goBack())} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Perfil</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Carregando perfil...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack || (() => navigation.goBack())} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Perfil</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>
            Perfil não encontrado
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack || (() => navigation.goBack())} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Perfil</Text>
        <View style={{ width: 40 }} />
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
          <View style={styles.profileImageContainer}>
            <OptimizedImage 
              source={profile.profile_image_url || profile.profileImage} 
              style={styles.profileImage}
              fallbackIcon="person-circle-outline"
              fallbackSize={120}
            />
          </View>

          {/* Username (principal) */}
          <Text style={[styles.userName, { color: theme.text }]}>
            @{profile.username || 'usuário'}
          </Text>

          {/* Nome completo (secundário) */}
          {profile.name && (
            <Text style={[styles.fullName, { color: theme.textSecondary }]}>
              {profile.name}
            </Text>
          )}

          {/* Email (se disponível) */}
          {profile.email && (
            <Text style={[styles.email, { color: theme.textSecondary }]}>
              {profile.email}
            </Text>
          )}

          {/* Escola/Instituição */}
          {profile.school && (
            <View style={styles.schoolContainer}>
              <Ionicons name="school-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.schoolText, { color: theme.textSecondary }]}>
                {profile.school}
              </Text>
            </View>
          )}

          {/* Bio do usuário */}
          <View style={[styles.bioContainer, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.bioText, { 
              color: profile.bio ? theme.text : theme.textSecondary, 
              fontStyle: profile.bio ? 'normal' : 'italic' 
            }]}>
              {profile.bio || 'Nenhuma bio adicionada ainda...'}
            </Text>
          </View>

          {/* Ações (Seguir e Mensagem) */}
          <View style={styles.actionsContainer}>
            {currentUserId !== userId && (
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  { 
                    backgroundColor: followStatus === 'accepted' ? 'transparent' : theme.primary,
                    borderColor: theme.primary,
                    borderWidth: followStatus === 'accepted' ? 1 : 0
                  }
                ]}
                onPress={handleFollowAction}
                disabled={processingFollow}
              >
                {processingFollow ? (
                  <ActivityIndicator size="small" color={followStatus === 'accepted' ? theme.primary : 'white'} />
                ) : (
                  <>
                    <Ionicons 
                      name={followStatus === 'accepted' ? "checkmark" : followStatus === 'pending' ? "time-outline" : "person-add-outline"} 
                      size={20} 
                      color={followStatus === 'accepted' ? theme.primary : 'white'} 
                    />
                    <Text style={[
                      styles.actionButtonText, 
                      { color: followStatus === 'accepted' ? theme.primary : 'white' }
                    ]}>
                      {followStatus === 'accepted' ? 'Seguindo' : followStatus === 'pending' ? 'Solicitado' : 'Seguir'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[
                styles.actionButton, 
                { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, flex: currentUserId === userId ? 1 : 0.8 }
              ]}
              onPress={() => {
                if (!userId) return;
                
                // Navegar para a tela de chat
                navigation.navigate('Chat', { 
                  conversationId: null, // Será criada uma nova conversa
                  recipientId: userId,
                  recipientName: profile.name || profile.username,
                  recipientAvatar: profile.profile_image_url || profile.profileImage
                });
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.text} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>Mensagem</Text>
            </TouchableOpacity>
          </View>

          {/* Estatísticas */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.text }]}>{posts.length}</Text>
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
            {posts.length === 0 ? (
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
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
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
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    resizeMode: 'cover',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  fullName: {
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
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
    marginBottom: 20,
    elevation: 2,
  },
  messageButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
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

export default UserProfileScreen;

