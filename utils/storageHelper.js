import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/**
 * Helper unificado para armazenamento de dados.
 * Usa SecureStore no mobile (criptografado) para dados sensíveis
 * e AsyncStorage para dados gerais (cache, configurações).
 */
export const StorageHelper = {
  /**
   * Verifica se a chave deve ser armazenada no SecureStore
   */
  isSecureKey: (key) => {
    const secureKeywords = ['token', 'auth', 'credential', 'password', 'secret', 'key'];
    return secureKeywords.some(keyword => key.toLowerCase().includes(keyword));
  },

  /**
   * Salva um item no armazenamento.
   * @param {string} key - A chave do item.
   * @param {string} value - O valor a ser salvo.
   */
  setItem: async (key, value) => {
    try {
      if (isWeb) {
        await AsyncStorage.setItem(key, value);
      } else {
        if (StorageHelper.isSecureKey(key)) {
          await SecureStore.setItemAsync(key, value);
        } else {
          // Para chaves não seguras, usar AsyncStorage
          await AsyncStorage.setItem(key, value);
          // Tentar limpar do SecureStore caso existisse lá anteriormente (migração)
          try {
            await SecureStore.deleteItemAsync(key);
          } catch (e) {
            // Ignorar erro se não existir
          }
        }
      }
    } catch (error) {
      console.error(`Erro ao salvar item ${key}:`, error);
      throw error;
    }
  },

  /**
   * Recupera um item do armazenamento.
   * @param {string} key - A chave do item.
   * @returns {Promise<string|null>} O valor recuperado ou null.
   */
  getItem: async (key) => {
    try {
      if (isWeb) {
        return await AsyncStorage.getItem(key);
      } else {
        // Se for chave segura, buscar direto no SecureStore
        if (StorageHelper.isSecureKey(key)) {
          return await SecureStore.getItemAsync(key);
        } else {
          // Para chaves comuns, tentar primeiro no AsyncStorage
          let value = await AsyncStorage.getItem(key);
          
          // Se não encontrar, tentar no SecureStore (migração de dados antigos)
          if (value === null) {
            try {
              value = await SecureStore.getItemAsync(key);
              if (value) {
                // Se encontrou no SecureStore, migrar para AsyncStorage
                await AsyncStorage.setItem(key, value);
                await SecureStore.deleteItemAsync(key);
              }
            } catch (e) {
              // Ignorar erros de leitura no SecureStore para dados não críticos
            }
          }
          
          return value;
        }
      }
    } catch (error) {
      // Verificar se é erro de decriptografia conhecido
      const errorString = String(error);
      const isCorruptionError = 
        errorString.includes('decrypt') || 
        errorString.includes('KeyPermanent') || 
        errorString.includes('getValueWithKeyAsync') ||
        errorString.includes('keychain');

      if (isCorruptionError) {
        console.warn(`Aviso: Detectada corrupção de chave ${key} no SecureStore. Tentando limpar...`);
        try {
          if (!isWeb) {
            await SecureStore.deleteItemAsync(key);
            console.log(`Chave ${key} limpa com sucesso.`);
          }
        } catch (cleanupError) {
          console.warn(`Falha ao limpar chave ${key}:`, cleanupError);
        }
        return null;
      }

      // Se não for erro de corrupção, logar como erro normal
      console.error(`Erro ao recuperar item ${key}:`, error);
      return null;
    }
  },

  /**
   * Remove um item do armazenamento.
   * @param {string} key - A chave do item.
   */
  deleteItem: async (key) => {
    try {
      if (isWeb) {
        await AsyncStorage.removeItem(key);
      } else {
        if (StorageHelper.isSecureKey(key)) {
          await SecureStore.deleteItemAsync(key);
        } else {
          // Para chaves não seguras, remover de ambos para garantir
          await AsyncStorage.removeItem(key);
          try {
            await SecureStore.deleteItemAsync(key);
          } catch (e) {
            // Ignorar erro
          }
        }
      }
    } catch (error) {
      console.warn(`Aviso ao remover item ${key}:`, error);
      // Não lançar erro para evitar crash em operações de limpeza
    }
  },

  /**
   * Alias para deleteItem, para compatibilidade com interfaces que esperam removeItem (ex: Supabase).
   * @param {string} key - A chave do item.
   */
  removeItem: async (key) => {
    return StorageHelper.deleteItem(key);
  }
};

export default StorageHelper;
