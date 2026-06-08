# Diretriz visual e padrão de migração SATE

## Regra principal

A migração do SATE para GitHub + Supabase não deve redesenhar as telas.
O layout atual deve ser preservado como base visual oficial.

Isso significa:

- Manter os mesmos tokens visuais do sistema atual: `--primary`, `--neon-blue`, `--fundo`, `--card-bg`, `--borda`, `--texto`, `--azul-claro` etc.
- Manter os mesmos componentes: `nav-header`, `main-wrap`, `card-kpi`, `card`, `grid-cards`, `filtros-avancados`, `table-container`, `btn-submit`, `btn-subtab`, `modal-overlay`, `admin-sidebar` e demais classes já usadas.
- Manter o menu lateral como overlay, sem empurrar o conteúdo.
- Manter a tela de Disponibilidade de Frota com visualização por Manhã e Tarde dentro dos dias.
- Não trocar o padrão visual por template genérico, dashboard novo, cards novos ou biblioteca diferente.

## Padrão inspirado na migração do GOM

A estrutura segue o princípio usado no GOM:

1. A tela final de deploy deve ser estável para GitHub Pages.
2. O `index.html` de produção não depende de includes dinâmicos frágeis para montar as telas principais.
3. Os arquivos continuam separados em `src/views`, `css`, `src/core`, `src/repositories`, `src/services` e `src/compat` para manutenção.
4. A camada de dados pode mudar para Supabase sem mexer no visual das telas.
5. A ponte temporária `google.script.run → Supabase` existe apenas para acelerar a transição e reaproveitar as funções visuais atuais.

## Arquivos importantes

- `index.html`: arquivo final para deploy no GitHub Pages, com as telas embutidas.
- `index.modular.html`: versão de desenvolvimento com includes estáticos por `data-include`.
- `css/styles.css`: estilo visual oficial preservado do SATE atual.
- `src/views/*.html`: telas separadas para manutenção.
- `src/legacy/sate-legacy.js`: regras atuais da interface reaproveitadas durante a migração.
- `src/compat/googleScriptRun.js`: ponte temporária entre funções antigas e Supabase.
- `supabase/*.sql`: estrutura inicial do banco.

## Como atualizar o index de deploy após editar telas

Depois de alterar algum arquivo em `src/views`, execute:

```bash
npm run build:index
```

Isso recria o `index.html` final sem perder a modularidade dos arquivos fonte.
