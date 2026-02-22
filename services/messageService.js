import { supabase } from '../utils/supabase';
import * as FileSystem from 'expo-file-system';
import CacheManager from '../utils/cache';
import { withRetry } from '../utils/networkHelper';
import logger from '../utils/logger';
import { getActiveConversationId } from '../utils/chatState';

// Criar uma conversa de grupo
export const createGroupConversation = async (groupName, participantIds, creatorId) => {
  try {
    if (!groupName || !participantIds || participantIds.length === 0 || !creatorId) {
      throw new Error('Nome do grupo, participantes e criador são obrigatórios');
    }

    const { data, error } = await supabase.rpc('create_group_conversation', {
      group_name: groupName,
      participant_ids: participantIds,
      creator_id: creatorId
    });

    if (error) throw error;
    return { conversationId: data, error: null };
  } catch (error) {
    logger.error('Erro ao criar grupo:', error);
    return { conversationId: null, error };
  }
};

// Obter ou criar uma conversa com outro usuário
export const getOrCreateConversation = async (currentUserId, otherUserId) => {
  try {
    if (!currentUserId || !otherUserId) {
      throw new Error('IDs dos usuários são necessários');
    }

    // Ordenar os IDs para garantir consistência
    const [user1Id, user2Id] = [currentUserId, otherUserId].sort();
    
    // Chamar a função do banco de dados para obter ou criar a conversa
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      user1_id: user1Id,
      user2_id: user2Id
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao obter/criar conversa:', error);
    return { data: null, error };
  }
};

// Enviar uma mensagem
export const sendMessage = async (conversationId, senderId, content, mediaUrl = null, mediaType = null, replyToId = null) => {
  try {
    console.log('Enviando mensagem:', { conversationId, senderId, hasContent: !!content, hasMedia: !!mediaUrl, replyToId });
    
    if (!conversationId || !senderId || (!content && !mediaUrl)) {
      console.error('Dados incompletos:', { conversationId, senderId, hasContent: !!content, hasMedia: !!mediaUrl });
      throw new Error('Dados da mensagem incompletos');
    }

    console.log('Inserindo mensagem no banco de dados...');
    const insertResult = await supabase
      .from('messages')
      .insert([
        { 
          conversation_id: conversationId, 
          sender_id: senderId, 
          content: content ? content.trim() : '',
          media_url: mediaUrl,
          media_type: mediaType,
          reply_to_id: replyToId,
          created_at: new Date().toISOString()
        }
      ])
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        media_url,
        media_type,
        reply_to_id,
        created_at
      `)
      .single();
    const { data, error } = insertResult;

    if (error) {
      console.error('Erro ao inserir mensagem no banco:', error);
      throw error;
    }

    console.log('Mensagem inserida com sucesso:', data);

    // Send push notifications to other participants (Background/Quit state)
    (async () => {
      try {
        // Get other participants
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', senderId);

        if (participants && participants.length > 0) {
          const participantIds = participants.map(p => p.user_id);
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', senderId)
            .single();
          const senderName = senderProfile?.username || 'Novo Usuário';
          let messageBody = content || (mediaUrl ? (mediaType === 'video' ? '🎬 Vídeo' : '📷 Imagem') : 'Nova mensagem');
          // Limitar tamanho da notificação
          if (messageBody.length > 140) {
            messageBody = messageBody.slice(0, 137) + '...';
          }
          try {
            await supabase.functions.invoke('push', {
              body: {
                targetUserIds: participantIds,
                title: `💬 ${senderName}`,
                body: messageBody,
                data: { conversationId, type: 'message' }
              }
            });
          } catch {}
        }
      } catch (notifError) {
        console.error('Error sending push notification:', notifError);
      }
    })();

    let senderProfile = null;
    try {
      const { data: sp } = await supabase
        .from('profiles')
        .select('username, full_name, profile_image_url')
        .eq('id', data.sender_id)
        .single();
      senderProfile = sp || null;
    } catch {}
    let replyMessage = null;
    if (data.reply_to_id) {
      try {
        const { data: rm } = await supabase
          .from('messages')
          .select('id, content, media_url, media_type, sender_id')
          .eq('id', data.reply_to_id)
          .single();
        replyMessage = rm || null;
      } catch {}
    }
    const enriched = {
      ...data,
      sender: senderProfile ? {
        username: senderProfile.username,
        full_name: senderProfile.full_name,
        profile_image_url: senderProfile.profile_image_url
      } : null,
      reply_to: replyMessage || null
    };

    return { message: enriched, error: null };
  } catch (error) {
    logger.error('Erro detalhado ao enviar mensagem:', {
      error,
      conversationId,
      senderId,
      hasContent: !!content
    });
    return { message: null, error };
  }
};



// Obter contagem global de mensagens não lidas
export const getGlobalUnreadCount = async (userId) => {
  if (!userId) {
    logger.warn('getGlobalUnreadCount: userId não fornecido');
    return 0;
  }

  const operation = async () => {
    // 1. Obter IDs das conversas que o usuário participa
    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (partError) throw partError;
    
    if (!participations || participations.length === 0) {
      return 0;
    }

    const conversationIds = participations.map(p => p.conversation_id);

    // 2. Contar mensagens não lidas nessas conversas enviadas por outros
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .eq('read', false);

    if (error) throw error;
    
    return count || 0;
  };

  try {
    const result = await withRetry(operation, 'contar mensagens não lidas');
    
    if (result.success) {
      return result.data;
    } else {
      console.error('Falha ao contar mensagens não lidas após tentativas:', result.error);
      return 0;
    }
  } catch (error) {
    console.error('Erro inesperado ao contar mensagens não lidas:', error);
    return 0;
  }
};

// Obter mensagens de uma conversa
export const getMessages = async (conversationId, page = 1, pageSize = 20) => {
  try {
    console.log(`Buscando mensagens para a conversa ${conversationId}, página ${page}, tamanho ${pageSize}`);
    
    if (!conversationId) {
      console.error('ID da conversa é necessário');
      throw new Error('ID da conversa é necessário');
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    console.log(`Consultando mensagens de ${from} a ${to}`);
    
    let data, error, count;
    try {
      const res = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          media_url,
          media_type,
          reply_to_id,
          read,
          created_at
        `, { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(from, to);
      data = res.data; error = res.error; count = res.count;
    } catch (e) {
      error = e;
    }

    if (error) {
      // PGRST103: Requested range not satisfiable (offset > total rows)
      if (error.code === 'PGRST103') {
        console.log('Range não satisfatível (provavelmente fim da lista), retornando lista vazia');
        return { 
          data: [], 
          total: count || 0, // O count pode não vir se der erro, mas tentamos manter
          hasMore: false,
          error: null 
        };
      }
      console.warn('Falha na consulta principal, tentando fallback sem count:', error?.message || error);
      try {
        const res2 = await supabase
          .from('messages')
          .select(`
            id,
            conversation_id,
            sender_id,
            content,
            media_url,
            media_type,
            reply_to_id,
            read,
            created_at
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .range(from, to);
        data = res2.data; count = (res2.data || []).length;
      } catch (e2) {
        console.warn('Fallback 1 falhou, tentando select mínimo:', e2?.message || e2);
        const res3 = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, content, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .range(from, to);
        data = res3.data; count = (res3.data || []).length;
      }
    }
    
    console.log(`Encontradas ${data ? data.length : 0} mensagens`);
    
    const sortedData = data || [];
    const senderIds = Array.from(new Set(sortedData.map(m => m.sender_id).filter(Boolean)));
    let profilesMap = {};
    if (senderIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, profile_image_url')
          .in('id', senderIds);
        if (profiles && profiles.length > 0) {
          for (const p of profiles) {
            profilesMap[p.id] = p;
          }
        }
      } catch {}
    }
    let repliesMap = {};
    const replyIds = Array.from(new Set(sortedData.map(m => m.reply_to_id).filter(Boolean)));
    if (replyIds.length > 0) {
      try {
        const { data: replies } = await supabase
          .from('messages')
          .select('id, content, media_url, media_type, sender_id')
          .in('id', replyIds);
        if (replies && replies.length > 0) {
          for (const r of replies) {
            repliesMap[r.id] = r;
          }
        }
      } catch {}
    }
    const enriched = sortedData.map(m => {
      const sp = profilesMap[m.sender_id];
      const rp = m.reply_to_id ? repliesMap[m.reply_to_id] || null : null;
      return {
        ...m,
        sender: sp ? {
          username: sp.username,
          full_name: sp.full_name,
          profile_image_url: sp.profile_image_url
        } : null,
        reply_to: rp
      };
    });

    const result = { 
      data: enriched, 
      total: count || 0,
      hasMore: (count || 0) > to + 1,
      error: null 
    };
    
    console.log('Resultado da busca de mensagens:', {
      count: result.data ? result.data.length : 0,
      total: result.total,
      hasMore: result.hasMore
    });
    
    return result;
  } catch (error) {
    console.error('Erro detalhado ao buscar mensagens:', {
      conversationId,
      page,
      pageSize,
      error
    });
    return { data: [], total: 0, hasMore: false, error };
  }
};

export const getMessagesFast = async (conversationId, limit = 5) => {
  try {
    if (!conversationId) {
      throw new Error('ID da conversa é necessário');
    }
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, media_url, media_type, reply_to_id, read, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      return { data: [], error };
    }
    return { data, error: null };
  } catch (error) {
    return { data: [], error };
  }
};
// Obter conversas do usuário
export const getUserConversations = async (userId) => {
  try {
    if (!userId) {
      throw new Error('ID do usuário é necessário');
    }

    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (partError) throw partError;
    
    if (!participations || participations.length === 0) {
      await CacheManager.saveRecentConversations([]);
      return { conversations: [], error: null };
    }

    const conversationIds = participations.map(p => p.conversation_id);

    const { data: conversationsDetails, error: convError } = await supabase
      .from('conversations')
      .select('id, is_group, name, group_image_url, admin_id, only_admins_can_post')
      .in('id', conversationIds);

    if (convError) throw convError;

    const oneOnOneConversationIds = conversationsDetails
      .filter(c => !c.is_group)
      .map(c => c.id);

    let othersMap = {};
    let profilesMap = {};

    if (oneOnOneConversationIds.length > 0) {
      const { data: others, error: othersError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', oneOnOneConversationIds)
        .neq('user_id', userId);

      if (othersError) throw othersError;

      others.forEach(o => {
        othersMap[o.conversation_id] = o.user_id;
      });

      const otherUserIds = others.map(o => o.user_id);
      if (otherUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name, profile_image_url')
          .in('id', otherUserIds);

        if (profilesError) throw profilesError;

        profiles.forEach(p => {
          profilesMap[p.id] = p;
        });
      }
    }

    const conversations = await Promise.all(conversationsDetails.map(async (conv) => {
      let name = conv.name;
      let image = conv.group_image_url;
      let otherUserId = null;
      let otherUsername = null;

      if (!conv.is_group) {
        otherUserId = othersMap[conv.id];
        const otherUser = profilesMap[otherUserId];
        if (otherUser) {
          name = otherUser.username || otherUser.full_name;
          otherUsername = otherUser.username;
          image = otherUser.profile_image_url;
        } else {
          name = 'Usuário desconhecido';
        }
      }

      const { data: messages } = await supabase
        .from('messages')
        .select('content, created_at, sender_id')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1);
        
      const lastMsg = messages && messages.length > 0 ? messages[0] : null;
      
      let unreadCount = 0;
      try {
        const query = supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('read', false);
          
        query.neq('sender_id', userId);

        const { count } = await query;
        unreadCount = count || 0;
      } catch (e) {
        console.warn('Não foi possível contar mensagens não lidas:', e);
      }

      return {
        conversation_id: conv.id,
        is_group: conv.is_group,
        admin_id: conv.admin_id,
        only_admins_can_post: conv.only_admins_can_post,
        other_user_id: otherUserId,
        username: name,
        other_username: otherUsername,
        profile_image_url: image,
        last_message: lastMsg ? lastMsg.content : '',
        last_message_time: lastMsg ? lastMsg.created_at : null,
        last_message_sender_id: lastMsg ? lastMsg.sender_id : null,
        unread_count: unreadCount
      };
    }));

    const sortedConversations = conversations
      .filter(c => c.last_message_time || c.is_group)
      .sort((a, b) => {
        const timeA = a.last_message_time ? new Date(a.last_message_time) : new Date(0);
        const timeB = b.last_message_time ? new Date(b.last_message_time) : new Date(0);
        return timeB - timeA;
      });

    await CacheManager.saveRecentConversations(sortedConversations);

    return { conversations: sortedConversations, error: null };
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    try {
      const cached = await CacheManager.loadRecentConversations();
      return { conversations: cached, error };
    } catch {
      return { conversations: [], error };
    }
  }
};

// Apagar uma mensagem
export const deleteMessage = async (messageId) => {
  try {
    if (!messageId) {
      throw new Error('ID da mensagem é necessário');
    }

    // Tentar apagar normalmente (funciona se for o autor)
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      // Se der erro de permissão (RLS), tentar via RPC de admin
      if (error.code === '42501' || error.message.includes('security policy')) {
        console.log('Tentando apagar como admin...');
        const { error: rpcError } = await supabase.rpc('delete_message_as_admin', {
          message_id_param: messageId
        });
        if (rpcError) throw rpcError;
        return { error: null };
      }
      throw error;
    }
    return { error: null };
  } catch (error) {
    console.error('Erro ao apagar mensagem:', error);
    return { error };
  }
};

// Marcar mensagens como lidas
export const markMessagesAsRead = async (conversationId, userId) => {
  // console.log(`Marcando mensagens como lidas - Conversa: ${conversationId}, Usuário: ${userId}`);
  
  try {
    if (!conversationId || !userId) {
      // Validação silenciosa para evitar spam de logs se faltar dados
      return { success: false, error: 'Dados faltando' };
    }

    const { data, error } = await supabase
      .rpc('mark_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: userId
      });

    if (error) {
      console.error('Erro ao chamar mark_messages_as_read:', error);
      throw error;
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error);
    return { success: false, error };
  }
};

// Obter detalhes de uma conversa
export const getConversationDetails = async (conversationId, currentUserId) => {
  try {
    if (!conversationId || !currentUserId) {
      throw new Error('ID da conversa e do usuário são necessários');
    }

    // Obter participantes da conversa
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (participantsError) throw participantsError;

    // Encontrar o outro participante (não o usuário atual)
    const otherParticipantId = participants.find(p => p.user_id !== currentUserId)?.user_id;
    
    if (!otherParticipantId) {
      throw new Error('Participante não encontrado');
    }

    // Buscar detalhes do perfil do outro participante
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, profile_image_url')
      .eq('id', otherParticipantId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // Ignorar erro se não encontrar perfil
       console.error('Erro ao buscar perfil:', profileError);
    }

    return { 
      participant: {
        id: otherParticipantId,
        username: profile?.username || null,
        name: profile?.full_name || null,
        avatar: profile?.profile_image_url || null
      },
      error: null 
    };
  } catch (error) {
    console.error('Erro ao buscar detalhes da conversa:', error);
    return { participant: null, error };
  }
};

// Enviar mensagem para um usuário (cria conversa se não existir)
export const sendMessageToUser = async (currentUserId, recipientId, content) => {
  try {
    if (!currentUserId || !recipientId || !content) {
      throw new Error('Dados da mensagem incompletos');
    }

    // Obter ou criar conversa
    const { data: conversation, error: convError } = await getOrCreateConversation(
      currentUserId,
      recipientId
    );

    if (convError) throw convError;

    // Enviar mensagem
    const { message, error: messageError } = await sendMessage(
      conversation,
      currentUserId,
      content
    );

    if (messageError) throw messageError;

    return { message, error: null };
  } catch (error) {
    console.error('Erro ao enviar mensagem para usuário:', error);
    return { message: null, error };
  }
};

// === NOVAS FUNÇÕES PARA GRUPOS ===

// Obter detalhes completos do grupo (info + participantes)
export const getGroupDetails = async (conversationId) => {
  try {
    const convId = String(conversationId || getActiveConversationId() || '').trim();
    if (!convId) {
      console.warn('getGroupDetails: conversationId inválido');
      return { group: null, participants: [], error: 'ID da conversa inválido' };
    }
    // 1. Obter info do grupo
    const { data: groupInfo, error: groupError } = await supabase
      .from('conversations')
      .select('id, name, group_image_url, admin_id, only_admins_can_post')
      .eq('id', convId)
      .single();

    if (groupError) throw groupError;

    // 2. Obter participantes com status de admin (Tenta pegar is_admin, se falhar faz fallback)
    let participantsData = [];
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('user_id, is_admin')
        .eq('conversation_id', convId);
        
      if (error) throw error;
      participantsData = data;
    } catch (err) {
      // Se der erro (provavelmente coluna is_admin não existe), tenta sem ela
      console.log('Fallback: Buscando participantes sem is_admin', err.message);
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', convId);
        
      if (error) throw error;
      participantsData = data;
    }

    const participantIds = participantsData.map(p => p.user_id);
    const adminsMap = {};
    
    // Mapear admins baseados na coluna is_admin
    participantsData.forEach(p => {
      if (p.is_admin) adminsMap[p.user_id] = true;
    });
    
    // Fallback/Compatibilidade: Sempre considerar o admin_id da tabela conversations como admin
    if (groupInfo.admin_id) {
      adminsMap[groupInfo.admin_id] = true;
    }

    // 3. Obter perfis dos participantes
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, profile_image_url')
      .in('id', participantIds);

    if (profilesError) throw profilesError;

    // Mesclar status de admin
    const participantsWithRoles = profiles.map(p => ({
      ...p,
      is_admin: !!adminsMap[p.id]
    }));

    return {
      group: groupInfo,
      participants: participantsWithRoles,
      error: null
    };
  } catch (error) {
    console.error('Erro ao buscar detalhes do grupo:', error);
    return { group: null, participants: [], error };
  }
};

// Adicionar participante ao grupo
export const addGroupParticipant = async (conversationId, userId) => {
  try {
    const convId = String(conversationId || getActiveConversationId() || '').trim();
    if (!convId) return { error: 'ID da conversa inválido' };
    const { error } = await supabase.rpc('add_group_participant', {
      conversation_id_param: convId,
      user_id_to_add: userId
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao adicionar participante:', error);
    return { error };
  }
};

// Promover usuário a admin
export const promoteToAdmin = async (conversationId, newAdminId) => {
  try {
    const convId = String(conversationId || getActiveConversationId() || '').trim();
    if (!convId) return { error: 'ID da conversa inválido' };
    const { error } = await supabase.rpc('promote_to_admin', {
      conversation_id_param: convId,
      new_admin_id: newAdminId
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao promover a admin:', error);
    return { error };
  }
};

// Rebaixar admin (Remover privilégios)
export const dismissAdmin = async (conversationId, targetUserId) => {
  try {
    const convId = String(conversationId || getActiveConversationId() || '').trim();
    if (!convId) return { error: 'ID da conversa inválido' };
    const { error } = await supabase.rpc('dismiss_admin', {
      conversation_id_param: convId,
      target_user_id: targetUserId
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao remover admin:', error);
    return { error };
  }
};

// Atualizar informações do grupo
export const updateGroupInfo = async (conversationId, name, imageUrl) => {
  try {
    const convId = String(conversationId || getActiveConversationId() || '').trim();
    if (!convId) return { error: 'ID da conversa inválido' };
    const { error } = await supabase.rpc('update_group_info', {
      conversation_id_param: convId,
      new_name: name,
      new_image_url: imageUrl
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao atualizar grupo:', error);
    return { error };
  }
};

// Atualizar permissões do grupo
export const updateGroupPermissions = async (conversationId, onlyAdmins) => {
  try {
    const convId = String(conversationId || getActiveConversationId() || '').trim();
    if (!convId) return { error: 'ID da conversa inválido' };
    const { error } = await supabase.rpc('update_group_permissions', {
      conversation_id_param: convId,
      only_admins: onlyAdmins
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao atualizar permissões do grupo:', error);
    return { error };
  }
};

// Sair do grupo
export const leaveGroup = async (conversationId, userId) => {
  try {
    const convId = String(conversationId || getActiveConversationId() || '').trim();
    if (!convId) return { error: 'ID da conversa inválido' };
    const { error } = await supabase.rpc('leave_group', {
      conversation_id_param: convId,
      user_id_param: userId
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao sair do grupo:', error);
    return { error };
  }
};

// Excluir grupo
export const deleteGroup = async (conversationId) => {
  try {
    const convId = String(conversationId || getActiveConversationId() || '').trim();
    if (!convId) return { error: 'ID da conversa inválido' };
    const { error } = await supabase.rpc('delete_group', {
      conversation_id_param: convId
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao excluir grupo:', error);
    return { error };
  }
};

// Remover participante
export const removeGroupParticipant = async (conversationId, userId) => {
  try {
    const { error } = await supabase.rpc('remove_group_participant', {
      conversation_id_param: conversationId,
      user_id_to_remove: userId
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao remover participante:', error);
    return { error };
  }
};

// Função auxiliar para decodificar base64 para Uint8Array
const decodeBase64ToUint8 = (base64) => {
  if (!base64) return new Uint8Array();
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

// Função auxiliar para converter Blob para Uint8Array (fallback)
const blobToUint8Array = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(new Uint8Array(reader.result));
    };
    reader.onerror = () => {
      reject(new Error('Falha ao ler blob com FileReader'));
    };
    reader.readAsArrayBuffer(blob);
  });
};

// Helper para processar arquivo para upload
const processFileForUpload = async (fileUri) => {
  let fileData = null;
  try {
    // Tentar com FileSystem primeiro
    console.log('Lendo arquivo via FileSystem...');
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    if (!base64Data || base64Data.length === 0) {
      throw new Error('Arquivo vazio ou não pôde ser lido');
    }
    
    fileData = decodeBase64ToUint8(base64Data);
  } catch (fsError) {
    console.error('Erro ao ler com FileSystem, tentando fetch:', fsError);
    // Fallback para fetch
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      if (typeof blob.arrayBuffer === 'function') {
         const arrayBuffer = await blob.arrayBuffer();
         fileData = new Uint8Array(arrayBuffer);
      } else {
         fileData = await blobToUint8Array(blob);
      }
    } catch (fetchError) {
      throw new Error(`Falha ao ler arquivo: ${fsError.message} / ${fetchError.message}`);
    }
  }
  return fileData;
};

// Upload de imagem do grupo
export const uploadGroupImage = async (conversationId, file) => {
  try {
    if (!file || !file.uri) {
      throw new Error('Arquivo de imagem inválido');
    }

    const fileExt = file.uri.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `${conversationId}_${Date.now()}.${fileExt}`;
    const filePath = `group_avatars/${fileName}`;
    
    const fileData = await processFileForUpload(file.uri);

    if (!fileData) throw new Error('Falha ao processar dados do arquivo');

    // Determinar content type corretamente
    let contentType = 'image/jpeg';
    const extLower = String(fileExt).toLowerCase();
    if (file?.mimeType && file.mimeType.startsWith('image/')) {
      contentType = file.mimeType;
    } else {
      switch (extLower) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        default:
          contentType = 'image/jpeg';
      }
    }

    const { data, error } = await supabase.storage
      .from('group-avatars')
      .upload(filePath, fileData, {
        contentType: contentType,
        upsert: false
      });
      
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('group-avatars')
      .getPublicUrl(filePath);
      
    const publicUrlWithTimestamp = `${publicUrl}?t=${new Date().getTime()}`;
    
    return { url: publicUrlWithTimestamp, error: null };
  } catch (error) {
    console.error('Erro ao fazer upload da imagem do grupo:', error);
    return { url: null, error };
  }
};

// Excluir conversa (sair do grupo ou remover conversa 1-para-1)
export const deleteConversation = async (conversationId, userId, isGroup) => {
  try {
    if (isGroup) {
      // Se for grupo, usa a função de sair do grupo
      return await leaveGroup(conversationId, userId);
    } else {
      // Se for conversa 1-para-1, remove o participante da tabela
      // Isso efetivamente remove a conversa da lista do usuário
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      return { error: null };
    }
  } catch (error) {
    console.error('Erro ao excluir conversa:', error);
    return { error };
  }
};

export const uploadChatMedia = async (file) => {
  try {
    if (!file || !file.uri) throw new Error('Arquivo inválido');
    
    const uriParts = file.uri.split('.');
    const fileExt = uriParts.length > 1 ? uriParts[uriParts.length - 1].split('?')[0] : 'bin';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const fileData = await processFileForUpload(file.uri);
    
    if (!fileData) throw new Error('Falha ao processar dados do arquivo');

    // Determinar content type corretamente
    let contentType = 'application/octet-stream';
    if (file.mimeType) {
      contentType = file.mimeType;
    } else if (file.type === 'video') {
      contentType = 'video/mp4';
    } else if (file.type === 'image') {
      contentType = 'image/jpeg';
    }
    // Fallback por extensão
    if (!file.mimeType && String(fileExt).toLowerCase() === 'pdf') {
      contentType = 'application/pdf';
    }

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, fileData, {
        contentType: contentType,
        upsert: false
      });

    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);
      
    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('Erro ao fazer upload de mídia:', error);
    return { url: null, error };
  }
};
