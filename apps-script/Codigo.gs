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
  USERS:   'Usuarios',
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
    // Avulsa (externa) e laudo de fungo (listas de contagem salvas como texto "a,b,c")
    'tipoAnalise', 'identAmostra', 'periodoExec', 'fungoDil', 'fungoC1', 'fungoC2', 'fungoGerm', 'respFuncao',
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
  // Usuários do app (controle de acesso). A senha nunca é guardada em texto:
  // guardamos só o "hash" (SHA-256) + um "sal" aleatório. perfil: admin | operador.
  [TAB.USERS]: ['id', 'nome', 'senhaHash', 'salt', 'perfil', 'ativo', 'criadoEm'],
};

// Opções (espelham o Index.html) para desenhar os "checkboxes" no PDF.
const OPC_TIPO_AMOSTRA = ['Água', 'Inóculo', 'Meio de cultura', 'Multiplicado', 'Outro'];
const OPC_MEIO_CULTURA = ['BAC', 'SM', 'BUG', 'CATP', 'FINISH', 'WHITE', 'Não se aplica'];
const OPC_COMPRESSOR = ['Odontológico/Parafuso', 'Radial', 'Venturi'];
const LAUDO_TITULO = 'RELATÓRIO DE ANÁLISE MICROBIOLÓGICA ON FARM – SOLUBIO';
const LAUDO_RODAPE = 'Rodovia GO 184, km 09 – Zona Rural, Jataí – GO, CEP 75.809-899. Contato: (64) 99975-9910';
const LAUDO_FUNGO_TITULO = 'RESULTADO MICROBIOLÓGICO — FUNGO';
const FATOR_NEUBAUER = 25 * 1e4; // 25 quadrados médios × 10⁴ (câmara de Neubauer)
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
    salvarUsuario: salvarUsuario,
    excluirUsuario: excluirUsuario,
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
  const lotes = readAll_(TAB.LOTES).map(function (l) {
    l.fungoC1 = parseFungo_(l.fungoC1); l.fungoC2 = parseFungo_(l.fungoC2); return l; // texto → lista
  });
  return {
    config: FERMENTADORES,
    fermentadores: statusById,
    lotes: lotes,
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
    usuarios: readAll_(TAB.USERS).filter(ativo_),
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

// Usuários (controle de acesso). Grava/atualiza pelo id. A senha chega já como
// hash (SHA-256) calculado no app — o servidor nunca vê a senha em texto.
function salvarUsuario(u) {
  return withLock_(function () {
    var obj = {
      id: u.id, nome: u.nome, senhaHash: u.senhaHash || '', salt: u.salt || '',
      perfil: u.perfil === 'admin' ? 'admin' : 'operador', ativo: true,
      criadoEm: u.criadoEm || nowIso_(),
    };
    var sh = sheet_(TAB.USERS);
    var row = findRow_(sh, u.id);
    if (row === -1) sh.appendRow(rowFromObj_(TAB.USERS, obj));
    else sh.getRange(row, 1, 1, COLS[TAB.USERS].length).setValues([rowFromObj_(TAB.USERS, obj)]);
    return obj;
  });
}

function excluirUsuario(id) {
  return withLock_(function () {
    var sh = sheet_(TAB.USERS);
    var row = findRow_(sh, id);
    if (row !== -1) sh.deleteRow(row);
    return true;
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
  lote.fungoC1 = parseFungo_(lote.fungoC1); lote.fungoC2 = parseFungo_(lote.fungoC2);
  var fotos = readAll_(TAB.FOTOS).filter(function (f) { return String(f.loteId) === String(loteId); });
  var html = ehFungo_(lote) ? laudoFungoHtml_(lote, fotos) : laudoHtml_(lote, fotos);
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

// ── Avulsa / Fungo: serialização das listas e cálculos (espelham o app) ──
function serFungo_(v) { return Array.isArray(v) ? v.join(',') : (v == null ? '' : String(v)); }
function parseFungo_(v) { v = String(v == null ? '' : v); return v === '' ? [] : v.split(','); }
function numBR_(v) { if (v === '' || v == null) return null; var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
function toSup_(s) { var m = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻'}; return String(s).split('').map(function (c) { return m[c] || c; }).join(''); }
function fmtUFCnum_(n) {
  if (n === null || isNaN(n)) return '—';
  if (n < 1000) return String(Math.round(n));
  var e = Math.floor(Math.log10(n)); var mant = n / Math.pow(10, e);
  return mant.toFixed(1).replace('.', ',') + '×10' + toSup_(String(e));
}
function fungoMedia_(arr) { var v = (arr || []).map(numBR_).filter(function (x) { return x !== null; }); if (!v.length) return null; return v.reduce(function (a, b) { return a + b; }, 0) / v.length; }
function fungoMediaTxt_(m) { return m == null ? '—' : m.toFixed(1).replace('.', ','); }
function fungoResultadoNum_(l) {
  var m1 = fungoMedia_(l.fungoC1), m2 = fungoMedia_(l.fungoC2);
  var ms = [m1, m2].filter(function (x) { return x !== null; });
  if (!ms.length) return null;
  var mean = ms.reduce(function (a, b) { return a + b; }, 0) / ms.length;
  return mean * FATOR_NEUBAUER * Math.pow(10, Number(l.fungoDil || 2));
}
function dilTxt_(pow) { return '10⁻' + toSup_(Number(pow || 2)); }
function substratoTxt_(l) { return l.tipoSubstrato === 'Outro' ? (l.tipoSubstratoOutro || 'Outro') : (l.tipoSubstrato || ''); }
function nomeUnidade_(id) { return id === 'S1' ? 'Sala 1' : id === 'S2' ? 'Sala 2' : id; }
function ehSala_(id) { var f = FERMENTADORES.filter(function (x) { return x.id === id; })[0]; return !!(f && f.tipo === 'S'); }
function ehAvulsa_(l) { return !!(l && l.fermentador === 'AVULSA'); }
function ehFungo_(l) { return ehSala_(l && l.fermentador) || !!(l && l.tipoAnalise === 'fungo'); }

function linhaKV_(k, v) {
  return '<tr><td class="k">' + esc_(k) + '</td><td>' + (v == null || v === '' ? '—' : esc_(v)) + '</td></tr>';
}

function laudoHtml_(l, fotos) {
  fotos = fotos || [];
  var conc = l.resultadoQuantitativo || '';
  if (conc && !/ufc/i.test(conc)) conc = conc + ' UFC/mL';
  var quali = (l.resultadosQualitativos || '').toUpperCase();
  var outros = (l.outrosMicrorganismos || '').toUpperCase();

  function dataImg_(ft) {
    try {
      var b = DriveApp.getFileById(ft.fileId).getBlob();
      return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    } catch (e) { return ''; }
  }
  function cel_(label, value) { return '<b>' + esc_(label) + ':</b> ' + (value == null || value === '' ? '—' : value); }
  // TIPO DE AMOSTRA com "Outro: <texto>"
  var tipoAm = OPC_TIPO_AMOSTRA.map(function (o) {
    if (o === 'Outro') return (l.tipoAmostra === 'Outro' ? '&#9746;' : '&#9744;') + ' Outro: ' + (l.tipoAmostra === 'Outro' && l.tipoAmostraOutro ? esc_(l.tipoAmostraOutro) : '');
    return (l.tipoAmostra === o ? '&#9746;' : '&#9744;') + ' ' + esc_(o);
  }).join('&nbsp;&nbsp; ');
  var choque = (l.choqueTermico === 'Sim' ? '&#9746;' : '&#9744;') + ' SIM&nbsp;&nbsp; ' + (l.choqueTermico === 'Sim' ? '&#9744;' : '&#9746;') + ' NÃO';

  var fotosHtml = '';
  if (fotos.length) {
    fotosHtml = '<div class="fotos"><div class="flabel">FOTOS ANÁLISE:</div>' +
      fotos.map(function (ft) {
        var img = dataImg_(ft);
        return '<div class="foto">' + (img ? '<img src="' + img + '">' : '<div class="semimg">(imagem indisponível)</div>') +
          '<div class="cap">' + esc_(ft.categoria || 'Microscopia') + '</div></div>';
      }).join('') + '</div>';
  }

  return '' +
    '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1a1a1a;margin:18px;}' +
    '.banner{background:#2fa23f;color:#fff;padding:12px 16px;}' +
    '.banner .bq{font-weight:800;font-size:23px;letter-spacing:1px;}' +
    '.banner .bo{font-weight:800;font-size:11px;color:#ffd21f;border:2px solid #ffd21f;border-radius:5px;padding:1px 7px;margin-left:10px;}' +
    '.title{text-align:center;font-weight:bold;font-size:13px;margin:12px 0 4px;}' +
    'table{width:100%;border-collapse:collapse;font-size:10.5px;table-layout:fixed;}' +
    'td{border:1px solid #555;padding:4px 7px;vertical-align:top;word-wrap:break-word;}' +
    '.sec{background:#8dc63f;color:#fff;font-weight:bold;text-align:center;text-transform:uppercase;letter-spacing:.4px;}' +
    '.rk{width:52%;text-align:center;font-weight:bold;}' +
    '.rv{text-align:center;font-weight:bold;font-size:12px;}' +
    '.ital{font-style:italic;}' +
    '.right{text-align:right;}' +
    '.fotos{margin-top:10px;}' +
    '.flabel{font-size:11px;margin:0 0 6px;}' +
    '.foto{display:inline-block;width:46%;margin:0 1.5% 6px;text-align:center;vertical-align:top;}' +
    '.foto img{width:100%;max-height:240px;border:1px solid #bbb;}' +
    '.foto .cap{font-size:10px;margin-top:2px;}' +
    '.semimg{font-size:9px;color:#999;padding:20px;border:1px dashed #ccc;}' +
    '.pag{text-align:right;font-size:9.5px;color:#333;margin-top:10px;}' +
    '.foot{text-align:center;font-size:9.5px;color:#333;margin-top:4px;}' +
    '</style></head><body>' +
    '<div class="banner"><span class="bq">QUALIDADE</span><span class="bo">ON FARM</span></div>' +
    '<div class="title">' + esc_(LAUDO_TITULO) + '</div>' +
    '<table>' +
      '<tr><td>' + cel_('Nº DE RELATÓRIO', esc_(l.numeroRelatorio || '—')) + '</td><td class="right">' + cel_('DATA DA EMISSÃO', fmtDataPt_(l.dataEmissao)) + '</td></tr>' +
      '<tr><td class="sec" colspan="2">Dados da amostra</td></tr>' +
      '<tr><td colspan="2">' + cel_('CLIENTE/FAZENDA', esc_(l.cliente || 'Fazenda Água Viva')) + '</td></tr>' +
      '<tr><td colspan="2">' + cel_('TIPO DE AMOSTRA', tipoAm) + '</td></tr>' +
      '<tr><td colspan="2">' + cel_('MEIO DE CULTURA', chk_(OPC_MEIO_CULTURA, l.meioCultura)) + '</td></tr>' +
      '<tr><td colspan="2">' + cel_('TIPO DE COMPRESSOR', chk_(OPC_COMPRESSOR, l.tipoCompressor)) + '</td></tr>' +
      '<tr><td>' + cel_('NOME DO PRODUTO', esc_(l.produto)) + '</td><td>' + cel_('MICRORGANISMO', '<span class="ital">' + esc_(l.microrganismo || '—') + '</span>') + '</td></tr>' +
      '<tr><td>' + cel_('LOTE DO PRODUTO', esc_(l.loteProduto || l.loteNum)) + '</td><td>' + cel_('LOTE MEIO DE CULTURA', esc_(l.loteMeio)) + '</td></tr>' +
      '<tr><td>' + cel_('TEMPERATURA', esc_(l.temperatura || 'N/A')) + '</td><td>' + cel_('pH', esc_(l.ph || 'N/A')) + '</td></tr>' +
      '<tr><td>' + cel_('DATA DA MULTIPLICAÇÃO', fmtDataPt_(l.dataMultiplicacao)) + '</td><td>' + cel_('DATA DA COLETA', fmtDataPt_(l.dataColeta)) + '</td></tr>' +
      '<tr><td colspan="2">' + cel_('RESPONSÁVEL PELA COLETA', esc_(l.responsavelColeta)) + '</td></tr>' +
      '<tr><td colspan="2">' + cel_('OUTRAS INFORMAÇÕES', esc_(l.outrasInformacoes)) + '</td></tr>' +
      '<tr><td class="sec" colspan="2">Dados da análise</td></tr>' +
      '<tr><td>' + cel_('DATA RECEBIMENTO DA AMOSTRA', fmtDataPt_(l.dataRecebimento)) + '</td><td>' + cel_('DATA DA ANÁLISE', fmtDataPt_(l.dataAnalise)) + '</td></tr>' +
      '<tr><td>' + cel_('TÉCNICA DE PLAQUEAMENTO', esc_(l.tecnicaPlaqueamento || 'NA')) + '</td><td>' + cel_('DILUIÇÕES PLAQUEADAS', esc_(l.diluicoesPlaqueadas || 'NA')) + '</td></tr>' +
      '<tr><td>' + cel_('TEMPERATURA DE INCUBAÇÃO', esc_(l.tempIncubacao || 'NA')) + '</td><td>' + cel_('TEMPO DE INCUBAÇÃO', esc_(l.tempoIncubacao || 'NA')) + '</td></tr>' +
      '<tr><td colspan="2">' + cel_('CHOQUE TÉRMICO', choque) + '</td></tr>' +
      '<tr><td colspan="2">' + cel_('COLORAÇÃO DE GRAM', esc_(l.coloracaoGram || '—')) + '</td></tr>' +
      '<tr><td colspan="2">' + cel_('RESPONSÁVEL', esc_(l.responsavelAnalise)) + '</td></tr>' +
      '<tr><td class="sec" colspan="2">Resultados</td></tr>' +
      '<tr><td class="rk">RESULTADOS QUALITATIVOS:</td><td class="rv">' + esc_(quali || '—') + '</td></tr>' +
      (conc ? '<tr><td class="rk">CONTAGEM (com choque térmico):</td><td class="rv">' + esc_(conc) + '</td></tr>' : '') +
      '<tr><td class="rk">OUTROS MICRORGANISMOS:</td><td class="rv">' + esc_(outros || '—') + '</td></tr>' +
    '</table>' +
    fotosHtml +
    '<div class="pag">Página <b>1</b> de <b>1</b></div>' +
    (LAUDO_RODAPE ? '<div class="foot">' + esc_(LAUDO_RODAPE) + '</div>' : '') +
    '</body></html>';
}

// Laudo de FUNGO (salas · sólido, e avulsas de fungo) no mesmo formato ON FARM.
function laudoFungoHtml_(l, fotos) {
  fotos = fotos || [];
  var m1 = fungoMedia_(l.fungoC1), m2 = fungoMedia_(l.fungoC2), res = fungoResultadoNum_(l);
  function cel_(label, value) { return '<b>' + esc_(label) + ':</b> ' + (value == null || value === '' ? '—' : value); }
  function cc_(t) { return '<td class="sec">' + esc_(t) + '</td>'; }
  function dc_(v) { return '<td style="text-align:center">' + ((v == null || v === '') ? '—' : esc_(v)) + '</td>'; }
  function linha_(nome, arr, m) {
    var c = arr || [], o = '<td style="text-align:center;font-weight:bold">' + esc_(nome) + '</td>';
    for (var i = 0; i < 5; i++) o += dc_(c[i]);
    return '<tr>' + o + '<td style="text-align:center;font-weight:bold">' + esc_(fungoMediaTxt_(m)) + '</td></tr>';
  }
  function dataImg_(ft) {
    try { var b = DriveApp.getFileById(ft.fileId).getBlob(); return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); } catch (e) { return ''; }
  }
  var local = ehAvulsa_(l)
    ? cel_('AMOSTRA', esc_(l.identAmostra || l.loteNum || '—'))
    : cel_('LOCAL DA PRODUÇÃO', esc_('Fazenda Água Viva · ' + nomeUnidade_(l.fermentador)));
  var assinatura = l.responsavelAnalise
    ? '<div style="margin-top:28px;text-align:center"><div style="border-top:1px solid #333;width:55%;margin:0 auto 4px"></div>' +
        '<div style="font-size:12px;font-weight:bold">' + esc_(l.responsavelAnalise) + '</div>' +
        (l.respFuncao ? '<div style="font-size:10px;color:#555">' + esc_(l.respFuncao) + '</div>' : '') + '</div>'
    : '';
  var fotosHtml = '';
  if (fotos.length) {
    fotosHtml = '<div class="fotos"><div class="flabel">FOTOS ANÁLISE:</div>' +
      fotos.map(function (ft) { var img = dataImg_(ft); return '<div class="foto">' + (img ? '<img src="' + img + '">' : '<div class="semimg">(imagem indisponível)</div>') + '<div class="cap">' + esc_(ft.categoria || 'Microscopia') + '</div></div>'; }).join('') + '</div>';
  }
  return '' +
    '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1a1a1a;margin:18px;}' +
    '.banner{background:#2fa23f;color:#fff;padding:12px 16px;}' +
    '.banner .bq{font-weight:800;font-size:23px;letter-spacing:1px;}' +
    '.banner .bo{font-weight:800;font-size:11px;color:#ffd21f;border:2px solid #ffd21f;border-radius:5px;padding:1px 7px;margin-left:10px;}' +
    '.title{text-align:center;font-weight:bold;font-size:13px;margin:12px 0 4px;}' +
    'table{width:100%;border-collapse:collapse;font-size:10.5px;table-layout:fixed;}' +
    'td{border:1px solid #555;padding:4px 7px;vertical-align:top;word-wrap:break-word;}' +
    '.sec{background:#8dc63f;color:#fff;font-weight:bold;text-align:center;text-transform:uppercase;letter-spacing:.4px;}' +
    '.rk{width:52%;text-align:center;font-weight:bold;}' +
    '.rv{text-align:center;font-weight:bold;font-size:12px;}' +
    '.ital{font-style:italic;}' +
    '.right{text-align:right;}' +
    '.fotos{margin-top:10px;}' +
    '.flabel{font-size:11px;margin:0 0 6px;}' +
    '.foto{display:inline-block;width:46%;margin:0 1.5% 6px;text-align:center;vertical-align:top;}' +
    '.foto img{width:100%;max-height:240px;border:1px solid #bbb;}' +
    '.foto .cap{font-size:10px;margin-top:2px;}' +
    '.semimg{font-size:9px;color:#999;padding:20px;border:1px dashed #ccc;}' +
    '.pag{text-align:right;font-size:9.5px;color:#333;margin-top:10px;}' +
    '.foot{text-align:center;font-size:9.5px;color:#333;margin-top:4px;}' +
    '</style></head><body>' +
    '<div class="banner"><span class="bq">QUALIDADE</span><span class="bo">ON FARM</span></div>' +
    '<div class="title">' + esc_(LAUDO_FUNGO_TITULO) + '</div>' +
    '<table>' +
      '<tr><td>' + cel_('Nº DE RELATÓRIO', esc_(l.numeroRelatorio || '—')) + '</td><td class="right">' + cel_('DATA DA EMISSÃO', fmtDataPt_(l.dataEmissao)) + '</td></tr>' +
      '<tr><td colspan="2">' + cel_('CONTRATANTE', esc_(l.cliente || 'Fazenda Água Viva')) + '</td></tr>' +
      '<tr><td colspan="2">' + local + '</td></tr>' +
      '<tr><td>' + cel_('PERÍODO DE EXECUÇÃO', esc_(l.periodoExec)) + '</td><td>' + cel_('MICRORGANISMO', '<span class="ital">' + esc_(l.microrganismo || '—') + '</span>') + '</td></tr>' +
      '<tr><td>' + cel_('SUBSTRATO', esc_(substratoTxt_(l) || '—')) + '</td><td>' + cel_('IDENTIFICAÇÃO', esc_(l.identAmostra || '—')) + '</td></tr>' +
      '<tr><td>' + cel_('TIPO DA AMOSTRA', 'Meio sólido') + '</td><td>' + cel_('DILUIÇÃO', esc_(dilTxt_(l.fungoDil))) + '</td></tr>' +
      '<tr><td class="sec" colspan="2">Contagem de conídios/mL</td></tr>' +
    '</table>' +
    '<table><tr>' + cc_('QUADRANTE') + cc_('E1') + cc_('E2') + cc_('E3') + cc_('E4') + cc_('E5') + cc_('MÉDIA') + '</tr>' +
      linha_('CAMPO 1', l.fungoC1, m1) + linha_('CAMPO 2', l.fungoC2, m2) + '</table>' +
    '<table>' +
      '<tr><td class="rk">RESULTADO:</td><td class="rv">' + (res == null ? '—' : esc_(fmtUFCnum_(res) + ' conídios/mL')) + '</td></tr>' +
      '<tr><td colspan="2">' + cel_('TESTE DE GERMINAÇÃO', l.fungoGerm ? esc_(l.fungoGerm + '% de germinação.') : '—') + '</td></tr>' +
      '<tr><td colspan="2">' + cel_('DATA DA COLETA', fmtDataPt_(l.dataColeta)) + '</td></tr>' +
      (l.outrasInformacoes ? '<tr><td colspan="2">' + cel_('OBSERVAÇÕES', esc_(l.outrasInformacoes)) + '</td></tr>' : '') +
    '</table>' +
    assinatura +
    fotosHtml +
    '<div class="pag">Página <b>1</b> de <b>1</b></div>' +
    (LAUDO_RODAPE ? '<div class="foot">' + esc_(LAUDO_RODAPE) + '</div>' : '') +
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
    l.fungoC1 = serFungo_(l.fungoC1); // listas de contagem → texto "a,b,c" na planilha
    l.fungoC2 = serFungo_(l.fungoC2);
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
