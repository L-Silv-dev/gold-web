import { supabase } from '../utils/supabase';
import * as FileSystem from 'expo-file-system';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const atobPolyfill = (input = '') => {
  let str = input.replace(/=+$/, '');
  if (str.length % 4 === 1) {
    throw new Error('String base64 inválida');
  }

  let output = '';
  for (
    let bc = 0, bs = 0, buffer, idx = 0;
    (buffer = str.charAt(idx++));
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4)
      ? output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))
      : 0
  ) {
    buffer = BASE64_CHARS.indexOf(buffer);
  }

  return output;
};

const decodeBase64ToUint8 = (base64) => {
  if (!base64) return new Uint8Array();
  const binaryString = (globalThis.atob || atobPolyfill)(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const getBinaryFileData = async (image) => {
  if (image?.base64) {
    return decodeBase64ToUint8(image.base64);
  }

  try {
    const response = await fetch(image.uri);
    if (!response.ok) {
      throw new Error(`Falha ao ler arquivo (status ${response.status})`);
    }
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (fetchError) {
    const base64Data = await FileSystem.readAsStringAsync(image.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return decodeBase64ToUint8(base64Data);
  }
};

// Função para criar um post de texto
export const createTextPost = async (content) => {
  try {
    if (!content || !content.trim()) {
      return { data: null, error: { message: 'Conteúdo do post é obrigatório' } };
    }

    // Usar a função RPC que busca dados do autor automaticamente
    const { data, error } = await supabase.rpc('create_post_with_author', {
      p_content: content.trim(),
      p_type: 'text',
      p_image_url: null
    });

    if (error) {
      console.error('Erro ao criar post:', error);
      return { data: null, error };
    }

    return { data: data?.[0] || data, error: null };
  } catch (error) {
    console.error('Erro ao criar post:', error);
    return { data: null, error };
  }
};

// Função para buscar posts (feed)
export const fetchPosts = async (limit = 50, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Erro ao buscar posts (Supabase):', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('Erro ao buscar posts (Exception):', error);
    return { data: null, error };
  }
};

// Função para buscar posts de um usuário específico
export const fetchUserPosts = async (userId, limit = 50, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar posts do usuário:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Erro ao buscar posts do usuário:', error);
    return { data: null, error };
  }
};

// Função para deletar um post
export const deletePost = async (postId) => {
  try {
    // Primeiro, verificar se o usuário é o dono da postagem
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'Usuário não autenticado' } };
    }

    // Buscar o post para verificar o autor
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      console.error('Erro ao buscar post:', fetchError);
      return { data: null, error: fetchError || { message: 'Post não encontrado' } };
    }

    // Verificar se o usuário é o autor do post
    if (post.author_id !== user.id) {
      return { 
        data: null, 
        error: { 
          message: 'Você não tem permissão para excluir esta publicação' 
        } 
      };
    }

    // Se for o autor, prosseguir com a exclusão
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Erro ao deletar post:', deleteError);
      return { data: null, error: deleteError };
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Erro ao deletar post:', error);
    return { data: null, error };
  }
};

// Função para atualizar um post
export const updatePost = async (postId, content) => {
  try {
    if (!content || !content.trim()) {
      return { data: null, error: { message: 'Conteúdo do post é obrigatório' } };
    }

    const { data, error } = await supabase
      .from('posts')
      .update({ content: content.trim() })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar post:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erro ao atualizar post:', error);
    return { data: null, error };
  }
};

// Função para curtir/descurtir um post
export const togglePostLike = async (postId) => {
  try {
    const { data, error } = await supabase.rpc('toggle_post_like', {
      p_post_id: postId
    });

    if (error) {
      console.error('Erro ao curtir post:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erro ao curtir post:', error);
    return { data: null, error };
  }
};

// Função para verificar se usuário curtiu um post
export const checkPostLiked = async (postId) => {
  try {
    const { data, error } = await supabase.rpc('is_post_liked', {
      p_post_id: postId
    });

    if (error) {
      console.error('Erro ao verificar like:', error);
      return { data: false, error };
    }

    return { data: data || false, error: null };
  } catch (error) {
    console.error('Erro ao verificar like:', error);
    return { data: false, error };
  }
};

// Função para buscar contagem de likes de um post
export const getPostLikeCount = async (postId) => {
  try {
    const { data, error } = await supabase.rpc('get_post_like_count', {
      p_post_id: postId
    });

    if (error) {
      console.error('Erro ao buscar contagem de likes:', error);
      return { data: 0, error };
    }

    return { data: data || 0, error: null };
  } catch (error) {
    console.error('Erro ao buscar contagem de likes:', error);
    return { data: 0, error };
  }
};

// Função para criar um post com múltiplas imagens
export const createImagePost = async (images, description = '') => {
  try {
    if (!images || images.length === 0) {
      return { data: null, error: { message: 'Pelo menos uma imagem é obrigatória' } };
    }

    if (images.length > 8) {
      return { data: null, error: { message: 'Máximo de 8 imagens permitidas' } };
    }

    // Primeiro, fazer upload de todas as imagens
    const uploadedImages = [];
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: { message: 'Usuário não autenticado' } };
    }

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // Garantir que temos uma URI válida
      if (!image || (!image.uri && typeof image !== 'string')) {
        console.error(`Imagem ${i + 1} inválida:`, image);
        continue;
      }

      // Normalizar para objeto se for string (legado)
      const imageObj = typeof image === 'string' ? { uri: image } : image;
      
      const fileExt = imageObj.uri ? imageObj.uri.split('.').pop()?.split('?')[0] || 'jpg' : 'jpg';
      const fileName = `${user.id}/posts/${Date.now()}_${i}.${fileExt}`;
      const contentType = imageObj.type?.startsWith('image/') ? imageObj.type : 'image/jpeg';

      let fileData = null;
      try {
        fileData = await getBinaryFileData(imageObj);
      } catch (readError) {
        console.error(`Erro ao preparar arquivo ${i + 1}:`, readError);
        continue;
      }

      if (!fileData || fileData.length === 0) {
        console.error(`Arquivo ${i + 1} vazio ou inválido`);
        continue;
      }

      // Fazer upload
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, fileData, {
          cacheControl: '3600',
          contentType,
        });

      if (uploadError) {
        console.error(`Erro ao fazer upload da imagem ${i + 1}:`, uploadError);
        // Continuar com as outras imagens mesmo se uma falhar
        continue;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      uploadedImages.push({
        url: publicUrl,
        order: i,
      });
    }

    if (uploadedImages.length === 0) {
      return { data: null, error: { message: 'Erro ao fazer upload das imagens' } };
    }

    // Criar o post usando a função RPC
    const { data: postData, error: postError } = await supabase.rpc('create_post_with_author', {
      p_content: description || '',
      p_type: 'image',
      p_image_url: uploadedImages[0].url, // Primeira imagem como principal (compatibilidade)
    });

    if (postError) {
      console.error('Erro ao criar post:', postError);
      return { data: null, error: postError };
    }

    const post = postData?.[0] || postData;

    // Inserir todas as imagens na tabela post_images
    const imageInserts = uploadedImages.map(img => ({
      post_id: post.id,
      image_url: img.url,
      image_order: img.order,
    }));

    const { error: imagesError } = await supabase
      .from('post_images')
      .insert(imageInserts);

    if (imagesError) {
      console.error('Erro ao salvar imagens:', imagesError);
      // Post foi criado, mas imagens não foram salvas na tabela
      // Retornar sucesso mesmo assim, pois a primeira imagem está em image_url
    }

    // Buscar o post completo com todas as imagens
    const { data: fullPost, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        post_images (
          id,
          image_url,
          image_order
        )
      `)
      .eq('id', post.id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar post completo:', fetchError);
      return { data: post, error: null };
    }

    return { data: fullPost, error: null };
  } catch (error) {
    console.error('Erro ao criar post com imagens:', error);
    return { data: null, error };
  }
};

// Função para buscar posts com informações de likes
export const fetchPostsWithLikes = async (userId, limit = 50, offset = 0) => {
  try {
    // Buscar posts com imagens, vídeos e foto de perfil atualizada do autor
    // Usar join manual através do author_id para pegar a foto atualizada
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        post_images (
          id,
          image_url,
          image_order
        ),
        post_videos (
          id,
          video_url,
          video_order,
          caption,
          has_audio,
          duration,
          thumbnail_url
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      console.error('Erro ao buscar posts:', postsError);
      return { data: null, error: postsError };
    }

    if (!posts || posts.length === 0) {
      return { data: [], error: null };
    }

    // Buscar fotos de perfil atualizadas de todos os autores
    const authorIds = [...new Set(posts.map(p => p.author_id).filter(Boolean))];
    let authorProfiles = {};
    
    if (authorIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, profile_image_url, username, full_name')
        .in('id', authorIds);
      
      if (!profilesError && profiles) {
        profiles.forEach(profile => {
          authorProfiles[profile.id] = {
            avatar: profile.profile_image_url || null,
            name: (profile.full_name || profile.username || 'Usuário')
          };
        });
      }
    }

    // Log para debug: verificar posts com vídeos
    const postsWithVideos = posts.filter(p => p.post_videos && p.post_videos.length > 0);
    if (postsWithVideos.length > 0) {
      console.log(`📹 fetchPostsWithLikes: ${postsWithVideos.length} post(s) com vídeo(s) encontrado(s)`);
      postsWithVideos.forEach(post => {
        console.log(`  Post ${post.id} (type: ${post.type}):`, {
          videoCount: post.post_videos.length,
          videos: post.post_videos.map(v => ({
            id: v.id,
            url: v.video_url?.substring(0, 50) + '...',
            order: v.video_order,
            hasAudio: v.has_audio
          }))
        });
      });
    }

    // Buscar likes de todos os posts de uma vez
    const postIds = posts.map(p => p.id);
    const { data: likes, error: likesError } = await supabase
      .from('post_likes')
      .select('post_id, user_id')
      .in('post_id', postIds);

    if (likesError) {
      console.error('Erro ao buscar likes:', likesError);
      // Continuar mesmo com erro nos likes
    }

    // Contar likes por post e verificar se usuário curtiu
    const likesByPost = {};
    const userLikes = new Set();

    if (likes) {
      likes.forEach(like => {
        if (!likesByPost[like.post_id]) {
          likesByPost[like.post_id] = 0;
        }
        likesByPost[like.post_id]++;

        if (userId && like.user_id === userId) {
          userLikes.add(like.post_id);
        }
      });
    }

    // Adicionar informações de likes aos posts e atualizar foto de perfil
    const postsWithLikes = posts.map(post => {
      const profileInfo = authorProfiles[post.author_id];
      const currentAvatar = profileInfo ? profileInfo.avatar : post.author_avatar;
      const currentAuthorName = post.author && post.author.trim() ? post.author : (profileInfo ? profileInfo.name : 'Usuário');
      
      return {
        ...post,
        author: currentAuthorName,
        author_avatar: currentAvatar,
        like_count: likesByPost[post.id] || 0,
        is_liked: userLikes.has(post.id)
      };
    });

    return { data: postsWithLikes, error: null };
  } catch (error) {
    console.error('Erro ao buscar posts com likes:', error);
    return { data: null, error };
  }
};

// Função para criar um post com vídeo(s)
export const createVideoPost = async (videos, description = '', hasAudio = true) => {
  try {
    if (!videos || videos.length === 0) {
      return { data: null, error: { message: 'Pelo menos um vídeo é obrigatório' } };
    }

    if (videos.length > 5) {
      return { data: null, error: { message: 'Máximo de 5 vídeos permitidos' } };
    }

    // Primeiro, fazer upload de todos os vídeos
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: { message: 'Usuário não autenticado' } };
    }

    console.log('Iniciando upload de vídeos para o bucket post-videos...');
    console.log('Usuário autenticado:', user.id);

    // Upload paralelo dos vídeos
    const uploadPromises = videos.map(async (video, i) => {
      console.log(`Processando vídeo ${i + 1}/${videos.length}:`, {
        uri: video.uri?.substring(0, 50) + '...',
        type: video.type,
        duration: video.duration,
        hasAudio: video.hasAudio
      });

      const fileExt = video.uri.split('.').pop()?.split('?')[0] || 'mp4';
      const fileName = `${user.id}/posts/${Date.now()}_${i}.${fileExt}`;
      
      let contentType = 'video/mp4';
      if (fileExt === 'mov') contentType = 'video/quicktime';
      else if (fileExt === 'avi') contentType = 'video/x-msvideo';
      else if (fileExt === 'webm') contentType = 'video/webm';
      else if (fileExt === '3gp') contentType = 'video/3gpp';
      else if (fileExt === 'mkv') contentType = 'video/x-matroska';
      else if (video.type?.startsWith('video/')) contentType = video.type;

      try {
        // Obter informações do arquivo sem ler o conteúdo para memória
        const fileInfo = await FileSystem.getInfoAsync(video.uri);
        if (!fileInfo.exists) {
           throw new Error(`Vídeo ${i + 1} não encontrado no dispositivo`);
        }

        const fileSizeMB = fileInfo.size / (1024 * 1024);
        console.log(`Tamanho do vídeo ${i + 1}: ${fileSizeMB.toFixed(2)}MB`);
        
        // Obter token de sessão para autenticação
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
           throw new Error('Sessão inválida ou expirada');
        }

        // Construir URL de upload do Supabase Storage
        // A URL padrão é: https://<project_id>.supabase.co/storage/v1/object/<bucket>/<filename>
        const projectUrl = supabase.supabaseUrl || 'https://hodzsckzancczwirtwcx.supabase.co';
        const uploadUrl = `${projectUrl}/storage/v1/object/post-videos/${fileName}`;
        
        console.log(`Iniciando upload via FileSystem.uploadAsync para: ${fileName}`);

        // Usar upload nativo do sistema de arquivos (evita carregar tudo na memória JS)
        const response = await FileSystem.uploadAsync(uploadUrl, video.uri, {
          httpMethod: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': contentType,
            'x-upsert': 'false', // Opcional, default false
          },
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        });

        if (response.status >= 200 && response.status < 300) {
           // Upload bem sucedido, obter URL pública
           const { data: { publicUrl } } = supabase.storage
            .from('post-videos')
            .getPublicUrl(fileName);

            console.log(`Upload do vídeo ${i + 1} concluído com sucesso!`);

            return {
              success: true,
              url: publicUrl,
              order: i,
              caption: video.caption || null,
              hasAudio: video.hasAudio !== undefined ? video.hasAudio : hasAudio,
              duration: video.duration || null,
              thumbnailUrl: video.thumbnailUrl || null,
            };
        } else {
           throw new Error(`Falha no upload (Status ${response.status}): ${response.body}`);
        }

      } catch (error) {
        console.error(`Erro no upload do vídeo ${i + 1}:`, error);
        return { success: false, error, index: i };
      }
    });

    const results = await Promise.all(uploadPromises);
    
    const uploadedVideos = results.filter(r => r.success);
    const uploadErrors = results.filter(r => !r.success);

    // Verificar erros críticos nos uploads falhos
    if (uploadErrors.length > 0) {
       const firstError = uploadErrors[0].error;
       // Se for erro de bucket não encontrado, retornar imediatamente
       if (firstError.message?.includes('Bucket not found') || firstError.message?.includes('not found')) {
          return {
            data: null,
            error: {
              message: `Bucket 'post-videos' não encontrado. Verifique se o bucket foi criado no Supabase Storage.`,
              details: firstError
            }
          };
       }
        
       // Se for erro de permissão, retornar imediatamente
       if (firstError.message?.includes('permission') || firstError.message?.includes('policy') || firstError.statusCode === 403) {
          return {
            data: null,
            error: {
              message: `Erro de permissão ao fazer upload. Verifique as políticas RLS do bucket 'post-videos'.`,
              details: firstError
            }
          };
       }
    }

    if (uploadedVideos.length === 0) {
      const errorMessage = uploadErrors.length > 0 
        ? `Erro ao fazer upload dos vídeos. ${uploadErrors.length} erro(s) encontrado(s). Primeiro erro: ${uploadErrors[0].error.message || JSON.stringify(uploadErrors[0].error)}`
        : 'Nenhum vídeo foi enviado com sucesso.';
      
      console.error('❌ Nenhum vídeo foi enviado. Erros:', uploadErrors);
      return { 
        data: null, 
        error: { 
          message: errorMessage,
          details: uploadErrors
        } 
      };
    }
    
    if (uploadErrors.length > 0) {
      console.warn(`⚠️ ${uploadErrors.length} vídeo(s) falharam no upload, mas ${uploadedVideos.length} foram enviados com sucesso.`);
    }

    // Criar o post usando a função RPC
    const { data: postData, error: postError } = await supabase.rpc('create_post_with_author', {
      p_content: description || '',
      p_type: 'video',
      p_image_url: null, // Vídeos não usam image_url
    });

    if (postError) {
      console.error('Erro ao criar post:', postError);
      return { data: null, error: postError };
    }

    const post = postData?.[0] || postData;

    if (!post || !post.id) {
      console.error('Erro: Post não foi criado corretamente');
      return { data: null, error: { message: 'Erro ao criar post: post não retornado corretamente' } };
    }

    console.log('Post criado com sucesso:', post.id);
    console.log('Tentando inserir', uploadedVideos.length, 'vídeo(s) na tabela post_videos');

    // Inserir todos os vídeos na tabela post_videos
    const videoInserts = uploadedVideos.map(vid => {
      // Garantir que has_audio seja boolean (não undefined/null)
      const hasAudioValue = vid.hasAudio !== undefined && vid.hasAudio !== null 
        ? Boolean(vid.hasAudio) 
        : true; // Default true se não especificado
      
      return {
        post_id: post.id,
        video_url: vid.url,
        video_order: vid.order,
        caption: vid.caption || null,
        has_audio: hasAudioValue,
        duration: vid.duration || null,
        thumbnail_url: vid.thumbnailUrl || null,
      };
    });

    console.log('Dados dos vídeos para inserção:', JSON.stringify(videoInserts, null, 2));

    const { data: insertedVideos, error: videosError } = await supabase
      .from('post_videos')
      .insert(videoInserts)
      .select();

    if (videosError) {
      console.error('❌ Erro ao salvar vídeos na tabela post_videos:', videosError);
      console.error('Código do erro:', videosError.code);
      console.error('Mensagem:', videosError.message);
      console.error('Detalhes completos:', JSON.stringify(videosError, null, 2));
      console.error('Post ID:', post.id);
      console.error('Dados que tentamos inserir:', JSON.stringify(videoInserts, null, 2));
      
      let errorMessage = 'Post criado mas vídeos não foram associados. ';
      
      // Mensagens específicas para diferentes tipos de erro
      if (videosError.code === 'PGRST301' || videosError.message?.includes('permission') || videosError.message?.includes('policy')) {
        errorMessage += 'Erro de permissão (RLS). Verifique se as políticas RLS da tabela post_videos permitem inserção para o autor do post.';
      } else if (videosError.message?.includes('foreign key') || videosError.message?.includes('post_id')) {
        errorMessage += 'Erro de chave estrangeira. O post_id pode estar incorreto.';
      } else if (videosError.message?.includes('null value') || videosError.message?.includes('NOT NULL')) {
        errorMessage += 'Erro: algum campo obrigatório está nulo.';
      } else {
        errorMessage += `Erro: ${videosError.message || JSON.stringify(videosError)}`;
      }
      
      return { 
        data: null, 
        error: { 
          message: errorMessage,
          details: videosError,
          postId: post.id // Retornar o ID do post para possível correção manual
        } 
      };
    }

    console.log('Vídeos inseridos com sucesso:', insertedVideos?.length || 0);

    // Buscar o post completo com todos os vídeos
    const { data: fullPost, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        post_videos (
          id,
          video_url,
          video_order,
          caption,
          has_audio,
          duration,
          thumbnail_url
        )
      `)
      .eq('id', post.id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar post completo:', fetchError);
      return { data: post, error: null };
    }

    return { data: fullPost, error: null };
  } catch (error) {
    console.error('Erro ao criar post com vídeos:', error);
    return { data: null, error };
  }
};
