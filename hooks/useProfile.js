import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabase';
import { uploadProfileImage, fetchUserProfile, updateUserProfile } from '../services/userService';
import CacheManager from '../utils/cache';

export default function useProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    username: '',
    bio: '',
    profileImage: null,
    school: '',
    email: '',
    isLoading: true
  });

  // Carregar perfil do usuário ao iniciar
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const cachedProfile = await CacheManager.loadUserProfile();
        if (cachedProfile) {
          setProfile(prev => ({
            ...prev,
            ...cachedProfile,
            isLoading: false
          }));
        }

        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          const { profile: userProfile, error } = await fetchUserProfile(authUser.id);
          
          if (error && error.code !== 'PGRST116') {
            console.error('Erro ao buscar perfil:', error);
          }
          
          setUser(authUser);
          if (userProfile) {
            const mappedProfile = {
              name: userProfile.name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
              username: userProfile.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || '',
              bio: userProfile.bio || '',
              profileImage: userProfile.profileImage || userProfile.profile_image_url || null,
              school: userProfile.school || authUser.user_metadata?.school || '',
              email: userProfile.email || authUser.email || '',
              isLoading: false
            };
            setProfile(prev => ({
              ...prev,
              ...mappedProfile
            }));
            await CacheManager.saveUserProfile(mappedProfile);
          } else if (!cachedProfile) {
            // Apenas usar fallback de metadados se NÃO tivermos cache
            // Isso evita sobrescrever dados bons do cache com dados incompletos em caso de erro de rede
            setProfile(prev => ({
              ...prev,
              name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
              username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || '',
              bio: '',
              profileImage: null,
              school: authUser.user_metadata?.school || '',
              email: authUser.email || '',
              isLoading: false
            }));
          } else {
             // Temos cache e a requisição falhou: manter cache e parar loading
             setProfile(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setProfile(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        setProfile(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadProfile();

    // Configurar listener de mudança de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { profile: userProfile, error } = await fetchUserProfile(session.user.id);
          
          setUser(session.user);
          if (userProfile) {
            setProfile(prev => ({
              ...prev,
              name: userProfile.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
              username: userProfile.username || session.user.user_metadata?.username || session.user.email?.split('@')[0] || '',
              bio: userProfile.bio || '',
              profileImage: userProfile.profileImage || userProfile.profile_image_url || null,
              school: userProfile.school || session.user.user_metadata?.school || '',
              email: userProfile.email || session.user.email || '',
              isLoading: false
            }));
          } else {
            setProfile(prev => ({
              ...prev,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '',
              bio: '',
              profileImage: null,
              school: session.user.user_metadata?.school || '',
              email: session.user.email || '',
              isLoading: false
            }));
          }
        } else {
          setUser(null);
          setProfile({
            name: '',
            username: '',
            bio: '',
            profileImage: null,
            school: '',
            email: '',
            isLoading: false
          });
        }
      }
    );

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const updateProfile = async (updates) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { data, error } = await updateUserProfile(user.id, updates);
      
      if (error) throw error;
      
      setProfile(prev => {
        const newProfile = {
          ...prev,
          ...(data || updates)
        };
        CacheManager.saveUserProfile(newProfile);
        return newProfile;
      });
      return { data, error: null };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return { data: null, error };
    }
  };

  // Selecionar e fazer upload de imagem de perfil
  const pickImage = async () => {
    try {
      console.log('📸 Iniciando seleção de imagem de perfil...');
      
      if (!user) {
        console.error('❌ Usuário não autenticado');
        return { error: 'Usuário não autenticado' };
      }

      console.log('Solicitando permissão para acessar galeria...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.error('❌ Permissão negada');
        return { error: 'Permissão para acessar a galeria é necessária' };
      }

      console.log('Abrindo seletor de imagens...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      
      if (result.canceled || !result.assets?.[0]?.uri) {
        console.log('Seleção cancelada ou nenhuma imagem selecionada');
        return { error: 'Nenhuma imagem selecionada' };
      }

      const imageUri = result.assets[0].uri;
      console.log('✅ Imagem selecionada:', imageUri.substring(0, 50) + '...');
      console.log('Iniciando upload...');
      
      // Fazer upload da imagem
      const { url, error: uploadError } = await uploadProfileImage(user.id, {
        uri: imageUri,
        type: 'image/jpeg',
        name: `profile_${user.id}.jpg`
      });

      if (uploadError) {
        console.error('❌ Erro no upload:', uploadError);
        throw new Error(uploadError);
      }

      if (!url) {
        console.error('❌ URL não retornada do upload');
        throw new Error('Upload concluído mas URL não foi retornada');
      }

      console.log('✅ Upload concluído, URL:', url);
      console.log('Atualizando perfil no banco de dados...');

      // Atualizar perfil com a nova URL da imagem
      const { error: updateError } = await updateProfile({
        profile_image_url: url
      });

      if (updateError) {
        console.error('❌ Erro ao atualizar perfil:', updateError);
        throw updateError;
      }

      console.log('✅ Perfil atualizado com sucesso');
      console.log('✅ Foto de perfil atualizada completamente');
      return { url, error: null };
    } catch (error) {
      console.error('❌ Erro completo ao selecionar imagem:', error);
      console.error('Stack trace:', error.stack);
      const errorMessage = error.message || error.toString() || 'Erro ao processar a imagem';
      return { url: null, error: errorMessage };
    }
  };

  // Remover imagem de perfil
  const removeProfileImage = async () => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { error } = await updateProfile({ profile_image_url: null });
      
      if (error) throw error;
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Erro ao remover imagem de perfil:', error);
      return { success: false, error: error.message };
    }
  };

  // Funções auxiliares para compatibilidade
  const setName = (name) => updateProfile({ name });
  const setUsername = (username) => updateProfile({ username });
  const setBio = (bio) => updateProfile({ bio });
  const setUserEmail = (email) => setProfile(prev => ({ ...prev, email }));
  const setUserSchool = (school) => updateProfile({ school });

  return {
    ...profile,
    user,
    updateProfile,
    pickImage,
    removeProfileImage,
    isAuthenticated: !!user,
    // Funções auxiliares para compatibilidade
    setName,
    setUsername,
    setBio,
    setUserEmail,
    setUserSchool,
  };
}
