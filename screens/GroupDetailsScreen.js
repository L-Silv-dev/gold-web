import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeContext } from '../contexts/ThemeContext';
import { supabase } from '../utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import { 
  getGroupDetails, 
  updateGroupInfo, 
  updateGroupPermissions, 
  leaveGroup, 
  deleteGroup, 
  removeGroupParticipant,
  uploadGroupImage,
  addGroupParticipant,
  promoteToAdmin,
  dismissAdmin
} from '../services/messageService';

const GroupDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId } = route.params;
  const { theme } = useThemeContext();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchGroupDetails();
  }, [conversationId]);

  const fetchGroupDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { group, participants, error } = await getGroupDetails(conversationId);
      
      if (error) throw error;

      setGroup(group);
      setParticipants(participants);
      setEditedName(group.name);
      
      // Verificar se é admin
      const currentUserParticipant = participants.find(p => p.id === user.id);
      const isUserAdmin = (currentUserParticipant && currentUserParticipant.is_admin) || group.admin_id === user.id;
      setIsAdmin(!!isUserAdmin);
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar detalhes do grupo:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do grupo.');
      navigation.goBack();
    }
  };

  const handleUpdateImage = async () => {
    if (!isAdmin) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        
        const { url, error } = await uploadGroupImage(conversationId, result.assets[0]);
        
        if (error) {
            console.error('Erro upload:', error);
            throw error;
        }
        
        if (url) {
            await updateGroupInfo(conversationId, group.name, url);
            setGroup(prev => ({ ...prev, group_image_url: url }));
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar imagem:', error);
      Alert.alert('Erro', 'Falha ao atualizar a imagem do grupo.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      Alert.alert('Erro', 'O nome do grupo não pode ser vazio.');
      return;
    }
    
    try {
      await updateGroupInfo(conversationId, editedName.trim(), group.group_image_url);
      setGroup(prev => ({ ...prev, name: editedName.trim() }));
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar nome:', error);
      Alert.alert('Erro', 'Falha ao atualizar nome do grupo.');
    }
  };

  const handleTogglePermissions = async (value) => {
    try {
      // Otimista
      setGroup(prev => ({ ...prev, only_admins_can_post: value }));
      await updateGroupPermissions(conversationId, value);
    } catch (error) {
      // Reverter em caso de erro
      setGroup(prev => ({ ...prev, only_admins_can_post: !value }));
      Alert.alert('Erro', 'Falha ao atualizar permissões.');
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Sair do Grupo',
      'Tem certeza que deseja sair deste grupo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(conversationId, currentUserId);
              navigation.navigate('Main'); // Voltar para home/lista
            } catch (error) {
              Alert.alert('Erro', 'Falha ao sair do grupo.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Excluir Grupo',
      'Esta ação apagará o grupo e todas as mensagens para todos os participantes. Não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(conversationId);
              navigation.navigate('Main');
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir o grupo.');
            }
          }
        }
      ]
    );
  };

  const handleRemoveParticipant = (participantId, participantName) => {
    Alert.alert(
      'Remover Participante',
      `Remover ${participantName} do grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeGroupParticipant(conversationId, participantId);
              setParticipants(prev => prev.filter(p => p.id !== participantId));
            } catch (error) {
              Alert.alert('Erro', 'Falha ao remover participante.');
            }
          }
        }
      ]
    );
  };

  const handleAddParticipant = () => {
    navigation.navigate('FindUsers', {
      onSelectUser: async (userId) => {
        try {
          // Verificar se já está no grupo
          if (participants.some(p => p.id === userId)) {
            Alert.alert('Aviso', 'Este usuário já está no grupo.');
            return;
          }

          const { error } = await addGroupParticipant(conversationId, userId);
          if (error) throw error;
          
          fetchGroupDetails();
          Alert.alert('Sucesso', 'Participante adicionado.');
        } catch (error) {
          console.error(error);
          Alert.alert('Erro', 'Não foi possível adicionar o participante.');
        }
      }
    });
  };

  const handlePromoteToAdmin = (userId, userName) => {
    Alert.alert(
      'Promover a Admin',
      `Deseja tornar ${userName} um administrador do grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            try {
              const { error } = await promoteToAdmin(conversationId, userId);
              if (error) throw error;
              fetchGroupDetails();
              Alert.alert('Sucesso', 'Novo administrador definido.');
            } catch (error) {
              console.error(error);
              Alert.alert('Erro', 'Falha ao promover participante. Verifique se a funcionalidade de múltiplos admins está ativada no banco de dados.');
            }
          }
        }
      ]
    );
  };

  const handleDismissAdmin = (userId, userName) => {
    Alert.alert(
      'Remover Admin',
      `Deseja remover o status de administrador de ${userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            try {
              const { error } = await dismissAdmin(conversationId, userId);
              if (error) throw error;
              fetchGroupDetails();
              Alert.alert('Sucesso', 'Administrador removido.');
            } catch (error) {
              console.error(error);
              Alert.alert('Erro', 'Falha ao remover admin.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header do Grupo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleUpdateImage} disabled={!isAdmin}>
          <View style={styles.imageContainer}>
            {group?.group_image_url ? (
              <Image source={{ uri: group.group_image_url }} style={styles.groupImage} />
            ) : (
              <View style={[styles.groupImagePlaceholder, { backgroundColor: theme.primary }]}>
                <Ionicons name="people" size={40} color="#fff" />
              </View>
            )}
            {isAdmin && (
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {isEditing ? (
          <View style={styles.editNameContainer}>
            <TextInput
              style={[styles.nameInput, { color: theme.text, borderColor: theme.border }]}
              value={editedName}
              onChangeText={setEditedName}
              autoFocus
            />
            <TouchableOpacity onPress={handleSaveName} style={styles.saveButton}>
              <Ionicons name="checkmark-circle" size={30} color={theme.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nameContainer}>
            <Text style={[styles.groupName, { color: theme.text }]}>{group?.name}</Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={20} color={theme.textSecondary} style={{ marginLeft: 10 }} />
              </TouchableOpacity>
            )}
          </View>
        )}
        
        <Text style={[styles.participantsCount, { color: theme.textSecondary }]}>
          {participants.length} participantes
        </Text>
      </View>

      {/* Configurações de Admin */}
      {isAdmin && (
        <View style={[styles.section, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CONFIGURAÇÕES DO GRUPO</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Enviar Mensagens</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                {group?.only_admins_can_post ? 'Apenas Admins' : 'Todos os participantes'}
              </Text>
            </View>
            <Switch
              value={group?.only_admins_can_post}
              onValueChange={handleTogglePermissions}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={'#f4f3f4'}
            />
          </View>
        </View>
      )}

      {/* Lista de Participantes */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>PARTICIPANTES</Text>
            {isAdmin && (
                <TouchableOpacity onPress={handleAddParticipant} style={{ padding: 5 }}>
                    <Text style={{ color: theme.primary, fontWeight: 'bold' }}>+ Adicionar</Text>
                </TouchableOpacity>
            )}
        </View>
        {participants.map((participant) => (
          <View key={participant.id} style={[styles.participantRow, { borderBottomColor: theme.border }]}>
            <Image 
              source={{ uri: participant.profile_image_url || 'https://via.placeholder.com/150' }} 
              style={styles.participantAvatar} 
            />
            <View style={styles.participantInfo}>
              <Text style={[styles.participantName, { color: theme.text }]}>
                {participant.id === currentUserId ? 'Você' : participant.username}
              </Text>
              {(participant.is_admin || participant.id === group.admin_id) && (
                <Text style={[styles.adminBadge, { color: theme.primary }]}>Admin</Text>
              )}
            </View>
            
            {isAdmin && participant.id !== currentUserId && participant.id !== group.admin_id && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {!participant.is_admin ? (
                    <TouchableOpacity 
                      onPress={() => handlePromoteToAdmin(participant.id, participant.username)}
                      style={[styles.removeButton, { backgroundColor: theme.primary + '20', marginRight: 8 }]}
                    >
                      <Text style={[styles.removeButtonText, { color: theme.primary }]}>Promover</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      onPress={() => handleDismissAdmin(participant.id, participant.username)}
                      style={[styles.removeButton, { backgroundColor: '#f0f0f0', marginRight: 8 }]}
                    >
                      <Text style={[styles.removeButtonText, { color: '#666' }]}>Rebaixar</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    onPress={() => handleRemoveParticipant(participant.id, participant.username)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Remover</Text>
                  </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Ações de Perigo */}
      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.leaveButton]} 
          onPress={handleLeaveGroup}
        >
          <Ionicons name="exit-outline" size={20} color="#FF3B30" style={{ marginRight: 10 }} />
          <Text style={styles.leaveButtonText}>Sair do Grupo</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={handleDeleteGroup}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" style={{ marginRight: 10 }} />
            <Text style={styles.deleteButtonText}>Apagar Grupo</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  groupImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  groupImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    paddingVertical: 5,
    minWidth: 150,
    textAlign: 'center',
  },
  saveButton: {
    marginLeft: 10,
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  participantsCount: {
    fontSize: 14,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
  },
  adminBadge: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFE5E5',
    borderRadius: 15,
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsSection: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  leaveButton: {
    backgroundColor: '#FFF0F0',
  },
  leaveButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GroupDetailsScreen;
