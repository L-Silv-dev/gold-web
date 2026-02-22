import { useState, useEffect, useCallback } from 'react';
import { countCommentsByPostId } from '../services/commentService';

const useVideoFullScreen = (videos = []) => {
  const [videosState, setVideosState] = useState(videos);
  const [commentsCount, setCommentsCount] = useState({});
  const [likingPosts, setLikingPosts] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  // Atualizar vídeos quando a prop mudar
  useEffect(() => {
    setVideosState(videos);
    loadCommentsCount(videos);
  }, [videos]);

  // Carregar contagem de comentários
  const loadCommentsCount = useCallback(async (videoList) => {
    const counts = {};
    for (const video of videoList) {
      try {
        const { data: count } = await countCommentsByPostId(video.id);
        counts[video.id] = count || 0;
      } catch (error) {
        console.error('Erro ao carregar comentários:', error);
        counts[video.id] = 0;
      }
    }
    setCommentsCount(counts);
  }, []);

  // Atualizar estado de um vídeo específico
  const updateVideoState = useCallback((videoId, updates) => {
    setVideosState(prevVideos => 
      prevVideos.map(video => 
        video.id === videoId 
          ? { ...video, ...updates }
          : video
      )
    );
  }, []);

  // Remover vídeo da lista
  const removeVideo = useCallback((videoId) => {
    setVideosState(prevVideos => 
      prevVideos.filter(video => video.id !== videoId)
    );
  }, []);

  // Gerenciar estado de curtida
  const setLiking = useCallback((postId, isLiking) => {
    setLikingPosts(prev => {
      const newSet = new Set(prev);
      if (isLiking) {
        newSet.add(postId);
      } else {
        newSet.delete(postId);
      }
      return newSet;
    });
  }, []);

  return {
    videosState,
    commentsCount,
    likingPosts,
    currentIndex,
    setCurrentIndex,
    updateVideoState,
    removeVideo,
    setLiking,
    loadCommentsCount
  };
};

export default useVideoFullScreen;