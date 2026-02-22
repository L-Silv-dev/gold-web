import { supabase } from './supabase';
import StorageHelper from './storageHelper';

/**
 * Utilitário para recuperação de problemas de autenticação
 */
export const AuthRecovery = {
  /**
   * Limpa completamente todos os dados de autenticação armazenados
   */
  clearAllAuthData: async () => {
    try {
      console.log('🔧 Iniciando limpeza completa de dados de autenticação...');
      
      // Lista de possíveis chaves de autenticação do Supabase
      const authKeys = [
        'sb-hodzsckzancczwirtwcx-auth-token',
        'supabase.auth.token',
        'sb-auth-token',
        'auth-token',
        // Adicionar outras chaves que possam existir
        'sb-hodzsckzancczwirtwcx-auth-token-code-verifier',
        'sb-hodzsckzancczwirtwcx-auth-token-refresh-token',
      ];
      
      let clearedCount = 0;
      
      for (const key of authKeys) {
        try {
          const existingValue = await StorageHelper.getItem(key);
          if (existingValue) {
            await StorageHelper.removeItem(key);
            clearedCount++;
            console.log(`✅ Removida chave: ${key}`);
          }
        } catch (error) {
          console.log(`ℹ️ Chave ${key} não encontrada ou já removida`);
        }
      }
      
      console.log(`🎉 Limpeza concluída! ${clearedCount} chaves removidas.`);
      return { success: true, clearedCount };
    } catch (error) {
      console.error('❌ Erro durante limpeza:', error);
      return { success: false, error };
    }
  },

  /**
   * Força logout e limpa dados
   */
  forceLogout: async () => {
    try {
      console.log('🔧 Forçando logout...');
      
      // Primeiro limpar armazenamento
      await AuthRecovery.clearAllAuthData();
      
      // Tentar logout no Supabase (pode falhar se token inválido)
      try {
        await supabase.auth.signOut();
        console.log('✅ Logout no Supabase realizado');
      } catch (logoutError) {
        console.log('ℹ️ Logout no Supabase falhou (esperado se token inválido):', logoutError.message);
      }
      
      console.log('🎉 Logout forçado concluído!');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro durante logout forçado:', error);
      return { success: false, error };
    }
  },

  /**
   * Verifica o estado atual da autenticação
   */
  checkAuthState: async () => {
    try {
      console.log('🔍 Verificando estado da autenticação...');
      
      // Verificar tokens no armazenamento
      const storedToken = await StorageHelper.getItem('sb-hodzsckzancczwirtwcx-auth-token');
      console.log('Token armazenado:', storedToken ? 'Existe' : 'Não existe');
      
      // Verificar sessão no Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('❌ Erro na sessão:', error.message);
        return { 
          hasStoredToken: !!storedToken,
          hasValidSession: false,
          error: error.message,
          needsCleanup: true
        };
      }
      
      console.log('Sessão válida:', session ? 'Sim' : 'Não');
      
      return {
        hasStoredToken: !!storedToken,
        hasValidSession: !!session,
        user: session?.user || null,
        needsCleanup: false
      };
    } catch (error) {
      console.error('❌ Erro ao verificar estado:', error);
      return {
        hasStoredToken: false,
        hasValidSession: false,
        error: error.message,
        needsCleanup: true
      };
    }
  }
};

export default AuthRecovery;