/**
 * Script de debug para corrigir problemas de autenticação
 * Execute este script quando encontrar erros de "Invalid Refresh Token"
 */

const { Platform } = require('react-native');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

// Simulação do StorageHelper para Node.js
const StorageHelper = {
  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.log(`Erro ao recuperar ${key}:`, error.message);
      return null;
    }
  },
  
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.log(`Erro ao remover ${key}:`, error.message);
      return false;
    }
  }
};

const clearAuthStorage = async () => {
  try {
    console.log('🔧 Limpando armazenamento de autenticação...');
    
    const authKeys = [
      'sb-hodzsckzancczwirtwcx-auth-token',
      'supabase.auth.token',
      'sb-auth-token',
      'auth-token',
      'sb-hodzsckzancczwirtwcx-auth-token-code-verifier',
      'sb-hodzsckzancczwirtwcx-auth-token-refresh-token',
    ];
    
    let clearedCount = 0;
    
    for (const key of authKeys) {
      try {
        const existingValue = await StorageHelper.getItem(key);
        if (existingValue) {
          const success = await StorageHelper.removeItem(key);
          if (success) {
            clearedCount++;
            console.log(`✅ Removida chave: ${key}`);
          }
        }
      } catch (error) {
        console.log(`ℹ️ Chave ${key} não encontrada: ${error.message}`);
      }
    }
    
    console.log(`🎉 Limpeza concluída! ${clearedCount} chaves removidas.`);
    return true;
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
    return false;
  }
};

const fixAuthIssues = async () => {
  console.log('🚀 Iniciando correção de problemas de autenticação...\n');
  
  const success = await clearAuthStorage();
  
  if (success) {
    console.log('\n✅ Correção concluída!');
    console.log('💡 Agora você pode fazer login novamente no app.');
    console.log('📱 Reinicie o app para aplicar as mudanças.');
  } else {
    console.log('\n❌ Houve problemas na correção.');
    console.log('💡 Tente reiniciar o app e fazer login novamente.');
  }
};

// Executar
fixAuthIssues().catch(console.error);