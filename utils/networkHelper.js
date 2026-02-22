import { supabase } from './supabase';
import logger from './logger';

// Classe para gerenciar conectividade e retry de operações
class NetworkHelper {
  constructor() {
    this.isOnline = true;
    this.retryQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 segundos
  }

  // Verificar conectividade com o Supabase
  async checkConnectivity() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        console.warn('Conectividade limitada:', error.message);
        this.isOnline = false;
        return false;
      }

      this.isOnline = true;
      return true;
    } catch (error) {
      console.warn('Sem conectividade:', error.message);
      this.isOnline = false;
      return false;
    }
  }

  // Executar operação com retry automático
  async executeWithRetry(operation, operationName = 'operação', maxRetries = this.maxRetries) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Verificar conectividade antes de tentar
        if (attempt > 1) {
          const isConnected = await this.checkConnectivity();
          if (!isConnected) {
            console.warn(`Tentativa ${attempt}/${maxRetries} para ${operationName}: Sem conectividade`);
            await this.delay(this.retryDelay * attempt);
            continue;
          }
        }

        const result = await operation();
        
        // Se chegou aqui, a operação foi bem-sucedida
        if (attempt > 1) {
          console.log(`${operationName} bem-sucedida na tentativa ${attempt}/${maxRetries}`);
        }
        
        return { success: true, data: result, error: null };
      } catch (error) {
        lastError = error;
        
        // Verificar se é erro de rede
        const isNetworkError = this.isNetworkError(error);
        
        if (isNetworkError && attempt < maxRetries) {
          logger.warn(`Tentativa ${attempt}/${maxRetries} para ${operationName} falhou (erro de rede). Tentando novamente em ${this.retryDelay * attempt}ms...`);
          await this.delay(this.retryDelay * attempt);
          continue;
        }
        
        // Se não é erro de rede ou esgotaram as tentativas
        if (attempt === maxRetries) {
          logger.error(`${operationName} falhou após ${maxRetries} tentativas:`, error);
        }
        
        break;
      }
    }
    
    return { success: false, data: null, error: lastError };
  }

  // Verificar se é erro de rede
  isNetworkError(error) {
    if (!error) return false;
    
    const networkErrorMessages = [
      'Network request failed',
      'fetch failed',
      'Failed to fetch',
      'NetworkError',
      'Connection failed',
      'timeout',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT'
    ];
    
    const errorMessage = error.message || error.toString();
    return networkErrorMessages.some(msg => 
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    );
  }

  // Delay helper
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Adicionar operação à fila de retry
  addToRetryQueue(operation, operationName, callback) {
    this.retryQueue.push({
      operation,
      operationName,
      callback,
      timestamp: Date.now()
    });
  }

  // Processar fila de retry
  async processRetryQueue() {
    if (this.retryQueue.length === 0) return;
    
    console.log(`Processando ${this.retryQueue.length} operações na fila de retry...`);
    
    const queue = [...this.retryQueue];
    this.retryQueue = [];
    
    for (const item of queue) {
      try {
        const result = await this.executeWithRetry(item.operation, item.operationName);
        if (item.callback) {
          item.callback(result);
        }
      } catch (error) {
        console.error(`Erro ao processar item da fila de retry (${item.operationName}):`, error);
      }
    }
  }

  // Iniciar monitoramento de conectividade
  startConnectivityMonitoring(intervalMs = 30000) {
    setInterval(async () => {
      const wasOnline = this.isOnline;
      const isOnline = await this.checkConnectivity();
      
      if (!wasOnline && isOnline) {
        console.log('Conectividade restaurada. Processando fila de retry...');
        await this.processRetryQueue();
      }
    }, intervalMs);
  }
}

// Instância singleton
const networkHelper = new NetworkHelper();

// Wrapper para operações do Supabase com retry automático
export const withRetry = async (operation, operationName = 'operação Supabase') => {
  return await networkHelper.executeWithRetry(operation, operationName);
};

// Verificar conectividade
export const checkConnectivity = async () => {
  return await networkHelper.checkConnectivity();
};

// Iniciar monitoramento (chamar uma vez no app)
export const startNetworkMonitoring = () => {
  networkHelper.startConnectivityMonitoring();
};

export default networkHelper;