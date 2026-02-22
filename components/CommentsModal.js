import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import { fetchCommentsByPostId, createComment, deleteComment } from '../services/commentService';
import { useThemeContext } from '../contexts/ThemeContext';

const CommentsModal = ({ visible, onClose, postId, navigation, setCurrentScreen }) => {
  const { theme, isDark } = useThemeContext();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const navigateToProfile = (userId) => {
    if (onClose) onClose();
    if (setCurrentScreen) {
      setCurrentScreen('userProfile', { userId });
    } else if (navigation) {
      navigation.navigate('UserProfile', { userId });
    }
  };


  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (visible && postId) {
      loadComments();
    } else {
      // Reset states when modal is closed
      setComments([]);
      setNewComment('');
    }
  }, [visible, postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchCommentsByPostId(postId);
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      Alert.alert('Erro', 'Não foi possível carregar os comentários.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !postId || submitting) return;
    
    setSubmitting(true);
    try {
      const { data, error } = await createComment(postId, newComment);
      if (error) throw error;
      
      // Adiciona o novo comentário à lista
      setComments(prev => [data, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
      Alert.alert('Erro', 'Não foi possível enviar o comentário. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId || deletingCommentId) return;
    
    Alert.alert(
      'Excluir Comentário',
      'Tem certeza que deseja excluir este comentário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeletingCommentId(commentId);
            try {
              const { error } = await deleteComment(commentId);
              if (error) throw error;
              
              // Remove o comentário da lista
              setComments(prev => prev.filter(comment => comment.id !== commentId));
            } catch (error) {
              console.error('Erro ao excluir comentário:', error);
              Alert.alert('Erro', 'Não foi possível excluir o comentário.');
            } finally {
              setDeletingCommentId(null);
            }
          },
        },
      ]
    );
  };

  const renderComment = ({ item }) => (
    <View style={[styles.commentContainer, { borderBottomColor: isDark ? '#333' : '#e2e8f0' }]}>
      <View style={styles.commentHeader}>
        <TouchableOpacity 
          style={[styles.avatar, { backgroundColor: theme.primary || '#007AFF' }]}
          onPress={() => navigateToProfile(item.user_id)}
        >
          {item.author_avatar ? (
            <Image 
              source={{ uri: item.author_avatar }} 
              style={styles.avatarImage} 
            />
          ) : (
            <Text style={styles.avatarText}>
              {item.author_name ? item.author_name.charAt(0).toUpperCase() : '?'}
            </Text>
          )}
        </TouchableOpacity>
        <View style={styles.commentContent}>
          <TouchableOpacity onPress={() => navigateToProfile(item.user_id)}>
            <Text style={[styles.authorName, { color: theme.text }]}>
              {item.author_name || 'Usuário'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.commentText, { color: theme.text }]}>{item.content}</Text>
          <Text style={[styles.commentTime, { color: theme.textSecondary || theme.text }]}>
            {new Date(item.created_at).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
        {currentUser?.id === item.user_id && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteComment(item.id)}
            disabled={deletingCommentId === item.id}
          >
            {deletingCommentId === item.id ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#e2e8f0' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Comentários</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Lista de comentários */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary || '#007AFF'} />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="chatbubble-ellipses-outline" 
              size={60} 
              color={theme.textSecondary || theme.text} 
              style={{ opacity: 0.5, marginBottom: 16 }}
            />
            <Text style={[styles.emptyText, { color: theme.textSecondary || theme.text }]}>
              Nenhum comentário ainda.\nSeja o primeiro a comentar!
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            contentContainerStyle={styles.commentsList}
            inverted={false}
          />
        )}

        {/* Input de comentário */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                color: theme.text,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'
              }]}
              placeholder="Adicione um comentário..."
              placeholderTextColor={theme.textSecondary ? `${theme.textSecondary}80` : `${theme.text}80`}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, { 
                backgroundColor: newComment.trim() ? (theme.primary || '#007AFF') : (isDark ? '#333' : '#e2e8f0'),
                opacity: newComment.trim() ? 1 : 0.6
              }]} 
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color={newComment.trim() ? "#fff" : (theme.textSecondary || theme.text)} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.7,
    marginTop: 8,
  },
  commentsList: {
    padding: 16,
  },
  commentContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  commentContent: {
    flex: 1,
  },
  authorName: {
    fontWeight: '600',
    marginBottom: 2,
    fontSize: 15,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 120,
    fontSize: 15,
    borderWidth: 1,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CommentsModal;
