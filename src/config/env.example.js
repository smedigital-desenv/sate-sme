// Copie este arquivo para env.local.js e preencha com os dados do seu projeto Supabase.
// A ANON KEY pode ficar no front-end quando as regras RLS estiverem corretas.
// Nunca coloque SERVICE_ROLE_KEY no GitHub ou no navegador.
window.SATE_ENV = {
  SUPABASE_URL: 'https://SEU-PROJETO.supabase.co',
  SUPABASE_ANON_KEY: 'SUA_ANON_KEY',

  // Enquanto a autenticação definitiva não estiver ativa, use um e-mail de usuário cadastrado
  // na tabela public.usuarios para carregar perfil e permissões em homologação.
  DEV_USER_EMAIL: 'usuario@educacao.pmrp.sp.gov.br',
  DEV_USER_NAME: 'Administrador VIP'
};
