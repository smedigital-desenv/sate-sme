# Modelagem inicial do Supabase

A modelagem separa o que antes estava em planilhas em entidades reais:

- `unidades`
- `usuarios`
- `turmas`
- `eventos`
- `agendas`
- `programacoes`
- `eventos_midia`
- `empresas`
- `motoristas`
- `veiculos`
- `frota_padrao`
- `frota_excecoes`
- `reservas_frota`
- `pedidos`
- `pedido_turmas`
- `pedido_alocacoes`
- `pedido_historico`
- `configuracoes`
- `import_controle`

O objetivo é evitar copiar a estrutura da planilha para o banco. Por isso turmas, alocações e histórico foram normalizados em tabelas próprias.
