# Estrutura de pastas

- `index.html`: entrada do sistema para GitHub Pages.
- `css/styles.css`: visual principal extraído da versão Apps Script.
- `src/views/`: telas HTML separadas.
- `src/core/`: inicialização, includes e cliente Supabase.
- `src/repositories/`: comunicação com tabelas do Supabase.
- `src/services/`: regras de autenticação/perfil.
- `src/compat/`: ponte temporária para reaproveitar o código atual que chamava `google.script.run`.
- `src/legacy/`: script atual preservado para evitar quebrar o layout durante a migração.
- `supabase/`: scripts SQL do banco.
- `legacy/appscript/`: arquivos originais apenas para consulta.
- `scripts/importacao/`: espaço reservado para o normalizador/importador.
