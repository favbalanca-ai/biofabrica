// ───────────────────────────────────────────────────────────────────
// PONTE BioFábrica ↔ Planejamento  ·  Estoque de BIOLÓGICOS
// ───────────────────────────────────────────────────────────────────
// Cole este código no editor de script DA PLANILHA DO PLANEJAMENTO
// (a mesma que tem as abas PORTIFÓLIO e MOVIMENTAÇÃO ESTOQUE):
//   Extensões → Apps Script → apague o que tiver → cole isto → Salvar.
// Depois publique como App da Web:
//   Implantar → Nova implantação → Tipo: App da Web
//   Executar como: Você  ·  Quem tem acesso: Qualquer pessoa  → Implantar
//   Copie a URL que termina em /exec e mande para o Claude.
//
// O que faz (só isso, nada mais na planilha):
//  • Lê o SALDO dos produtos BIOLÓGICOS  (saldo = estoque base + entradas − saídas).
//  • Lança ENTRADA (beneficiado) e SAÍDA (baixa) na aba MOVIMENTAÇÃO ESTOQUE —
//    a MESMA que o Planejamento usa. Idempotente pelo id (etiqueta [#id]): reenviar não duplica.
// ───────────────────────────────────────────────────────────────────

var PORT_SHEET = 'PORTIFÓLIO';
var MOV_SHEET  = 'MOVIMENTAÇÃO ESTOQUE';
var MOV_COLS   = ['DATA/HORA', 'TIPO', 'PRODUTO', 'UN', 'QTD', 'ORIGEM', 'OBS'];

function ss_()   { return SpreadsheetApp.getActiveSpreadsheet(); }
function S_(v)   { return v == null ? '' : String(v).trim(); }
function N_(v)   {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var s = String(v == null ? '' : v).trim(); if (!s) return 0;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');   // 1.234,56 → 1234.56
  var n = parseFloat(s); return isFinite(n) ? n : 0;
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function movSheet_() {
  var s = ss_().getSheetByName(MOV_SHEET);
  if (!s) { s = ss_().insertSheet(MOV_SHEET); s.appendRow(MOV_COLS); s.setFrozenRows(1); }
  return s;
}

// Saldo por produto BIOLÓGICO = estoque base (PORTIFÓLIO col T) + entradas − saídas (MOVIMENTAÇÃO).
function biologicos_() {
  var base = {}, un = {}, P = ss_().getSheetByName(PORT_SHEET);
  if (P && P.getLastRow() >= 4) {
    var v = P.getRange(4, 1, P.getLastRow() - 3, 20).getValues();   // A..T, a partir da linha 4
    for (var i = 0; i < v.length; i++) {
      var classe = S_(v[i][1]).toUpperCase(), prod = S_(v[i][2]);   // B=classe, C=produto
      if (!prod || classe.indexOf('BIOL') !== 0) continue;          // só BIOLÓGICOS
      base[prod] = N_(v[i][19]); un[prod] = S_(v[i][5]);            // T=estoque base, F=unidade
    }
  }
  var ent = {}, sai = {}, M = ss_().getSheetByName(MOV_SHEET);
  if (M && M.getLastRow() >= 2) {
    var mv = M.getRange(2, 1, M.getLastRow() - 1, 6).getValues();   // DATA, TIPO, PRODUTO, UN, QTD, ORIGEM
    for (var j = 0; j < mv.length; j++) {
      var tp = S_(mv[j][1]).toUpperCase(), pr = S_(mv[j][2]), q = N_(mv[j][4]);
      if (!pr || !q) continue;
      if (tp.indexOf('ENTRADA') === 0) ent[pr] = (ent[pr] || 0) + q;
      else if (tp.indexOf('SA') === 0) sai[pr] = (sai[pr] || 0) + q;   // SAÍDA / SAIDA
    }
  }
  var out = [];
  for (var p in base) out.push({ nome: p, unidade: un[p] || '', saldo: Math.round((base[p] + (ent[p] || 0) - (sai[p] || 0)) * 100) / 100 });
  out.sort(function (a, b) { return a.nome.localeCompare(b.nome); });
  return out;
}
function saldoDe_(prod) { var b = biologicos_(); for (var i = 0; i < b.length; i++) if (b[i].nome === prod) return b[i].saldo; return null; }

// Apaga as linhas cuja ORIGEM contenha [#id] (para reenviar sem duplicar).
function movDelete_(id) {
  var s = movSheet_(), last = s.getLastRow(); if (last < 2) return;
  var v = s.getRange(2, 6, last - 1, 1).getValues();   // coluna F = ORIGEM
  for (var i = v.length - 1; i >= 0; i--) if (String(v[i][0]).indexOf('[#' + id + ']') >= 0) s.deleteRow(i + 2);
}

function doGet() {
  try { return json_({ ok: true, biologicos: biologicos_(), ts: new Date().toISOString() }); }
  catch (err) { return json_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (_) { return json_({ ok: false, error: 'planilha ocupada — tente de novo' }); }
  try {
    var body = {}; try { body = JSON.parse(e.postData.contents); } catch (_) {}
    var fn = body.fn, m = (body.args && body.args[0]) || body.mov || {};
    if (fn === 'getEstoque') return json_({ ok: true, data: { biologicos: biologicos_() } });
    if (fn === 'movimentar') {
      var id = S_(m.id);
      var tipo = (S_(m.tipo).toUpperCase().indexOf('SA') === 0) ? 'SAÍDA' : 'ENTRADA';
      var prod = S_(m.produto), un = S_(m.unidade || m.un), qtd = N_(m.qtd);
      if (!prod || !qtd) return json_({ ok: false, error: 'produto/quantidade inválidos' });
      var origem = (S_(m.origem) || 'BioFábrica') + (id ? ' [#' + id + ']' : '');
      if (id) movDelete_(id);
      movSheet_().appendRow([new Date(), tipo, prod, un, qtd, origem, S_(m.obs)]);
      return json_({ ok: true, data: { saldo: saldoDe_(prod) } });
    }
    return json_({ ok: false, error: 'ação desconhecida: ' + fn });
  } catch (err) { return json_({ ok: false, error: String(err) }); }
  finally { lock.releaseLock(); }
}
