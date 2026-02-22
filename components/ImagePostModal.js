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
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeContext } from '../contexts/ThemeContext';
import { useUserContext } from '../contexts/UserContext';
import { createImagePost } from '../services/postService';
import { useToast } from '../contexts/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_IMAGES = 8;

const ImagePostModal = ({ visible, onClose, onPostCreated }) => {
  const { theme } = useThemeContext();
  const { name, username } = useUserContext();
  const { showToast } = useToast();
  const [images, setImages] = useState([]);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Precisamos de permissão para acessar suas fotos!', 'error');
        return false;
      }
    }
    return true;
  };

  const pickImages = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      showToast(`Você pode adicionar no máximo ${MAX_IMAGES} fotos.`, 'error');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
        selectionLimit: remainingSlots,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          width: asset.width,
          height: asset.height,
          base64: asset.base64
        }));
        setImages(prev => [...prev, ...newImages].slice(0, MAX_IMAGES));
        
        const added = Math.min(newImages.length, MAX_IMAGES - images.length);
        if (added < newImages.length) {
          showToast(`Apenas ${added} imagens foram adicionadas (limite de ${MAX_IMAGES} imagens)`, 'info');
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar imagens:', error);
      showToast('Não foi possível selecionar as imagens.', 'error');
    }
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handlePost = async () => {
    if (images.length === 0) {
      showToast('Por favor, selecione pelo menos uma foto para publicar.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await createImagePost(images, description.trim());
      
      if (error) {
        showToast('Não foi possível criar a publicação. Tente novamente.', 'error');
        console.error('Erro ao criar post:', error);
        return;
      }

      // Limpar campos e fechar modal
      setImages([]);
      setDescription('');
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
      setImages([]);
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
                Publicar foto
              </Text>
              <TouchableOpacity
                onPress={handlePost}
                disabled={isLoading || images.length === 0}
                style={[
                  styles.postButton,
                  (images.length === 0 || isLoading) && styles.postButtonDisabled,
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
              {/* Image selection area */}
              <View style={styles.imageSection}>
                {images.length > 0 ? (
                  <View style={styles.imagesGrid}>
                    {images.map((image, index) => (
                      <View key={index} style={styles.imageContainer}>
                        <Image 
                          source={{ uri: image.uri }} 
                          style={styles.previewImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color="#FF3040" />
                        </TouchableOpacity>
                        <View style={styles.imageNumberBadge}>
                          <Text style={styles.imageNumberText}>{index + 1}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.addImageButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                    onPress={pickImages}
                  >
                    <Ionicons name="image-outline" size={48} color={theme.textSecondary} />
                    <Text style={[styles.addImageText, { color: theme.textSecondary }]}>
                      Adicionar fotos
                    </Text>
                    <Text style={[styles.addImageSubtext, { color: theme.textSecondary }]}>
                      Toque para selecionar até {MAX_IMAGES} fotos
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Add more images button */}
                {images.length > 0 && images.length < MAX_IMAGES && (
                  <TouchableOpacity
                    style={[styles.addMoreButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                    onPress={pickImages}
                  >
                    <Ionicons name="add" size={24} color={theme.primary} />
                    <Text style={[styles.addMoreText, { color: theme.primary }]}>
                      Adicionar mais fotos ({images.length}/{MAX_IMAGES})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Description input */}
              <View style={styles.descriptionSection}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Descrição (opcional)
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
                  placeholder="Escreva uma legenda para suas fotos..."
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
  imageSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  addImageButton: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  addImageSubtext: {
    fontSize: 12,
    marginTop: 5,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  imageContainer: {
    width: (SCREEN_WIDTH - 60) / 3, // 3 colunas com padding
    height: (SCREEN_WIDTH - 60) / 3,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  imageNumberBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageNumberText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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

export default ImagePostModal;



