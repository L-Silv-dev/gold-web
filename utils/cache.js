import { StorageHelper } from './storageHelper';

// Chaves para diferentes tipos de dados
const CACHE_KEYS = {
  // Posts e publicações
  HOME_POSTS: 'homePosts',
  PROFILE_POSTS: 'profilePosts',
  
  // Agenda e notas
  NOTES: 'notes',
  ALARMS: 'alarms',
  COMMITMENTS: 'commitments',
  
  // Gráficos e estatísticas
  SCHOOL_GRAPHS: 'schoolNoteGraphs',
  SCHOOL_CHARTS: 'schoolCharts',
  SUBJECT_ACCESS: 'userSubjectAccess',
  SUBJECT_TIME: 'userSubjectTime',
  STUDY_MINUTES: 'userStudyMinutes',
  
  // Perfil do usuário
  USER_PROFILE: 'userProfile',
  USER_IMAGE: 'userProfileImage',
  RECENT_CONVERSATIONS: 'recentConversations',
  MESSAGES_PREFIX: 'messages_',
  
  // Configurações
  THEME: 'selectedTheme',
  ADMIN_STATUS: 'isAdmin',
  
  // Registro
  IS_REGISTERED: 'isRegistered',
  USER_CREDENTIALS: 'userCredentials'
};

/**
 * Sistema de cache local para o app
 */
class CacheManager {
  
  /**
   * Recupera um item do cache de forma segura, tratando erros de decriptografia
   */
  static async safeGetItem(key) {
    // A lógica de tratamento de erro e limpeza de chaves corrompidas 
    // foi movida para o StorageHelper para beneficiar todas as chamadas
    return await StorageHelper.getItem(key);
  }

  // ===== POSTS E PUBLICAÇÕES =====
  
  /**
   * Salva posts da tela inicial
   */
  static async saveHomePosts(posts) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.HOME_POSTS, JSON.stringify(posts));
      // console.log('Posts da tela inicial salvos no cache');
    } catch (error) {
      console.log('Erro ao salvar posts da tela inicial:', error);
    }
  }
  
  /**
   * Carrega posts da tela inicial
   */
  static async loadHomePosts() {
    try {
      const posts = await this.safeGetItem(CACHE_KEYS.HOME_POSTS);
      return posts ? JSON.parse(posts) : [];
    } catch (error) {
      console.log('Erro ao carregar posts da tela inicial:', error);
      return [];
    }
  }
  
  /**
   * Salva posts do perfil
   */
  static async saveProfilePosts(posts) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.PROFILE_POSTS, JSON.stringify(posts));
      // console.log('Posts do perfil salvos no cache');
    } catch (error) {
      console.log('Erro ao salvar posts do perfil:', error);
    }
  }
  
  /**
   * Carrega posts do perfil
   */
  static async loadProfilePosts() {
    try {
      const posts = await StorageHelper.getItem(CACHE_KEYS.PROFILE_POSTS);
      return posts ? JSON.parse(posts) : [];
    } catch (error) {
      console.log('Erro ao carregar posts do perfil:', error);
      return [];
    }
  }
  
  // ===== AGENDA E NOTAS =====
  
  /**
   * Salva notas
   */
  static async saveNotes(notes) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.NOTES, JSON.stringify(notes));
      // console.log('Notas salvas no cache');
    } catch (error) {
      console.log('Erro ao salvar notas:', error);
    }
  }
  
  /**
   * Carrega notas
   */
  static async loadNotes() {
    try {
      const notes = await this.safeGetItem(CACHE_KEYS.NOTES);
      return notes ? JSON.parse(notes) : [];
    } catch (error) {
      console.log('Erro ao carregar notas:', error);
      return [];
    }
  }
  
  /**
   * Salva alarmes
   */
  static async saveAlarms(alarms) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.ALARMS, JSON.stringify(alarms));
      // console.log('Alarmes salvos no cache');
    } catch (error) {
      console.log('Erro ao salvar alarmes:', error);
    }
  }

  /**
   * Carrega alarmes
   */
  static async loadAlarms() {
    try {
      const alarms = await this.safeGetItem(CACHE_KEYS.ALARMS);
      return alarms ? JSON.parse(alarms) : [];
    } catch (error) {
      console.log('Erro ao carregar alarmes:', error);
      return [];
    }
  }

  /**
   * Salva compromissos
   */
  static async saveCommitments(commitments) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.COMMITMENTS, JSON.stringify(commitments));
      // console.log('Compromissos salvos no cache');
    } catch (error) {
      console.log('Erro ao salvar compromissos:', error);
    }
  }

  /**
   * Carrega compromissos
   */
  static async loadCommitments() {
    try {
      const commitments = await StorageHelper.getItem(CACHE_KEYS.COMMITMENTS);
      return commitments ? JSON.parse(commitments) : [];
    } catch (error) {
      console.log('Erro ao carregar compromissos:', error);
      return [];
    }
  }
  
  // ===== GRÁFICOS E ESTATÍSTICAS =====
  
  /**
   * Salva gráficos de escolas
   */
  static async saveSchoolGraphs(graphs) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.SCHOOL_GRAPHS, JSON.stringify(graphs));
      // console.log('Gráficos de escolas salvos no cache');
    } catch (error) {
      console.log('Erro ao salvar gráficos de escolas:', error);
    }
  }
  
  /**
   * Carrega gráficos de escolas
   */
  static async loadSchoolGraphs() {
    try {
      const graphs = await StorageHelper.getItem(CACHE_KEYS.SCHOOL_GRAPHS);
      return graphs ? JSON.parse(graphs) : {};
    } catch (error) {
      console.log('Erro ao carregar gráficos de escolas:', error);
      return {};
    }
  }

  /**
   * Salva gráficos de escolas (charts)
   */
  static async saveSchoolCharts(charts) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.SCHOOL_CHARTS, JSON.stringify(charts));
      // console.log('Gráficos de escolas (charts) salvos no cache');
    } catch (error) {
      console.log('Erro ao salvar gráficos de escolas (charts):', error);
    }
  }

  /**
   * Carrega gráficos de escolas (charts)
   */
  static async loadSchoolCharts() {
    try {
      const charts = await StorageHelper.getItem(CACHE_KEYS.SCHOOL_CHARTS);
      return charts ? JSON.parse(charts) : [];
    } catch (error) {
      console.log('Erro ao carregar gráficos de escolas (charts):', error);
      return [];
    }
  }
  
  /**
   * Salva acesso às matérias
   */
  static async saveSubjectAccess(access) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.SUBJECT_ACCESS, JSON.stringify(access));
      // console.log('Acesso às matérias salvo no cache');
    } catch (error) {
      console.log('Erro ao salvar acesso às matérias:', error);
    }
  }
  
  /**
   * Carrega acesso às matérias
   */
  static async loadSubjectAccess() {
    try {
      const access = await StorageHelper.getItem(CACHE_KEYS.SUBJECT_ACCESS);
      return access ? JSON.parse(access) : {};
    } catch (error) {
      console.log('Erro ao carregar acesso às matérias:', error);
      return {};
    }
  }

  /**
   * Salva tempo por matéria
   */
  static async saveSubjectTime(subjectTime) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.SUBJECT_TIME, JSON.stringify(subjectTime));
      // console.log('Tempo por matéria salvo no cache');
    } catch (error) {
      console.log('Erro ao salvar tempo por matéria:', error);
    }
  }

  /**
   * Carrega tempo por matéria
   */
  static async loadSubjectTime() {
    try {
      const subjectTime = await StorageHelper.getItem(CACHE_KEYS.SUBJECT_TIME);
      return subjectTime ? JSON.parse(subjectTime) : {};
    } catch (error) {
      console.log('Erro ao carregar tempo por matéria:', error);
      return {};
    }
  }
  
  /**
   * Salva minutos de estudo
   */
  static async saveStudyMinutes(minutes) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.STUDY_MINUTES, String(minutes));
      // console.log('Minutos de estudo salvos no cache');
    } catch (error) {
      console.log('Erro ao salvar minutos de estudo:', error);
    }
  }
  
  /**
   * Carrega minutos de estudo
   */
  static async loadStudyMinutes() {
    try {
      const minutes = await StorageHelper.getItem(CACHE_KEYS.STUDY_MINUTES);
      return minutes ? Number(minutes) : 0;
    } catch (error) {
      console.log('Erro ao carregar minutos de estudo:', error);
      return 0;
    }
  }
  
  // ===== PERFIL DO USUÁRIO =====
  
  /**
   * Salva dados do perfil
   */
  static async saveUserProfile(profile) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.USER_PROFILE, JSON.stringify(profile));
      // console.log('Perfil do usuário salvo no cache');
    } catch (error) {
      console.log('Erro ao salvar perfil do usuário:', error);
    }
  }
  
  /**
   * Carrega dados do perfil
   */
  static async loadUserProfile() {
    try {
      const profile = await this.safeGetItem(CACHE_KEYS.USER_PROFILE);
      return profile ? JSON.parse(profile) : null;
    } catch (error) {
      console.log('Erro ao carregar perfil do usuário:', error);
      return null;
    }
  }
  
  /**
   * Salva imagem do perfil
   */
  static async saveUserImage(imageUri) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.USER_IMAGE, imageUri);
      // console.log('Imagem do perfil salva no cache');
    } catch (error) {
      console.log('Erro ao salvar imagem do perfil:', error);
    }
  }
  
  /**
   * Carrega imagem do perfil
   */
  static async loadUserImage() {
    try {
      const imageUri = await this.safeGetItem(CACHE_KEYS.USER_IMAGE);
      return imageUri;
    } catch (error) {
      console.log('Erro ao carregar imagem do perfil:', error);
      return null;
    }
  }
  
  /**
   * Salva conversas recentes
   */
  static async saveRecentConversations(conversations) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.RECENT_CONVERSATIONS, JSON.stringify(conversations));
    } catch (error) {
      console.log('Erro ao salvar conversas recentes:', error);
    }
  }
  
  /**
   * Carrega conversas recentes
   */
  static async loadRecentConversations() {
    try {
      const conversations = await StorageHelper.getItem(CACHE_KEYS.RECENT_CONVERSATIONS);
      return conversations ? JSON.parse(conversations) : [];
    } catch (error) {
      console.log('Erro ao carregar conversas recentes:', error);
      return [];
    }
  }

  /**
   * Salva mensagens de uma conversa
   */
  static async saveMessages(conversationId, messages) {
    try {
      await StorageHelper.setItem(`${CACHE_KEYS.MESSAGES_PREFIX}${conversationId}`, JSON.stringify(messages));
    } catch (error) {
      console.log(`Erro ao salvar mensagens da conversa ${conversationId}:`, error);
    }
  }

  /**
   * Remove uma mensagem específica do cache de uma conversa
   */
  static async removeMessage(conversationId, messageId) {
    try {
      const messages = await this.loadMessages(conversationId);
      if (messages && messages.length > 0) {
        const updatedMessages = messages.filter(msg => msg.id !== messageId);
        if (updatedMessages.length !== messages.length) {
          await this.saveMessages(conversationId, updatedMessages);
          // console.log(`Mensagem ${messageId} removida do cache da conversa ${conversationId}`);
        }
      }
    } catch (error) {
      console.log(`Erro ao remover mensagem ${messageId} do cache da conversa ${conversationId}:`, error);
    }
  }

  /**
   * Carrega mensagens de uma conversa
   */
  static async loadMessages(conversationId) {
    try {
      const messages = await StorageHelper.getItem(`${CACHE_KEYS.MESSAGES_PREFIX}${conversationId}`);
      return messages ? JSON.parse(messages) : [];
    } catch (error) {
      console.log(`Erro ao carregar mensagens da conversa ${conversationId}:`, error);
      return [];
    }
  }
  
  // ===== CONFIGURAÇÕES =====
  
  /**
   * Salva tema selecionado
   */
  static async saveTheme(theme) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.THEME, theme);
      // console.log('Tema salvo no cache');
    } catch (error) {
      console.log('Erro ao salvar tema:', error);
    }
  }
  
  /**
   * Carrega tema selecionado
   */
  static async loadTheme() {
    try {
      const theme = await this.safeGetItem(CACHE_KEYS.THEME);
      return theme || 'claro';
    } catch (error) {
      console.log('Erro ao carregar tema:', error);
      return 'claro';
    }
  }
  
  /**
   * Salva status de admin
   */
  static async saveAdminStatus(isAdmin) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.ADMIN_STATUS, String(isAdmin));
      // console.log('Status de admin salvo no cache');
    } catch (error) {
      console.log('Erro ao salvar status de admin:', error);
    }
  }
  
  /**
   * Carrega status de admin
   */
  static async loadAdminStatus() {
    try {
      const status = await StorageHelper.getItem(CACHE_KEYS.ADMIN_STATUS);
      return status === 'true';
    } catch (error) {
      console.log('Erro ao carregar status de admin:', error);
      return false;
    }
  }
  
  // ===== REGISTRO =====
  
  /**
   * Salva status de registro
   */
  static async saveRegistrationStatus(isRegistered) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.IS_REGISTERED, String(isRegistered));
      // console.log('Status de registro salvo no cache');
    } catch (error) {
      console.log('Erro ao salvar status de registro:', error);
    }
  }
  
  /**
   * Carrega status de registro
   */
  static async loadRegistrationStatus() {
    try {
      const status = await StorageHelper.getItem(CACHE_KEYS.IS_REGISTERED);
      return status === 'true';
    } catch (error) {
      console.log('Erro ao carregar status de registro:', error);
      return false;
    }
  }
  
  /**
   * Salva credenciais do usuário
   */
  static async saveUserCredentials(credentials) {
    try {
      await StorageHelper.setItem(CACHE_KEYS.USER_CREDENTIALS, JSON.stringify(credentials));
      // console.log('Credenciais do usuário salvas no cache');
    } catch (error) {
      console.log('Erro ao salvar credenciais do usuário:', error);
    }
  }
  
  /**
   * Carrega credenciais do usuário
   */
  static async loadUserCredentials() {
    try {
      const credentials = await this.safeGetItem(CACHE_KEYS.USER_CREDENTIALS);
      return credentials ? JSON.parse(credentials) : null;
    } catch (error) {
      console.log('Erro ao carregar credenciais do usuário:', error);
      return null;
    }
  }
  
  // ===== UTILIDADES =====
  
  /**
   * Limpa todo o cache
   */
  static async clearAllCache() {
    try {
      const keys = Object.values(CACHE_KEYS);
      for (const key of keys) {
        await StorageHelper.deleteItem(key);
      }
      // console.log('Cache limpo com sucesso');
    } catch (error) {
      console.log('Erro ao limpar cache:', error);
    }
  }
  
  /**
   * Obtém informações do cache
   */
  static async getCacheInfo() {
    try {
      const info = {};
      const keys = Object.entries(CACHE_KEYS);
      
      for (const [name, key] of keys) {
        const value = await StorageHelper.getItem(key);
        info[name] = value ? 'Presente' : 'Ausente';
      }
      
      return info;
    } catch (error) {
      console.log('Erro ao obter informações do cache:', error);
      return {};
    }
  }
}

export default CacheManager; 
