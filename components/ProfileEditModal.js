import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, Image, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/AppStyles';
import { useUserContext } from '../contexts/UserContext';
import { useThemeContext } from '../contexts/ThemeContext';
import OptimizedImage from './OptimizedImage';

const ProfileEditModal = ({
  modalVisible,
  setModalVisible,
  name,
  setName,
  username,
  setUsername,
  bio,
  setBio,
  profileImage,
  pickImage,
  theme,
  selectedMode
}) => {
  const { name: userName, setName: setUserName, username: userUsername, setUsername: setUserUsername, bio: userBio, setBio: setUserBio, profileImage: userProfileImage, pickImage: userPickImage } = useUserContext();
  const { theme: userTheme, selectedMode: userSelectedMode } = useThemeContext();
  const [uploadingImage, setUploadingImage] = useState(false);

  const handlePickImage = async () => {
    setUploadingImage(true);
    try {
      const result = await userPickImage();
      
      if (result.error) {
        Alert.alert(
          'Erro ao atualizar foto',
          result.error || 'Não foi possível atualizar a foto de perfil. Tente novamente.',
          [{ text: 'OK' }]
        );
      } else if (result.url) {
        Alert.alert(
          'Sucesso',
          'Foto de perfil atualizada com sucesso!',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert(
        'Erro',
        error.message || 'Ocorreu um erro ao atualizar a foto de perfil.',
        [{ text: 'OK' }]
      );
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Modal visible={modalVisible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: userTheme.background }]}>
        <Text style={[styles.modalTitle, { color: userTheme.text }]}>Editar Perfil</Text>

        <TouchableOpacity 
          onPress={handlePickImage} 
          disabled={uploadingImage}
          accessibilityLabel="Alterar imagem de perfil no modal"
          style={{ position: 'relative' }}
        >
          {uploadingImage && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 50,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1
            }}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          )}
          <OptimizedImage 
            source={userProfileImage} 
            style={styles.profileImage}
            fallbackIcon="person-circle-outline"
            fallbackSize={100}
          />
          {!uploadingImage && (
            <View style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: userTheme.primary || userTheme.icon,
              borderRadius: 15,
              width: 30,
              height: 30,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: userTheme.background
            }}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { color: userTheme.text, borderColor: userTheme.border, backgroundColor: userTheme.card }]}
          value={userName}
          onChangeText={setUserName}
          placeholder="Nome"
          placeholderTextColor={userTheme.text}
          accessibilityLabel="Campo nome"
          autoFocus
        />
        <TextInput
          style={[styles.input, { color: userTheme.text, borderColor: userTheme.border, backgroundColor: userTheme.card }]}
          value={userUsername}
          onChangeText={setUserUsername}
          placeholder="Usuário"
          placeholderTextColor={userTheme.text}
          accessibilityLabel="Campo usuário"
        />
        <TextInput
          style={[styles.input, { height: 80, color: userTheme.text, borderColor: userTheme.border, backgroundColor: userTheme.card }]}
          value={userBio}
          onChangeText={setUserBio}
          placeholder="Bio"
          multiline
          placeholderTextColor={userTheme.text}
          accessibilityLabel="Campo bio"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
          <Ionicons name={userSelectedMode === 'escuro' ? 'moon' : 'sunny'} size={24} color={userSelectedMode === 'escuro' ? '#FFD700' : userTheme.icon} style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 16, color: userTheme.text, marginRight: 10 }}>Modo noturno</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: userTheme.text }]}
          onPress={() => setModalVisible(false)}
          accessibilityLabel="Salvar alterações do perfil"
        >
          <Text style={[styles.buttonText, { color: userTheme.card }]}>Salvar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

export default ProfileEditModal; 