/**
 * SATE - Script de Manutenção de Estrutura
 * Garante que a aba de LOGS e as novas estruturas existam.
 */
function configurarEstruturaSATE() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cores = { azul: "#0056b3", texto: "white", log: "#444444" };

  const estruturaDesejada = [
    { nome: "Usuários", cabecalho: ["Unidade", "Função", "Nome", "E-mail", "Perfil", "Ativo"] },
    {
      nome: "Cadastros",
      cabecalho: [
        "ID", "Unidade", "Turma", "Qtd Alunos", "Data Viagem", "Período", 
        "Origem", "Destino", "Saída Partida", "Saída Chegada", "Volta Partida", 
        "Volta Chegada", "Evento", "Observações", "Título Outros", "Detalhe", 
        "Responsável", "Telefone", "Acessibilidade", "Qtd Adaptado", "Placa", 
        "Status", "ID Pedido", "Histórico", "Criado Por", "Data Solicitação"
      ]
    },
    { nome: "Empresa/Veículo", cabecalho: ["Empresa", "Veículo", "Placa", "Lotação", "Acessibilidade", "Disponibilidade", "Motorista", "Contato", "Custo", "Data Cadastro"] },
    { nome: "Motoristas", cabecalho: ["Empresa", "Nome", "Contato", "Status"] },
    { nome: "Eventos_Midia", cabecalho: ["Evento", "URL Imagem", "Texto Descritivo", "Links Anexos"] },
    { nome: "Configuracoes", cabecalho: ["Chave", "Valor", "Descrição"] },
    { 
      nome: "Logs", 
      cabecalho: ["Data/Hora", "Usuário", "E-mail", "Ação", "Pedido ID", "Detalhes Técnicos"] 
    }
  ];

  console.log("🚀 Iniciando Verificação de Estrutura SATE...");

  estruturaDesejada.forEach(abaObj => {
    let sheet = ss.getSheetByName(abaObj.nome);
    if (!sheet) {
      sheet = ss.insertSheet(abaObj.nome);
      console.log("✔️ Aba criada: " + abaObj.nome);
    }

    if (sheet.getLastColumn() < abaObj.cabecalho.length) {
       sheet.insertColumnsAfter(sheet.getLastColumn() || 1, abaObj.cabecalho.length - (sheet.getLastColumn() || 0));
    }
    
    const cabecalhoAtual = sheet.getRange(1, 1, 1, abaObj.cabecalho.length).getValues()[0];
    abaObj.cabecalho.forEach((nomeColuna, index) => {
      if (cabecalhoAtual[index] !== nomeColuna) {
        sheet.getRange(1, index + 1).setValue(nomeColuna);
      }
    });

    const corCabecalho = abaObj.nome === "Logs" ? cores.log : cores.azul;
    sheet.getRange(1, 1, 1, abaObj.cabecalho.length)
         .setBackground(corCabecalho).setFontColor(cores.texto).setFontWeight("bold").setHorizontalAlignment("center");
    
    if (sheet.getFrozenRows() === 0) sheet.setFrozenRows(1);
  });

  console.log("✅ Estrutura de LOGS e Cadastros validada com sucesso!");
}