import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { fetchPostsWithLikes } from '../services/postService';
import CacheManager from '../utils/cache';

export default function usePostsSupabase(refreshKey = 0) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  const abortControllerRef = useRef(null);

  // Carregar posts do cache inicialmente
  useEffect(() => {
    isMounted.current = true;
    const loadCache = async () => {
      try {
        const cachedPosts = await CacheManager.loadHomePosts();
        if (isMounted.current && cachedPosts && cachedPosts.length > 0) {
          setPosts(cachedPosts);
          setLoading(false); // Mostrar cache enquanto carrega
        }
      } catch (e) {
        console.error('Erro ao carregar cache:', e);
      }
    };
    loadCache();

    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchPosts = useCallback(async (silent = false) => {
    // Cancelar requisição anterior se houver
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!silent && posts.length === 0) setLoading(true);

    try {
      // Obter ID do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      // Timeout de 15 segundos para evitar loading infinito
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );

      // Buscar posts com informações de likes
      const fetchPromise = fetchPostsWithLikes(userId);
      
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      const { data, error } = result || {}; // Fallback safe
      
      if (!isMounted.current) return;

      if (error) {
        console.error('Erro ao buscar posts:', error);
        // Em caso de erro, tentar carregar do cache se o estado estiver vazio
        if (posts.length === 0) {
           const cached = await CacheManager.loadHomePosts();
           if (isMounted.current && cached && cached.length > 0) {
             setPosts(cached);
           }
        }
      } else {
        // Log para debug: verificar se posts com vídeos estão sendo retornados
        const postsWithVideos = (data || []).filter(p => p.post_videos && p.post_videos.length > 0);
        if (postsWithVideos.length > 0) {
          console.log(`✅ ${postsWithVideos.length} post(s) com vídeo(s) encontrado(s):`);
        }
        
        if (isMounted.current) {
          setPosts(data || []);
          // Salvar no cache
          await CacheManager.saveHomePosts(data || []);
        }
      }
    } catch (error) {
      if (error.message === 'Timeout') {
        console.warn('Timeout ao buscar posts - conexão lenta');
      } else if (error.name === 'AbortError') {
        console.log('Busca de posts cancelada');
        return; // Não altera estado se foi abortado
      } else {
        console.error('Erro ao buscar posts (catch):', error);
      }
      
      // Em caso de erro/timeout, manter o que tem ou tentar cache
      if (isMounted.current && posts.length === 0) {
          const cached = await CacheManager.loadHomePosts();
          if (cached && cached.length > 0) {
            setPosts(cached);
          }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, []); // Removido posts.length das dependências para evitar loops

  // Buscar posts ao iniciar e quando refreshKey mudar
  useEffect(() => {
    fetchPosts();
  }, [refreshKey, fetchPosts]);

  async function createPost({ content, author, image_url, description, author_avatar }) {
    const { data, error } = await supabase.from('posts').insert([
      { content, author, image_url, description, author_avatar }
    ]);
    if (error) {
      console.log(error);
      return false;
    }
    if (data && data[0]) {
      setPosts(prev => [data[0], ...prev]);
    }
    return true;
  }

  return { posts, loading, fetchPosts, createPost, refresh: fetchPosts };
}