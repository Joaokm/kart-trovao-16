/* Testa o servidor de salas (servidor/) sem o jogo.
   Uso: em servidor/, `npm install` e `npm run dev`; depois `node ferramentas/qa-relay.js [ws://127.0.0.1:8787]`. */
'use strict';
const path = require('path');
const WebSocket = require(path.join(__dirname, '..', 'servidor', 'node_modules', 'ws'));

const BASE = process.argv[2] || 'ws://127.0.0.1:8787';
const ORIGEM = 'http://127.0.0.1:8080';
let falhas = 0, codigo = 0;

function sala() { codigo++; return 'QATESTE' + 'ABCDEFGHJKLMNPQRSTUVWXYZ'[codigo % 24]; }
function abrir(code, papel, origem) {
  const ws = new WebSocket(`${BASE}/v1/sala/${code}?papel=${papel}`, { headers: { Origin: origem || ORIGEM } });
  ws.fila = []; ws.espera = [];
  ws.on('message', (d) => { const t = d.toString(); const w = ws.espera.shift(); if (w) w(t); else ws.fila.push(t); });
  ws.fechou = new Promise((ok) => { ws.on('close', (c) => ok(c)); ws.on('error', () => ok(-1)); ws.on('unexpected-response', (req, res) => ok(res.statusCode)); });
  return ws;
}
function proxima(ws, ms) {
  if (ws.fila.length) return Promise.resolve(ws.fila.shift());
  return new Promise((ok) => { const t = setTimeout(() => { ws.espera = ws.espera.filter((f) => f !== w); ok(null); }, ms || 1500); const w = (m) => { clearTimeout(t); ok(m); }; ws.espera.push(w); });
}
const controle = (t) => t && t[0] === '\t' ? JSON.parse(t.slice(1)) : null;
function confere(nome, ok, extra) { console.log((ok ? 'OK   ' : 'FALHA') + ' ' + nome + (ok || extra === undefined ? '' : ' → ' + JSON.stringify(extra))); if (!ok) falhas++; }
async function comAnfitriao() {
  const code = sala(), host = abrir(code, 'host');
  const w = controle(await proxima(host));
  return { code, host, w };
}
async function convidado(code, host) {
  const g = abrir(code, 'guest');
  const w = controle(await proxima(g));
  const o = controle(await proxima(host));
  return { g, id: w && w.id, w, o };
}

(async () => {
  let s = await comAnfitriao();
  confere('anfitrião recebe welcome com id host', s.w && s.w.r === 'welcome' && s.w.id === 'host', s.w);

  const dup = abrir(s.code, 'host');
  confere('segundo anfitrião no mesmo código fecha com 4009', (await dup.fechou) === 4009);

  const orfao = abrir('QASEMSAL', 'guest');
  confere('convidado sem sala fecha com 4004', (await orfao.fechou) === 4004);

  const intruso = abrir(sala(), 'host', 'https://exemplo.com');
  confere('origem proibida é recusada com 403', (await intruso.fechou) === 403);

  const gs = [];
  for (let i = 0; i < 3; i++) gs.push(await convidado(s.code, s.host));
  confere('convidado recebe welcome com id próprio', gs.every((c) => c.w && c.w.r === 'welcome' && /^[0-9a-f]{12}$/.test(c.id)));
  confere('anfitrião recebe open antes de qualquer dado', gs.every((c) => c.o && c.o.r === 'open' && c.o.id === c.id));

  gs[0].g.send('{"t":"join"}');
  confere('convidado → anfitrião chega com o id do remetente', (await proxima(s.host)) === gs[0].id + '\t{"t":"join"}');

  s.host.send('*\t{"t":"lobby"}');
  const todos = await Promise.all(gs.map((c) => proxima(c.g)));
  confere('broadcast chega aos 3 convidados', todos.every((t) => t === '{"t":"lobby"}'), todos);

  s.host.send(gs[1].id + '\t{"t":"hello"}');
  confere('mensagem direcionada chega ao alvo', (await proxima(gs[1].g)) === '{"t":"hello"}');
  confere('e não chega aos outros', (await proxima(gs[0].g, 400)) === null && (await proxima(gs[2].g, 400)) === null);

  s.host.send('\t' + JSON.stringify({ r: 'kick', id: gs[2].id }));
  confere('kick fecha o convidado com 4001', (await gs[2].g.fechou) === 4001);
  const aviso = controle(await proxima(s.host));
  confere('anfitrião é avisado da saída', aviso && aviso.r === 'close' && aviso.id === gs[2].id, aviso);

  gs[1].g.send('x'.repeat(2048));
  confere('mensagem grande do convidado fecha com 4008', (await gs[1].g.fechou) === 4008);
  await proxima(s.host);

  s.host.send('ping');
  confere('keepalive ping recebe pong', (await proxima(s.host)) === 'pong');

  s.host.close();
  confere('anfitrião sai e os convidados fecham com 4000', (await gs[0].g.fechou) === 4000);

  s = await comAnfitriao();
  const r = await convidado(s.code, s.host);
  for (let i = 0; i < 50; i++) r.g.send('{"t":"input"}');
  confere('50 mensagens em 1 s fecham com 4008', (await r.g.fechou) === 4008);
  s.host.close();

  s = await comAnfitriao();
  const lotacao = [];
  for (let i = 0; i < 4; i++) lotacao.push(await convidado(s.code, s.host));
  const setimo = abrir(s.code, 'guest');
  confere('quinto convidado fecha com 4013', (await setimo.fechou) === 4013);
  s.host.close();

  console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
