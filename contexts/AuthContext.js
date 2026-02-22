import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import StorageHelper from '../utils/storageHelper';
import logger from '../utils/logger';
import { checkConnectivity } from '../utils/networkHelper';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evolutionStats, setEvolutionStats] = useState({
    pdfs_opened: 0,
    books_opened: 0,
    charts_viewed: 0,
    messages_sent: 0,
    videos_watched: 0,
    quizzes_joined: 0,
    quiz_best_score: 0,
    days_active: 0,
    streak_days: 0,
    last_active: null
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [evolutionVersion, setEvolutionVersion] = useState(0);

  useEffect(() => {
    // Verificar se há uma sessão ativa ao carregar o aplicativo
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Evento de Autenticação: ${event}`);
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Se o usuário acabou de fazer login, garantir que o perfil existe
      if (event === 'SIGNED_IN' && session?.user) {
        checkConnectivity().then((online) => {
          if (online) ensureUserProfile(session.user);
        });
      }
      
      // Tratamento para renovação de token falha
      if (event === 'TOKEN_REFRESH_REVOKED' || event === 'TOKEN_REFRESHED') {
          if (event === 'TOKEN_REFRESH_REVOKED') {
            logger.warn('Refresh token revogado. Deslogando...');
            await clearAuthStorage();
            setSession(null);
            setUser(null);
          }
      }
    });

    // Verificar a sessão atual
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao verificar sessão:', error);
          
          // Verificar se é erro de refresh token
          const isRefreshTokenError = error.message.includes('Refresh Token Not Found') || 
                                    error.message.includes('Invalid Refresh Token') ||
                                    error.message.includes('refresh_token_not_found') ||
                                    error.message.includes('invalid_grant');
          
          if (isRefreshTokenError) {
            console.log('Token de refresh inválido detectado. Limpando armazenamento...');
            await clearAuthStorage();
            setSession(null);
            setUser(null);
          }
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          checkConnectivity().then((online) => {
            if (online) ensureUserProfile(session.user);
          });
        }
    } catch (error) {
      logger.error('Erro crítico ao verificar sessão:', error);
      
      // Em caso de erro crítico na sessão, fazer logout preventivo
        const isRefreshTokenError = error?.message?.includes('Refresh Token Not Found') ||
                                  error?.message?.includes('Invalid Refresh Token') ||
                                  error?.message?.includes('refresh_token_not_found') ||
                                  error?.message?.includes('invalid_grant');
        
        if (isRefreshTokenError) {
          logger.warn('Erro de refresh token capturado. Limpando armazenamento...');
          await clearAuthStorage();
          setSession(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Limpar listener ao desmontar
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Função para limpar completamente o armazenamento de autenticação
  const clearAuthStorage = async () => {
    try {
      console.log('Limpando armazenamento de autenticação...');
      
      // Limpar tokens do Supabase
      const authKeys = [
        'sb-hodzsckzancczwirtwcx-auth-token',
        'supabase.auth.token',
        'sb-auth-token',
        'auth-token'
      ];
      
      for (const key of authKeys) {
        try {
          await StorageHelper.removeItem(key);
        } catch (error) {
          console.log(`Chave ${key} não encontrada ou já removida`);
        }
      }
      
      console.log('Armazenamento de autenticação limpo com sucesso');
    } catch (error) {
      console.error('Erro ao limpar armazenamento:', error);
    }
  };

  // Função para garantir que o perfil do usuário existe
  const ensureUserProfile = async (authUser) => {
    try {
      // Verificar se o perfil já existe
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // Se não existe, criar usando função RPC (bypassa RLS)
      if (fetchError && fetchError.code === 'PGRST116') {
        const metadata = authUser.user_metadata || {};
        
        // Tentar criar usando função RPC primeiro
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_user_profile', {
          p_user_id: authUser.id,
          p_email: authUser.email || '',
          p_full_name: metadata.full_name || metadata.name || '',
          p_username: metadata.username || authUser.email?.split('@')[0] || '',
          p_school: metadata.school || '',
        });

        if (rpcError) {
          console.error('Erro ao criar perfil via RPC:', rpcError);
          // Tentar inserção direta como fallback
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authUser.id,
                email: authUser.email,
                full_name: metadata.full_name || metadata.name || '',
                username: metadata.username || authUser.email?.split('@')[0] || '',
                school: metadata.school || '',
                bio: metadata.bio || '',
              }
            ]);

          if (insertError) {
            console.error('Erro ao criar perfil:', insertError);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao garantir perfil do usuário:', error);
    }
  };

  const getScopedKey = (base) => {
    const uid = user?.id || 'anon';
    return `${base}:${uid}`;
  };

  const persistEvolution = async (stats, achievements) => {
    try {
      await StorageHelper.setItem(getScopedKey('evolution_stats'), JSON.stringify(stats));
      await StorageHelper.setItem(getScopedKey('user_achievements'), JSON.stringify(achievements));
    } catch (e) {
      logger.warn('Falha ao persistir evolução');
    }
  };

  const loadEvolution = async () => {
    try {
      const statsStr = await StorageHelper.getItem(getScopedKey('evolution_stats'));
      const achStr = await StorageHelper.getItem(getScopedKey('user_achievements'));
      if (statsStr) {
        const parsed = JSON.parse(statsStr);
        setEvolutionStats(prev => ({ ...prev, ...parsed }));
      }
      if (achStr) {
        setUnlockedAchievements(JSON.parse(achStr));
      }
    } catch (e) {
      logger.warn('Falha ao carregar evolução');
    }
  };

  useEffect(() => {
    loadEvolution();
  }, [user?.id]);

  useEffect(() => {
    const sendAudit = async () => {
      try {
        if (user?.id) {
          await supabase.functions.invoke('audit', { body: { event: 'session' } });
        }
      } catch {}
    };
    sendAudit();
  }, [user?.id]);

  const evalAndUnlock = (stats) => {
    const defs = [
      { id: 'first_access', ok: () => stats.days_active >= 1 },
      { id: 'open_pdf', ok: () => stats.pdfs_opened >= 1 },
      { id: 'chart_viewer_5', ok: () => stats.charts_viewed >= 5 },
      { id: 'first_message', ok: () => stats.messages_sent >= 1 },
      { id: 'chatter_20', ok: () => stats.messages_sent >= 20 },
      { id: 'watch_videos_3', ok: () => stats.videos_watched >= 3 },
      { id: 'join_quiz', ok: () => stats.quizzes_joined >= 1 },
      { id: 'quiz_score_70', ok: () => stats.quiz_best_score >= 70 },
      { id: 'streak_3', ok: () => stats.streak_days >= 3 },
      { id: 'streak_7', ok: () => stats.streak_days >= 7 }
    ];
    const have = new Set(unlockedAchievements.map(a => a.id));
    const newly = [];
    defs.forEach(d => {
      if (!have.has(d.id) && d.ok()) {
        newly.push({ id: d.id, date: Date.now() });
      }
    });
    if (newly.length > 0) {
      const next = [...unlockedAchievements, ...newly];
      setUnlockedAchievements(next);
      persistEvolution(stats, next);
      setEvolutionVersion(v => v + 1);
    } else {
      persistEvolution(stats, unlockedAchievements);
    }
  };

  const markDailyActive = (stats) => {
    const today = new Date();
    const dayStr = today.toISOString().slice(0, 10);
    if (stats.last_active === dayStr) return stats;
    let streak = stats.streak_days || 0;
    if (stats.last_active) {
      const last = new Date(stats.last_active);
      const diff = Math.floor((today - last) / (1000 * 60 * 60 * 24));
      if (diff === 1) streak = streak + 1;
      else streak = 1;
    } else {
      streak = 1;
    }
    return { ...stats, days_active: (stats.days_active || 0) + 1, streak_days: streak, last_active: dayStr };
  };

  useEffect(() => {
    setEvolutionStats(prev => {
      const next = markDailyActive(prev);
      evalAndUnlock(next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const recordEvent = (type, payload = {}) => {
    setEvolutionStats(prev => {
      let next = { ...prev };
      switch (type) {
        case 'opened_pdf':
          next.pdfs_opened = (next.pdfs_opened || 0) + 1;
          break;
        case 'opened_book':
          next.books_opened = (next.books_opened || 0) + 1;
          break;
        case 'viewed_chart':
          next.charts_viewed = (next.charts_viewed || 0) + 1;
          break;
        case 'sent_chat_message':
          next.messages_sent = (next.messages_sent || 0) + 1;
          break;
        case 'watched_video':
          next.videos_watched = (next.videos_watched || 0) + 1;
          break;
        case 'joined_quiz':
          next.quizzes_joined = (next.quizzes_joined || 0) + 1;
          break;
        case 'quiz_score':
          if (typeof payload.score === 'number') {
            next.quiz_best_score = Math.max(next.quiz_best_score || 0, payload.score);
          }
          break;
        case 'daily_active':
          next = markDailyActive(next);
          break;
        default:
          break;
      }
      evalAndUnlock(next);
      return next;
    });
  };

  // Função para login com email/senha
  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Garantir que o perfil existe após login
      if (data.user) {
        await ensureUserProfile(data.user);
        // Auditoria de login
        try { await supabase.functions.invoke('audit', { body: { event: 'login' } }); } catch {}
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Função para cadastro com email/senha
  const signUpWithEmail = async (email, password, userData) => {
    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.name,
            name: userData.name,
            username: userData.username || email.split('@')[0],
            school: userData.school,
          },
        },
      });

      if (signUpError) throw signUpError;

      // 2. O trigger no banco de dados criará o perfil automaticamente
      // Mas vamos garantir que foi criado corretamente
      if (authData.user) {
        // Aguardar um pouco para o trigger executar
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se o perfil foi criado
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        // Se não foi criado pelo trigger, tentar criar manualmente
        if (profileError || !profile) {
          console.log('Perfil não encontrado após trigger, tentando criar manualmente...');
          
          // Aguardar mais um pouco caso o trigger esteja demorando
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verificar novamente
          const { data: profileRetry, error: profileRetryError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();
          
          if (profileRetryError || !profileRetry) {
            // Tentar criar usando função RPC do banco (bypassa RLS)
            console.log('Tentando criar perfil usando função RPC...');
            const { data: rpcData, error: rpcError } = await supabase.rpc('create_user_profile', {
              p_user_id: authData.user.id,
              p_email: email,
              p_full_name: userData.name,
              p_username: userData.username || email.split('@')[0],
              p_school: userData.school,
            });

            if (rpcError) {
              console.error('Erro ao criar perfil via RPC:', rpcError);
              // Tentar inserção direta como último recurso
              const { error: insertError } = await supabase
                .from('profiles')
                .insert([
                  {
                    id: authData.user.id,
                    email: email,
                    full_name: userData.name,
                    username: userData.username || email.split('@')[0],
                    school: userData.school,
                  }
                ]);

              if (insertError) {
                console.error('Erro ao criar perfil manualmente:', insertError);
                // Não falhar o cadastro - o perfil pode ser criado depois no primeiro login
                console.warn('Perfil não foi criado automaticamente. Será criado no próximo login.');
              } else {
                console.log('Perfil criado manualmente com sucesso');
              }
            } else {
              console.log('Perfil criado via RPC com sucesso');
            }
          }
        }
      }

      return { data: authData, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Função para logout
  const signOut = async () => {
    try {
      // Auditoria de logout (enviar antes de limpar sessão)
      try { await supabase.functions.invoke('audit', { body: { event: 'logout' } }); } catch {}
      // Limpar o armazenamento local
      await clearAuthStorage();
      
      // Depois fazer logout no Supabase
      const { error } = await supabase.auth.signOut();
      
      // Mesmo se houver erro no logout do Supabase, limpar o estado local
      setUser(null);
      setSession(null);
      
      if (error) {
        console.warn('Aviso durante logout:', error);
        // Não retornar erro se for problema de token inválido
        if (error.message.includes('Refresh Token Not Found') || 
            error.message.includes('Invalid Refresh Token')) {
          return { error: null };
        }
        throw error;
      }
      
      return { error: null };
    } catch (error) {
      // Garantir que o estado local seja limpo mesmo em caso de erro
      setUser(null);
      setSession(null);
      return { error };
    }
  };

  // Função para redefinir senha
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'goldapp://reset-password'
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        evolutionStats,
        unlockedAchievements,
        evolutionVersion,
        recordEvent,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        resetPassword,
        clearAuthStorage,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
