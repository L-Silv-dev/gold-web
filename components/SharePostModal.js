import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import { useUserContext } from '../contexts/UserContext';
import { supabase } from '../utils/supabase';
import { sendMessage, getOrCreateConversation, getUserConversations } from '../services/messageService';

const SharePostModal = ({ visible, onClose, post }) => {
  const { theme, isDark } = useThemeContext();
  const { user } = useUserContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [recentConversations, setRecentConversations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState({}); // { key: boolean } - key = `conv_${id}` or `user_${id}`

  useEffect(() => {
    if (visible && user) {
      fetchRecentConversations();
    }
  }, [visible, user]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchRecentConversations = async () => {
    try {
      setLoading(true);
      // Usar o serviço centralizado que trata corretamente grupos e DMs
      const { conversations, error } = await getUserConversations(user.id);
      
      if (error) throw error;
      
      setRecentConversations(conversations || []);
    } catch (error) {
      console.error('Erro ao buscar conversas recentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, profile_image_url')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', user.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const handleSend = async (target, isConversation = false) => {
    // Definir chave única para estado de carregamento
    const uniqueKey = isConversation ? `conv_${target.conversation_id}` : `user_${target.id}`;
    
    if (sendingTo[uniqueKey]) return;

    try {
      setSendingTo(prev => ({ ...prev, [uniqueKey]: true }));

      let conversationId;
      
      if (isConversation) {
        // Se for conversa recente, já temos o ID
        conversationId = target.conversation_id;
      } else {
        // Se for usuário da busca, criar ou obter conversa
        const { data } = await getOrCreateConversation(user.id, target.id);
        conversationId = data;
      }

      if (!conversationId) throw new Error('Falha ao obter ID da conversa');

      // Preparar conteúdo
      const senderName = user.user_metadata?.username || 'Alguém';
      const postContent = post.content || post.description || 'Sem descrição';
      const messageContent = `🔗 *Post compartilhado*\n\n${postContent}`;
      
      let mediaUrl = null;
      let mediaType = null;

      if (post.image_url) {
        mediaUrl = post.image_url;
        mediaType = 'image';
      } else if (post.post_images && post.post_images.length > 0) {
        mediaUrl = post.post_images[0].image_url;
        mediaType = 'image';
      } else if (post.post_videos && post.post_videos.length > 0) {
        mediaUrl = post.post_videos[0].video_url;
        mediaType = 'video';
      }

      await sendMessage(
        conversationId,
        user.id,
        messageContent,
        mediaUrl,
        mediaType
      );

      Alert.alert('Sucesso', 'Post compartilhado!');
      
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o post.');
    } finally {
      setSendingTo(prev => ({ ...prev, [uniqueKey]: false }));
    }
  };

  const renderItem = ({ item, isConversation }) => {
    // Determinar ID e propriedades baseado no tipo (Conversa ou Usuário)
    const id = isConversation ? item.conversation_id : item.id;
    const uniqueKey = isConversation ? `conv_${id}` : `user_${id}`;
    
    // Nome: Se for conversa (getUserConversations), já vem formatado como "username" (nome do grupo ou usuário)
    const name = isConversation ? item.username : item.username;
    
    // Avatar: Se for conversa, vem "profile_image_url" (grupo ou usuário)
    const avatar = isConversation ? item.profile_image_url : item.profile_image_url;
    
    // Subtítulo
    let subtitle;
    if (isConversation) {
      subtitle = item.is_group ? 'Grupo' : (item.other_username ? `@${item.other_username}` : 'Conversa recente');
    } else {
      subtitle = item.full_name || `@${item.username}`;
    }
    
    const isSending = sendingTo[uniqueKey];

    return (
      <View style={[styles.userItem, { borderBottomColor: theme.border }]}>
        <View style={styles.userInfo}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              {item.is_group ? (
                <Ionicons name="people" size={20} color="#FFF" />
              ) : (
                <Text style={styles.avatarText}>{name?.charAt(0).toUpperCase()}</Text>
              )}
            </View>
          )}
          <View style={styles.textContainer}>
            <Text style={[styles.userName, { color: theme.text }]}>{name}</Text>
            <Text style={[styles.userSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: isSending ? theme.border : theme.primary }
          ]}
          onPress={() => handleSend(item, isConversation)}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Text style={styles.sendButtonText}>Enviar</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: '80%',
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      marginLeft: 10,
      color: theme.text,
      fontSize: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 10,
      marginTop: 10,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    avatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    textContainer: {
      marginLeft: 12,
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
    },
    userSubtitle: {
      fontSize: 12,
    },
    sendButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    sendButtonText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 12,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Compartilhar</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar pessoas..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {searchQuery.length === 0 ? (
            <FlatList
              data={recentConversations}
              keyExtractor={item => `conv_${item.conversation_id}`}
              renderItem={props => renderItem({ ...props, isConversation: true })}
              ListHeaderComponent={() => (
                <Text style={styles.sectionTitle}>Conversas recentes</Text>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={{ color: theme.textSecondary }}>
                    Nenhuma conversa recente
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={item => `user_${item.id}`}
              renderItem={props => renderItem({ ...props, isConversation: false })}
              ListHeaderComponent={() => (
                <Text style={styles.sectionTitle}>Resultados da busca</Text>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={{ color: theme.textSecondary }}>
                    Nenhum usuário encontrado
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default SharePostModal;
