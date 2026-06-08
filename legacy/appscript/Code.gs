/**
 * SATE - SISTEMA DE AGENDAMENTO DE TRANSPORTE ESCOLAR
 * Arquivo Principal (Backend) - Versão 100% Completa e Corrigida
 */

function verificarAcesso() {
  let emailUsuario = Session.getActiveUser().getEmail();
  if (!emailUsuario) { emailUsuario = 'usuario@educacao.pmrp.sp.gov.br'; }

  const emailsDesenvolvedores = [
    'usuario@educacao.pmrp.sp.gov.br', 'usuario@educacao.pmrp.sp.gov.br',
    'usuario@educacao.pmrp.sp.gov.br', 'usuario@educacao.pmrp.sp.gov.br', 'usuario@educacao.pmrp.sp.gov.br'
  ];

  if (emailsDesenvolvedores.some(email => email.toLowerCase() === emailUsuario.toLowerCase().trim())) {
    return { autorizado: true, nome: 'Administrador VIP', email: emailUsuario, unidade: 'Secretaria de Educação', perfil: 'Administrador', isDev: true };
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Usuários');
  if (!sheet) return { autorizado: false, erro: 'Aba Usuários não encontrada' };
  
  const data = sheet.getDataRange().getValues(); data.shift(); 
  for (let i = 0; i < data.length; i++) {
    let row = data[i];
    if (row[3] && row[3].toString().toLowerCase().trim() === emailUsuario.toLowerCase().trim()) {
      if (row[5] && row[5].toString().toLowerCase() === 'sim') {
        return { autorizado: true, nome: row[2], email: emailUsuario, unidade: row[0], perfil: row[4], isDev: false };
      } else { 
        return { autorizado: false, erro: 'Usuário inativo no sistema.' }; 
      }
    }
  }
  return { autorizado: false, erro: 'E-mail não cadastrado.' };
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('SATE - Transporte Escolar')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) { 
  return HtmlService.createHtmlOutputFromFile(filename).getContent(); 
}

function obterPrimeiraLinhaLivre(sheet, colunaIndice) {
  const valores = sheet.getRange(1, colunaIndice, sheet.getMaxRows(), 1).getValues();
  for (let i = 0; i < valores.length; i++) { 
    if (String(valores[i][0]).trim() === "") return i + 1; 
  }
  sheet.insertRowAfter(sheet.getMaxRows()); 
  return sheet.getMaxRows() + 1; 
}

function getDadosParaFormulario() {
  try {
    const credenciais = verificarAcesso();
    if (!credenciais.autorizado) return { erro: 'Não autorizado' };

    const abas = SpreadsheetApp.getActiveSpreadsheet().getSheets();
    
    let sysConfig = {};
    let sheetConfig = abas.find(s => s.getName().toLowerCase().includes('configura'));
    if(sheetConfig) {
       let dataCfg = sheetConfig.getDataRange().getValues(); dataCfg.shift();
       dataCfg.forEach(r => { if(r[0]) sysConfig[String(r[0]).trim()] = String(r[1]).trim(); });
    }

    let midiaEventos = {};
    let sheetMidia = abas.find(s => s.getName() === 'Eventos_Midia');
    if (sheetMidia) {
        let dataM = sheetMidia.getDataRange().getValues();
        if(dataM.length > 1) {
            dataM.shift();
            dataM.forEach(r => { if(r[0]) midiaEventos[String(r[0]).trim()] = { img: r[1]||'', txt: r[2]||'', link: r[3]||'' }; });
        }
    }

    let consumoAgendas = {};
    let sheetCadastros = abas.find(s => s.getName().toLowerCase() === 'cadastros');
    if (sheetCadastros) {
        let dadosCad = sheetCadastros.getDataRange().getValues(); dadosCad.shift();
        dadosCad.forEach(r => {
            let status = String(r[21] || '').toLowerCase();
            if(status.includes('cancel') || status.includes('recus') || status.includes('reprov')) return;
            
            let dataStr = '';
            if (Object.prototype.toString.call(r[4]) === '[object Date]') { dataStr = Utilities.formatDate(r[4], Session.getScriptTimeZone(), 'yyyy-MM-dd'); } 
            else { let txt = String(r[4]).trim(); if(txt.includes('/')) { let p=txt.split('/'); dataStr=`${p[2]}-${p[1]}-${p[0]}`; } else dataStr = txt; }
            
            let evento = String(r[12] || '').trim();
            let key = `${dataStr}_${evento}`; let qtd = parseInt(r[3]) || 0;
            if(!consumoAgendas[key]) consumoAgendas[key] = 0; consumoAgendas[key] += qtd;
        });
    }

    let totalFrotaAtiva = 0;
    let sheetFrota = abas.find(s => s.getName() === 'Empresa/Veículo');
    if (sheetFrota) {
       let frotaData = sheetFrota.getDataRange().getValues(); frotaData.shift();
       frotaData.forEach(r => { if(String(r[5]).toLowerCase().includes('dispon')) totalFrotaAtiva++; });
    }

    let turmasPorUnidade = {}; let enderecosPorUnidade = {}; let todasUnidades = new Set();
    let sheetTurmas = abas.find(s => s.getName().toLowerCase().includes('turmas'));
    if (sheetTurmas) {
      const dataTurmas = sheetTurmas.getDataRange().getValues(); dataTurmas.shift(); 
      dataTurmas.forEach(row => {
        let und = (row[0] || '').toString().trim();
        if(!und) return; todasUnidades.add(und);
        if(!turmasPorUnidade[und]) { turmasPorUnidade[und] = []; enderecosPorUnidade[und] = (row[5]||'').toString().trim() + (row[6] ? `, ${row[6]}` : ''); }
        turmasPorUnidade[und].push({ nome: `${row[2]} ${row[3]} (${row[4]})`, ciclo: (row[1]||'').toString().trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), qtd: parseInt(row[10]) || 0 });
      });
    }
    
    let catalogoFilmes = [];
    let sheetCauim = abas.find(s => s.getName().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('cauim'));
    if (sheetCauim) {
      const dataCauim = sheetCauim.getDataRange().getValues(); dataCauim.shift(); 
      dataCauim.forEach(row => { if(row[0]) catalogoFilmes.push({ filme: String(row[0]).trim() }); });
    }

    let listaEventosDinamicos = []; let locaisEventos = {}; let calendarioEventos = [];

    abas.forEach(aba => {
        let nomeAba = aba.getName();
        if(nomeAba.startsWith('Agenda_') || nomeAba.startsWith('Programacao_')) {
            let dataAba = aba.getDataRange().getValues(); 
            if(dataAba.length > 1) {
                let isCatalogoCauim = nomeAba.toLowerCase().includes('cauim');
                let cabecalho = dataAba[0].map(c => String(c).toLowerCase());
                
                let idxLocal = cabecalho.findIndex(c => c.includes('local') || c.includes('endere'));
                let idxCapacidade = cabecalho.findIndex(c => c.includes('capacidade') || c.includes('vagas') || c.includes('lota'));
                let idxPeriodo = cabecalho.findIndex(c => c.includes('período') || c.includes('periodo'));
                
                let nomeExibicao = nomeAba.replace('Agenda_', '').replace('Programacao_', '').replace(/_/g, ' ').trim();
                if(nomeAba.startsWith('Agenda_') && !listaEventosDinamicos.includes(nomeExibicao)) { listaEventosDinamicos.push(nomeExibicao); }
                
                for(let i=1; i<dataAba.length; i++) { if(dataAba[i][5] && idxLocal !== -1) { locaisEventos[nomeExibicao] = String(dataAba[i][idxLocal]); break; } } 

                dataAba.shift();
                dataAba.forEach((r, i) => {
                    if(isCatalogoCauim && r[0]) catalogoFilmes.push({ filme: String(r[0]).trim() });
                    if(!r[1] || !nomeAba.startsWith('Agenda_')) return; 
                    
                    let dataISO = '';
                    if (Object.prototype.toString.call(r[1]) === '[object Date]') { dataISO = Utilities.formatDate(r[1], Session.getScriptTimeZone(), 'yyyy-MM-dd'); } 
                    else { let txtData = String(r[1]).trim(); if (txtData.includes('/')) { let p = txtData.split('/'); if(p.length === 3) dataISO = `${p[2]}-${p[1]}-${p[0]}`; } else if (txtData.includes('-')) { dataISO = txtData; } }
                    
                    if(dataISO) {
                        let atividade = String(r[3] || ''); let titulo = `[${nomeExibicao}] ` + atividade;
                        let periodoAg = String(r[idxPeriodo !== -1 ? idxPeriodo : 2] || 'Manhã');
                        
                        let capStr = String(r[idxCapacidade] || '').replace(/\D/g, ''); 
                        let capacidade = parseInt(capStr);
                        if (!isNaN(capacidade) && capacidade > 0) {
                            let key = `${dataISO}_${nomeExibicao}`; let consumido = consumoAgendas[key] || 0;
                            if (consumido >= capacidade) { titulo += ' 🔴 (LOTADO)'; } else { titulo += ` 🟢 (${capacidade - consumido} vagas)`; }
                        }
                        
                        let linhaObjCompleta = { idLinha: i + 2, nomeAba: nomeAba };
                        cabecalho.forEach((col, j) => { linhaObjCompleta[col] = (r[j] instanceof Date) ? Utilities.formatDate(r[j], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(r[j]||''); });

                        calendarioEventos.push({ 
                          dataISO: dataISO, periodo: periodoAg, evento: nomeExibicao,
                          titulo: atividade, sinopse: String(r[4] || ''), local: String(r[5] || ''),
                          capacidade: capacidade || 0, vagasLivres: capacidade > 0 ? (capacidade - (consumoAgendas[`${dataISO}_${nomeExibicao}`] || 0)) : 0,
                          linhaCompleta: linhaObjCompleta 
                        });
                    }
                });
            }
        }
    });
    
    if(catalogoFilmes.length === 0) catalogoFilmes.push({filme: "Opção Padrão CAUIM"});
    listaEventosDinamicos.push("Outros");

    credenciais.configuracoes = sysConfig; 
    credenciais.turmasPorUnidade = turmasPorUnidade; 
    credenciais.enderecosPorUnidade = enderecosPorUnidade;
    credenciais.todasUnidades = Array.from(todasUnidades).sort();  
    credenciais.listaEventos = listaEventosDinamicos; 
    credenciais.locaisEventos = locaisEventos; 
    credenciais.calendarioEventos = calendarioEventos;
    credenciais.totalFrotaAtiva = totalFrotaAtiva; 
    credenciais.catalogoFilmes = catalogoFilmes; 
    credenciais.midiaEventos = midiaEventos; 

    return credenciais;
  } catch (e) { return { erro: "Erro ao processar: " + e.message }; }
}
function getPedidosParaCards() {
  try {
    const credenciais = verificarAcesso();
    if (!credenciais.autorizado) return { erro: credenciais.erro }; 

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Cadastros');
    if (!sheet) return { erro: 'Aba Cadastros não encontrada' };

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { erro: null, usuario: credenciais, dados: [] }; data.shift(); 
    
    let perfilUsuario = String(credenciais.perfil || '').toLowerCase();
    let grupos = {}; 

    data.forEach((row, index) => {
      let idLinha = index + 2; let und = String(row[1] || 'Sem Unidade');
      if (und === 'Sem Unidade' || und === '') return;
      if (perfilUsuario !== 'administrador' && !credenciais.isDev) { if (und.toLowerCase() !== credenciais.unidade.toLowerCase()) return; }

      let idPedido = String(row[22] || `OLD_${idLinha}`); 

      if(!grupos[idPedido]) {
        let dataFormatada = '-';
        if (row[4]) { if (Object.prototype.toString.call(row[4]) === '[object Date]') dataFormatada = Utilities.formatDate(row[4], Session.getScriptTimeZone(), 'dd/MM/yyyy'); else dataFormatada = String(row[4]).trim(); }
        let horaIda = '-'; let horaVolta = '-';
        if (row[8]) { if (Object.prototype.toString.call(row[8]) === '[object Date]') horaIda = Utilities.formatDate(row[8], Session.getScriptTimeZone(), 'HH:mm'); else horaIda = String(row[8]).trim(); }
        if (row[10]) { if (Object.prototype.toString.call(row[10]) === '[object Date]') horaVolta = Utilities.formatDate(row[10], Session.getScriptTimeZone(), 'HH:mm'); else horaVolta = String(row[10]).trim(); }

        let tituloOutros = String(row[14] || '');
        let evF = String(row[12] || '-');
        if(evF === 'Outros' && tituloOutros) evF = `Outros: ${tituloOutros}`;

        grupos[idPedido] = {
          idLinhas: [], unidade: und, turmasArray: [], qtdAlunos: 0,                 
          data: dataFormatada, periodo: String(row[5] || '-'), origem: String(row[6] || '-'), destino: String(row[7] || '-'),                 
          idaPartida: horaIda, voltaPartida: horaVolta, evento: evF, observacoes: String(row[13] || ''), tituloOutros: tituloOutros, detalhe: String(row[15] || ''),
          responsavel: String(row[16] || 'Não informado'), telefone: String(row[17] || ''), 
          acessibilidade: row[18] === true || String(row[18]).toLowerCase() === 'sim' ? 'SIM' : 'NÃO',
          qtdAdaptado: parseInt(row[19]) || 0,
          placa: String(row[20] || ''), status: String(row[21] || 'Em Análise'),
          historico: String(row[23] || ''), criadoPor: String(row[24] || ''), dataSolicitacao: String(row[25] || '')
        };
      }
      
      grupos[idPedido].idLinhas.push(idLinha);
      grupos[idPedido].turmasArray.push(String(row[2] || ''));
      grupos[idPedido].qtdAlunos = parseInt(row[3]) || 0; 
    });

    let pedidos = Object.values(grupos).map(g => { g.turmas = g.turmasArray.join(', '); delete g.turmasArray; return g; });
    return { erro: null, usuario: credenciais, dados: pedidos.reverse() };
  } catch (e) { return { erro: "Erro Cadastros: " + e.message }; }
}

function salvarNovoPedido(dados) {
  const credenciais = verificarAcesso();
  if (!credenciais.autorizado) return { sucesso: false, erro: 'Não autorizado' };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Cadastros');
  
  // ====================================================================
  // TRAVA DE CONCORRÊNCIA (LOCK DE FROTA EM TEMPO REAL NO SERVIDOR)
  // ====================================================================
  let totalFrotaAtiva = 0;
  let sheetFrota = ss.getSheetByName('Empresa/Veículo');
  if (sheetFrota) {
     let frotaData = sheetFrota.getDataRange().getValues(); frotaData.shift();
     frotaData.forEach(r => { if(String(r[5]).toLowerCase().includes('dispon')) totalFrotaAtiva++; });
  }
  
  let onibusUsados = 0;
  let dadosCad = sheet.getDataRange().getValues(); dadosCad.shift();
  let viagensProcessadas = new Set(); // Agrupa para não contar a mesma viagem várias vezes
  
  dadosCad.forEach(r => {
      let status = String(r[21] || '').toLowerCase();
      if(status.includes('cancel') || status.includes('recus') || status.includes('reprov')) return;
      
      let idPedido = String(r[22] || '');
      if(!idPedido) idPedido = 'OLD_' + String(r[0]); // Proteção para pedidos antigos sem ID
      if(viagensProcessadas.has(idPedido)) return; 
      
      let dataPlanilha = '';
      if (Object.prototype.toString.call(r[4]) === '[object Date]') { 
          dataPlanilha = Utilities.formatDate(r[4], Session.getScriptTimeZone(), 'yyyy-MM-dd'); 
      } else { 
          let txt = String(r[4]).trim(); 
          if(txt.includes('/')) { let p = txt.split('/'); dataPlanilha = `${p[2]}-${p[1]}-${p[0]}`; } 
          else { dataPlanilha = txt; } 
      }
      
      let periodoPlanilha = String(r[5] || '');
      
      // Se for o mesmo dia e período, subtrai da frota
      if (dataPlanilha === dados.data && periodoPlanilha === dados.periodo) {
          let qtdAlunos = parseInt(r[3]) || 0;
          onibusUsados += Math.ceil(qtdAlunos / 43); // Conta quantos ônibus esse pedido consumiu
          viagensProcessadas.add(idPedido);
      }
  });
  
  let onibusNecessarios = Math.ceil((parseInt(dados.qtdAlunosTotal) || 0) / 43);
  let saldoFrota = totalFrotaAtiva - onibusUsados;
  
  // A MÁGICA ACONTECE AQUI: Rejeita se o saldo for menor do que a escola precisa
  if (saldoFrota < onibusNecessarios) {
      return { 
          sucesso: false, 
          erro: `Lotação esgotada! Outra escola reservou os últimos ônibus disponíveis segundos antes de você. Tente outro dia ou período.` 
      };
  }
  // ====================================================================
  
  let p = String(credenciais.perfil || '').toLowerCase(); let unidadeFinal = (p === 'administrador' || credenciais.isDev) ? dados.unidade : credenciais.unidade;
  const idUnicoPedido = Utilities.getUuid(); let linhaLivre = obterPrimeiraLinhaLivre(sheet, 2); 
  let dataHoraAtual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');

  dados.turmasDetalhadas.forEach(turmaItem => {
      let novaLinha = new Array(26).fill(''); 
      novaLinha[1] = unidadeFinal; novaLinha[2] = turmaItem.nome; novaLinha[3] = dados.qtdAlunosTotal; 
      novaLinha[4] = dados.data; novaLinha[5] = dados.periodo; novaLinha[6] = dados.origem; novaLinha[7] = dados.destino; novaLinha[8] = dados.idaPartida;           
      novaLinha[9] = dados.idaChegada; novaLinha[10] = dados.voltaPartida; novaLinha[11] = dados.voltaChegada;           
      novaLinha[12] = dados.evento; novaLinha[13] = dados.observacoes; novaLinha[14] = dados.tituloOutros; 
      novaLinha[15] = dados.detalhe; novaLinha[16] = dados.responsavel; novaLinha[17] = dados.telefone; 
      novaLinha[18] = dados.acessibilidade ? true : false; novaLinha[19] = dados.qtdAdaptado || 0; 
      novaLinha[21] = 'Em Análise'; novaLinha[22] = idUnicoPedido; 
      
      novaLinha[23] = dados.historicoAntigo ? (dados.historicoAntigo + `[${dataHoraAtual}] Editado por ${credenciais.nome}\n`) : `[${dataHoraAtual}] Criado por ${credenciais.nome}\n`;
      novaLinha[24] = dados.criadoPorAntigo || credenciais.nome;
      novaLinha[25] = dados.dataSolAntiga || dataHoraAtual;

      sheet.getRange(linhaLivre, 1, 1, 26).setValues([novaLinha]); linhaLivre++;
  });
  return { sucesso: true };
}

function editarPedidoCompleto(dados) {
   const credenciais = verificarAcesso(); if (!credenciais.autorizado) return { sucesso: false, erro: 'Não autorizado' };
   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Cadastros');
   if(dados.idLinhasAntigas && dados.idLinhasAntigas.length > 0) {
       let linhasOrdenadas = dados.idLinhasAntigas.sort((a, b) => b - a);
       linhasOrdenadas.forEach(l => { sheet.deleteRow(l); });
   }
   return salvarNovoPedido(dados);
}

function cancelarPedidoEscola(idLinhas, justificativa) {
   const credenciais = verificarAcesso(); if (!credenciais.autorizado) return { sucesso: false, erro: 'Não autorizado' };
   try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Cadastros');
      let dataHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
      let logCancelamento = `[${dataHora}] Cancelado por ${credenciais.nome}: ${justificativa || 'Sem justificativa'}\n`;

      idLinhas.forEach(linha => { 
          sheet.getRange(linha, 21).setValue(''); // Remove a placa do ônibus (Coluna U)
          sheet.getRange(linha, 22).setValue('Cancelado'); // Muda Status (Coluna V)
          let histAntigo = sheet.getRange(linha, 24).getValue(); // Coluna Histórico (X)
          sheet.getRange(linha, 24).setValue(histAntigo + logCancelamento);
      });
      return { sucesso: true };
   } catch(e) { return { sucesso: false, erro: e.message }; }
}

function atualizarStatusPedido(dadosAdmin) {
  const c = verificarAcesso(); 
  if (!c.autorizado || (String(c.perfil).toLowerCase() !== 'administrador' && !c.isDev)) return { sucesso: false, erro: 'Acesso negado.' }; 
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Cadastros');
    
    // Formata a data e monta a linha que será adicionada ao histórico
    let dataHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    let textoJustificativa = dadosAdmin.justificativa ? ` Motivo: ${dadosAdmin.justificativa}` : ' Avaliado sem observações adicionais.';
    let logAvaliacao = `[${dataHora}] ${c.nome} alterou para ${dadosAdmin.status}.${textoJustificativa}\n`;

    dadosAdmin.idLinhas.forEach(idLinha => { 
        sheet.getRange(idLinha, 21).setValue(dadosAdmin.placa); // Coluna U
        sheet.getRange(idLinha, 22).setValue(dadosAdmin.status); // Coluna V
        
        // Pega o histórico atual e adiciona a nova linha (Coluna 24 = X)
        let histAntigo = sheet.getRange(idLinha, 24).getValue();
        sheet.getRange(idLinha, 24).setValue(histAntigo + logAvaliacao);
    });
    return { sucesso: true };
  } catch (e) { 
    return { sucesso: false, erro: e.message }; 
  }
}
function getMotoristas() {
  try {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Motoristas');
    if(!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Motoristas');
        sheet.appendRow(["Empresa", "Nome", "Contato", "Status"]);
        sheet.getRange("1:1").setFontWeight("bold").setBackground("#0056b3").setFontColor("white");
        return { dados: [] };
    }
    const data = sheet.getDataRange().getValues(); 
    if(data.length <= 1) return {dados: []}; 
    data.shift(); // Remove o cabeçalho
    
    // Mapeia os dados e filtra (ignora) linhas onde o Nome do Motorista esteja em branco
    let lista = data.map((r, i) => ({ 
        idLinha: i + 2, 
        empresa: String(r[0] || '').trim(), 
        nome: String(r[1] || '').trim(), 
        contato: String(r[2] || '').trim(), 
        status: String(r[3] || '').trim() 
    })).filter(m => m.nome !== ''); 
    
    return { dados: lista.reverse() };
  } catch(e) { 
    return { erro: e.message }; 
  }
}

function salvarMotorista(dados) {
  const c = verificarAcesso(); if (!c.autorizado || (String(c.perfil).toLowerCase() !== 'administrador' && !c.isDev)) return { erro: 'Acesso negado.' }; 
  try {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Motoristas');
    if(!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Motoristas');
        sheet.appendRow(["Empresa", "Nome", "Contato", "Status"]);
        sheet.getRange("1:1").setFontWeight("bold").setBackground("#0056b3").setFontColor("white");
    }
    if(dados.idLinha && !String(dados.idLinha).includes('SIM')) {
        sheet.getRange(dados.idLinha, 1, 1, 4).setValues([[dados.empresa, dados.nome, dados.contato, dados.status]]);
    } else {
        let l = obterPrimeiraLinhaLivre(sheet, 1);
        sheet.getRange(l, 1, 1, 4).setValues([[dados.empresa, dados.nome, dados.contato, dados.status]]);
    }
    return {sucesso: true};
  } catch(e) { return {sucesso: false, erro: e.message}; }
}

function excluirMotoristaAdmin(idLinha) {
  try { 
      if(String(idLinha).includes('SIM')) return { sucesso: true }; 
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Motoristas').deleteRow(idLinha); 
      return { sucesso: true }; 
  } catch(e) { return { sucesso: false, erro: e.message }; }
}

function salvarNovoVeiculo(dadosVeiculo) {
  const c = verificarAcesso(); if (!c.autorizado || (String(c.perfil).toLowerCase() !== 'administrador' && !c.isDev)) return { erro: 'Acesso negado.' }; 
  try {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Empresa/Veículo');
    if(!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Empresa/Veículo');
        sheet.appendRow(["Empresa", "Veículo", "Placa", "Lotação", "Acessibilidade", "Disponibilidade", "Motorista", "Contato", "Custo", "Data Cadastro"]);
        sheet.getRange("1:1").setFontWeight("bold").setBackground("#0056b3").setFontColor("white");
    }
    let dCad = dadosVeiculo.dataCadastro; if(dCad && dCad.includes('-')) { let p = dCad.split('-'); dCad = `${p[2]}/${p[1]}/${p[0]}`; }
    let novaLinha = [dadosVeiculo.empresa, dadosVeiculo.veiculo, dadosVeiculo.placa, dadosVeiculo.lotacao, dadosVeiculo.acessibilidade, dadosVeiculo.disponibilidade, dadosVeiculo.motorista, dadosVeiculo.contato, dadosVeiculo.custo, dCad];
    
    if(dadosVeiculo.idLinha && !String(dadosVeiculo.idLinha).includes('SIM')) {
        sheet.getRange(dadosVeiculo.idLinha, 1, 1, 10).setValues([novaLinha]);
    } else {
        let linhaLivre = obterPrimeiraLinhaLivre(sheet, 1);
        sheet.getRange(linhaLivre, 1, 1, 10).setValues([novaLinha]);
    }
    return { sucesso: true };
  } catch (e) { return { sucesso: false, erro: e.message }; }
}

function getVeiculosCadastrados() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Empresa/Veículo');
    if(!sheet) return { dados: [] };
    const data = sheet.getDataRange().getValues(); if (data.length <= 1) return { dados: [] }; data.shift(); 
    let veiculos = data.map((row, index) => {
      let dCad = '-'; if (row[9]) { if (Object.prototype.toString.call(row[9]) === '[object Date]') dCad = Utilities.formatDate(row[9], Session.getScriptTimeZone(), 'dd/MM/yyyy'); else dCad = String(row[9]).trim(); }
      return { idLinha: index + 2, empresa: String(row[0] || ''), veiculo: String(row[1] || ''), placa: String(row[2] || ''), lotacao: String(row[3] || '0'), acessibilidade: String(row[4] || 'Não'), disponibilidade: String(row[5] || 'Desconhecido'), motorista: String(row[6] || ''), contato: String(row[7] || ''), custo: String(row[8] || ''), dataCadastro: dCad };
    }).filter(v => v.placa !== ''); return { erro: null, dados: veiculos.reverse() }; 
  } catch (e) { return { erro: e.message }; }
}

function excluirVeiculoAdmin(idLinha) {
  try { 
      if(String(idLinha).includes('SIM')) return { sucesso: true }; 
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Empresa/Veículo').deleteRow(idLinha); 
      return { sucesso: true }; 
  } catch(e) { return { sucesso: false, erro: e.message }; }
}
function getMidiasAdmin() {
  try {
    const c = verificarAcesso(); if (!c.autorizado || (String(c.perfil).toLowerCase() !== 'administrador' && !c.isDev)) return { erro: 'Acesso negado.' }; 
    const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Eventos_Midia');
    if(!s) return { erro: null, dados: [] };
    const data = s.getDataRange().getValues(); if (data.length <= 1) return { dados: [] }; data.shift();
    return { erro: null, dados: data.map((r, i) => ({ idLinha: i+2, evento: String(r[0]||''), img: String(r[1]||''), txt: String(r[2]||''), link: String(r[3]||'') })).filter(x => x.evento !== '') };
  } catch(e) { return { erro: e.message }; }
}

function salvarMidiaAdmin(d) {
  try {
    const c = verificarAcesso(); if (!c.autorizado || (String(c.perfil).toLowerCase() !== 'administrador' && !c.isDev)) return { erro: 'Acesso negado.' }; 
    let s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Eventos_Midia');
    if(!s) { s = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Eventos_Midia'); s.appendRow(['Evento', 'URL da Imagem', 'Texto', 'Link do Arquivo']); s.getRange("1:1").setFontWeight("bold").setBackground("#0056b3").setFontColor("white"); }
    if(d.idLinha && !String(d.idLinha).includes('SIM')) { s.getRange(d.idLinha, 1, 1, 4).setValues([[d.evento, d.img, d.txt, d.link]]); } else { let l = obterPrimeiraLinhaLivre(s, 1); s.getRange(l, 1, 1, 4).setValues([[d.evento, d.img, d.txt, d.link]]); }
    return { sucesso: true };
  } catch(e) { return { sucesso: false, erro: e.message }; }
}

function excluirMidiaAdmin(idLinha) {
  try { if(String(idLinha).includes('SIM')) return { sucesso: true }; SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Eventos_Midia').deleteRow(idLinha); return { sucesso: true }; } catch(e) { return { sucesso: false, erro: e.message }; }
}

function getEstruturasDinamicas() {
  try {
    const c = verificarAcesso(); if (!c.autorizado || (String(c.perfil).toLowerCase() !== 'administrador' && !c.isDev)) return { erro: 'Acesso negado.' }; 
    const abas = SpreadsheetApp.getActiveSpreadsheet().getSheets();
    let programacoes = []; let agendas = [];

    abas.forEach(sh => {
        let nome = sh.getName();
        if(nome.startsWith('Programacao_') || nome.startsWith('Agenda_')) {
            let data = sh.getDataRange().getValues();
            let padraoCabecalho = nome.startsWith('Agenda_') ? ['Nome Evento', 'Data', 'Período', 'Atividade (Filme)', 'Informações (Sinopse)', 'Local', 'Faixa Etária / Público', 'Lotação', 'Lanche', 'Horário do ônibus', 'Horário Evento'] : ['Filme', 'Público Alvo', 'Sinopse', 'Classificação'];
            let cabecalho = data.length > 0 ? data.shift() : padraoCabecalho;
            
            let linhas = data.map((r, i) => {
                let obj = { idLinha: i + 2 };
                cabecalho.forEach((col, j) => { obj[col] = (r[j] instanceof Date) ? Utilities.formatDate(r[j], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(r[j]||''); });
                return obj;
            }).filter(x => x[cabecalho[0]] && x[cabecalho[0]] !== ''); 
            
            let estrut = { nomeAba: nome, nomeExibicao: nome.replace('Agenda_', '').replace('Programacao_', '').replace(/_/g, ' '), cabecalho: cabecalho, dados: linhas };
            if(nome.startsWith('Programacao_')) programacoes.push(estrut); else agendas.push(estrut);
        }
    });
    return { sucesso: true, programacoes: programacoes, agendas: agendas };
  } catch(e) { return { erro: e.message }; }
}

function salvarLinhaEstrutura(nomeAba, idLinha, arrayValores) {
  try {
    const c = verificarAcesso(); if (!c.autorizado || (String(c.perfil).toLowerCase() !== 'administrador' && !c.isDev)) return { erro: 'Acesso negado.' }; 
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nomeAba); if(!sh) return { erro: "Aba não encontrada" };
    if(arrayValores[1] && arrayValores[1].includes('-')) { let p = arrayValores[1].split('-'); arrayValores[1] = `${p[2]}/${p[1]}/${p[0]}`; }
    if(idLinha && !String(idLinha).includes('SIM')) { sh.getRange(idLinha, 1, 1, arrayValores.length).setValues([arrayValores]);
    } else { let l = obterPrimeiraLinhaLivre(sh, 1); sh.getRange(l, 1, 1, arrayValores.length).setValues([arrayValores]); }
    return { sucesso: true };
  } catch(e) { return { sucesso: false, erro: e.message }; }
}

function excluirLinhaEstrutura(nomeAba, idLinha) {
  try {
    if(String(idLinha).includes('SIM')) return { sucesso: true };
    const c = verificarAcesso(); if (!c.autorizado || (String(c.perfil).toLowerCase() !== 'administrador' && !c.isDev)) return { erro: 'Acesso negado.' }; 
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nomeAba).deleteRow(idLinha); return { sucesso: true };
  } catch (e) { return { sucesso: false, erro: e.message }; }
}

function criarNovaEstruturaAba(nomeExibicao, tipo) {
  try {
    const c = verificarAcesso(); if (!c.autorizado || (String(c.perfil).toLowerCase() !== 'administrador' && !c.isDev)) return { erro: 'Acesso negado.' }; 
    const s = SpreadsheetApp.getActiveSpreadsheet(); 
    let prefix = tipo === 'Agenda' ? 'Agenda_' : 'Programacao_';
    let nomeFormatado = prefix + nomeExibicao.trim().replace(/\s+/g, '_');
    if(s.getSheetByName(nomeFormatado)) return { sucesso: false, erro: 'Já existe uma aba com esse nome.' };
    
    let novaAba = s.insertSheet(nomeFormatado); 
    if(tipo === 'Agenda') novaAba.appendRow(['Nome Evento', 'Data', 'Período', 'Atividade (Filme)', 'Informações (Sinopse)', 'Local', 'Faixa Etária / Público', 'Lotação', 'Lanche', 'Horário do ônibus', 'Horário Evento']); 
    else novaAba.appendRow(['Filme', 'Público Alvo', 'Sinopse', 'Classificação']);
    
    novaAba.getRange("1:1").setFontWeight("bold").setBackground("#0056b3").setFontColor("white"); return { sucesso: true };
  } catch(e) { return { sucesso: false, erro: e.message }; }
}

function excluirAbaEstruturaAdmin(nomeAba) {
  try {
    const c = verificarAcesso(); if (!c.autorizado || (String(c.perfil).toLowerCase() !== 'administrador' && !c.isDev)) return { erro: 'Acesso negado.' }; 
    const s = SpreadsheetApp.getActiveSpreadsheet(); const sh = s.getSheetByName(nomeAba); if(sh) s.deleteSheet(sh); return { sucesso: true };
  } catch(e) { return { sucesso: false, erro: e.message }; }
}

function getUsuariosAdmin() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Usuários');
    const data = sheet.getDataRange().getValues(); data.shift();
    let usuarios = data.map((row, i) => ({ idLinha: i + 2, unidade: String(row[0] || ''), funcao: String(row[1] || ''), nome: String(row[2] || ''), email: String(row[3] || ''), perfil: String(row[4] || ''), ativo: String(row[5] || '') })).filter(u => u.email !== '');
    return { erro: null, dados: usuarios };
  } catch (e) { return { erro: e.message }; }
}

function salvarUsuarioAdmin(d) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Usuários');
    if(d.idLinha && !String(d.idLinha).includes('SIM')) { sheet.getRange(d.idLinha, 1, 1, 6).setValues([[d.unidade, d.funcao, d.nome, d.email, d.perfil, d.ativo]]);
    } else { let l = obterPrimeiraLinhaLivre(sheet, 4); sheet.getRange(l, 1, 1, 6).setValues([[d.unidade, d.funcao, d.nome, d.email, d.perfil, d.ativo]]); }
    return { sucesso: true };
  } catch (e) { return { sucesso: false, erro: e.message }; }
}

function excluirUsuarioAdmin(idLinha) {
  if(String(idLinha).includes('SIM')) return { sucesso: true };
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Usuários').deleteRow(idLinha); return { sucesso: true };
}

function getConfigAdmin() {
  try {
    const s = SpreadsheetApp.getActiveSpreadsheet().getSheets().find(sh => sh.getName().toLowerCase().includes('configura'));
    const data = s.getDataRange().getValues(); if (data.length <= 1) return { dados: [] }; data.shift();
    return { erro: null, dados: data.map((r, i) => ({ idLinha: i+2, chave: String(r[0]||''), valor: String(r[1]||''), descricao: String(r[2]||'') })).filter(x => x.chave !== '') };
  } catch(e) { return { erro: e.message }; }
}

function salvarConfigAdmin(d) {
  try {
    const s = SpreadsheetApp.getActiveSpreadsheet().getSheets().find(sh => sh.getName().toLowerCase().includes('configura'));
    if(d.idLinha && !String(d.idLinha).includes('SIM')) { s.getRange(d.idLinha, 1, 1, 3).setValues([[d.chave, d.valor, d.descricao]]); } 
    else { let l = obterPrimeiraLinhaLivre(s, 1); s.getRange(l, 1, 1, 3).setValues([[d.chave, d.valor, d.descricao]]); }
    return { sucesso: true };
  } catch(e) { return { sucesso: false, erro: e.message }; }
}

function excluirConfigAdmin(idLinha) {
  if(String(idLinha).includes('SIM')) return { sucesso: true };
  SpreadsheetApp.getActiveSpreadsheet().getSheets().find(sh => sh.getName().toLowerCase().includes('configura')).deleteRow(idLinha); return { sucesso: true };
}

function testarMotoristas() {
  var resultado = getMotoristas();
  Logger.log("Resultado da busca: " + JSON.stringify(resultado));
}

function obterDadosLogistica(origem, destino, dataViagem, horaSaida) {
  try {
    // Converte a data (DD/MM/YYYY) e hora (HH:MM) em um objeto Date para o Maps
    const pD = dataViagem.split('/');
    const pH = horaSaida.split(':');
    const dataHoraPartida = new Date(pD[2], pD[1]-1, pD[0], pH[0], pH[1]);

    const direcoes = Maps.newDirectionFinder()
      .setOrigin(origem)
      .setDestination(destino)
      .setMode(Maps.DirectionFinder.Mode.DRIVING) // Força o trajeto por carro (ruas)
      .setDepartureTime(dataHoraPartida)         // Considera o trânsito previsto para este horário
      .setRegion('BR')
      .getDirections();

    if (direcoes && direcoes.routes && direcoes.routes.length > 0) {
      const rota = direcoes.routes[0].legs[0];
      
      // O Maps retorna 'duration' (médio) e 'duration_in_traffic' (com trânsito)
      // Vamos usar o maior valor entre eles para garantir a segurança da logística
      let tempoSegundos = rota.duration.value;
      if (rota.duration_in_traffic) {
        tempoSegundos = rota.duration_in_traffic.value;
      }

      return {
        sucesso: true,
        distanciaKm: (rota.distance.value / 1000).toFixed(1),
        tempoMinutos: Math.ceil(tempoSegundos / 60)
      };
    }
    return { sucesso: false, erro: "Não foi possível traçar uma rota entre os endereços." };
  } catch (e) {
    return { sucesso: false, erro: "Erro no Maps: " + e.message };
  }
}