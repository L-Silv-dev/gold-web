import { createClient } from '@supabase/supabase-js';
import StorageHelper from './storageHelper';
import logger from './logger';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://hnknkdkshevvvweethyb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhua25rZGtzaGV2dnZ3ZWV0aHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NzQwNDIsImV4cCI6MjA4NTU1MDA0Mn0.ledw70F62Ea3m7gJRh1byazKik2cCBsBaZNK7socTm8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: StorageHelper,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Configurações adicionais para melhor tratamento de erros
    flowType: 'pkce',
    debug: false, // Debug desabilitado para reduzir logs
  },
  // Configurações globais para melhor tratamento de erros
  global: {
    headers: {
      'X-Client-Info': 'react-native-app',
    },
  },
});

// Interceptar erros de autenticação globalmente
supabase.auth.onAuthStateChange((event, session) => {
  logger.info(`Auth Event: ${event}`);
});
