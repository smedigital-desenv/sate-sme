# SATE — GitHub + Supabase v2

Esta versão segue a mesma lógica adotada na migração do GOM: preservar o visual atual e trocar a camada de dados com segurança.

O `index.html` principal já é o arquivo de deploy, com as telas embutidas para evitar includes frágeis no GitHub Pages. Para manutenção, as telas continuam separadas em `src/views`.

Diretriz obrigatória: **não redesenhar as telas durante a migração**. O CSS em `css/styles.css` foi preservado do layout atual do SATE, incluindo menu lateral sobreposto e calendário de frota com Manhã/Tarde.

Para editar telas, altere os arquivos em `src/views` e depois rode:

```bash
npm run build:index
```

---

# SATE - Migração GitHub + Supabase

Este pacote transforma a base atual do SATE em uma estrutura pronta para GitHub/GitHub Pages e prepara o Supabase como banco principal.

## O que já foi organizado

- `index.html` estático, sem dependência de Apps Script.
- CSS separado em `css/styles.css`.
- Telas separadas em `src/views/`.
- Script atual preservado em `src/legacy/sate-legacy.js` para manter a tela funcionando durante a migração.
- Camada de compatibilidade `google.script.run → Supabase` em `src/compat/googleScriptRun.js`.
- Cliente Supabase em `src/core/supabaseClient.js`.
- Repositórios em `src/repositories/`.
- SQL inicial em `supabase/`.
- Arquivos antigos do Apps Script preservados em `legacy/appscript/` apenas como referência.

## Ordem recomendada

1. Criar o projeto no Supabase.
2. Abrir o SQL Editor e executar:
   - `supabase/001_schema.sql`
   - `supabase/003_seed_minimo.sql`
   - durante homologação sem login, opcionalmente `supabase/099_dev_disable_rls_temporario.sql`
3. Copiar `src/config/env.example.js` para `src/config/env.local.js`.
4. Preencher `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
5. Abrir o projeto localmente com um servidor simples ou subir no GitHub Pages.

## Atenção sobre segurança

A `ANON KEY` pode ficar no front-end quando as políticas RLS estiverem corretas. A `SERVICE_ROLE_KEY` nunca deve ser colocada no GitHub nem no navegador.

## Próxima etapa

Depois que o projeto abrir conectado ao Supabase, a próxima etapa é criar o importador/normalizador dos dados atuais do Apps Script para preencher as tabelas definitivas.
