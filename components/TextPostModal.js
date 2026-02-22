import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../contexts/ThemeContext';
import { useUserContext } from '../contexts/UserContext';
import { createTextPost } from '../services/postService';
import { useToast } from '../contexts/ToastContext';

const TextPostModal = ({ visible, onClose, onPostCreated }) => {
  const { theme } = useThemeContext();
  const { name, username } = useUserContext();
  const { showToast } = useToast();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) {
      showToast('Por favor, escreva algo para publicar.', 'error');
      return;
    }

    if (content.trim().length < 3) {
      showToast('A publicação deve ter pelo menos 3 caracteres.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await createTextPost(content.trim());
      
      if (error) {
        showToast('Não foi possível criar a publicação. Tente novamente.', 'error');
        console.error('Erro ao criar post:', error);
        return;
      }

      // Limpar campo e fechar modal
      setContent('');
      onPostCreated?.(data);
      onClose();
      
      showToast('Publicação criada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao criar post:', error);
      showToast('Ocorreu um erro ao criar a publicação.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setContent('');
      onClose();
    }
  };

  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isLoading}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text }]}>
                Criar publicação
              </Text>
              <TouchableOpacity
                onPress={handlePost}
                disabled={isLoading || !content.trim()}
                style={[
                  styles.postButton,
                  (!content.trim() || isLoading) && styles.postButtonDisabled,
                  { backgroundColor: theme.primary }
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.postButtonText}>Publicar</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Author info */}
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: theme.text }]}>
                {username ? `@${username}` : name || 'Você'}
              </Text>
            </View>

            {/* Content input */}
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={{ paddingHorizontal: 20 }}>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      color: theme.text, 
                      backgroundColor: theme.background,
                      borderColor: theme.border 
                    }
                  ]}
                  placeholder="O que você está pensando?"
                  placeholderTextColor={theme.textSecondary}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  editable={!isLoading}
                  autoFocus
                />
                <Text style={[styles.charCount, { color: theme.textSecondary }]}>
                  {content.length}/500
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  closeButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  authorInfo: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  input: {
    minHeight: 200,
    padding: 20,
    fontSize: 16,
    lineHeight: 24,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  charCount: {
    textAlign: 'right',
    paddingHorizontal: 20,
    paddingBottom: 10,
    fontSize: 12,
  },
});

export default TextPostModal;

