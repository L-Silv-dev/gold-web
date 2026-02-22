import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../utils/supabase';
import { useThemeContext } from '../contexts/ThemeContext';
import { followUser, unfollowUser } from '../services/userService';

export default function FindUsersScreen({ onBack, onViewProfile }) {
  const navigation = useNavigation();
  const route = useRoute();
  const onSelectUser = route.params?.onSelectUser;

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingStatus, setFollowingStatus] = useState({});
  const [processingFollow, setProcessingFollow] = useState({});
  const { theme } = useThemeContext();

  const fetchFollowingStatus = async (userIds) => {
    if (!userIds.length) return {};
    
    const status = {};
    const currentUserId = (await supabase.auth.getUser())?.data?.user?.id;
    
    if (!currentUserId) return status;
    
    try {
      const { data: followingData } = await supabase
        .from('user_followers')
        .select('following_id, status')
        .in('following_id', userIds)
        .eq('follower_id', currentUserId);
      
      const statusMap = {};
      followingData?.forEach(item => {
        statusMap[item.following_id] = item.status;
      });
      
      userIds.forEach(userId => {
        status[userId] = statusMap[userId] || null;
      });
    } catch (error) {
      console.error('Erro ao verificar status de seguimento:', error);
    }
    
    return status;
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setUsers([]);
      setFollowingStatus({});
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, profile_image_url')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', (await supabase.auth.getUser())?.data?.user?.id)
        .limit(20);

      if (error) throw error;
      
      const usersData = data || [];
      setUsers(usersData);
      
      const status = await fetchFollowingStatus(usersData.map(u => u.id));
      setFollowingStatus(prev => ({
        ...prev,
        ...status
      }));
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const handleViewProfile = (userId) => {
    if (onSelectUser) {
      onSelectUser(userId);
      navigation.goBack();
    } else if (onViewProfile) {
      onViewProfile(userId);
    } else {
      navigation.navigate('UserProfile', { userId });
    }
  };

  const handleFollow = async (userId) => {
    if (processingFollow[userId]) return;
    
    setProcessingFollow(prev => ({ ...prev, [userId]: true }));
    
    try {
      const currentUserId = (await supabase.auth.getUser())?.data?.user?.id;
      if (!currentUserId) return;
      
      const currentStatus = followingStatus[userId];
      
      if (currentStatus) {
        await unfollowUser(currentUserId, userId);
        setFollowingStatus(prev => ({
          ...prev,
          [userId]: null
        }));
      } else {
        const { status } = await followUser(currentUserId, userId);
        setFollowingStatus(prev => ({
          ...prev,
          [userId]: status || 'pending'
        }));
      }
      
    } catch (error) {
      console.error('Erro ao atualizar status de seguimento:', error);
    } finally {
      setProcessingFollow(prev => ({ ...prev, [userId]: false }));
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.userItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleViewProfile(item.id)}
      activeOpacity={0.7}
    >
      {item.profile_image_url ? (
        <Image 
          source={{ uri: item.profile_image_url }} 
          style={styles.avatar} 
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <Ionicons name="person" size={24} color="white" />
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: theme.text }]}>{item.username}</Text>
        {item.full_name && (
          <Text style={[styles.fullName, { color: theme.textSecondary }]}>{item.full_name}</Text>
        )}
      </View>
      <TouchableOpacity 
        style={[
          styles.followButton, 
          { 
            backgroundColor: followingStatus[item.id] === 'accepted' ? 'transparent' : theme.primary,
            borderWidth: followingStatus[item.id] === 'accepted' ? 1 : 0,
            borderColor: followingStatus[item.id] === 'accepted' ? theme.border : 'transparent'
          }
        ]}
        onPress={(e) => {
          e.stopPropagation();
          handleFollow(item.id);
        }}
        disabled={processingFollow[item.id]}
      >
        {processingFollow[item.id] ? (
          <ActivityIndicator size="small" color={theme.text} />
        ) : (
          <Text style={[
            styles.followButtonText, 
            { color: followingStatus[item.id] === 'accepted' ? theme.text : 'white' }
          ]}>
            {followingStatus[item.id] === 'accepted' ? 'Seguindo' : followingStatus[item.id] === 'pending' ? 'Solicitado' : 'Seguir'}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Nova Conversa</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar usuários..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={true}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.primary} />
          <Text style={{ color: theme.text, marginTop: 10 }}>Buscando...</Text>
        </View>
      ) : users.length > 0 ? (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.usersList}
          keyboardShouldPersistTaps="handled"
        />
      ) : searchQuery.length > 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            Nenhum usuário encontrado
          </Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            Digite um nome para buscar
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    margin: 10,
    borderRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  usersList: {
    padding: 10,
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
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    fontWeight: '600',
    fontSize: 14,
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
    fontSize: 16,
    textAlign: 'center',
  },
});
