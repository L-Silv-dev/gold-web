import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import useProfile from '../hooks/useProfile';
import { supabase } from '../utils/supabase';
import { getGlobalUnreadCount } from '../services/messageService';

const UserContext = createContext();

export function UserProvider({ children }) {
  const profile = useProfile();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (profile.user?.id) {
      // console.log('Atualizando contagem global de mensagens não lidas...');
      const count = await getGlobalUnreadCount(profile.user.id);
      setUnreadCount(count);
    }
  }, [profile.user?.id]);

  // Carregar contagem inicial quando o usuário estiver autenticado
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Polling e AppState para garantir atualização
  useEffect(() => {
    if (!profile.user?.id) return;

    // Atualizar ao focar o app
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        fetchUnreadCount();
      }
    });

    // Polling a cada 10 segundos como fallback
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 10000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [profile.user?.id, fetchUnreadCount]);

  // Realtime subscription para mensagens
  useEffect(() => {
    if (!profile.user?.id) return;

    // Debounce para evitar múltiplas chamadas em atualizações em massa
    let debounceTimeout;
    const debouncedFetch = () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        fetchUnreadCount();
      }, 1000);
    };

    // console.log('Iniciando subscription global de mensagens para usuário:', profile.user.id);

    const subscription = supabase
      .channel(`global_messages_${profile.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
           // Se for INSERT, verifique se não é minha mensagem
           if (payload.eventType === 'INSERT') {
             if (payload.new.sender_id !== profile.user.id) {
               // Para novas mensagens, atualizamos mais rápido (mas ainda com leve debounce para bursts)
               if (debounceTimeout) clearTimeout(debounceTimeout);
               debounceTimeout = setTimeout(() => {
                 fetchUnreadCount();
               }, 500);
             }
           }
           // Se for UPDATE (ex: lido) ou DELETE
           else {
             debouncedFetch();
           }
        }
      )
      .subscribe((status) => {
        // if (status === 'SUBSCRIBED') {
        //   console.log('Global message subscription connected');
        // }
      });

    return () => {
      supabase.removeChannel(subscription);
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [profile.user?.id, fetchUnreadCount]);

  const value = {
    ...profile,
    unreadCount,
    fetchUnreadCount
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  return useContext(UserContext);
}
