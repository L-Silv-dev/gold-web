import { supabase } from '../utils/supabase';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Funções para gerenciar seguidores

// Função para buscar os dados do usuário da tabela profiles
export const fetchUserProfile = async (userId) => {
  try {
    if (!userId) {
      return { profile: null, error: { message: 'ID do usuário não fornecido' } };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // Se o perfil não existe, retornar estrutura vazia
      if (error.code === 'PGRST116') {
        return {
          profile: {
            id: userId,
            email: '',
            full_name: '',
            username: '',
            bio: '',
            school: '',
            profile_image_url: null,
            theme_mode: 'claro',
          },
          error: null
        };
      }
      throw error;
    }

    // Mapear os campos para o formato esperado pelo app
    return {
      profile: {
        id: data.id,
        email: data.email || '',
        name: data.full_name || '',
        username: data.username || '',
        bio: data.bio || '',
        school: data.school || '',
        profileImage: data.profile_image_url || null,
        profile_image_url: data.profile_image_url || null,
        theme_mode: data.theme_mode || 'claro',
      },
      error: null
    };
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return { profile: null, error };
  }
};

// Função para atualizar o perfil do usuário
export const updateUserProfile = async (userId, updates) => {
  try {
    if (!userId) {
      return { data: null, error: { message: 'ID do usuário não fornecido' } };
    }

    // Mapear campos do app para campos do banco
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.full_name = updates.name;
    if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name;
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.school !== undefined) dbUpdates.school = updates.school;
    if (updates.profile_image_url !== undefined) dbUpdates.profile_image_url = updates.profile_image_url;
    if (updates.profileImage !== undefined) dbUpdates.profile_image_url = updates.profileImage;
    if (updates.theme_mode !== undefined) dbUpdates.theme_mode = updates.theme_mode;
    if (updates.theme !== undefined) dbUpdates.theme_mode = updates.theme;

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Retornar no formato esperado pelo app
    return {
      data: {
        id: data.id,
        email: data.email,
        name: data.full_name,
        username: data.username,
        bio: data.bio,
        school: data.school,
        profileImage: data.profile_image_url,
        profile_image_url: data.profile_image_url,
        theme_mode: data.theme_mode || 'claro',
      },
      error: null
    };
  } catch (error) {
    logger.error('Erro ao atualizar perfil:', error);
    return { data: null, error };
  }
};

// Função para fazer upload da imagem de perfil
export const uploadProfileImage = async (userId, file) => {
  try {
    if (!file || !file.uri) {
      throw new Error('Arquivo de imagem inválido');
    }

    if (!userId) {
      throw new Error('ID do usuário não fornecido');
    }

    // Extrair a extensão do arquivo
    const fileExt = file.uri.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `${userId}/profile.${fileExt}`;
    const filePath = fileName;

    console.log('Lendo arquivo da URI:', file.uri);

    // Função auxiliar para decodificar base64 para Uint8Array
    const decodeBase64ToUint8 = (base64) => {
      if (!base64) return new Uint8Array();
      // Usar atob se disponível, senão usar polyfill
      const atobPolyfill = (input = '') => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let str = input.replace(/=+$/, '');
        if (str.length % 4 === 1) {
          throw new Error('String base64 inválida');
        }
        let output = '';
        for (let bc = 0, bs = 0, buffer, idx = 0; (buffer = str.charAt(idx++)); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))) : 0) {
          buffer = chars.indexOf(buffer);
        }
        return output;
      };
      
      const binaryString = (globalThis.atob || atobPolyfill)(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    };

    // Ler o arquivo usando FileSystem (mais confiável no React Native)
    let fileData = null;
    try {
      // Tentar primeiro com fetch (para URLs remotas)
      if (file.uri.startsWith('http://') || file.uri.startsWith('https://')) {
        console.log('Lendo arquivo remoto via fetch...');
        try {
          const response = await fetch(file.uri);
          if (!response.ok) {
            throw new Error(`Falha ao ler arquivo (status ${response.status})`);
          }
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          fileData = new Uint8Array(arrayBuffer);
        } catch (fetchError) {
          console.warn('Fetch falhou, tentando FileSystem como fallback:', fetchError);
          // Fallback para FileSystem mesmo para URLs remotas
          const base64Data = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileData = decodeBase64ToUint8(base64Data);
        }
      } else {
        // Para arquivos locais, usar FileSystem
        console.log('Lendo arquivo local via FileSystem...');
        console.log('URI do arquivo:', file.uri);
        
        try {
          const base64Data = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          if (!base64Data || base64Data.length === 0) {
            throw new Error('Arquivo vazio ou não pôde ser lido');
          }
          
          console.log('Base64 lido, tamanho:', base64Data.length, 'caracteres');
          fileData = decodeBase64ToUint8(base64Data);
        } catch (fsError) {
          console.error('Erro ao ler com FileSystem:', fsError);
          // Tentar com fetch como fallback
          console.log('Tentando fetch como fallback...');
          try {
            const response = await fetch(file.uri);
            if (!response.ok) {
              throw new Error(`Falha ao ler arquivo (status ${response.status})`);
            }
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            fileData = new Uint8Array(arrayBuffer);
          } catch (fetchError) {
            console.error('Fetch também falhou:', fetchError);
            throw new Error(`Não foi possível ler o arquivo. FileSystem: ${fsError.message}, Fetch: ${fetchError.message}`);
          }
        }
      }
    } catch (readError) {
      console.error('Erro completo ao ler arquivo:', readError);
      console.error('Stack trace:', readError.stack);
      throw new Error(`Erro ao ler arquivo: ${readError.message || readError}`);
    }

    if (!fileData || fileData.length === 0) {
      throw new Error('Arquivo vazio ou inválido');
    }

    // Verificar tamanho do arquivo (limite de 5MB para imagens de perfil)
    const fileSizeMB = fileData.length / (1024 * 1024);
    console.log('Arquivo lido com sucesso, tamanho:', fileData.length, 'bytes', `(${fileSizeMB.toFixed(2)}MB)`);
    
    if (fileSizeMB > 5) {
      throw new Error(`Arquivo muito grande: ${fileSizeMB.toFixed(2)}MB. O limite é 5MB.`);
    }
    
    if (fileSizeMB < 0.001) {
      console.warn('⚠️ Arquivo muito pequeno, pode estar corrompido');
    }

    // Determinar content type
    const contentType = file.type || 
      (fileExt === 'png' ? 'image/png' : 
       fileExt === 'gif' ? 'image/gif' : 
       fileExt === 'webp' ? 'image/webp' : 
       'image/jpeg');

    console.log('Preparando upload:', {
      bucket: 'profile-pictures',
      filePath,
      contentType,
      fileSize: fileData.length,
      userId
    });

    // Não verificar bucket - tentar upload diretamente
    // Se o bucket não existir, o erro virá do upload
    console.log('Iniciando upload para o bucket profile-pictures...');

    // Primeiro, tentar deletar a imagem antiga se existir
    // Isso é necessário porque o Supabase Storage não suporta UPDATE direto
    try {
      const { error: deleteError } = await supabase.storage
        .from('profile-pictures')
        .remove([filePath]);
      
      if (deleteError && !deleteError.message.includes('not found') && !deleteError.message.includes('No such file')) {
        console.log('Aviso ao deletar arquivo antigo (pode não existir):', deleteError);
        // Não lançar erro, apenas continuar
      }
    } catch (deleteError) {
      // Ignorar erro se o arquivo não existir
      console.log('Arquivo antigo não encontrado ou já removido');
    }

    // Fazer upload para o storage
    console.log('Iniciando upload para o Supabase...');
    console.log('Dados do upload:', {
      bucket: 'profile-pictures',
      path: filePath,
      contentType,
      fileSize: fileData.length,
      fileType: typeof fileData,
      isUint8Array: fileData instanceof Uint8Array
    });
    
    let uploadData, uploadError;
    try {
      const uploadResult = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, fileData, {
          cacheControl: '3600',
          upsert: false, // Não usar upsert, já deletamos o arquivo anterior
          contentType: contentType
        });
      
      uploadData = uploadResult.data;
      uploadError = uploadResult.error;
    } catch (uploadException) {
      console.error('Exceção durante upload:', uploadException);
      uploadError = uploadException;
    }

    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError);
      console.error('Tipo do erro:', typeof uploadError);
      console.error('Mensagem do erro:', uploadError.message);
      console.error('Código do erro:', uploadError.statusCode || uploadError.code);
      console.error('Detalhes completos:', JSON.stringify(uploadError, null, 2));
      
      // Se o erro for de bucket não encontrado, retornar erro específico
      if (uploadError.message && (
        uploadError.message.includes('Bucket not found') ||
        uploadError.message.includes('not found') ||
        uploadError.statusCode === 404
      )) {
        const errorMsg = 'Bucket profile-pictures não encontrado. Verifique se o bucket foi criado no Supabase Storage.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Se o erro for de rede
      if (uploadError.message && (
        uploadError.message.includes('Network request failed') ||
        uploadError.message.includes('network') ||
        uploadError.message.includes('fetch') ||
        uploadError.message.includes('Failed to fetch')
      )) {
        const errorMsg = 'Erro de conexão com o servidor. Verifique sua conexão com a internet e tente novamente.';
        console.error('❌ Erro de rede:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Se o erro for de arquivo já existente, tentar deletar e fazer upload novamente
      if (uploadError.message && (
        uploadError.message.includes('already exists') || 
        uploadError.message.includes('duplicate') ||
        uploadError.message.includes('The resource already exists')
      )) {
        console.log('Arquivo ainda existe, tentando deletar e fazer upload novamente...');
        
        // Deletar novamente
        await supabase.storage
          .from('profile-pictures')
          .remove([filePath]);
        
        // Aguardar um pouco
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Tentar upload novamente
        const { data: retryUploadData, error: retryUploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(filePath, fileData, {
            cacheControl: '3600',
            upsert: false,
            contentType: contentType
          });
        
        if (retryUploadError) {
          console.error('Erro no retry do upload:', retryUploadError);
          throw retryUploadError;
        }
      } else {
        throw uploadError;
      }
    }

    // Obter a URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    // Adicionar timestamp para evitar cache (cache busting)
    const publicUrlWithTimestamp = `${publicUrl}?t=${new Date().getTime()}`;

    console.log('Upload successful, public URL:', publicUrlWithTimestamp);

    // Atualizar o perfil do usuário com a nova URL da imagem
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_image_url: publicUrlWithTimestamp })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao atualizar perfil:', updateError);
      throw updateError;
    }

    return { url: publicUrlWithTimestamp, error: null };
  } catch (error) {
    console.error('Erro completo ao fazer upload da imagem:', error);
    return { url: null, error: error.message || error.toString() };
  }
};

// Função para verificar se username está disponível
export const checkUsernameAvailability = async (username, currentUserId = null) => {
  try {
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', username);

    // Se houver um usuário atual, excluir ele da verificação
    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { available: data.length === 0, error: null };
  } catch (error) {
    console.error('Erro ao verificar disponibilidade do username:', error);
    return { available: false, error };
  }
};

// Função para buscar perfil por username
export const fetchProfileByUsername = async (username) => {
  try {
    if (!username) {
      return { profile: null, error: { message: 'Username não fornecido' } };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { profile: null, error: { message: 'Usuário não encontrado' } };
      }
      throw error;
    }

    return {
      profile: {
        id: data.id,
        email: data.email || '',
        name: data.full_name || '',
        username: data.username || '',
        bio: data.bio || '',
        school: data.school || '',
        profileImage: data.profile_image_url || null,
        profile_image_url: data.profile_image_url || null,
      },
      error: null
    };
  } catch (error) {
    console.error('Erro ao buscar perfil por username:', error);
    return { profile: null, error };
  }
};

// Seguir um usuário
export const followUser = async (followerId, followingId) => {
  try {
    if (!followerId || !followingId) {
      throw new Error('IDs do seguidor ou usuário a ser seguido não fornecidos');
    }

    if (followerId === followingId) {
      throw new Error('Não é possível seguir a si mesmo');
    }

    const { data, error } = await supabase
      .from('user_followers')
      .insert([
        { follower_id: followerId, following_id: followingId, status: 'pending' }
      ])
      .select()
      .single();

    if (error) {
      // Se já estiver seguindo, retornar sucesso
      if (error.code === '23505') { // Código de violação de restrição única
        return { success: true, alreadyFollowing: true };
      }
      throw error;
    }

    try {
      const { data: followerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', followerId)
        .single();
      const followerName = followerProfile?.username || 'Novo Usuário';
      try {
        await supabase.functions.invoke('push', {
          body: {
            targetUserIds: [followingId],
            title: '👤 Nova solicitação',
            body: `${followerName} solicitou seguir você`,
            data: { type: 'follow_request', requestId: data.id, followerId }
          }
        });
      } catch {}
    } catch (notifyErr) {
      console.error('Erro ao preparar notificação de solicitação:', notifyErr);
    }

    return { success: true, data, status: 'pending' };
  } catch (error) {
    console.error('Erro ao seguir usuário:', error);
    return { success: false, error };
  }
};

// Aceitar solicitação de seguidor
export const acceptFollowRequest = async (requestId) => {
  try {
    const { data, error } = await supabase
      .from('user_followers')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao aceitar solicitação:', error);
    return { success: false, error };
  }
};

// Rejeitar solicitação de seguidor (mesmo que unfollow, mas semântica diferente)
export const rejectFollowRequest = async (requestId) => {
  try {
    const { error } = await supabase
      .from('user_followers')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao rejeitar solicitação:', error);
    return { success: false, error };
  }
};

// Buscar solicitações de seguidores pendentes
export const getFollowRequests = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_followers')
      .select(`
        id,
        created_at,
        follower:profiles!user_followers_follower_id_profiles_fkey (
          id,
          username,
          full_name,
          profile_image_url
        )
      `)
      .eq('following_id', userId)
      .eq('status', 'pending');

    if (error) throw error;

    return { 
      requests: data.map(item => ({
        requestId: item.id,
        followerId: item.follower.id,
        username: item.follower.username,
        name: item.follower.full_name,
        profileImage: item.follower.profile_image_url,
        createdAt: item.created_at
      })), 
      error: null 
    };
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error);
    return { requests: [], error };
  }
};

// Deixar de seguir um usuário
export const unfollowUser = async (followerId, followingId) => {
  try {
    if (!followerId || !followingId) {
      throw new Error('IDs do seguidor ou usuário a ser deixado de seguir não fornecidos');
    }

    const { error } = await supabase
      .from('user_followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Erro ao deixar de seguir usuário:', error);
    return { success: false, error };
  }
};

// Verificar se um usuário segue outro e qual o status
export const checkFollowStatus = async (followerId, followingId) => {
  try {
    if (!followerId || !followingId) {
      return { isFollowing: false, status: null, error: 'IDs não fornecidos' };
    }

    const { data, error } = await supabase
      .from('user_followers')
      .select('status')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (error) throw error;

    return { 
      isFollowing: !!data, 
      status: data ? data.status : null,
      error: null 
    };
  } catch (error) {
    console.error('Erro ao verificar status de seguidor:', error);
    return { isFollowing: false, status: null, error };
  }
};

// Manter retrocompatibilidade com isFollowing, mas usando a nova lógica
export const isFollowing = async (followerId, followingId) => {
  const { isFollowing, status } = await checkFollowStatus(followerId, followingId);
  // Retorna true apenas se status for accepted para fins de visualização de conteúdo protegido, se houver
  // Mas para o botão de UI, usaremos checkFollowStatus
  return { isFollowing: isFollowing && status === 'accepted', error: null };
};

// Buscar seguidores de um usuário (apenas aceitos)
export const getUserFollowers = async (userId) => {
  try {
    if (!userId) {
      return { followers: [], error: 'ID do usuário não fornecido' };
    }

    const { data, error } = await supabase
      .from('user_followers')
      .select(`
        id,
        created_at,
        status,
        follower:profiles!user_followers_follower_id_profiles_fkey (
          id,
          username,
          full_name,
          profile_image_url
        )
      `)
      .eq('following_id', userId)
      .eq('status', 'accepted'); // Apenas aceitos

    if (error) throw error;

    return { 
      followers: data.map(item => ({
        id: item.follower.id,
        username: item.follower.username,
        name: item.follower.full_name,
        profileImage: item.follower.profile_image_url,
        followedAt: item.created_at
      })), 
      error: null 
    };
  } catch (error) {
    console.error('Erro ao buscar seguidores:', error);
    return { followers: [], error };
  }
};

// Buscar quem o usuário está seguindo (apenas aceitos)
export const getUserFollowing = async (userId) => {
  try {
    if (!userId) {
      return { following: [], error: 'ID do usuário não fornecido' };
    }

    const { data, error } = await supabase
      .from('user_followers')
      .select(`
        id,
        created_at,
        status,
        following:profiles!user_followers_following_id_profiles_fkey (
          id,
          username,
          full_name,
          profile_image_url
        )
      `)
      .eq('follower_id', userId)
      .eq('status', 'accepted'); // Apenas aceitos

    if (error) throw error;

    return { 
      following: data.map(item => ({
        id: item.following.id,
        username: item.following.username,
        name: item.following.full_name,
        profileImage: item.following.profile_image_url,
        followedAt: item.created_at
      })), 
      error: null 
    };
  } catch (error) {
    console.error('Erro ao buscar quem o usuário está seguindo:', error);
    return { following: [], error };
  }
};
