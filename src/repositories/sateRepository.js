window.SATE = window.SATE || {};

function brDate(iso) {
  if (!iso) return '-';
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}

function isoDate(br) {
  if (!br) return null;
  if (String(br).includes('-')) return br;
  const [d, m, y] = String(br).split('/');
  return y && m && d ? `${y}-${m}-${d}` : br;
}

function timeHHMM(t) {
  if (!t) return '';
  return String(t).slice(0,5);
}

function statusLegacy(status) {
  return status || 'Em Análise';
}

window.SATE.Repository = {
  async getConfiguracoesMap() {
    const rows = await window.SATE.BaseRepository.select('configuracoes', '*', { column: 'chave' });
    return Object.fromEntries(rows.map(r => [r.chave, String(r.valor ?? '')]));
  },

  async getUsuarios() {
    const rows = await window.SATE.BaseRepository.select('usuarios', 'id,unidade_id,funcao,nome,email,perfil,ativo,is_dev,unidades:unidade_id(nome)', { column: 'nome' });
    return rows.map(r => ({
      idLinha: r.id,
      id: r.id,
      unidade: r.unidades?.nome || '',
      funcao: r.funcao || '',
      nome: r.nome || '',
      email: r.email || '',
      perfil: r.perfil || '',
      ativo: r.ativo ? 'Sim' : 'Não',
      isDev: !!r.is_dev
    }));
  },

  async getUnidadesTurmas() {
    const unidades = await window.SATE.BaseRepository.select('unidades', 'id,nome,endereco,ativo', { column: 'nome' });
    const turmas = await window.SATE.BaseRepository.select('turmas', 'id,unidade_id,nome_exibicao,ciclo,qtd_alunos,ativo,unidades:unidade_id(nome,endereco)', { column: 'nome_exibicao' });

    const turmasPorUnidade = {};
    const enderecosPorUnidade = {};
    const todasUnidades = [];

    unidades.filter(u => u.ativo !== false).forEach(u => {
      todasUnidades.push(u.nome);
      enderecosPorUnidade[u.nome] = u.endereco || '';
      turmasPorUnidade[u.nome] = [];
    });

    turmas.filter(t => t.ativo !== false).forEach(t => {
      const nomeUnidade = t.unidades?.nome;
      if (!nomeUnidade) return;
      if (!turmasPorUnidade[nomeUnidade]) turmasPorUnidade[nomeUnidade] = [];
      turmasPorUnidade[nomeUnidade].push({
        id: t.id,
        nome: t.nome_exibicao || '',
        ciclo: String(t.ciclo || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        qtd: Number(t.qtd_alunos || 0)
      });
    });

    return { unidades, turmas, turmasPorUnidade, enderecosPorUnidade, todasUnidades };
  },

  async getEventosAgendas() {
    const eventos = await window.SATE.BaseRepository.select('eventos', '*', { column: 'nome' });
    const agendas = await window.SATE.BaseRepository.select('agendas', '*,eventos:evento_id(id,nome)', { column: 'data' });
    const midias = await window.SATE.BaseRepository.select('eventos_midia', '*,eventos:evento_id(id,nome)', { column: 'created_at', ascending: false });
    const programacoes = await window.SATE.BaseRepository.select('programacoes', '*,eventos:evento_id(id,nome)', { column: 'filme' });

    const listaEventos = eventos.filter(e => e.ativo !== false).map(e => e.nome);
    if (!listaEventos.includes('Outros')) listaEventos.push('Outros');

    const locaisEventos = {};
    agendas.forEach(a => {
      const nome = a.eventos?.nome || a.nome_evento;
      if (nome && a.local && !locaisEventos[nome]) locaisEventos[nome] = a.local;
    });

    const midiaEventos = {};
    midias.forEach(m => {
      const nome = m.eventos?.nome || m.evento_nome;
      if (!nome) return;
      midiaEventos[nome] = {
        img: m.imagem_url || '',
        txt: m.texto_html || '',
        link: m.anexos ? JSON.stringify(m.anexos) : ''
      };
    });

    const calendarioEventos = agendas.filter(a => a.ativo !== false).map(a => ({
      id: a.id,
      dataISO: a.data,
      periodo: a.periodo || 'Manhã',
      evento: a.eventos?.nome || a.nome_evento || '',
      titulo: a.atividade || '',
      sinopse: a.informacoes || '',
      local: a.local || '',
      capacidade: Number(a.lotacao || 0),
      vagasLivres: Number(a.lotacao || 0),
      linhaCompleta: a
    }));

    const catalogoFilmes = programacoes.map(p => ({ filme: p.filme })).filter(x => x.filme);

    return { eventos, agendas, programacoes, midias, listaEventos, locaisEventos, midiaEventos, calendarioEventos, catalogoFilmes };
  },

  async getVeiculos() {
    const rows = await window.SATE.BaseRepository.select('veiculos', '*,empresas:empresa_id(nome),motoristas:motorista_padrao_id(nome,contato)', { column: 'created_at', ascending: false });
    return rows.filter(r => r.ativo !== false).map(r => ({
      idLinha: r.id,
      id: r.id,
      empresa: r.empresas?.nome || r.empresa_nome || '',
      veiculo: r.tipo_veiculo || '',
      placa: r.placa || '',
      lotacao: String(r.lotacao || '0'),
      acessibilidade: r.acessibilidade ? 'Sim' : 'Não',
      disponibilidade: r.disponibilidade || 'Disponível',
      motorista: r.motoristas?.nome || r.motorista_nome || '',
      contato: r.motoristas?.contato || r.contato || '',
      custo: r.custo || '',
      dataCadastro: brDate(r.data_cadastro)
    }));
  },

  async getMotoristas() {
    const rows = await window.SATE.BaseRepository.select('motoristas', '*,empresas:empresa_id(nome)', { column: 'created_at', ascending: false });
    return rows.filter(r => r.ativo !== false).map(r => ({
      idLinha: r.id,
      id: r.id,
      empresa: r.empresas?.nome || r.empresa_nome || '',
      nome: r.nome || '',
      contato: r.contato || '',
      status: r.status || 'Ativo'
    }));
  },

  async getPedidos(usuario) {
    let q = window.SATE.supabase
      .from('pedidos')
      .select('*,unidades:unidade_id(id,nome,endereco),pedido_turmas(id,nome_turma,qtd_alunos),pedido_historico(created_at,mensagem,justificativa,usuario_nome),pedido_alocacoes(placa,motorista_nome,ordem)')
      .order('created_at', { ascending: false });

    const perfil = String(usuario?.perfil || '').toLowerCase();
    if (perfil !== 'administrador' && !usuario?.isDev && usuario?.unidadeId) {
      q = q.eq('unidade_id', usuario.unidadeId);
    }

    const { data, error } = await q;
    if (error) throw error;

    return (data || []).map(p => {
      const alocacoes = (p.pedido_alocacoes || []).sort((a,b) => (a.ordem||0) - (b.ordem||0));
      const placaResumo = alocacoes.length
        ? alocacoes.map(a => `${a.placa || ''} (Mot: ${a.motorista_nome || ''})`).join(' | ')
        : (p.placa_resumo || '');
      return {
        idLinha: p.id,
        idLinhas: [p.id],
        unidade: p.unidades?.nome || p.unidade_nome || '',
        turmas: (p.pedido_turmas || []).map(t => t.nome_turma).join(', '),
        qtdAlunos: Number(p.qtd_alunos_total || 0),
        data: brDate(p.data_viagem),
        periodo: p.periodo || '-',
        origem: p.origem || '-',
        destino: p.destino || '-',
        idaPartida: timeHHMM(p.ida_partida),
        voltaPartida: timeHHMM(p.volta_partida),
        evento: p.evento_nome || '-',
        observacoes: p.observacoes || '',
        tituloOutros: p.titulo_outros || '',
        detalhe: p.detalhe || '',
        responsavel: p.responsavel || 'Não informado',
        telefone: p.telefone || '',
        acessibilidade: p.acessibilidade ? 'SIM' : 'NÃO',
        qtdAdaptado: Number(p.qtd_adaptado || 0),
        placa: placaResumo,
        status: statusLegacy(p.status),
        historico: (p.pedido_historico || []).map(h => `[${new Date(h.created_at).toLocaleString('pt-BR')}] ${h.mensagem || ''}${h.justificativa ? ' Motivo: ' + h.justificativa : ''}`).join('\n'),
        criadoPor: p.criado_por_nome || '',
        dataSolicitacao: p.data_solicitacao || p.created_at
      };
    });
  },

  async upsertUsuario(d) {
    const unidade = d.unidade ? await this.ensureUnidade(d.unidade) : null;
    const payload = {
      id: d.idLinha && !String(d.idLinha).includes('SIM') ? d.idLinha : undefined,
      unidade_id: unidade?.id || null,
      funcao: d.funcao || '',
      nome: d.nome || '',
      email: d.email || '',
      perfil: d.perfil || 'Escola',
      ativo: String(d.ativo || 'Sim').toLowerCase() === 'sim'
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    return window.SATE.BaseRepository.upsert('usuarios', payload);
  },

  async ensureUnidade(nome) {
    const clean = String(nome || '').trim();
    if (!clean) return null;
    let { data, error } = await window.SATE.supabase.from('unidades').select('*').eq('nome', clean).maybeSingle();
    if (error) throw error;
    if (data) return data;
    const inserted = await window.SATE.BaseRepository.insert('unidades', { nome: clean });
    return inserted?.[0] || null;
  },

  async ensureEmpresa(nome) {
    const clean = String(nome || '').trim();
    if (!clean) return null;
    let { data, error } = await window.SATE.supabase.from('empresas').select('*').eq('nome', clean).maybeSingle();
    if (error) throw error;
    if (data) return data;
    const inserted = await window.SATE.BaseRepository.insert('empresas', { nome: clean });
    return inserted?.[0] || null;
  },

  async upsertMotorista(d) {
    const empresa = await this.ensureEmpresa(d.empresa);
    const payload = {
      id: d.idLinha && !String(d.idLinha).includes('SIM') ? d.idLinha : undefined,
      empresa_id: empresa?.id || null,
      empresa_nome: d.empresa || '',
      nome: d.nome || '',
      contato: d.contato || '',
      status: d.status || 'Ativo',
      ativo: true
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    return window.SATE.BaseRepository.upsert('motoristas', payload);
  },

  async upsertVeiculo(d) {
    const empresa = await this.ensureEmpresa(d.empresa);
    const payload = {
      id: d.idLinha && !String(d.idLinha).includes('SIM') ? d.idLinha : undefined,
      empresa_id: empresa?.id || null,
      empresa_nome: d.empresa || '',
      tipo_veiculo: d.veiculo || '',
      placa: d.placa || '',
      lotacao: Number(d.lotacao || 0),
      acessibilidade: String(d.acessibilidade || '').toLowerCase() === 'sim',
      disponibilidade: d.disponibilidade || 'Disponível',
      motorista_nome: d.motorista || '',
      contato: d.contato || '',
      custo: d.custo || '',
      data_cadastro: isoDate(d.dataCadastro) || new Date().toISOString().slice(0,10),
      ativo: true
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    return window.SATE.BaseRepository.upsert('veiculos', payload, 'placa');
  },

  async getMidiasAdmin() {
    const { midias } = await this.getEventosAgendas();
    return midias.map(m => ({
      idLinha: m.id,
      evento: m.eventos?.nome || m.evento_nome || '',
      img: m.imagem_url || '',
      txt: m.texto_html || '',
      link: m.anexos ? JSON.stringify(m.anexos) : ''
    }));
  },

  async upsertMidia(d) {
    let evento = null;
    if (d.evento) {
      const { data } = await window.SATE.supabase.from('eventos').select('*').eq('nome', d.evento).maybeSingle();
      evento = data || (await window.SATE.BaseRepository.insert('eventos', { nome: d.evento, categoria: 'agenda' }))?.[0];
    }
    let anexos = [];
    if (d.link) {
      try { anexos = JSON.parse(d.link); } catch { anexos = [{ nome: 'Anexo', url: d.link }]; }
    }
    const payload = {
      id: d.idLinha && !String(d.idLinha).includes('SIM') ? d.idLinha : undefined,
      evento_id: evento?.id || null,
      evento_nome: d.evento || '',
      imagem_url: d.img || '',
      texto_html: d.txt || '',
      anexos
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    return window.SATE.BaseRepository.upsert('eventos_midia', payload);
  },

  async getConfigAdmin() {
    const rows = await window.SATE.BaseRepository.select('configuracoes', '*', { column: 'chave' });
    return rows.map(r => ({ idLinha: r.id, chave: r.chave, valor: r.valor, descricao: r.descricao || '' }));
  },

  async upsertConfig(d) {
    const payload = { id: d.idLinha && !String(d.idLinha).includes('SIM') ? d.idLinha : undefined, chave: d.chave, valor: d.valor, descricao: d.descricao || '' };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    return window.SATE.BaseRepository.upsert('configuracoes', payload, 'chave');
  },

  async salvarNovoPedido(dados, usuario) {
    const unidade = await this.ensureUnidade(dados.unidade || usuario.unidade);
    const eventoNome = dados.evento === 'Outros' && dados.tituloOutros ? `Outros: ${dados.tituloOutros}` : dados.evento;
    const pedidoPayload = {
      unidade_id: unidade?.id || null,
      unidade_nome: unidade?.nome || dados.unidade || usuario.unidade,
      data_viagem: dados.data,
      periodo: dados.periodo,
      origem: dados.origem,
      destino: dados.destino,
      ida_partida: dados.idaPartida || null,
      volta_partida: dados.voltaPartida || null,
      evento_nome: eventoNome,
      titulo_outros: dados.tituloOutros || '',
      detalhe: dados.detalhe || '',
      observacoes: dados.observacoes || '',
      responsavel: dados.responsavel || '',
      telefone: dados.telefone || '',
      qtd_alunos_total: Number(dados.qtdAlunosTotal || 0),
      acessibilidade: !!dados.acessibilidade,
      qtd_adaptado: Number(dados.qtdAdaptado || 0),
      status: 'Em Análise',
      criado_por_usuario_id: usuario.id || null,
      criado_por_nome: usuario.nome || '',
      data_solicitacao: new Date().toISOString()
    };
    const { data: pedido, error } = await window.SATE.supabase.from('pedidos').insert(pedidoPayload).select().single();
    if (error) throw error;

    const turmas = (dados.turmasDetalhadas || []).map(t => ({
      pedido_id: pedido.id,
      nome_turma: t.nome,
      qtd_alunos: Number(t.qtd || 0)
    }));
    if (turmas.length) await window.SATE.BaseRepository.insert('pedido_turmas', turmas);
    await window.SATE.BaseRepository.insert('pedido_historico', {
      pedido_id: pedido.id,
      status_para: 'Em Análise',
      acao: 'criado',
      mensagem: `Criado por ${usuario.nome}`,
      usuario_id: usuario.id || null,
      usuario_nome: usuario.nome || ''
    });
    return pedido;
  },

  async atualizarStatusPedido(payload, usuario) {
    const ids = payload.idLinhas || [];
    for (const id of ids) {
      await window.SATE.BaseRepository.update('pedidos', id, { status: payload.status, placa_resumo: payload.placa || '' });
      if (payload.placa) {
        await window.SATE.supabase.from('pedido_alocacoes').delete().eq('pedido_id', id);
        const partes = String(payload.placa).split(' | ');
        const alocs = partes.map((p, idx) => {
          const [placa, motParte] = p.split('(Mot:');
          return { pedido_id: id, placa: placa.trim(), motorista_nome: String(motParte || '').replace(')', '').trim(), ordem: idx + 1 };
        });
        if (alocs.length) await window.SATE.BaseRepository.insert('pedido_alocacoes', alocs);
      }
      await window.SATE.BaseRepository.insert('pedido_historico', {
        pedido_id: id,
        status_para: payload.status,
        acao: 'status',
        mensagem: `${usuario.nome} alterou para ${payload.status}.`,
        justificativa: payload.justificativa || '',
        usuario_id: usuario.id || null,
        usuario_nome: usuario.nome || ''
      });
    }
    return true;
  },

  async cancelarPedido(ids, justificativa, usuario) {
    for (const id of ids) {
      await window.SATE.BaseRepository.update('pedidos', id, { status: 'Cancelado', placa_resumo: '' });
      await window.SATE.BaseRepository.insert('pedido_historico', {
        pedido_id: id,
        status_para: 'Cancelado',
        acao: 'cancelado',
        mensagem: `Cancelado por ${usuario.nome}`,
        justificativa: justificativa || '',
        usuario_id: usuario.id || null,
        usuario_nome: usuario.nome || ''
      });
    }
    return true;
  }
};
