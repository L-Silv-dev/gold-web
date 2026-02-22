// Script para aplicar a migração no banco de dados Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações do Supabase
const supabaseUrl = 'https://hodzsckzancczwirtwcx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZHpzY2t6YW5jY3p3aXJ0d2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzgxNTQsImV4cCI6MjA2OTExNDE1NH0.OiDg_Fp37Us6Nu_gIo3W3X_eQGY65P7nc1v9IEx_GX4';

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Caminho para o arquivo de migração
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250907175106_add_author_avatar_to_posts.sql');

// Ler o arquivo de migração
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Executar a migração
async function applyMigration() {
  try {
    console.log('Aplicando migração...');
    
    // Dividir o SQL em comandos individuais
    const commands = migrationSQL.split(';').filter(cmd => cmd.trim().length > 0);
    
    // Executar cada comando
    for (const command of commands) {
      const { error } = await supabase.rpc('exec_sql', { sql: command.trim() + ';' });
      
      if (error) {
        console.error('Erro ao executar comando SQL:', error);
        return;
      }
    }
    
    console.log('Migração aplicada com sucesso!');
  } catch (error) {
    console.error('Erro ao aplicar migração:', error);
  }
}

// Executar a função
applyMigration();