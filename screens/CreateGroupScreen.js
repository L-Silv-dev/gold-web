import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeContext } from '../contexts/ThemeContext';
import { getUserFollowing } from '../services/userService';
import { createGroupConversation } from '../services/messageService';
import { supabase } from '../utils/supabase';
import OptimizedImage from '../components/OptimizedImage';

export default function CreateGroupScreen() {
  const { theme } = useThemeContext();
  const navigation = useNavigation();
  const [groupName, setGroupName] = useState('');
  const [following, setFollowing] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFollowing();
  }, []);

  const loadFollowing = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { following, error } = await getUserFollowing(user.id);
      if (error) throw error;
      setFollowing(following || []);
    } catch (error) {
      console.error('Erro ao carregar seguidores:', error);
      Alert.alert('Erro', 'Não foi possível carregar sua lista de amigos.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Atenção', 'Por favor, digite um nome para o grupo.');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um participante.');
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { conversationId, error } = await createGroupConversation(
        groupName.trim(),
        selectedUsers,
        user.id
      );

      if (error) throw error;

      navigation.replace('Chat', {
        conversationId,
        recipientName: groupName,
        isGroup: true
      });
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      Alert.alert('Erro', 'Não foi possível criar o grupo. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  const filteredFollowing = following.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      flex: 1,
    },
    createButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.primary,
      borderRadius: 20,
    },
    createButtonDisabled: {
      opacity: 0.5,
    },
    createButtonText: {
      color: 'white',
      fontWeight: '600',
    },
    inputContainer: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    inputLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: theme.card,
      padding: 12,
      borderRadius: 8,
      color: theme.text,
      fontSize: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchContainer: {
      padding: 16,
      backgroundColor: theme.card,
    },
    searchInput: {
      backgroundColor: theme.background,
      padding: 10,
      borderRadius: 8,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    list: {
      padding: 16,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginBottom: 8,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    userItemSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.cardBackground, // Ajuste leve se necessário
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    userInfo: {
      flex: 1,
    },
    username: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    name: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.textSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      textAlign: 'center',
      color: theme.textSecondary,
      marginTop: 20,
      fontSize: 16,
    }
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Novo Grupo</Text>
        <TouchableOpacity 
          style={[styles.createButton, (!groupName.trim() || selectedUsers.length === 0) && styles.createButtonDisabled]}
          onPress={handleCreateGroup}
          disabled={creating || !groupName.trim() || selectedUsers.length === 0}
        >
          {creating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.createButtonText}>Criar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Nome do Grupo</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Ex: Grupo de Estudos"
          placeholderTextColor={theme.textSecondary}
          value={groupName}
          onChangeText={setGroupName}
        />
      </View>

      <Text style={styles.sectionTitle}>Participantes ({selectedUsers.length})</Text>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar amigos..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredFollowing}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isSelected = selectedUsers.includes(item.id);
          return (
            <TouchableOpacity 
              style={[styles.userItem, isSelected && styles.userItemSelected]}
              onPress={() => toggleUserSelection(item.id)}
            >
              <OptimizedImage 
                source={item.profileImage} 
                style={styles.avatar}
                fallbackIcon="person-circle" 
              />
              <View style={styles.userInfo}>
                <Text style={styles.username}>@{item.username}</Text>
                {item.name && <Text style={styles.name}>{item.name}</Text>}
              </View>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {following.length === 0 
              ? 'Você precisa seguir alguém para criar um grupo.' 
              : 'Nenhum usuário encontrado.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}
