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
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeContext } from '../contexts/ThemeContext';
import { useUserContext } from '../contexts/UserContext';
import { createVideoPost } from '../services/postService';
import { useToast } from '../contexts/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_VIDEOS = 5;

const VideoPostModal = ({ visible, onClose, onPostCreated }) => {
  const { theme } = useThemeContext();
  const { name, username } = useUserContext();
  const { showToast } = useToast();
  const [videos, setVideos] = useState([]);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Precisamos de permissão para acessar seus vídeos!', 'error');
        return false;
      }
    }
    return true;
  };

  const pickVideos = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const remainingSlots = MAX_VIDEOS - videos.length;
    if (remainingSlots <= 0) {
      showToast(`Você pode adicionar no máximo ${MAX_VIDEOS} vídeos.`, 'error');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: true,
        quality: 0.5, // Reduzir qualidade para otimizar upload
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium, // Para iOS
        videoMaxDuration: 300, // 5 minutos máximo
        selectionLimit: remainingSlots,
      });

      if (!result.canceled) {
        const newVideos = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || 'video',
          name: asset.fileName || `video-${Date.now()}.mp4`
        }));
        setVideos(prev => [...prev, ...newVideos].slice(0, MAX_VIDEOS));
        
        const added = Math.min(newVideos.length, MAX_VIDEOS - videos.length);
        if (added < newVideos.length) {
          showToast(`Apenas ${added} vídeos foram adicionados (limite de ${MAX_VIDEOS} vídeos)`, 'info');
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar vídeos:', error);
      showToast('Não foi possível selecionar os vídeos.', 'error');
    }
  };

  const removeVideo = (index) => {
    const newVideos = videos.filter((_, i) => i !== index);
    setVideos(newVideos);
  };

  const toggleAudio = (index) => {
    const newVideos = [...videos];
    newVideos[index].hasAudio = !newVideos[index].hasAudio;
    setVideos(newVideos);
  };

  const updateCaption = (index, caption) => {
    const newVideos = [...videos];
    newVideos[index].caption = caption;
    setVideos(newVideos);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const handlePost = async () => {
    if (videos.length === 0) {
      showToast('Por favor, selecione pelo menos um vídeo para publicar.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Iniciando criação de post com vídeo(s)...');
      console.log('Vídeos selecionados:', videos.length);
      console.log('Descrição:', description.trim());
      
      const { data, error } = await createVideoPost(videos, description.trim());
      
      if (error) {
        console.error('Erro ao criar post:', error);
        let errorMessage = error.message || error.details?.message || 'Não foi possível criar a publicação. Tente novamente.';
        
        // Se for erro de configuração, mostrar mensagem mais clara
        if (error.requiresSetup || errorMessage.includes('Bucket de vídeos não configurado')) {
          errorMessage = 'Configuração necessária: O bucket de vídeos precisa ser criado no Supabase. Execute o script SQL: database/create_post_videos_bucket.sql no Supabase SQL Editor.';
        }
        
        showToast(errorMessage, 'error');
        return;
      }

      if (!data) {
        showToast('Post criado mas nenhum dado foi retornado.', 'error');
        return;
      }

      // Verificar se os vídeos foram associados ao post
      const hasVideos = data.post_videos && data.post_videos.length > 0;
      if (!hasVideos) {
        console.warn('⚠️ Post criado mas sem vídeos associados!');
        showToast('Post criado, mas os vídeos não foram associados corretamente.', 'warning');
      } else {
        console.log('✅ Post criado com sucesso! Vídeos associados:', data.post_videos.length);
      }

      // Limpar campos e fechar modal
      setVideos([]);
      setDescription('');
      onPostCreated?.(data);
      onClose();
      
      if (hasVideos) {
        showToast('Publicação criada com sucesso!', 'success');
      }
    } catch (error) {
      console.error('Erro ao criar post:', error);
      showToast(`Ocorreu um erro ao criar a publicação: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setVideos([]);
      setDescription('');
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
                Publicar vídeo
              </Text>
              <TouchableOpacity
                onPress={handlePost}
                disabled={isLoading || videos.length === 0}
                style={[
                  styles.postButton,
                  (videos.length === 0 || isLoading) && styles.postButtonDisabled,
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

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Video selection area */}
              <View style={styles.videoSection}>
                {videos.length > 0 ? (
                  <View style={styles.videosList}>
                    {videos.map((video, index) => (
                      <View key={index} style={[styles.videoItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <View style={styles.videoHeader}>
                          <View style={styles.videoInfo}>
                            <Ionicons name="videocam" size={20} color={theme.primary} />
                            <Text style={[styles.videoNumber, { color: theme.text }]}>
                              Vídeo {index + 1}
                            </Text>
                            {video.duration && (
                              <Text style={[styles.videoDuration, { color: theme.textSecondary }]}>
                                {formatDuration(video.duration)}
                              </Text>
                            )}
                            {video.fileSize && (
                              <Text style={[styles.videoSize, { color: theme.textSecondary }]}>
                                {formatFileSize(video.fileSize)}
                              </Text>
                            )}
                          </View>
                          <View style={styles.videoActions}>
                            <TouchableOpacity
                              onPress={() => toggleAudio(index)}
                              style={styles.audioButton}
                            >
                              <Ionicons 
                                name={video.hasAudio !== false ? "volume-high" : "volume-mute"} 
                                size={20} 
                                color={video.hasAudio !== false ? theme.primary : theme.textSecondary} 
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => removeVideo(index)}
                              style={styles.removeButton}
                            >
                              <Ionicons name="close-circle" size={24} color="#FF3040" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        {/* Caption input for each video */}
                        <TextInput
                          style={[
                            styles.captionInput,
                            {
                              color: theme.text,
                              backgroundColor: theme.card,
                              borderColor: theme.border
                            }
                          ]}
                          placeholder="Legenda para este vídeo (opcional)"
                          placeholderTextColor={theme.textSecondary}
                          value={video.caption || ''}
                          onChangeText={(text) => updateCaption(index, text)}
                          multiline
                          maxLength={200}
                          editable={!isLoading}
                        />
                      </View>
                    ))}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.addVideoButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                    onPress={pickVideos}
                  >
                    <Ionicons name="videocam-outline" size={48} color={theme.textSecondary} />
                    <Text style={[styles.addVideoText, { color: theme.textSecondary }]}>
                      Adicionar vídeos
                    </Text>
                    <Text style={[styles.addVideoSubtext, { color: theme.textSecondary }]}>
                      Toque para selecionar até {MAX_VIDEOS} vídeos
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Add more videos button */}
                {videos.length > 0 && videos.length < MAX_VIDEOS && (
                  <TouchableOpacity
                    style={[styles.addMoreButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                    onPress={pickVideos}
                  >
                    <Ionicons name="add" size={24} color={theme.primary} />
                    <Text style={[styles.addMoreText, { color: theme.primary }]}>
                      Adicionar mais vídeos ({videos.length}/{MAX_VIDEOS})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Description input */}
              <View style={styles.descriptionSection}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Descrição do post (opcional)
                </Text>
                <TextInput
                  style={[
                    styles.descriptionInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.background,
                      borderColor: theme.border
                    }
                  ]}
                  placeholder="Escreva uma descrição para sua publicação..."
                  placeholderTextColor={theme.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  editable={!isLoading}
                />
                <Text style={[styles.charCount, { color: theme.textSecondary }]}>
                  {description.length}/500
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
    paddingBottom: 20,
  },
  videoSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  addVideoButton: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  addVideoText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  addVideoSubtext: {
    fontSize: 12,
    marginTop: 5,
  },
  videosList: {
    gap: 15,
    marginBottom: 15,
  },
  videoItem: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  videoNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  videoDuration: {
    fontSize: 12,
    marginLeft: 8,
  },
  videoSize: {
    fontSize: 12,
    marginLeft: 8,
  },
  videoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audioButton: {
    padding: 5,
  },
  removeButton: {
    padding: 5,
  },
  captionInput: {
    minHeight: 60,
    padding: 12,
    fontSize: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  descriptionInput: {
    minHeight: 100,
    padding: 15,
    fontSize: 16,
    lineHeight: 22,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 5,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
  },
});

export default VideoPostModal;


