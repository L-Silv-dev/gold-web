import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../utils/supabase';
import { useThemeContext } from '../contexts/ThemeContext';
import { followUser, unfollowUser, isFollowing } from '../services/userService';
import { getUserConversations, deleteConversation } from '../services/messageService';
import { getFollowRequests, acceptFollowRequest, rejectFollowRequest } from '../services/userService';
import CacheManager from '../utils/cache';

export default function SearchUsersScreen({ onViewProfile }) {
  const [conversations, setConversations] = useState([]);
  const [followRequests, setFollowRequests] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const { theme } = useThemeContext();
  const navigation = useNavigation();

  // Buscar conversas recentes e solicitações de seguidores
  const fetchData = useCallback(async () => {
    // Tentar carregar do cache primeiro para evitar tela branca
    try {
      const cachedConversations = await CacheManager.loadRecentConversations();
      if (cachedConversations && cachedConversations.length > 0) {
        setConversations(prev => prev.length === 0 ? cachedConversations : prev);
      } else {
        // Se não tem cache, mostrar loading
        setLoadingConversations(true);
      }
    } catch (e) {
      console.log('Erro ao ler cache:', e);
      setLoadingConversations(true);
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Buscar conversas e solicitações em paralelo
      const [conversationsResult, requestsResult] = await Promise.all([
        getUserConversations(user.id),
        getFollowRequests(user.id)
      ]);
      
      if (conversationsResult.error) {
        console.error('Erro ao buscar conversas:', conversationsResult.error);
        // Se falhar na rede, garantir que ficamos com o cache (se existir)
        const cached = await CacheManager.loadRecentConversations();
        if (cached && cached.length > 0) {
          setConversations(cached);
        }
      } else {
        console.log('Conversas carregadas:', conversationsResult.conversations);
        const newConversations = conversationsResult.conversations || [];
        setConversations(newConversations);
        // Salvar no cache
        await CacheManager.saveRecentConversations(newConversations);
      }

      if (requestsResult.error) {
        console.error('Erro ao buscar solicitações:', requestsResult.error);
      } else {
        setFollowRequests(requestsResult.requests || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Fallback para cache em caso de erro
      const cached = await CacheManager.loadRecentConversations();
      if (cached && cached.length > 0) {
        setConversations(cached);
      }
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Carregar dados ao focar na tela
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Manter a lista de conversas atualizada em tempo real
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('public:messages_list_update')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, () => {
        // Quando uma nova mensagem chega, atualizamos a lista silenciosamente
        // Como o fetchData já verifica se tem dados antes de mostrar loading,
        // e o getUserConversations foi otimizado, isso será rápido
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchData]);

  const handleAcceptRequest = async (requestId) => {
    const { success } = await acceptFollowRequest(requestId);
    if (success) {
      setFollowRequests(prev => prev.filter(req => req.requestId !== requestId));
    }
  };

  const handleRejectRequest = async (requestId) => {
    const { success } = await rejectFollowRequest(requestId);
    if (success) {
      setFollowRequests(prev => prev.filter(req => req.requestId !== requestId));
    }
  };

  const handleConversationPress = (conversation) => {
    navigation.navigate('Chat', {
      conversationId: conversation.conversation_id || conversation.id,
      recipientId: conversation.other_user_id || conversation.user_id,
      recipientName: conversation.username || conversation.other_username || 'Usuário',
      recipientAvatar: conversation.profile_image_url || conversation.other_profile_image_url,
      isGroup: conversation.is_group
    });
  };

  const handleDeleteConversation = (conversation) => {
    Alert.alert(
      'Excluir Conversa',
      'Tem certeza que deseja excluir esta conversa?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!currentUserId) return;
            
            const conversationId = conversation.conversation_id || conversation.id;
            const isGroup = conversation.is_group;
            
            const { error } = await deleteConversation(conversationId, currentUserId, isGroup);
            
            if (error) {
              Alert.alert('Erro', 'Não foi possível excluir a conversa.');
            } else {
              setConversations(prev => prev.filter(c => (c.conversation_id || c.id) !== conversationId));
            }
          }
        }
      ]
    );
  };

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.userItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleConversationPress(item)}
      onLongPress={() => handleDeleteConversation(item)}
      activeOpacity={0.7}
    >
      <TouchableOpacity onPress={() => {
        const userId = item.other_user_id || item.user_id;
        if (userId && !item.is_group) {
          navigation.navigate('UserProfile', { userId });
        }
      }}>
        {item.profile_image_url || item.other_profile_image_url ? (
          <Image 
            source={{ uri: item.profile_image_url || item.other_profile_image_url }} 
            style={styles.avatar} 
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Ionicons name="person" size={24} color="white" />
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.userInfo}>
        <TouchableOpacity onPress={() => {
          const userId = item.other_user_id || item.user_id;
          if (userId && !item.is_group) {
            navigation.navigate('UserProfile', { userId });
          } else if (item.is_group) {
            handleConversationPress(item);
          }
        }}>
          <Text style={[styles.username, { color: theme.text }]}>
            {item.username || item.other_username || 'Usuário'}
          </Text>
        </TouchableOpacity>
        {item.last_message && (
          <Text style={[styles.fullName, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.last_message}
          </Text>
        )}
      </View>
      {item.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ flex: 1 }}>
        {loadingConversations ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.conversation_id || item.id}
            renderItem={renderConversationItem}
            contentContainerStyle={styles.usersList}
            ListHeaderComponent={
              <>
                <TouchableOpacity 
                  style={[styles.userItem, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 20 }]}
                  onPress={() => navigation.navigate('CreateGroup')}
                >
                  <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                    <Ionicons name="people" size={24} color="white" />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.username, { color: theme.text }]}>Criar Novo Grupo</Text>
                    <Text style={[styles.fullName, { color: theme.textSecondary }]}>Inicie uma conversa com vários amigos</Text>
                  </View>
                </TouchableOpacity>

                {followRequests.length > 0 && (
                  <View style={styles.requestsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Solicitações de Seguidores
                    </Text>
                    {followRequests.map(request => (
                       <View key={request.requestId} style={[styles.requestItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                         <View style={styles.requestInfo}>
                           {request.profileImage ? (
                             <Image source={{ uri: request.profileImage }} style={styles.requestAvatar} />
                           ) : (
                             <View style={[styles.requestAvatar, { backgroundColor: theme.primary }]}>
                               <Ionicons name="person" size={20} color="white" />
                             </View>
                           )}
                           <Text style={[styles.requestName, { color: theme.text }]}>
                             {request.name || request.username || 'Usuário'}
                           </Text>
                         </View>
                         <View style={styles.requestActions}>
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: theme.primary }]}
                            onPress={() => handleAcceptRequest(request.requestId)}
                          >
                            <Text style={styles.actionButtonText}>Aceitar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: theme.error || '#FF3B30' }]}
                            onPress={() => handleRejectRequest(request.requestId)}
                          >
                            <Ionicons name="close" size={20} color="white" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {conversations.length > 0 && (
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Conversas Recentes
                  </Text>
                )}
              </>
            }
            ListEmptyComponent={
              (!loadingConversations && followRequests.length === 0) && (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={64} color={theme.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                    Nenhuma conversa encontrada
                  </Text>
                  <Text style={[styles.emptyStateSubText, { color: theme.textSecondary }]}>
                    Use o botão + para iniciar uma nova conversa
                  </Text>
                </View>
              )
            }
          />
        )}
      </View>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('FindUsers')}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  usersList: {
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 20,
    marginTop: 10,
    marginBottom: 5,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  fullName: {
    fontSize: 14,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyStateSubText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestsSection: {
    marginBottom: 20,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
