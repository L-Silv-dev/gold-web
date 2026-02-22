import { supabase } from '../utils/supabase';
import logger from '../utils/logger';

/**
 * Cria um novo comentário em um post
 * @param {string} postId - ID do post
 * @param {string} content - Conteúdo do comentário
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export const createComment = async (postId, content) => {
  try {
    if (!postId || !content?.trim()) {
      return { data: null, error: { message: 'ID do post e conteúdo são obrigatórios' } };
    }

    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Usuário não autenticado' } };
    }

    const { data, error } = await supabase
      .from('post_comments')
      .insert([
        { 
          post_id: postId, 
          content: content.trim(),
          user_id: user.id
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar comentário:', error);
      return { data: null, error };
    }

    // Buscar informações do autor
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('full_name, profile_image_url')
      .eq('id', data.user_id)
      .single();

    if (userError) {
      console.error('Erro ao buscar informações do autor:', userError);
      return { data: null, error: userError };
    }

    // Combinar dados do comentário com as informações do autor
    const commentWithAuthor = {
      ...data,
      author_name: userData.full_name,
      author_avatar: userData.profile_image_url
    };

    return { data: commentWithAuthor, error: null };
  } catch (error) {
    console.error('Erro inesperado ao criar comentário:', error);
    return { data: null, error };
  }
};

/**
 * Busca comentários de um post específico
 * @param {string} postId - ID do post
 * @returns {Promise<{data: Array<Object>|null, error: Object|null}>}
 */
export const fetchCommentsByPostId = async (postId) => {
  try {
    if (!postId) {
      return { data: null, error: { message: 'ID do post é obrigatório' } };
    }

    const { data, error } = await supabase
      .rpc('get_post_comments', { p_post_id: postId });

    if (error) {
      logger.error('Erro ao buscar comentários:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('Erro inesperado ao buscar comentários:', error);
    return { data: null, error };
  }
};

/**
 * Atualiza um comentário existente
 * @param {string} commentId - ID do comentário
 * @param {string} content - Novo conteúdo do comentário
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export const updateComment = async (commentId, content) => {
  try {
    if (!commentId || !content?.trim()) {
      return { data: null, error: { message: 'ID do comentário e conteúdo são obrigatórios' } };
    }

    const { data, error } = await supabase
      .from('post_comments')
      .update({ 
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar comentário:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erro inesperado ao atualizar comentário:', error);
    return { data: null, error };
  }
};

/**
 * Remove um comentário
 * @param {string} commentId - ID do comentário a ser removido
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export const deleteComment = async (commentId) => {
  try {
    if (!commentId) {
      return { data: null, error: { message: 'ID do comentário é obrigatório' } };
    }

    const { data, error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao remover comentário:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erro inesperado ao remover comentário:', error);
    return { data: null, error };
  }
};

/**
 * Conta o número de comentários de um post
 * @param {string} postId - ID do post
 * @returns {Promise<{data: number|null, error: Object|null}>}
 */
export const countCommentsByPostId = async (postId) => {
  try {
    if (!postId) {
      return { data: null, error: { message: 'ID do post é obrigatório' } };
    }

    const { count, error } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('Erro ao contar comentários:', error);
      return { data: null, error };
    }

    return { data: count || 0, error: null };
  } catch (error) {
    console.error('Erro inesperado ao contar comentários:', error);
    return { data: null, error };
  }
};
