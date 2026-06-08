import { loadIncludes } from './core/include.js';

async function bootstrap() {
  try {
    await loadIncludes();
    await import('./config/env.local.js').catch(() => {
      console.warn('[SATE] Arquivo src/config/env.local.js não encontrado. Copie env.example.js e preencha URL/anon key do Supabase.');
      window.SATE_ENV = window.SATE_ENV || {};
    });
    await import('./core/supabaseClient.js');
    await import('./core/state.js');
    await import('./services/authService.js');
    await import('./repositories/baseRepository.js');
    await import('./repositories/sateRepository.js');
    await import('./compat/googleScriptRun.js');

    const legacyScript = document.createElement('script');
    legacyScript.src = './src/legacy/sate-legacy.js';
    legacyScript.defer = true;
    legacyScript.onerror = () => console.error('[SATE] Não foi possível carregar o script legado.');
    document.body.appendChild(legacyScript);
  } catch (err) {
    console.error(err);
    const info = document.getElementById('user-info');
    if (info) info.innerText = 'Erro ao iniciar';
    const container = document.getElementById('toast-container');
    if (container) {
      container.innerHTML = `<div class="toast error show">Erro ao iniciar o SATE: ${err.message}</div>`;
    }
  }
}

bootstrap();
