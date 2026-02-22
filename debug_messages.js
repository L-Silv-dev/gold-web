
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hodzsckzancczwirtwcx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZHpzY2t6YW5jY3p3aXJ0d2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzgxNTQsImV4cCI6MjA2OTExNDE1NH0.OiDg_Fp37Us6Nu_gIo3W3X_eQGY65P7nc1v9IEx_GX4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMessages() {
  console.log('Testando filtro por coluna read...');
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('read', false)
    .limit(1);

  if (error) {
    console.error('Erro ao filtrar por read:', error);
    // Tentar read_at
    console.log('Tentando read_at...');
    const { data: data2, error: error2 } = await supabase
        .from('messages')
        .select('*')
        .is('read_at', null)
        .limit(1);
        
    if (error2) {
        console.error('Erro ao filtrar por read_at:', error2);
    } else {
        console.log('Coluna read_at parece existir.');
    }
  } else {
    console.log('Coluna read existe e filtro funcionou.');
  }
}

checkMessages();
