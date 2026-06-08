window.SATE = window.SATE || {};

async function buildDadosFormulario() {
  const usuario = await window.SATE.AuthService.getCurrentUserProfile();
  if (!usuario.autorizado) return { erro: usuario.erro };

  const [configuracoes, unidadeTurmas, eventos, veiculos] = await Promise.all([
    window.SATE.Repository.getConfiguracoesMap(),
    window.SATE.Repository.getUnidadesTurmas(),
    window.SATE.Repository.getEventosAgendas(),
    window.SATE.Repository.getVeiculos()
  ]);

  const totalFrotaAtiva = veiculos.filter(v => String(v.disponibilidade).toLowerCase().includes('dispon')).length;
  window.SATE.state.usuario = usuario;
  window.SATE.state.configuracoes = configuracoes;

  return {
    ...usuario,
    configuracoes,
    turmasPorUnidade: unidadeTurmas.turmasPorUnidade,
    enderecosPorUnidade: unidadeTurmas.enderecosPorUnidade,
    todasUnidades: unidadeTurmas.todasUnidades,
    listaEventos: eventos.listaEventos,
    locaisEventos: eventos.locaisEventos,
    calendarioEventos: eventos.calendarioEventos,
    totalFrotaAtiva,
    catalogoFilmes: eventos.catalogoFilmes.length ? eventos.catalogoFilmes : [{ filme: 'Opção Padrão CAUIM' }],
    midiaEventos: eventos.midiaEventos
  };
}

const handlers = {
  async getDadosParaFormulario() {
    return buildDadosFormulario();
  },

  async getPedidosParaCards() {
    const usuario = window.SATE.state.usuario || await window.SATE.AuthService.getCurrentUserProfile();
    if (!usuario.autorizado) return { erro: usuario.erro };
    const dados = await window.SATE.Repository.getPedidos(usuario);
    return { erro: null, usuario, dados };
  },

  async getMotoristas() { return { erro: null, dados: await window.SATE.Repository.getMotoristas() }; },
  async getVeiculosCadastrados() { return { erro: null, dados: await window.SATE.Repository.getVeiculos() }; },
  async getUsuariosAdmin() { return { erro: null, dados: await window.SATE.Repository.getUsuarios() }; },
  async getMidiasAdmin() { return { erro: null, dados: await window.SATE.Repository.getMidiasAdmin() }; },
  async getConfigAdmin() { return { erro: null, dados: await window.SATE.Repository.getConfigAdmin() }; },

  async salvarUsuarioAdmin(d) { await window.SATE.Repository.upsertUsuario(d); return { sucesso: true }; },
  async salvarMotorista(d) { await window.SATE.Repository.upsertMotorista(d); return { sucesso: true }; },
  async salvarNovoVeiculo(d) { await window.SATE.Repository.upsertVeiculo(d); return { sucesso: true }; },
  async salvarMidiaAdmin(d) { await window.SATE.Repository.upsertMidia(d); return { sucesso: true }; },
  async salvarConfigAdmin(d) { await window.SATE.Repository.upsertConfig(d); return { sucesso: true }; },

  async excluirUsuarioAdmin(id) { await window.SATE.BaseRepository.remove('usuarios', id); return { sucesso: true }; },
  async excluirMotoristaAdmin(id) { await window.SATE.BaseRepository.remove('motoristas', id); return { sucesso: true }; },
  async excluirVeiculoAdmin(id) { await window.SATE.BaseRepository.remove('veiculos', id); return { sucesso: true }; },
  async excluirMidiaAdmin(id) { await window.SATE.BaseRepository.remove('eventos_midia', id); return { sucesso: true }; },
  async excluirConfigAdmin(id) { await window.SATE.BaseRepository.remove('configuracoes', id); return { sucesso: true }; },

  async salvarNovoPedido(dados) {
    const usuario = window.SATE.state.usuario || await window.SATE.AuthService.getCurrentUserProfile();
    await window.SATE.Repository.salvarNovoPedido(dados, usuario);
    return { sucesso: true };
  },

  async editarPedidoCompleto(dados) {
    const usuario = window.SATE.state.usuario || await window.SATE.AuthService.getCurrentUserProfile();
    if (dados.idLinhasAntigas?.length) {
      await window.SATE.Repository.cancelarPedido(dados.idLinhasAntigas, 'Substituído por edição completa.', usuario);
    }
    await window.SATE.Repository.salvarNovoPedido(dados, usuario);
    return { sucesso: true };
  },

  async atualizarStatusPedido(payload) {
    const usuario = window.SATE.state.usuario || await window.SATE.AuthService.getCurrentUserProfile();
    await window.SATE.Repository.atualizarStatusPedido(payload, usuario);
    return { sucesso: true };
  },

  async cancelarPedidoEscola(ids, justificativa) {
    const usuario = window.SATE.state.usuario || await window.SATE.AuthService.getCurrentUserProfile();
    await window.SATE.Repository.cancelarPedido(ids, justificativa, usuario);
    return { sucesso: true };
  },

  async getEstruturasDinamicas() {
    const { eventos, agendas, programacoes } = await window.SATE.Repository.getEventosAgendas();
    const agendaGroups = eventos.filter(e => e.categoria === 'agenda').map(ev => ({
      nomeAba: `Agenda_${ev.nome.replace(/\s+/g, '_')}`,
      nomeExibicao: ev.nome,
      cabecalho: ['Nome Evento', 'Data', 'Período', 'Atividade (Filme)', 'Informações (Sinopse)', 'Local', 'Faixa Etária / Público', 'Lotação', 'Lanche', 'Horário do ônibus', 'Horário Evento'],
      dados: agendas.filter(a => a.evento_id === ev.id).map(a => ({
        idLinha: a.id,
        'Nome Evento': ev.nome,
        'Data': a.data,
        'Período': a.periodo,
        'Atividade (Filme)': a.atividade,
        'Informações (Sinopse)': a.informacoes,
        'Local': a.local,
        'Faixa Etária / Público': a.faixa_etaria,
        'Lotação': a.lotacao,
        'Lanche': a.lanche,
        'Horário do ônibus': a.horario_onibus,
        'Horário Evento': a.horario_evento
      }))
    }));
    const progGroups = eventos.filter(e => e.categoria === 'programacao').map(ev => ({
      nomeAba: `Programacao_${ev.nome.replace(/\s+/g, '_')}`,
      nomeExibicao: ev.nome,
      cabecalho: ['Filme', 'Público Alvo', 'Sinopse', 'Classificação'],
      dados: programacoes.filter(p => p.evento_id === ev.id).map(p => ({ idLinha: p.id, Filme: p.filme, 'Público Alvo': p.publico_alvo, Sinopse: p.sinopse, Classificação: p.classificacao }))
    }));
    return { sucesso: true, agendas: agendaGroups, programacoes: progGroups };
  },

  async salvarLinhaEstrutura() { return { sucesso: false, erro: 'Cadastro dinâmico será finalizado na etapa de importação/normalização.' }; },
  async excluirLinhaEstrutura() { return { sucesso: false, erro: 'Cadastro dinâmico será finalizado na etapa de importação/normalização.' }; },
  async criarNovaEstruturaAba() { return { sucesso: false, erro: 'Criação de estrutura dinâmica será finalizada na próxima etapa.' }; },
  async excluirAbaEstruturaAdmin() { return { sucesso: false, erro: 'Exclusão de estrutura dinâmica será finalizada na próxima etapa.' }; },

  async obterDadosLogistica() {
    return { sucesso: false, erro: 'Integração de logística/mapas ainda não configurada no Supabase.' };
  }
};

function createRunner() {
  let successHandler = null;
  let failureHandler = null;
  const runner = new Proxy({}, {
    get(_, prop) {
      if (prop === 'withSuccessHandler') return cb => { successHandler = cb; return runner; };
      if (prop === 'withFailureHandler') return cb => { failureHandler = cb; return runner; };
      if (prop === 'withUserObject') return () => runner;
      return async (...args) => {
        try {
          if (!handlers[prop]) throw new Error(`Ação não mapeada para Supabase: ${String(prop)}`);
          const result = await handlers[prop](...args);
          if (successHandler) successHandler(result);
          return result;
        } catch (err) {
          console.error('[SATE Supabase Bridge]', prop, err);
          if (failureHandler) failureHandler(err);
          else if (successHandler) successHandler({ erro: err.message, sucesso: false });
          return { erro: err.message, sucesso: false };
        }
      };
    }
  });
  return runner;
}

window.google = window.google || {};
window.google.script = window.google.script || {};
window.google.script.run = createRunner();
console.log('[SATE] Ponte google.script.run → Supabase ativa.');
