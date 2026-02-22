import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Keyboard,
  SafeAreaView,
  StatusBar,
  Alert,
  AppState,
  Dimensions,
  Modal,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Video, ResizeMode } from 'expo-av';
import ModernVideoPlayer from '../components/ModernVideoPlayer';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeContext } from '../contexts/ThemeContext';
import { useUserContext } from '../contexts/UserContext';
import { supabase } from '../utils/supabase';
import { getMessages, getMessagesFast, sendMessage, markMessagesAsRead, getConversationDetails, deleteMessage, getGroupDetails, uploadChatMedia } from '../services/messageService';
import { setActiveConversationId } from '../utils/chatState';
import CacheManager from '../utils/cache';
import { checkConnectivity } from '../utils/networkHelper';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [participant, setParticipant] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sharingBusy, setSharingBusy] = useState(false);
  // Estados para Grupos
  const [canPost, setCanPost] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [adminIds, setAdminIds] = useState(new Set());
  const [isRecipientOnline, setIsRecipientOnline] = useState(false);

  const appState = useRef(AppState.currentState);
  const isRealtimeConnected = useRef(false);
  const presenceChannelRef = useRef(null);
  
  const flatListRef = useRef();
  const layoutTimeout = useRef();
  
  // Limpar o timeout quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (layoutTimeout.current) {
        clearTimeout(layoutTimeout.current);
      }
    };
  }, []);
  const navigation = useNavigation();
  const { recordEvent } = useAuth();
  const route = useRoute();
  const { theme } = useThemeContext();
  const { fetchUnreadCount } = useUserContext();
  
  const { conversationId, recipientId, recipientName, recipientAvatar, isGroup } = route.params;
  const PAGE_SIZE = 20;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.card },
      headerTintColor: theme.text,
      headerTitle: () => (
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={() => {
            if (isGroup) {
               navigation.navigate('GroupDetails', { 
                 groupId: conversationId,
                 groupName: recipientName,
                 groupImage: recipientAvatar
               });
            } else if (recipientId) {
               navigation.navigate('UserProfile', { userId: recipientId });
            }
          }}
        >
          <View style={{ marginRight: 10 }}>
            {recipientAvatar ? (
              <Image 
                source={{ uri: recipientAvatar }} 
                style={{ width: 32, height: 32, borderRadius: 16 }}
              />
            ) : (
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary || '#007AFF', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={isGroup ? "people" : "person"} size={18} color="#fff" />
              </View>
            )}
            {!isGroup && isRecipientOnline && (
              <View style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#4CAF50',
                borderWidth: 2,
                borderColor: '#fff'
              }} />
            )}
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
              {recipientName || 'Usuário'}
            </Text>
          </View>
        </TouchableOpacity>
      ),
    });
  }, [navigation, recipientId, recipientName, recipientAvatar, isGroup, conversationId, theme, isRecipientOnline]);

  
  // Limpar estado de resposta ao sair da tela ou mudar de conversa
  useEffect(() => {
    // Limpar input e imagem ao mudar de conversa
    setNewMessage('');
    setSelectedImage(null);
  }, [conversationId, recipientId]);

  // Obter o ID do usuário atual
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Erro ao obter usuário atual:', error);
      }
    };
    
    getCurrentUser();
  }, []);

  // Gerenciar ID da conversa ativa para notificações
  useEffect(() => {
    const activeId = conversationId || currentConversationId;
    if (activeId) {
      setActiveConversationId(activeId);
    }
    
    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId, currentConversationId]);

  // Criar ou obter conversa
  const getOrCreateConversation = useCallback(async (userId1, userId2) => {
    if (!userId1 || !userId2) {
      console.error('IDs de usuário inválidos para criar/obter conversa');
      return { data: null, error: 'IDs de usuário inválidos' };
    }
    
    try {
      console.log('Chamando get_or_create_conversation com:', { userId1, userId2 });
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        user1_id: userId1,
        user2_id: userId2
      });
      
      if (error) {
        console.error('Erro na função get_or_create_conversation:', error);
        throw error;
      }
      
      console.log('Resposta de get_or_create_conversation:', data);
      // A função RPC retorna o UUID diretamente
      return { data, error: null };
    } catch (error) {
      console.error('Erro ao obter/criar conversa:', error);
      return { data: null, error };
    }
  }, []);

  // Carregar mensagens
  const loadMessages = useCallback(async (pageNum = 1, isInitialLoad = false) => {
    console.log(`Carregando mensagens - Página: ${pageNum}, Inicial: ${isInitialLoad}`);
    
    if (!currentUserId || (!recipientId && !conversationId)) {
      console.error('IDs necessários não encontrados:', { currentUserId, recipientId, conversationId });
      return;
    }
    
    let targetConversationId = conversationId || currentConversationId;
    
    // Se for o carregamento inicial e não tivermos um conversationId, precisamos criar/obter uma conversa
    if (isInitialLoad && !targetConversationId) {
      console.log('Obtendo/Criando conversa...');
      const { data: conversationIdResult, error } = await getOrCreateConversation(currentUserId, recipientId);
      
      if (error || !conversationIdResult) {
        console.error('Erro ao obter/criar conversa:', error || 'Nenhuma conversa retornada');
        setLoading(false);
        return;
      }
      
      console.log('Conversa obtida/criada ID:', conversationIdResult);
      targetConversationId = conversationIdResult;
      setCurrentConversationId(conversationIdResult);
    }
    
    if (!targetConversationId) {
      console.error('Nenhum ID de conversa disponível para carregar mensagens');
      setLoading(false);
      return;
    }

    // Tentar carregar do cache primeiro (apenas na carga inicial)
    let cachedMessages = [];
    if (isInitialLoad) {
      try {
        cachedMessages = await CacheManager.loadMessages(targetConversationId);
        if (cachedMessages && cachedMessages.length > 0) {
          setMessages(cachedMessages.slice(0, PAGE_SIZE));
          // Não tiramos o loading totalmente aqui, apenas exibimos o cache
          // setLoading(false); 
        }
      } catch (e) {
        console.log('Erro ao ler cache de mensagens:', e);
      }
    }
    
    const online = await checkConnectivity();
    if (!online) {
      setHasMore(false);
      setPage(pageNum);
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    
    try {
      if (isInitialLoad) {
        if (cachedMessages.length === 0) setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      console.log(`Buscando mensagens para a conversa ${targetConversationId}, página ${pageNum}`);
      const { data: fetchedMessages, error: messagesError } = await getMessages(
        targetConversationId,
        pageNum,
        PAGE_SIZE
      );
      
      if (messagesError) {
        console.error('Erro ao carregar mensagens:', messagesError);
        // Se erro na carga inicial e temos cache, mantemos o cache
        if (isInitialLoad && cachedMessages.length > 0) {
             return;
        }
        throw messagesError;
      }
      
      console.log(`Mensagens recebidas: ${fetchedMessages ? fetchedMessages.length : 0}`);
      
      // Atualizar o estado com as mensagens
      if (fetchedMessages && Array.isArray(fetchedMessages)) {
        const newMessages = fetchedMessages;
        if (isInitialLoad) {
          const capped = newMessages.slice(0, 300);
          setMessages(capped);
          CacheManager.saveMessages(targetConversationId, capped);
          
          // Marcar mensagens como lidas
          if (newMessages.length > 0) {
            try {
              console.log('Marcando mensagens como lidas...');
              await markMessagesAsRead(targetConversationId, currentUserId);
              fetchUnreadCount(); // Atualizar contador global
              console.log('Mensagens marcadas como lidas com sucesso');
            } catch (error) {
              console.error('Erro ao marcar mensagens como lidas:', error);
              // Não interrompemos o fluxo se falhar em marcar como lida
            }
          }
        } else {
          const next = [...messages, ...newMessages];
          const capped = next.slice(0, 300);
          setMessages(capped);
          CacheManager.saveMessages(targetConversationId, capped);
        }
        
        setHasMore(newMessages.length === PAGE_SIZE);
      } else {
        console.log('Nenhuma mensagem encontrada ou formato inválido:', messages);
        if (isInitialLoad && cachedMessages.length === 0) {
           setMessages([]);
        }
      }
      
      setPage(pageNum);
      
      // Em lista invertida, não precisamos rolar para o final
      
    } catch (error) {
      console.error('Erro detalhado ao carregar mensagens:', {
        error: error.message || error,
        stack: error.stack,
        conversationId: targetConversationId,
        pageNum,
        isInitialLoad
      });
      
      if (isInitialLoad && cachedMessages.length === 0) {
        alert('Não foi possível carregar as mensagens. Tente novamente.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, currentUserId, recipientId, currentConversationId]);

  // Carregar detalhes do participante ou grupo
  const loadParticipant = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    
    if (isGroup) {
      try {
        const { group, participants, error } = await getGroupDetails(conversationId);
        
        if (group) {
          setGroupInfo(group);

          // Atualizar lista de admins
          let admins = new Set();
          if (participants) {
            participants.forEach(p => {
              if (p.is_admin) admins.add(p.id);
            });
            // Fallback para admin_id do grupo
            if (group.admin_id) admins.add(group.admin_id);
          } else if (group.admin_id) {
             admins.add(group.admin_id);
          }
          setAdminIds(admins);
          
          const isUserAdmin = admins.has(currentUserId);
          setIsAdmin(isUserAdmin);
          
          // Verificar permissões de postagem
          if (group.only_admins_can_post) {
            setCanPost(isUserAdmin);
          } else {
            setCanPost(true);
          }

          // Configurar cabeçalho clicável para detalhes do grupo
          // (Movido para useEffect separado)
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do grupo:', error);
      }
      return;
    }
    
    try {
      const { participant: participantData } = await getConversationDetails(
        conversationId,
        currentUserId
      );
      
      if (participantData) {
        setParticipant(participantData);
        // Configuração de cabeçalho movida para useEffect separado
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes do participante:', error);
    }
  }, [conversationId, currentUserId, navigation, theme.primary, isGroup, recipientName, recipientAvatar]);

  // Header configuration moved to useLayoutEffect


  const setupRealtimeSubscription = useCallback((targetConversationId) => {
    if (!targetConversationId) return;

    console.log('Configurando realtime para conversa:', targetConversationId);
    
    const channelName = `conversation_${targetConversationId}`;
    
    const existingChannel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (existingChannel) {
      console.log('Removendo canal existente antes de recriar...');
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel(channelName, {
        config: {
          presence: {
            key: currentUserId || 'anonymous',
          },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${targetConversationId}`
        },
        (payload) => {
            const newMessage = payload.new;
            console.log('Nova mensagem recebida via realtime:', newMessage);
            
            setMessages(prev => {
              // Verificar se a mensagem já existe para evitar duplicação
              const messageExists = prev.some(msg => msg.id === newMessage.id);
              if (messageExists) return prev;
              
              // Se for uma mensagem recebida, marcar como lida
              if (newMessage.sender_id !== currentUserId) {
                markMessagesAsRead(targetConversationId, currentUserId)
                  .then(() => fetchUnreadCount())
                  .catch(err => 
                    console.error('Erro ao marcar como lida no realtime:', err)
                  );
              }
              
              // Em lista invertida, novas mensagens vão no início do array (fundo visual)
              const next = [newMessage, ...prev];
              CacheManager.saveMessages(targetConversationId, next.slice(0, 300));
              return next;
            });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${targetConversationId}`
        },
        (payload) => {
           console.log('Mensagem atualizada via realtime:', payload.new);
           setMessages(prev => {
             const updated = prev.map(msg => {
               if (msg.id === payload.new.id) {
                  const updatedMsg = { ...msg, ...payload.new };
                  if (payload.new.reply_to_id === null) {
                      updatedMsg.reply_to = null;
                  }
                  return updatedMsg;
               }
               return msg;
             });
             CacheManager.saveMessages(targetConversationId, updated.slice(0, 300));
             return updated;
           });
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        if (recipientId) {
          const recipientState = state[recipientId];
          setIsRecipientOnline(!!recipientState && recipientState.length > 0);
        }
      })
      .subscribe((status, err) => {
        console.log(`Status da assinatura realtime (${channelName}):`, status);
        if (status === 'SUBSCRIBED') {
          console.log('Realtime conectado com sucesso!');
          isRealtimeConnected.current = true;
          if (currentUserId) {
            channel.track({
              user_id: currentUserId,
              conversation_id: targetConversationId,
              online_at: new Date().toISOString(),
            });
          }
        } else {
          isRealtimeConnected.current = false;
        }
        
        if (err) console.error('Erro na assinatura realtime:', err);
      });

    const deleteChannelName = `global_deletes_${targetConversationId}`;
    const deleteChannel = supabase
      .channel(deleteChannelName)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const deletedMessageId = payload.old?.id;
          if (!deletedMessageId) return;

          console.log('Evento DELETE global recebido:', deletedMessageId);
          
          // Remover do cache local para garantir consistência
          CacheManager.removeMessage(targetConversationId, deletedMessageId);
          
          setMessages(prev => {
            // Verificar se temos essa mensagem na lista
            const hasMessage = prev.some(msg => msg.id === deletedMessageId);
            if (!hasMessage) return prev;
            console.log('Removendo mensagem deletada da lista:', deletedMessageId);
            // Remover a mensagem e limpar replies que referenciam a mensagem deletada
            const filtered = prev.filter(msg => msg.id !== deletedMessageId);
            const cleaned = filtered.map(msg => {
              if (msg.reply_to_id === deletedMessageId) {
                return { ...msg, reply_to_id: null, reply_to: null };
              }
              return msg;
            });
            return cleaned;
          });
        }
      )
      .subscribe();
      
    presenceChannelRef.current = channel;
    return { channel, deleteChannel };
  }, [currentUserId, recipientId, fetchUnreadCount]);

  // Monitorar estado do app (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
      console.log('Estado do app alterado para:', nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Polling de fallback para garantir atualização de mensagens
  useEffect(() => {
    if (!currentUserId || (!conversationId && !currentConversationId)) return;

    const targetId = conversationId || currentConversationId;
    console.log('Iniciando polling para conversa:', targetId);

    const intervalId = setInterval(async () => {
      // Regras para pular o polling:
      // 1. App em background
      // 2. Enviando mensagem
      // 3. Carregando histórico
      
      const isBackground = appState.current.match(/inactive|background/);
      if (isBackground || sending || loading) return;

      // Removida otimização de frequência temporariamente para garantir entrega
      // if (isRealtimeConnected.current && Math.random() > 0.3) return;

      try {
        // Buscar apenas as mensagens mais recentes (primeira página)
        const { data: latestMessages, error } = await getMessagesFast(targetId, 5);
        
        if (error) {
          console.error('Erro no polling:', error);
          return;
        }

        if (latestMessages && latestMessages.length > 0) {
          setMessages(prev => {
            const newMessages = latestMessages.filter(
              newMsg => !prev.some(existingMsg => existingMsg.id === newMsg.id)
            );

            if (newMessages.length > 0) {
              console.log('Polling encontrou novas mensagens:', newMessages.length, newMessages.map(m => m.id));
              // Se houver novas mensagens, adicionar e marcar como lidas
              const hasIncoming = newMessages.some(m => m.sender_id !== currentUserId);
              if (hasIncoming) {
                markMessagesAsRead(targetId, currentUserId)
                  .then(() => fetchUnreadCount())
                  .catch(() => {});
              }
              
              // Mesclar e ordenar
                const updated = [...newMessages, ...prev].sort((a, b) => 
                  new Date(b.created_at) - new Date(a.created_at)
                );
                CacheManager.saveMessages(targetId, updated.slice(0, 300));
                return updated;
              }
              return prev;
            });
          }
      } catch (err) {
        console.error('Erro inesperado no polling:', err);
      }
    }, 3000); // Verificar a cada 3 segundos

    return () => {
      console.log('Parando polling');
      clearInterval(intervalId);
    };
  }, [conversationId, currentConversationId, currentUserId, sending, loading]);

  // Efeito para inicialização do chat e configuração do real-time
  useEffect(() => {
    // Se não temos os dados necessários, não faz nada
    if (!currentUserId) {
      return;
    }

    let isMounted = true;
    let subscription;

    const initializeChat = async () => {
      try {
        setLoading(true);
        let targetConversationId = conversationId || currentConversationId;
        
        // Se não temos um ID de conversa, mas temos um recipientId, tentamos obter/criar a conversa
        if (!targetConversationId && recipientId) {
          const { data: conversationIdResult, error } = await getOrCreateConversation(currentUserId, recipientId);
          
          if (error) throw error;
          
          if (conversationIdResult) {
            targetConversationId = conversationIdResult;
            setCurrentConversationId(conversationIdResult);
          }
        }

        // Se temos um ID de conversa, carregamos as mensagens
        if (targetConversationId) {
          try {
            const cached = await CacheManager.loadMessages(targetConversationId);
            if (cached && cached.length > 0) {
              setMessages(cached.slice(0, PAGE_SIZE));
            }
          } catch {}
          const { data: messages, error: messagesError } = await getMessages(
            targetConversationId,
            1,
            PAGE_SIZE
          );

          if (messagesError) throw messagesError;
          
          if (messages && Array.isArray(messages)) {
            setMessages(messages);
            
            // Marcar mensagens como lidas
            if (messages.length > 0) {
              try {
                await markMessagesAsRead(targetConversationId, currentUserId);
                fetchUnreadCount();
              } catch (error) {
                // Ignorar erros ao marcar como lida
              }
            }
            
            // Rolar para o final após carregar as mensagens
            setTimeout(() => {
              if (isMounted && messages.length > 0) {
                // Em lista invertida, não precisamos rolar
                // flatListRef.current?.scrollToEnd({ animated: false });
              }
            }, 100);
          }
          
          // Configurar assinatura real-time
          if (isMounted) {
            subscription = setupRealtimeSubscription(targetConversationId);
          }
        }
        
        // Carregar detalhes do participante ou grupo
        if (recipientId || isGroup) {
          await loadParticipant();
        }
        
        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Erro ao inicializar o chat:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    initializeChat();
    
    // Função de limpeza
    return () => {
      isMounted = false;
      if (subscription) {
        if (subscription.channel) supabase.removeChannel(subscription.channel);
        if (subscription.deleteChannel) supabase.removeChannel(subscription.deleteChannel);
        // Fallback caso seja o formato antigo (apenas um canal)
        if (!subscription.channel && !subscription.deleteChannel && typeof subscription.subscribe === 'function') {
           supabase.removeChannel(subscription);
        }
      }
    };
  }, [conversationId, currentUserId, recipientId, getOrCreateConversation, loadParticipant, setupRealtimeSubscription]);

  // Enviar mensagem (Texto ou Mídia)
  const performSend = async (content, mediaUrl = null, mediaType = null) => {
    if ((!content?.trim() && !mediaUrl) || sending || !currentUserId || (!recipientId && !conversationId)) {
      return;
    }
    
    // Se não tivermos um conversationId, precisamos criar/obter uma conversa primeiro
    let targetConversationId = conversationId || currentConversationId;
    if (!targetConversationId) {
      try {
        const { data: conversationIdResult, error } = await getOrCreateConversation(currentUserId, recipientId);

        if (error) throw error;
        if (!conversationIdResult) {
          throw new Error('Não foi possível criar a conversa');
        }
        
        targetConversationId = conversationIdResult;
        setCurrentConversationId(targetConversationId);
        setupRealtimeSubscription(targetConversationId);
      } catch (error) {
        console.error('Erro ao criar/obter conversa:', error);
        Alert.alert('Erro', 'Não foi possível iniciar a conversa. Tente novamente.');
        return;
      }
    }
    
    const messageContent = content ? content.trim() : '';
    if (!mediaUrl) setNewMessage('');
    setSending(true);

    // Mensagem otimista
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      conversation_id: targetConversationId,
      sender_id: currentUserId,
      content: messageContent,
      media_url: mediaUrl,
      media_type: mediaType,
      reply_to_id: null,
      reply_to: null,
      created_at: new Date().toISOString(),
      read: false,
      pending: true
    };

    // Em lista invertida, adicionamos no início
    setMessages(prev => [optimisticMessage, ...prev]);
    
    try {
      const { message, error } = await sendMessage(
        targetConversationId,
        currentUserId,
        messageContent,
        mediaUrl,
        mediaType
      );
      
      if (error) throw error;
      
      // Substituir mensagem otimista pela real
      setMessages(prev => {
        const next = prev.map(msg => 
          msg.id === tempId ? {
            ...message,
            reply_to: message.reply_to || msg.reply_to
          } : msg
        );
        CacheManager.saveMessages(targetConversationId, next.slice(0, 300));
        return next;
      });
      try { recordEvent('sent_chat_message'); } catch {}
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Não remover a mensagem, marcar como erro
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, pending: false, error: true } : msg
      ));
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (sending) return;
    performSend(newMessage);
  };

  const sendAttachment = async (asset, mediaType) => {
    if (sending) return;
    let targetConversationId = conversationId || currentConversationId;
    if (!targetConversationId) {
      try {
        const { data: conversationIdResult, error } = await getOrCreateConversation(currentUserId, recipientId);
        if (error) throw error;
        if (!conversationIdResult) throw new Error('Não foi possível criar a conversa');
        targetConversationId = conversationIdResult;
        setCurrentConversationId(targetConversationId);
        setupRealtimeSubscription(targetConversationId);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível iniciar a conversa. Tente novamente.');
        return;
      }
    }
    const tempId = `temp-${Date.now()}`;
    const contentText = (mediaType === 'document' && !newMessage.trim() && asset.name) ? asset.name : (newMessage || '');
    setNewMessage('');
    setSending(true);
    const optimisticMessage = {
      id: tempId,
      conversation_id: targetConversationId,
      sender_id: currentUserId,
      content: contentText,
      media_url: null,
      media_type: mediaType,
      local_media_uri: asset.uri,
      local_media_type: mediaType,
      local_file_name: asset.name || null,
      reply_to_id: null,
      reply_to: null,
      created_at: new Date().toISOString(),
      read: false,
      pending: true
    };
    setMessages(prev => [optimisticMessage, ...prev]);
    try {
      const { url, error } = await uploadChatMedia(asset);
      if (error || !url) throw error || new Error('Falha no upload');
      const { message, error: sendErr } = await sendMessage(
        targetConversationId,
        currentUserId,
        contentText.trim(),
        url,
        mediaType
      );
      if (sendErr) throw sendErr;
      setMessages(prev => {
        const next = prev.map(msg => (msg.id === tempId ? { ...message, reply_to: message.reply_to || msg.reply_to } : msg));
        CacheManager.saveMessages(targetConversationId, next.slice(0, 300));
        return next;
      });
      try { recordEvent('sent_chat_message'); } catch {}
    } catch (e) {
      setMessages(prev => prev.map(msg => (msg.id === tempId ? { ...msg, pending: false, error: true } : msg)));
    } finally {
      setSending(false);
    }
  };

  const handlePickDocument = async () => {
    setShowAttachmentOptions(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isImage = asset.mimeType?.startsWith('image/');
        const isVideo = asset.mimeType?.startsWith('video/');
        const mediaType = isImage ? 'image' : isVideo ? 'video' : 'document';
        await sendAttachment(asset, mediaType);
      }
    } catch (error) {
      console.error('Erro ao selecionar documento:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o documento');
    }
  };

  const handlePickMedia = async () => {
    setShowAttachmentOptions(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false, // Desabilitar edição para vídeos funcionarem melhor e manter original
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const type = asset.type === 'video' ? 'video' : 'image';
        await sendAttachment(asset, type);
      }
    } catch (error) {
      console.error('Erro ao selecionar mídia:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a mídia');
    }
  };

  const handleRetryMessage = async (message) => {
    if (!message.error) return;
    
    // Atualizar estado para "enviando"
    setMessages(prev => prev.map(m => 
      m.id === message.id ? { ...m, pending: true, error: false } : m
    ));
    
    try {
      const { message: sentMessage, error } = await sendMessage(
        message.conversation_id,
        message.sender_id,
        message.content
      );
      
      if (error) throw error;
      
      // Sucesso: substituir mensagem
      setMessages(prev => {
        const next = prev.map(m => (m.id === message.id ? sentMessage : m));
        CacheManager.saveMessages(message.conversation_id, next.slice(0, 300));
        return next;
      });
    } catch (error) {
      console.error('Erro ao re-enviar mensagem:', error);
      // Voltar para erro
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, pending: false, error: true } : m
      ));
      Alert.alert('Erro', 'Falha ao re-enviar mensagem. Verifique sua conexão.');
    }
  };

  const handleFilePress = async (url, fileName) => {
    if (sharingBusy) {
      Alert.alert('Aguarde', 'Um compartilhamento já está em andamento.');
      return;
    }
    setSharingBusy(true);
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      setSharingBusy(false);
      return;
    }

    try {
        // Extrair nome do arquivo da URL se fileName não vier ou for uma mensagem longa
        let name = fileName;
        if (!name || name.length > 50 || name.includes(' ')) {
            name = url.split('/').pop().split('?')[0];
        }
        
        console.log('Baixando arquivo:', url, 'como:', name);

        const { uri } = await FileSystem.downloadAsync(
            url,
            FileSystem.documentDirectory + name
        );
        
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
        } else {
            Alert.alert('Download concluído', 'Arquivo baixado com sucesso.');
        }
    } catch (e) {
        console.error('Erro ao baixar/abrir arquivo:', e);
        Alert.alert('Erro', 'Não foi possível abrir o arquivo.');
    } finally {
        setSharingBusy(false);
    }
  };

  // Carregar mais mensagens ao rolar para cima
  const handleLoadMore = () => {
    // Não carregar se já estiver carregando (inicial ou mais) ou se não houver mais
    if (loading || loadingMore || !hasMore) return;
    loadMessages(page + 1, false);
  };

  const handleDeleteMessage = async (message) => {
    // Permitir se for o dono DA MENSAGEM ou se o usuário atual for ADMIN
    if (message.sender_id !== currentUserId && !isAdmin) return;

    Alert.alert(
      'Apagar mensagem',
      'Tem certeza que deseja apagar esta mensagem?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            // Atualização otimista: remover mensagem e limpar replies que apontam para ela
            setMessages(prev => {
              const filtered = prev.filter(m => m.id !== message.id);
              const cleaned = filtered.map(m => {
                if (m.reply_to_id === message.id) {
                  return { ...m, reply_to_id: null, reply_to: null };
                }
                return m;
              });
              return cleaned;
            });
            // Atualizar cache imediatamente
            const convIdImmediate = conversationId || currentConversationId;
            if (convIdImmediate) {
              try { await CacheManager.removeMessage(convIdImmediate, message.id); } catch {}
            }
            
            const { error } = await deleteMessage(message.id);
            if (error) {
              Alert.alert('Erro', 'Não foi possível apagar a mensagem.');
              // Recarregar mensagens para restaurar o estado correto
              loadMessages(page);
            } else {
              const convId = conversationId || currentConversationId;
              if (convId) {
                CacheManager.removeMessage(convId, message.id);
              }
            }
          }
        }
      ]
    );
  };

  // Componente de Item de Mensagem Simplificado (Sem Swipe/Reply)
  const MessageItem = React.memo(({ item, isCurrentUser, isSenderAdmin, isSharedPost, onDelete, onRetry, onImagePress, onFilePress }) => {
    
    const renderSharedPostContent = () => {
      // Extrair o conteúdo do post e as informações do autor
      let postContent = item.content ? item.content.replace('🔗 *Post compartilhado*', '').trim() : '';
      // Remover aspas iniciais e finais se houver (adicionadas pelo SharePostModal)
      if (postContent.startsWith('"') && postContent.endsWith('"')) {
        postContent = postContent.substring(1, postContent.length - 1);
      }

      // Extrair informações do autor se disponíveis
      const authorName = (item.sender && (item.sender.username || item.sender.full_name)) || 'Usuário';
      const authorAvatar = item.sender && item.sender.profile_image_url ? item.sender.profile_image_url : null;

      return (
        <View style={{ width: 250 }}>
          {item.media_url && (
            <View style={{ width: 250, height: 350, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000', elevation: 3 }}>
              {item.media_type === 'video' ? (
                <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedVideo(item.media_url)} style={{ flex: 1 }}>
                  <ModernVideoPlayer
                    source={{ uri: item.media_url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={ResizeMode.COVER}
                    isLooping={true}
                    shouldPlay={false}
                  />
                  <View style={{ position: 'absolute', top: 10, left: 10, right: 10 }}>
                    <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={{ height: 60, borderTopLeftRadius: 18, borderTopRightRadius: 18 }} />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (item.content?.includes('userId:')) {
                        const parts = item.content.split('userId:');
                        if (parts.length > 1) {
                          const id = parts[1].split('}')[0].trim();
                          if (id) navigation.navigate('UserProfile', { userId: id });
                        }
                      } else if (item.sender_id) {
                        navigation.navigate('UserProfile', { userId: item.sender_id });
                      }
                    }}
                    style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center' }}
                    activeOpacity={0.8}
                  >
                    {authorAvatar ? (
                      <Image source={{ uri: authorAvatar }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }} />
                    ) : (
                      <Ionicons name="person-circle" size={28} color="#fff" style={{ marginRight: 8 }} />
                    )}
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{authorName}</Text>
                  </TouchableOpacity>
                  <View style={{ position: 'absolute', alignSelf: 'center', top: '42%', backgroundColor: 'rgba(0,0,0,0.4)', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="play" size={32} color="#fff" />
                  </View>
                  <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: '#fff', width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="videocam" size={18} color="#000" />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => onImagePress(item.media_url)} activeOpacity={0.9} style={{ flex: 1 }}>
                  <Image
                    source={{ uri: item.media_url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <View style={{ position: 'absolute', top: 10, left: 10, right: 10 }}>
                    <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={{ height: 60, borderTopLeftRadius: 18, borderTopRightRadius: 18 }} />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (item.content?.includes('userId:')) {
                        const parts = item.content.split('userId:');
                        if (parts.length > 1) {
                          const id = parts[1].split('}')[0].trim();
                          if (id) navigation.navigate('UserProfile', { userId: id });
                        }
                      } else if (item.sender_id) {
                        navigation.navigate('UserProfile', { userId: item.sender_id });
                      }
                    }}
                    style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center' }}
                    activeOpacity={0.8}
                  >
                    {authorAvatar ? (
                      <Image source={{ uri: authorAvatar }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }} />
                    ) : (
                      <Ionicons name="person-circle" size={28} color="#fff" style={{ marginRight: 8 }} />
                    )}
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{authorName}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            </View>
          )}

          {postContent ? (
            <Text 
              style={{ 
                fontSize: 14, 
                color: isCurrentUser ? 'white' : theme.text,
                lineHeight: 20
              }}
            >
              {postContent}
            </Text>
          ) : null}
        </View>
      );
    };

    const MessageContent = () => (
      <TouchableOpacity 
          onLongPress={() => (isCurrentUser || (isAdmin && !isSenderAdmin)) && !item.pending && !item.error && onDelete(item)}
          onPress={() => item.error && onRetry(item)}
          activeOpacity={0.9}
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
            { 
              backgroundColor: isSharedPost ? 'transparent' : (item.error ? '#ffcccc' : (isCurrentUser ? theme.primary : theme.card)),
              marginVertical: 4,
              elevation: isSharedPost ? 0 : 2,
              opacity: item.pending ? 0.7 : 1,
              maxWidth: isSharedPost ? '85%' : (item.media_url ? '70%' : '80%'),
              padding: isSharedPost ? 0 : (item.media_url ? 4 : 12),
            }
          ]}
        >


          {isSharedPost ? renderSharedPostContent() : (
            <>
              {item.media_url && (
                <View style={{ marginBottom: item.content ? 8 : 0 }}>
                  {item.media_type === 'video' ? (
                    Platform.OS === 'web' ? (
                      (() => {
                        const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
                        const w = Math.min(480, Math.max(220, Math.floor(vw * 0.6)));
                        const h = Math.floor(w * 9 / 16);
                        return (
                          <TouchableOpacity activeOpacity={0.9} onPress={() => { try { window.open(item.media_url, '_blank', 'noopener'); } catch {} }}>
                            <View style={{ width: w, height: h, borderRadius: 10, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                              <Ionicons name="play" size={Math.max(24, Math.floor(w * 0.07))} color="#fff" />
                            </View>
                          </TouchableOpacity>
                        );
                      })()
                    ) : (
                      <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedVideo(item.media_url)}>
                        <ModernVideoPlayer
                          source={{ uri: item.media_url }}
                          style={{ width: 240, height: 320, borderRadius: 10 }}
                          resizeMode={ResizeMode.COVER}
                          isLooping={true}
                          shouldPlay={false}
                        />
                      </TouchableOpacity>
                    )
                  ) : (item.media_type === 'image' || (!item.media_type && !item.media_url.endsWith('.pdf') && !item.media_url.endsWith('.doc') && !item.media_url.endsWith('.docx'))) ? (
                    <TouchableOpacity 
                      onPress={() => onImagePress(item.media_url)}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: item.media_url }}
                        style={{ width: 200, height: 200, borderRadius: 10 }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ) : (
                     <TouchableOpacity 
                        style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            backgroundColor: 'rgba(0,0,0,0.1)', 
                            padding: 10, 
                            borderRadius: 8,
                            minWidth: 200,
                            maxWidth: 250
                        }}
                        onPress={() => onFilePress(item.media_url, item.content)}
                        activeOpacity={0.7}
                    >
                        <View style={{ 
                            backgroundColor: 'rgba(255,255,255,0.2)', 
                            padding: 8, 
                            borderRadius: 8,
                            marginRight: 10
                        }}>
                            <Ionicons name="document-text" size={24} color={isCurrentUser ? 'white' : theme.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text 
                                numberOfLines={1} 
                                style={{ 
                                    color: isCurrentUser ? 'white' : theme.text,
                                    fontSize: 14,
                                    fontWeight: '600'
                                }}
                            >
                                {item.content && !item.content.includes('\n') ? item.content : 'Documento'}
                            </Text>
                            <Text 
                                style={{ 
                                    color: isCurrentUser ? 'rgba(255,255,255,0.8)' : theme.textSecondary,
                                    fontSize: 10
                                }}
                            >
                                Toque para baixar
                            </Text>
                        </View>
                        <Ionicons name="download" size={20} color={isCurrentUser ? 'white' : theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {!item.media_url && item.local_media_uri && (
                <View style={{ marginBottom: item.content ? 8 : 0 }}>
                  {item.local_media_type === 'image' ? (
                    <Image
                      source={{ uri: item.local_media_uri }}
                      style={{ width: 200, height: 200, borderRadius: 10, opacity: item.pending ? 0.7 : 1 }}
                      resizeMode="cover"
                    />
                  ) : item.local_media_type === 'video' ? (
                    <View style={{ width: 240, height: 320, borderRadius: 10, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="videocam" size={32} color={isCurrentUser ? 'white' : theme.primary} />
                    </View>
                  ) : (
                    <View 
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        backgroundColor: 'rgba(0,0,0,0.1)', 
                        padding: 10, 
                        borderRadius: 8,
                        minWidth: 200,
                        maxWidth: 250
                      }}
                    >
                      <View style={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        padding: 8, 
                        borderRadius: 8,
                        marginRight: 10
                      }}>
                        <Ionicons name="document-text" size={24} color={isCurrentUser ? 'white' : theme.primary} />
                      </View>
                      <Text style={{ color: isCurrentUser ? 'white' : theme.text, flex: 1 }} numberOfLines={1}>
                        {item.local_file_name || item.content || 'Documento'}
                      </Text>
                    </View>
                  )}
                  {item.pending && (
                    <View style={{ marginTop: 6 }}>
                      <ActivityIndicator size="small" color={isCurrentUser ? 'white' : theme.primary} />
                    </View>
                  )}
                </View>
              )}

              {item.content ? (
                <Text 
                  style={[
                    styles.messageText,
                    { 
                      color: item.error ? '#cc0000' : (isCurrentUser ? 'white' : theme.text),
                      marginHorizontal: item.media_url ? 8 : 0,
                      marginBottom: item.media_url ? 4 : 0
                    }
                  ]}
                >
                  {item.content}
                </Text>
              ) : null}
            </>
          )}
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'flex-end', 
            alignItems: 'center', 
            marginTop: 4,
            marginRight: (item.media_url || isSharedPost) ? 8 : 0 
          }}>
            <Text 
              style={[
                styles.messageTime,
                { 
                  color: item.error ? '#cc0000' : (isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : theme.textSecondary),
                  fontSize: 10,
                  marginRight: 4
                }
              ]}
            >
              {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : ''}
            </Text>
            {isCurrentUser && (
              item.error ? (
                <Ionicons name="alert-circle" size={12} color="#cc0000" />
              ) : item.pending ? (
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
              ) : (
                <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.7)" />
              )
            )}
          </View>
        </TouchableOpacity>
    );

    return (
      <View style={{ width: '100%', alignItems: isCurrentUser ? 'flex-end' : 'flex-start' }}>
        {isGroup && !isCurrentUser && item.sender && (
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.sender.id })}>
            <Text style={{ 
              fontSize: 12, 
              color: theme.textSecondary, 
              marginLeft: 12, 
              marginBottom: 2 
            }}>
              {item.sender.username || 'Usuário'}
            </Text>
          </TouchableOpacity>
        )}
        
        <MessageContent />
      </View>
    );
  });

  // Renderizar mensagem individual (Wrapper)
  const renderMessage = useCallback(({ item }) => {
    if (!item || !item.sender_id) return null;
    
    const isCurrentUser = item.sender_id === currentUserId;
    const isSharedPost = item.content && item.content.includes('🔗 *Post compartilhado*');
    const isSenderAdmin = adminIds.has(item.sender_id);
    
    return (
      <MessageItem 
        item={item}
        isCurrentUser={isCurrentUser}
        isSenderAdmin={isSenderAdmin}
        isSharedPost={isSharedPost}
        onDelete={handleDeleteMessage}
        onRetry={handleRetryMessage}
        onImagePress={setSelectedImage}
        onFilePress={handleFilePress}
      />
    );
  }, [currentUserId, adminIds, handleDeleteMessage, handleRetryMessage, handleFilePress]);
  
  // Mostrar indicador de carregamento apenas na primeira vez
  if (loading && messages.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Carregando mensagens...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
        {/* Lista de mensagens */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messagesContainer, { paddingBottom: 10 }]}
          showsVerticalScrollIndicator
          style={Platform.OS === 'web' ? { overflow: 'auto' } : undefined}
          inverted
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS !== 'web'}
          updateCellsBatchingPeriod={50}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          ListFooterComponent={ // Em lista invertida, o footer aparece no topo visual
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : null
          }
          ListHeaderComponent={null} // Header seria o fundo visual
          ListEmptyComponent={
            !loading && messages.length === 0 ? (
              <View style={[styles.emptyContainer, { transform: [{ scaleY: -1 }] }]}> 
                {/* Precisamos desinverter o empty component se quisermos que ele apareça normal */}
                <Ionicons name="chatbubbles-outline" size={48} color={theme.text} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  Nenhuma mensagem ainda. Envie uma mensagem para começar a conversa!
                </Text>
              </View>
            ) : null
          }
          onLayout={() => {
            // Não precisamos mais rolar para o final no layout
          }}
          // Removido onContentSizeChange para evitar recarregamentos desnecessários
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
        
        {/* Input de mensagem */}
        {!canPost ? (
          <View style={[
            styles.inputContainer, 
            { 
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              borderTopWidth: 1,
              justifyContent: 'center',
              paddingVertical: 15
            }
          ]}>
            <Text style={{ color: theme.textSecondary, fontStyle: 'italic' }}>
              Apenas administradores podem enviar mensagens neste grupo.
            </Text>
          </View>
        ) : (
        <View 
            style={[
              styles.inputContainer, 
              { 
                backgroundColor: theme.card,
                borderTopColor: theme.border,
                borderTopWidth: 1,
                flexDirection: 'column',
                alignItems: 'stretch',
                paddingTop: 10
              }
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={{ padding: 8, marginRight: 5 }}
              onPress={() => setShowAttachmentOptions(true)}
              disabled={sending}
            >
              <Ionicons name="attach" size={24} color={theme.primary} />
            </TouchableOpacity>

            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }
              ]}
              placeholder="Digite uma mensagem..."
              placeholderTextColor={theme.textSecondary}
              value={newMessage}
              onChangeText={setNewMessage}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity 
              style={[
                styles.sendButton, 
                { 
                  backgroundColor: newMessage.trim() ? theme.primary : theme.disabled,
                  opacity: sending ? 0.7 : 1
                }
              ]}
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={20} 
                  color="white" 
                />
              )}
            </TouchableOpacity>
            </View>
          </View>
        )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={!!selectedImage}
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
        animationType="fade"
      >
        <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity 
                style={{ position: 'absolute', top: 40, right: 20, zIndex: 2, padding: 10 }}
                onPress={() => setSelectedImage(null)}
            >
                <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
                style={{ position: 'absolute', top: 40, right: 70, zIndex: 2, padding: 10 }}
                onPress={() => selectedImage && handleFilePress(selectedImage)}
            >
                <Ionicons name="download" size={28} color="white" />
            </TouchableOpacity>
            {selectedImage && (
              <Image
                  source={{ uri: selectedImage }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                  resizeMode="contain"
              />
            )}
        </View>
      </Modal>
      
      <Modal
        visible={!!selectedVideo}
        transparent={true}
        onRequestClose={() => setSelectedVideo(null)}
        animationType="fade"
      >
        <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
              style={{ position: 'absolute', top: 40, right: 20, zIndex: 2, padding: 10 }}
              onPress={() => setSelectedVideo(null)}
          >
              <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
              style={{ position: 'absolute', top: 40, right: 70, zIndex: 2, padding: 10 }}
              onPress={() => selectedVideo && handleFilePress(selectedVideo)}
          >
              <Ionicons name="download" size={28} color="white" />
          </TouchableOpacity>
          {selectedVideo && (
            <Video
              source={{ uri: selectedVideo }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
            />
          )}
        </View>
      </Modal>

      {/* Modal de Opções de Anexo */}
      <Modal
        visible={showAttachmentOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAttachmentOptions(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowAttachmentOptions(false)}
        >
          <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 20, textAlign: 'center' }}>
              Anexar
            </Text>
            
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.border }}
              onPress={handlePickMedia}
            >
              <View style={{ width: 40, alignItems: 'center' }}>
                <Ionicons name="images" size={24} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 16, color: theme.text, marginLeft: 10 }}>Galeria (Fotos e Vídeos)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
              onPress={handlePickDocument}
            >
              <View style={{ width: 40, alignItems: 'center' }}>
                <Ionicons name="document-text" size={24} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 16, color: theme.text, marginLeft: 10 }}>Documento</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ marginTop: 20, paddingVertical: 15, alignItems: 'center', backgroundColor: theme.background, borderRadius: 10 }}
              onPress={() => setShowAttachmentOptions(false)}
            >
              <Text style={{ fontSize: 16, color: theme.text, fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 15,
    paddingBottom: 10,
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 4,
    minWidth: '20%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
  },
  currentUserBubble: {
    borderBottomRightRadius: 5,
  },
  otherUserBubble: {
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 120,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingMoreContainer: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  headerRight: {
    marginRight: 15,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;
