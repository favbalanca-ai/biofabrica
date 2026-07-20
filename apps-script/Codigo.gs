/**
 * BioFábrica · Controle de Produção
 * Backend Google Apps Script — usa uma planilha Google Sheets como banco de dados
 * compartilhado. Vários celulares acessam o mesmo web app e leem/gravam na planilha.
 *
 * Instalação: veja o README.md desta pasta.
 */

// ─── CONFIGURAÇÃO ──────────────────────────────────────────────────
// ID da planilha Google usada como banco de dados.
//  • Deixe vazio ('') → o app CRIA automaticamente uma planilha nova em
//    branco na primeira execução do setup (recomeçar do zero) e guarda o ID.
//  • Ou cole aqui o ID de uma planilha existente para usar ela.
const SHEET_ID = '';
// Nome da planilha nova criada automaticamente (quando SHEET_ID está vazio).
const NOVA_PLANILHA_NOME = 'BioFábrica — Controle de Produção';
// Pasta no Drive que agrupa a planilha, as fotos e os PDFs de laudo.
const PASTA_NOME = 'BioFábrica · Fazenda Água Viva';

const TAB = {
  FERM:    'Fermentadores',
  LOTES:   'Lotes',
  VISITAS: 'Visitas',
  AJUSTES: 'Ajustes',
  FUNC:    'Funcionarios',
  FOTOS:   'Fotos',
  INOC:    'Inoculos',
  MEIO:    'Meios',
  ORG:     'Organismos',
  PROD:    'Produtos',
  ACOES:   'Acoes',
  MED:     'Medicoes',
};

const FERMENTADORES = [
  { id: 'A1', volume: 1500, tipo: 'A', medida: 'L' },
  { id: 'A2', volume: 1500, tipo: 'A', medida: 'L' },
  { id: 'A3', volume: 1500, tipo: 'A', medida: 'L' },
  { id: 'A4', volume: 1500, tipo: 'A', medida: 'L' },
  { id: 'B1', volume: 1000, tipo: 'B', medida: 'L' },
  { id: 'B2', volume: 1000, tipo: 'B', medida: 'L' },
  { id: 'B3', volume: 1000, tipo: 'B', medida: 'L' },
  { id: 'B4', volume: 1000, tipo: 'B', medida: 'L' },
  { id: 'B5', volume: 1000, tipo: 'B', medida: 'L' },
  { id: 'B6', volume: 1000, tipo: 'B', medida: 'L' },
  // Salas de multiplicação via sólido (mesmo rastreamento; quantidade em kg).
  { id: 'S1', volume: '', tipo: 'S', medida: 'kg' },
  { id: 'S2', volume: '', tipo: 'S', medida: 'kg' },
];

const COLS = {
  [TAB.FERM]: ['id', 'volume', 'tipo', 'status'],
  [TAB.LOTES]: [
    'id', 'fermentador', 'loteNum', 'status',
    // Produção / identificação
    'produto', 'microrganismo', 'loteProduto', 'loteMeio', 'temperatura', 'ph',
    'dtInicio', 'dtFim', 'volumeInicial', 'volumeFinal', 'operador', 'obs',
    // Relatório de análise — Dados da amostra
    'numeroRelatorio', 'dataEmissao', 'cliente', 'tipoAmostra', 'tipoAmostraOutro',
    'meioCultura', 'tipoCompressor', 'dataMultiplicacao', 'dataColeta',
    'responsavelColeta', 'outrasInformacoes',
    // Relatório de análise — Dados da análise
    'dataRecebimento', 'dataAnalise', 'tecnicaPlaqueamento', 'diluicoesPlaqueadas',
    'tempIncubacao', 'tempoIncubacao', 'choqueTermico', 'coloracaoGram', 'responsavelAnalise',
    // Resultados
    'resultadosQualitativos', 'outrosMicrorganismos', 'resultadoQuantitativo',
    // Controle
    'criadoPor', 'criadoEm', 'atualizadoEm',
    // Seleções de catálogo (inóculo e meio de cultura usados na produção)
    'inoculo', 'meio', 'tempoProducaoH',
    // Volume de fabricação (para dosear insumos) e lote do inóculo usado
    'volumeFab', 'loteInoculo',
    // Sólido (salas): tipo de substrato e número de sacos
    'numeroSacos', 'tipoSubstrato', 'tipoSubstratoOutro',
  ],
  [TAB.VISITAS]: ['id', 'loteId', 'funcionario', 'objetivo', 'dtEntrada', 'dtSaida'],
  [TAB.AJUSTES]: ['id', 'loteId', 'tipo', 'dt', 'valor', 'operador', 'produto', 'obs'],
  [TAB.FUNC]: ['id', 'nome', 'funcao', 'ativo'],
  [TAB.FOTOS]: ['id', 'loteId', 'categoria', 'fileId', 'criadoEm'],
  [TAB.INOC]: ['id', 'nome', 'receita', 'ativo', 'tempoHoras', 'dose', 'doseUnid'],
  [TAB.MEIO]: ['id', 'nome', 'receita', 'ativo', 'tempoHoras', 'dose', 'doseUnid'],
  [TAB.ORG]: ['id', 'nome', 'ativo'],
  // Produtos: ligam o nome do produto ao organismo, inóculo e meio de cultura.
  [TAB.PROD]: ['id', 'nome', 'organismo', 'inoculo', 'meio', 'ativo'],
  // Ações realizadas durante uma visita (coleta/vistoria em um fermentador/lote).
  [TAB.ACOES]: ['id', 'visitaId', 'tipo', 'fermentador', 'loteId', 'dt', 'obs'],
  // Medições de parâmetros ao longo do processo (série temporal por lote).
  [TAB.MED]: ['id', 'loteId', 'dt', 'ph', 'temperatura', 'oxigenio', 'agitacao', 'obs'],
};

// Opções (espelham o Index.html) para desenhar os "checkboxes" no PDF.
const OPC_TIPO_AMOSTRA = ['Água', 'Inóculo', 'Meio de cultura', 'Multiplicado', 'Outro'];
const OPC_MEIO_CULTURA = ['BAC', 'SM', 'BUG', 'CATP', 'FINISH', 'WHITE', 'Não se aplica'];
const OPC_COMPRESSOR = ['Odontológico/Parafuso', 'Radial', 'Venturi'];
const LAUDO_TITULO = 'RELATÓRIO DE ANÁLISE MICROBIOLÓGICA ON FARM';
const LAUDO_CONSIDERACOES = [
  'A coloração de Gram foi realizada utilizando uma alíquota da amostra líquida.',
  'A amostra será retida para contraprova por 7 dias, contados a partir da emissão do relatório.',
];
const LAUDO_OBS_CHOQUE = 'Observação: Plaqueamento realizado com uma alíquota da amostra submetida ao choque térmico, visando a obtenção da contagem de esporos.';
const LAUDO_NOTAS = [
  '*BC: baixa contagem, não atingiu o intervalo de contagem (30 a 300 colônias).',
  '**Ausente: ausência de colônias de outros microrganismos.',
  '***Presente: presença de colônias de outros microrganismos.',
  '****Técnica utilizada: Diluição seriada e espalhamento (Spread plate) em meio de cultura TSA (Ágar Tryptic Soy) para a quantificação e determinação da concentração. Técnica de Gram para visualização da bactéria de interesse e outros microrganismos. Incubação das placas a 30±2 ºC por 24 a 48 horas. Após o tempo de incubação é realizada a contagem total e identificação da morfologia do microrganismo de interesse.',
];

// ─── ENTRADA WEB ───────────────────────────────────────────────────
// doGet: sem parâmetro serve a tela (HtmlService); com ?fn=... responde JSON
// (útil para o app do GitHub Pages testar a conexão).
function doGet(e) {
  if (e && e.parameter && e.parameter.fn) return apiRouter_(e.parameter.fn, e.parameter);
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('BioFábrica · Controle de Produção')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// doPost: API JSON usada pelo app hospedado no GitHub Pages.
// O app envia o corpo como text/plain (evita o preflight CORS do Apps Script):
//   body = { "fn": "salvarLote", "args": [ ... ] }
function doPost(e) {
  var body = {};
  try { body = (e && e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : {}; } catch (err) {}
  return apiRouter_(body.fn, body, body.args || []);
}

// Mapa explícito de funções expostas (allowlist). Só estas podem ser chamadas de fora.
function apiHandlers_() {
  return {
    getEstado: getEstado,
    salvarLote: salvarLote,
    excluirLote: excluirLote,
    setFermentadorStatus: setFermentadorStatus,
    salvarCatalogo: salvarCatalogo,
    excluirCatalogo: excluirCatalogo,
    addFuncionario: addFuncionario,
    excluirFuncionario: excluirFuncionario,
    addMedicao: addMedicao,
    excluirMedicao: excluirMedicao,
    addAjuste: addAjuste,
    excluirAjuste: excluirAjuste,
    addVisita: addVisita,
    atualizarVisita: atualizarVisita,
    excluirVisita: excluirVisita,
    addAcao: addAcao,
    excluirAcao: excluirAcao,
    salvarFoto: salvarFoto,
    excluirFoto: excluirFoto,
    gerarLaudoPdf: gerarLaudoPdf,
  };
}

// Executa uma função da allowlist e devolve JSON { ok, data } ou { ok:false, error }.
function apiRouter_(fn, body, args) {
  var out;
  try {
    var handlers = apiHandlers_();
    if (!fn || !handlers.hasOwnProperty(fn)) throw new Error('Função não permitida: ' + fn);
    // Se args não veio (ex.: GET), tenta reconstruir de body.args em JSON.
    if (!args) {
      args = [];
      if (body && body.args) { try { args = JSON.parse(body.args); } catch (e2) { args = [body.args]; } }
    }
    var data = handlers[fn].apply(null, args || []);
    out = { ok: true, data: data };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// ─── PLANILHA ──────────────────────────────────────────────────────
// Resolve qual planilha usar, nesta ordem:
//  1) SHEET_ID fixo no código (se preenchido);
//  2) planilha vinculada ao script (Extensões → Apps Script dentro da planilha);
//  3) ID guardado nas propriedades do script (planilha criada automaticamente);
//  4) cria uma planilha NOVA em branco e guarda o ID (recomeçar do zero).
function ss_() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  var vinculada = SpreadsheetApp.getActiveSpreadsheet();
  if (vinculada) return vinculada;
  var props = PropertiesService.getScriptProperties();
  var salvo = props.getProperty('SHEET_ID');
  if (salvo) {
    try { return SpreadsheetApp.openById(salvo); } catch (e) { /* recriada abaixo */ }
  }
  // Cria a planilha nova e a coloca dentro da pasta base (BioFábrica · Fazenda Água Viva).
  var nova = SpreadsheetApp.create(NOVA_PLANILHA_NOME);
  props.setProperty('SHEET_ID', nova.getId());
  try { moverParaPastaBase_(nova.getId()); } catch (e) { /* sem permissão de Drive: segue na raiz */ }
  return nova;
}

// ─── PASTA BASE (Drive) ────────────────────────────────────────────
/** Pasta única no Drive que agrupa a planilha, as fotos e os PDFs. Cria se não existir. */
function pastaBase_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('BASE_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* recriada abaixo */ }
  }
  // Reaproveita uma pasta de mesmo nome, se já existir; senão cria.
  var it = DriveApp.getFoldersByName(PASTA_NOME);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(PASTA_NOME);
  props.setProperty('BASE_FOLDER_ID', folder.getId());
  return folder;
}

/** Move um arquivo do Drive (por id) para dentro da pasta base. */
function moverParaPastaBase_(fileId) {
  var file = DriveApp.getFileById(fileId);
  var base = pastaBase_();
  base.addFile(file);
  // Remove da raiz (My Drive) para não ficar duplicado na listagem.
  var parents = file.getParents();
  while (parents.hasNext()) {
    var p = parents.next();
    if (p.getId() !== base.getId()) { try { p.removeFile(file); } catch (e) {} }
  }
  return file;
}

/** URL da planilha em uso (útil para achar a planilha nova criada pelo setup). */
function urlPlanilha() {
  return ss_().getUrl();
}

function sheet_(tab) {
  const ss = ss_();
  let sh = ss.getSheetByName(tab);
  if (!sh) {
    sh = ss.insertSheet(tab);
    sh.appendRow(COLS[tab]);
    sh.setFrozenRows(1);
  }
  // Garante que a aba tenha colunas suficientes (abas antigas podem ter menos
  // colunas do que o código novo espera — evita "out of bounds").
  const need = COLS[tab].length;
  const have = sh.getMaxColumns();
  if (have < need) sh.insertColumnsAfter(have, need - have);
  return sh;
}

/** Cria as abas, cabeçalhos e semeia os fermentadores. Rode uma vez após colar o código. */
function setup() {
  Object.keys(COLS).forEach((tab) => {
    const sh = sheet_(tab);
    // Garante o cabeçalho na primeira linha.
    sh.getRange(1, 1, 1, COLS[tab].length).setValues([COLS[tab]]);
    sh.setFrozenRows(1);
  });
  const fsh = sheet_(TAB.FERM);
  if (fsh.getLastRow() < 2) {
    const rows = FERMENTADORES.map((f) => [f.id, f.volume, f.tipo, 'Disponível']);
    fsh.getRange(2, 1, rows.length, COLS[TAB.FERM].length).setValues(rows);
  }
  // Garante a pasta no Drive (e dispara a autorização do Drive para gerar PDFs/fotos).
  pastaArquivos_();
  var url = ss_().getUrl();
  var pastaUrl = '';
  try { pastaUrl = pastaBase_().getUrl(); } catch (e) {}
  Logger.log('Planilha pronta: ' + url);
  if (pastaUrl) Logger.log('Pasta no Drive: ' + pastaUrl);
  return 'Planilha configurada com sucesso.\n'
    + (pastaUrl ? 'Pasta no Drive: ' + pastaUrl + '\n' : '')
    + 'Planilha (banco de dados): ' + url;
}

/** Adiciona um menu na planilha para rodar o setup facilmente. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('BioFábrica')
    .addItem('Configurar planilha', 'setup')
    .addToUi();
}

// ─── HELPERS DE LEITURA/ESCRITA ────────────────────────────────────
// Converte o valor de uma célula sempre para texto no formato que o app espera.
// (O Google devolve datas como objeto Date e números como number — isso pode
//  quebrar o envio dos dados ao navegador. Aqui normalizamos tudo para string.)
function celStr_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    var tz = Session.getScriptTimeZone();
    if (v.getHours() === 0 && v.getMinutes() === 0 && v.getSeconds() === 0) {
      return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    }
    return Utilities.formatDate(v, tz, "yyyy-MM-dd'T'HH:mm");
  }
  return String(v);
}

function readAll_(tab) {
  const sh = sheet_(tab);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const head = COLS[tab];
  const values = sh.getRange(2, 1, last - 1, head.length).getValues();
  return values
    .filter((r) => String(r[0]).trim() !== '')
    .map((r) => {
      const o = {};
      head.forEach((h, i) => { o[h] = celStr_(r[i]); });
      return o;
    });
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function rowFromObj_(tab, obj) {
  return COLS[tab].map((h) => (obj[h] === undefined || obj[h] === null ? '' : obj[h]));
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function nowIso_() {
  return new Date().toISOString();
}

function usuario_() {
  const email = Session.getActiveUser().getEmail();
  return email || 'anônimo';
}

// ─── API (chamada pelo front via google.script.run) ────────────────

/** Estado completo: fermentadores, lotes, visitas e ajustes. */
function getEstado() {
  const ferm = readAll_(TAB.FERM);
  const statusById = {};
  ferm.forEach((f) => { statusById[f.id] = f.status || 'Disponível'; });
  return {
    config: FERMENTADORES,
    fermentadores: statusById,
    lotes: readAll_(TAB.LOTES),
    visitas: readAll_(TAB.VISITAS),
    ajustes: readAll_(TAB.AJUSTES),
    funcionarios: readAll_(TAB.FUNC).filter(ativo_),
    inoculos: readAll_(TAB.INOC).filter(ativo_),
    meios: readAll_(TAB.MEIO).filter(ativo_),
    organismos: readAll_(TAB.ORG).filter(ativo_),
    produtos: readAll_(TAB.PROD).filter(ativo_),
    acoes: readAll_(TAB.ACOES),
    medicoes: readAll_(TAB.MED),
    fotos: readAll_(TAB.FOTOS),
    usuario: usuario_(),
    serverTime: nowIso_(),
  };
}

function ativo_(o) { return String(o.ativo) !== 'false'; }

// Catálogos: inóculos, meios de cultura e organismos.
function catTab_(tipo) {
  return tipo === 'inoculo' ? TAB.INOC : tipo === 'meio' ? TAB.MEIO
    : tipo === 'organismo' ? TAB.ORG : tipo === 'produto' ? TAB.PROD : null;
}

function salvarCatalogo(tipo, item) {
  return withLock_(function () {
    var tab = catTab_(tipo);
    if (!tab) throw new Error('Tipo de cadastro inválido');
    var obj = { id: item.id, nome: item.nome, ativo: true };
    if (tab === TAB.INOC || tab === TAB.MEIO) {
      obj.receita = item.receita || ''; obj.tempoHoras = item.tempoHoras || '';
      obj.dose = item.dose || ''; obj.doseUnid = item.doseUnid || '';
    }
    if (tab === TAB.PROD) {
      obj.organismo = item.organismo || ''; obj.inoculo = item.inoculo || ''; obj.meio = item.meio || '';
    }
    var sh = sheet_(tab);
    var row = findRow_(sh, item.id);
    if (row === -1) sh.appendRow(rowFromObj_(tab, obj));
    else sh.getRange(row, 1, 1, COLS[tab].length).setValues([rowFromObj_(tab, obj)]);
    return obj;
  });
}

function excluirCatalogo(tipo, id) {
  return withLock_(function () {
    var tab = catTab_(tipo);
    if (!tab) throw new Error('Tipo de cadastro inválido');
    var sh = sheet_(tab);
    var row = findRow_(sh, id);
    if (row !== -1) sh.deleteRow(row);
    return true;
  });
}

function addFuncionario(f) {
  return withLock_(function () {
    var func = { id: f.id, nome: f.nome, funcao: f.funcao || '', ativo: true };
    sheet_(TAB.FUNC).appendRow(rowFromObj_(TAB.FUNC, func));
    return func;
  });
}

function excluirFuncionario(id) {
  return withLock_(function () {
    var sh = sheet_(TAB.FUNC);
    var row = findRow_(sh, id);
    if (row !== -1) sh.deleteRow(row);
    return true;
  });
}

// ─── DRIVE: FOTOS E PDF ────────────────────────────────────────────
/** Pasta no Drive onde ficam as fotos e os PDFs de laudo. */
function pastaArquivos_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('folderId');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) {}
  }
  // Subpasta "Fotos e Laudos" dentro da pasta base, para manter tudo junto.
  var base;
  try { base = pastaBase_(); } catch (e) { base = null; }
  var folder = base ? base.createFolder('Fotos e Laudos')
                    : DriveApp.createFolder('BioFábrica — Fotos e Laudos');
  props.setProperty('folderId', folder.getId());
  return folder;
}

/**
 * Salva uma foto (base64) no Drive e registra na aba Fotos.
 * foto = { id, loteId, categoria, base64, mimeType, nome }
 */
function salvarFoto(foto) {
  return withLock_(function () {
    var bytes = Utilities.base64Decode(foto.base64);
    var blob = Utilities.newBlob(bytes, foto.mimeType || 'image/jpeg', foto.nome || (foto.id + '.jpg'));
    var file = pastaArquivos_().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    var rec = { id: foto.id, loteId: foto.loteId, categoria: foto.categoria || '', fileId: file.getId(), criadoEm: nowIso_() };
    sheet_(TAB.FOTOS).appendRow(rowFromObj_(TAB.FOTOS, rec));
    return rec;
  });
}

function excluirFoto(id) {
  return withLock_(function () {
    var sh = sheet_(TAB.FOTOS);
    var row = findRow_(sh, id);
    if (row !== -1) {
      var rec = sh.getRange(row, 1, 1, COLS[TAB.FOTOS].length).getValues()[0];
      var fileId = rec[COLS[TAB.FOTOS].indexOf('fileId')];
      try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) {}
      sh.deleteRow(row);
    }
    return true;
  });
}

/**
 * Gera o PDF do laudo de um lote (com as fotos anexadas), salva no Drive
 * e retorna { base64, filename, url }.
 */
function gerarLaudoPdf(loteId) {
  var lote = readAll_(TAB.LOTES).filter(function (l) { return String(l.id) === String(loteId); })[0];
  if (!lote) throw new Error('Lote não encontrado');
  var fotos = readAll_(TAB.FOTOS).filter(function (f) { return String(f.loteId) === String(loteId); });
  var html = laudoHtml_(lote, fotos);
  var nome = 'Laudo ' + (lote.numeroRelatorio ? ('nº ' + lote.numeroRelatorio + ' ') : '') + (lote.loteNum || lote.id);
  var pdfBlob = Utilities.newBlob(html, 'text/html', nome + '.html').getAs('application/pdf');
  pdfBlob.setName(nome + '.pdf');
  var file = pastaArquivos_().createFile(pdfBlob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return {
    base64: Utilities.base64Encode(pdfBlob.getBytes()),
    filename: nome + '.pdf',
    url: file.getUrl(),
  };
}

function fmtDataPt_(s) {
  if (!s) return '—';
  var str = String(s);
  var m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];
  var d = new Date(str);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  return str;
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function chk_(opcoes, selecionado) {
  return opcoes.map(function (o) {
    return (String(o) === String(selecionado) ? '&#9746;' : '&#9744;') + ' ' + esc_(o);
  }).join('&nbsp;&nbsp; ');
}

function linhaKV_(k, v) {
  return '<tr><td class="k">' + esc_(k) + '</td><td>' + (v == null || v === '' ? '—' : esc_(v)) + '</td></tr>';
}

function laudoHtml_(l, fotos) {
  var f = FERMENTADORES.filter(function (x) { return x.id === l.fermentador; })[0] || { volume: '' };
  var conc = l.resultadoQuantitativo || '';
  if (conc && !/ufc/i.test(conc)) conc = conc + ' UFC/mL';

  fotos = fotos || [];
  function dataImg_(ft) {
    try {
      var b = DriveApp.getFileById(ft.fileId).getBlob();
      return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    } catch (e) { return ''; }
  }
  function grupoFotos_(titulo, filtro, nota) {
    var sel = fotos.filter(filtro);
    if (!sel.length) return '';
    var itens = sel.map(function (ft) {
      var img = dataImg_(ft);
      return '<div class="foto">' + (img ? '<img src="' + img + '">' : '<div class="semimg">(imagem indisponível)</div>') +
        '<div class="cap">' + esc_(ft.categoria || 'Foto') + '</div></div>';
    }).join('');
    return '<div class="secao3">' + esc_(titulo) + '</div><div class="fotos">' + itens + '</div>' +
      (nota ? '<div class="notaobs">' + esc_(nota) + '</div>' : '');
  }
  var anexos = '';
  if (fotos.length) {
    var usadas_ = /placa|microscopia|gram|outros|sem choque/i;
    anexos = '<div class="secao2">Anexos — Fotos da análise</div>' +
      grupoFotos_('Fotos da análise com choque térmico', function (ft) { return /placa/i.test(ft.categoria || ''); }, LAUDO_OBS_CHOQUE) +
      grupoFotos_('Microscopia (100x) e outros microrganismos', function (ft) { return /microscopia|gram|outros|sem choque/i.test(ft.categoria || ''); }, '') +
      grupoFotos_('Outras fotos', function (ft) { return !usadas_.test(ft.categoria || ''); }, '');
  }

  var considera = LAUDO_CONSIDERACOES.map(function (c) { return '<li>' + esc_(c) + '</li>'; }).join('');
  var notas = LAUDO_NOTAS.map(function (n) { return '<div>' + esc_(n) + '</div>'; }).join('');

  return '' +
    '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#222;margin:26px;}' +
    'h1{font-size:15px;text-align:center;margin:0 0 2px;}' +
    '.sub{text-align:center;font-size:10px;color:#555;margin:0 0 10px;}' +
    'table{width:100%;border-collapse:collapse;margin:6px 0;}' +
    'td{border:1px solid #999;padding:5px 7px;vertical-align:top;}' +
    '.secao td{background:#e9e2d0;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;text-align:center;}' +
    '.secao2{background:#e9e2d0;font-weight:bold;text-transform:uppercase;padding:5px 7px;border:1px solid #999;margin-top:10px;text-align:center;}' +
    '.k{width:40%;font-weight:bold;background:#f6f2e8;}' +
    '.th td{font-weight:bold;background:#f6f2e8;}' +
    '.consid{font-size:10px;margin:4px 0;padding-left:16px;}' +
    '.fotos{display:flex;flex-wrap:wrap;margin-top:6px;}' +
    '.foto{width:47%;margin:1.5%;text-align:center;}' +
    '.foto img{max-width:100%;max-height:230px;border:1px solid #ccc;}' +
    '.foto .cap{font-size:9px;color:#555;margin-top:3px;}' +
    '.semimg{font-size:9px;color:#999;padding:20px;border:1px dashed #ccc;}' +
    '.secao3{font-weight:bold;font-size:10px;text-transform:uppercase;color:#5a4030;margin:8px 0 2px;}' +
    '.notaobs{font-size:9px;color:#555;font-style:italic;margin:2px 0 6px;}' +
    '.ufcnote{font-size:9px;color:#555;margin:2px 0 6px;}' +
    '.notas{font-size:8.5px;color:#555;margin-top:12px;border-top:1px solid #ccc;padding-top:6px;line-height:1.4;}' +
    '.notas > div{margin-bottom:3px;}' +
    '.rodape{margin-top:12px;font-size:10px;color:#555;}' +
    '</style></head><body>' +
    '<h1>' + esc_(LAUDO_TITULO) + '</h1>' +
    '<div class="sub">Fazenda Água Viva · BioFábrica</div>' +
    '<table><tr><td class="k">Nº do Relatório</td><td>' + esc_(l.numeroRelatorio || '—') +
      '</td><td class="k">Data da emissão</td><td>' + fmtDataPt_(l.dataEmissao) + '</td></tr></table>' +
    '<table>' +
      '<tr class="secao"><td colspan="2">Dados da amostra</td></tr>' +
      linhaKV_('Cliente / Fazenda', l.cliente || 'Fazenda Água Viva') +
      '<tr><td class="k">Tipo de amostra</td><td class="chk">' + chk_(OPC_TIPO_AMOSTRA, l.tipoAmostra) +
        (l.tipoAmostra === 'Outro' && l.tipoAmostraOutro ? ' (' + esc_(l.tipoAmostraOutro) + ')' : '') + '</td></tr>' +
      '<tr><td class="k">Meio de cultura</td><td class="chk">' + chk_(OPC_MEIO_CULTURA, l.meioCultura) + '</td></tr>' +
      '<tr><td class="k">Tipo de compressor</td><td class="chk">' + chk_(OPC_COMPRESSOR, l.tipoCompressor) + '</td></tr>' +
      linhaKV_('Nome do produto', l.produto) +
      linhaKV_('Microrganismo', l.microrganismo) +
      linhaKV_('Lote do produto', l.loteProduto) +
      linhaKV_('Lote meio de cultura', l.loteMeio) +
      linhaKV_('Temperatura', l.temperatura || 'N/A') +
      linhaKV_('pH', l.ph || 'N/A') +
      linhaKV_('Fermentador', l.fermentador + ' (' + f.volume + ' L)') +
      linhaKV_('Data da multiplicação', fmtDataPt_(l.dataMultiplicacao)) +
      linhaKV_('Data da coleta', fmtDataPt_(l.dataColeta)) +
      linhaKV_('Responsável pela coleta', l.responsavelColeta) +
      linhaKV_('Outras informações', l.outrasInformacoes) +
    '</table>' +
    '<table>' +
      '<tr class="secao"><td colspan="2">Dados da análise</td></tr>' +
      linhaKV_('Data de recebimento da amostra', fmtDataPt_(l.dataRecebimento)) +
      linhaKV_('Data da análise', fmtDataPt_(l.dataAnalise)) +
      linhaKV_('Técnica de plaqueamento', l.tecnicaPlaqueamento || 'Spread plate') +
      linhaKV_('Diluições plaqueadas', l.diluicoesPlaqueadas || '10-3 , 10-4 e 10-5') +
      linhaKV_('Temperatura de incubação', l.tempIncubacao || '30±02 °C') +
      linhaKV_('Tempo de incubação', l.tempoIncubacao || '24 a 48 h') +
      linhaKV_('Choque térmico', l.choqueTermico) +
      linhaKV_('Coloração de Gram', l.coloracaoGram) +
      linhaKV_('Responsável', l.responsavelAnalise) +
    '</table>' +
    '<table>' +
      '<tr class="secao"><td colspan="2">Resultados</td></tr>' +
      '<tr class="th"><td>Descrição</td><td>Concentração (UFC/mL)</td></tr>' +
      '<tr><td>Microrganismo de interesse (com choque térmico)</td><td>' + (conc || '—') + '</td></tr>' +
      '<tr><td>Presença de outros microrganismos</td><td>' + esc_(l.outrosMicrorganismos || '—') + '</td></tr>' +
    '</table>' +
    '<div class="ufcnote">UFC: Unidades Formadoras de Colônias.</div>' +
    '<div class="secao2">Considerações</div><ul class="consid">' + considera + '</ul>' +
    anexos +
    '<div class="notas">' + notas + '</div>' +
    '<div class="rodape">Emitido em ' + fmtDataPt_(nowIso_()) + '</div>' +
    '</body></html>';
}

function setFermentadorStatus(id, status) {
  return withLock_(() => {
    const sh = sheet_(TAB.FERM);
    let row = findRow_(sh, id);
    if (row === -1) {
      const cfg = FERMENTADORES.find((f) => f.id === id) || { volume: '', tipo: '' };
      sh.appendRow([id, cfg.volume, cfg.tipo, status]);
    } else {
      sh.getRange(row, 4).setValue(status); // coluna "status"
    }
    return true;
  });
}

/** Cria ou atualiza um lote (objeto com as colunas de Lotes). */
function salvarLote(lote) {
  return withLock_(() => {
    const sh = sheet_(TAB.LOTES);
    const l = Object.assign({}, lote);
    l.atualizadoEm = nowIso_();
    let row = findRow_(sh, l.id);
    if (row === -1) {
      if (!l.criadoPor) l.criadoPor = usuario_();
      if (!l.criadoEm) l.criadoEm = nowIso_();
      sh.appendRow(rowFromObj_(TAB.LOTES, l));
    } else {
      // Preserva criadoPor/criadoEm existentes se não vierem preenchidos.
      const atuais = sh.getRange(row, 1, 1, COLS[TAB.LOTES].length).getValues()[0];
      const idxCriadoPor = COLS[TAB.LOTES].indexOf('criadoPor');
      const idxCriadoEm = COLS[TAB.LOTES].indexOf('criadoEm');
      if (!l.criadoPor) l.criadoPor = atuais[idxCriadoPor];
      if (!l.criadoEm) l.criadoEm = atuais[idxCriadoEm];
      sh.getRange(row, 1, 1, COLS[TAB.LOTES].length).setValues([rowFromObj_(TAB.LOTES, l)]);
    }
    return l;
  });
}

function excluirLote(id) {
  return withLock_(() => {
    const sh = sheet_(TAB.LOTES);
    const row = findRow_(sh, id);
    if (row !== -1) sh.deleteRow(row);
    // Remove visitas/ajustes/medições/fotos vinculados.
    removerPorLote_(TAB.VISITAS, id);
    removerPorLote_(TAB.AJUSTES, id);
    removerPorLote_(TAB.MED, id);
    removerFotosDoLote_(id);
    return true;
  });
}

function removerFotosDoLote_(loteId) {
  var fotos = readAll_(TAB.FOTOS).filter(function (f) { return String(f.loteId) === String(loteId); });
  fotos.forEach(function (f) { try { DriveApp.getFileById(f.fileId).setTrashed(true); } catch (e) {} });
  removerPorLote_(TAB.FOTOS, loteId);
}

function removerPorLote_(tab, loteId) {
  const sh = sheet_(tab);
  const last = sh.getLastRow();
  if (last < 2) return;
  const idxLote = COLS[tab].indexOf('loteId');
  const values = sh.getRange(2, 1, last - 1, COLS[tab].length).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][idxLote]) === String(loteId)) sh.deleteRow(i + 2);
  }
}

function addVisita(v) {
  return withLock_(() => {
    sheet_(TAB.VISITAS).appendRow(rowFromObj_(TAB.VISITAS, v));
    return v;
  });
}

function atualizarVisita(v) {
  return withLock_(() => {
    const sh = sheet_(TAB.VISITAS);
    const row = findRow_(sh, v.id);
    if (row !== -1) sh.getRange(row, 1, 1, COLS[TAB.VISITAS].length).setValues([rowFromObj_(TAB.VISITAS, v)]);
    return v;
  });
}

function excluirVisita(id) {
  return withLock_(() => {
    const sh = sheet_(TAB.VISITAS);
    const row = findRow_(sh, id);
    if (row !== -1) sh.deleteRow(row);
    // Remove as ações (coletas/vistorias) desta visita.
    const ash = sheet_(TAB.ACOES);
    const last = ash.getLastRow();
    if (last >= 2) {
      const idx = COLS[TAB.ACOES].indexOf('visitaId');
      const vals = ash.getRange(2, 1, last - 1, COLS[TAB.ACOES].length).getValues();
      for (let i = vals.length - 1; i >= 0; i--) {
        if (String(vals[i][idx]) === String(id)) ash.deleteRow(i + 2);
      }
    }
    return true;
  });
}

function addAcao(a) {
  return withLock_(() => {
    sheet_(TAB.ACOES).appendRow(rowFromObj_(TAB.ACOES, a));
    return a;
  });
}

function addMedicao(m) {
  return withLock_(() => {
    sheet_(TAB.MED).appendRow(rowFromObj_(TAB.MED, m));
    return m;
  });
}

function excluirMedicao(id) {
  return withLock_(() => {
    const sh = sheet_(TAB.MED);
    const row = findRow_(sh, id);
    if (row !== -1) sh.deleteRow(row);
    return true;
  });
}

function excluirAcao(id) {
  return withLock_(() => {
    const sh = sheet_(TAB.ACOES);
    const row = findRow_(sh, id);
    if (row !== -1) sh.deleteRow(row);
    return true;
  });
}

function addAjuste(a) {
  return withLock_(() => {
    sheet_(TAB.AJUSTES).appendRow(rowFromObj_(TAB.AJUSTES, a));
    return a;
  });
}

function excluirAjuste(id) {
  return withLock_(() => {
    const sh = sheet_(TAB.AJUSTES);
    const row = findRow_(sh, id);
    if (row !== -1) sh.deleteRow(row);
    return true;
  });
}
