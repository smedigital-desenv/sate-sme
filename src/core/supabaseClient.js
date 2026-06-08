const env = window.SATE_ENV || {};

window.SATE = window.SATE || {};

if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || env.SUPABASE_URL.includes('SEU-PROJETO')) {
  console.warn('[SATE] Supabase ainda não configurado. Preencha src/config/env.local.js.');
}

window.SATE.supabase = window.supabase?.createClient(
  env.SUPABASE_URL || 'https://example.supabase.co',
  env.SUPABASE_ANON_KEY || 'missing-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

window.SATE.env = env;
console.log('[SATE] Cliente Supabase inicializado.');
