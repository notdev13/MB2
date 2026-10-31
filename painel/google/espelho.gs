/**
 * Espelho MB2: copia os lançamentos do Painel (Supabase) para esta planilha, só leitura.
 * Fonte única: o Painel. As abas abaixo são reescritas a cada atualização: não edite nelas.
 * Para fazer contas suas, crie outras abas e aponte para estas (fórmulas, tabela dinâmica, gráficos).
 *
 * Configuração (uma vez): Configurações do projeto > Propriedades do script, com:
 *   SUPABASE_URL    https://xxxx.supabase.co
 *   SUPABASE_CHAVE  chave pública (anon) do projeto
 *   LEITOR_EMAIL    e-mail do usuário leitor (só leitura)
 *   LEITOR_SENHA    senha desse usuário
 * Depois, no menu "Espelho MB2": Atualizar agora e Agendar a cada hora.
 */

var PAGAMENTO = { pix: 'Pix', boleto: 'Boleto', cartao: 'Cartão', transferencia: 'Transferência', dinheiro: 'Dinheiro', outro: 'Outro' };
var STATUS = { planejamento: 'Planejamento', em_andamento: 'Em andamento', pausada: 'Pausada', concluida: 'Concluída' };

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Espelho MB2')
    .addItem('Atualizar agora', 'atualizar')
    .addItem('Agendar a cada hora', 'agendar')
    .addItem('Parar atualização automática', 'desagendar')
    .addToUi();
}

function config_() {
  var p = PropertiesService.getScriptProperties();
  var c = {
    url: (p.getProperty('SUPABASE_URL') || '').replace(/\/+$/, ''),
    chave: p.getProperty('SUPABASE_CHAVE'),
    email: p.getProperty('LEITOR_EMAIL'),
    senha: p.getProperty('LEITOR_SENHA'),
  };
  if (!c.url || !c.chave || !c.email || !c.senha) {
    throw new Error('Faltam propriedades do script (SUPABASE_URL, SUPABASE_CHAVE, LEITOR_EMAIL, LEITOR_SENHA).');
  }
  return c;
}

function entrar_(c) {
  var r = UrlFetchApp.fetch(c.url + '/auth/v1/token?grant_type=password', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { apikey: c.chave }, payload: JSON.stringify({ email: c.email, password: c.senha }),
  });
  if (r.getResponseCode() !== 200) throw new Error('Login do leitor recusado (' + r.getResponseCode() + '). Confira e-mail e senha.');
  return JSON.parse(r.getContentText()).access_token;
}

function buscar_(c, token) {
  var todos = [], passo = 1000, de = 0;
  for (;;) {
    var r = UrlFetchApp.fetch(c.url + '/rest/v1/painel_registros?select=tipo,id,dados&excluido=eq.false&order=tipo.asc,id.asc&limit=' + passo + '&offset=' + de, {
      muteHttpExceptions: true,
      headers: { apikey: c.chave, Authorization: 'Bearer ' + token },
    });
    var cod = r.getResponseCode();
    if (cod !== 200 && cod !== 206) throw new Error('Não consegui ler o painel (' + cod + '): ' + r.getContentText().slice(0, 200));
    var linhas = JSON.parse(r.getContentText());
    todos = todos.concat(linhas);
    if (linhas.length < passo) return todos;
    de += passo;
  }
}

function dataPlanilha_(s) { var p = String(s).split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
function reais_(c) { return Math.round(Number(c || 0)) / 100; }

function escrever_(ss, nome, cab, linhas, formatos) {
  var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
  aba.clearContents();
  aba.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold');
  if (linhas.length) {
    var faixa = aba.getRange(2, 1, linhas.length, cab.length);
    faixa.setValues(linhas);
    for (var col in formatos) aba.getRange(2, Number(col), linhas.length, 1).setNumberFormat(formatos[col]);
  }
  aba.setFrozenRows(1);
  aba.autoResizeColumns(1, cab.length);
}

function atualizar() {
  var c = config_();
  var registros = buscar_(c, entrar_(c));
  var obras = {}, custos = [], contas = {}, saldos = [];
  registros.forEach(function (r) {
    if (!r.dados) return;
    if (r.tipo === 'obra') obras[r.id] = r.dados;
    else if (r.tipo === 'custo') custos.push(r.dados);
    else if (r.tipo === 'conta') contas[r.id] = r.dados;
    else if (r.tipo === 'saldo') saldos.push(r.dados);
  });
  var nome = function (id) { return obras[id] ? obras[id].nome : ''; };
  custos.sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dinheiro = 'R$ #,##0.00', dataFmt = 'dd/mm/yyyy';

  escrever_(ss, 'Lançamentos', ['Data', 'Obra', 'Categoria', 'Descrição', 'Fornecedor', 'Valor', 'Pagamento', 'Situação'],
    custos.map(function (k) {
      return [dataPlanilha_(k.data), nome(k.obraId), k.categoria, k.descricao || '', k.fornecedor || '', reais_(k.valor),
        PAGAMENTO[k.pagamento] || k.pagamento || '', k.pago ? 'Pago' : 'A pagar'];
    }), { 1: dataFmt, 6: dinheiro });

  var porObra = {};
  custos.forEach(function (k) {
    var o = porObra[k.obraId] || (porObra[k.obraId] = { gasto: 0, aPagar: 0, n: 0 });
    o.gasto += k.valor; o.n++; if (!k.pago) o.aPagar += k.valor;
  });
  var linhasObras = Object.keys(obras).map(function (id) {
    var o = obras[id], r = porObra[id] || { gasto: 0, aPagar: 0, n: 0 }, orc = o.orcamento || 0;
    return [o.nome, STATUS[o.status] || o.status, orc ? reais_(orc) : '', reais_(r.gasto), reais_(r.aPagar),
      orc ? reais_(orc - r.gasto) : '', orc ? r.gasto / orc : '', r.n];
  });
  escrever_(ss, 'Resumo por obra', ['Obra', 'Situação', 'Orçamento', 'Gasto', 'A pagar', 'Saldo do orçamento', '% do orçamento', 'Lançamentos'],
    linhasObras, { 3: dinheiro, 4: dinheiro, 5: dinheiro, 6: dinheiro, 7: '0%' });

  var porCat = {}, total = 0;
  custos.forEach(function (k) { porCat[k.categoria] = (porCat[k.categoria] || 0) + k.valor; total += k.valor; });
  escrever_(ss, 'Por categoria', ['Categoria', 'Valor', '% do total'],
    Object.keys(porCat).sort(function (a, b) { return porCat[b] - porCat[a]; })
      .map(function (cat) { return [cat, reais_(porCat[cat]), total ? porCat[cat] / total : 0]; }),
    { 2: dinheiro, 3: '0%' });

  // Último saldo conferido de cada conta.
  var ultimo = {};
  saldos.forEach(function (s) { if (!ultimo[s.contaId] || s.data > ultimo[s.contaId].data) ultimo[s.contaId] = s; });
  escrever_(ss, 'Contas', ['Conta', 'Banco', 'Obra', 'Saldo', 'Conferido em'],
    Object.keys(contas).filter(function (id) { return contas[id].ativa !== false; }).map(function (id) {
      var ct = contas[id], s = ultimo[id];
      return [ct.nome, ct.banco || '', ct.obraId ? nome(ct.obraId) : 'MB2 (empresa)', s ? reais_(s.valor) : '', s ? dataPlanilha_(s.data) : ''];
    }), { 4: dinheiro, 5: dataFmt });

  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', "dd/MM/yyyy 'às' HH:mm");
  var info = ss.getSheetByName('Atualização') || ss.insertSheet('Atualização');
  info.clearContents();
  info.getRange(1, 1, 3, 2).setValues([
    ['Última atualização', agora], ['Lançamentos', custos.length], ['Fonte', 'Painel MB2 (somente leitura; edite no painel, não aqui)'],
  ]);
  info.autoResizeColumns(1, 2);
}

function agendar() {
  desagendar();
  ScriptApp.newTrigger('atualizar').timeBased().everyHours(1).create();
  SpreadsheetApp.getActive().toast('Atualização automática a cada hora ligada.', 'Espelho MB2');
}

function desagendar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'atualizar') ScriptApp.deleteTrigger(t); });
}
