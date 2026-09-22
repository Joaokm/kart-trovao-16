/* ============================================================
   KART TROVAO 16 - QA automatico (Node, sem navegador)

   Carrega os scripts reais do jogo (na ordem do index.html) num
   contexto isolado com um DOM falso e roda:
     - testes de regressao (geometria e terreno do Circuito Vulcano)
     - determinismo (mesma semente = mesma corrida)
     - testes de unidade (progresso, colisao com muro, forca da IA)
     - corridas completas so de IA, com 6 e 8 karts
     - varredura de originalidade (ferramentas/termos-proibidos.txt)
     - metricas de base da IA (salvas em ferramentas/relatorios/)

   Uso (na pasta do projeto):
     node ferramentas/qa.js                 teste completo (8 sementes)
     node ferramentas/qa.js --rapido        2 sementes
     node ferramentas/qa.js --sementes 20   mais sementes nas metricas
     node ferramentas/qa.js --gravar-referencia [--raiz pasta]
         grava a referencia de geometria/terreno a partir do jogo em
         "pasta" (padrao: este projeto). So use ao mudar a pista DE PROPOSITO.

   Sai com codigo 1 se algum teste falhar.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PROJETO = path.resolve(__dirname, "..");
const REF_DIR = path.join(__dirname, "referencia");
const REL_DIR = path.join(__dirname, "relatorios");

const args = process.argv.slice(2);
function opcao(nome) { return args.indexOf(nome) >= 0; }
function valor(nome, padrao) {
  const i = args.indexOf(nome);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : padrao;
}

/* ---------------- DOM falso ---------------- */
function contextoFalso() {
  const base = {
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createLinearGradient: () => ({ addColorStop() {} })
  };
  return new Proxy(base, {
    get(t, p) { return p in t ? t[p] : function () {}; },
    set(t, p, v) { t[p] = v; return true; }
  });
}
function canvasFalso(w, h) {
  const c = { width: w || 0, height: h || 0, style: {} };
  c.getContext = () => contextoFalso();
  return c;
}

/* carrega o jogo em um contexto novo e executa o boot */
function carregarJogo(raiz) {
  const html = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
  const ouvintes = {};
  let filaRAF = [];
  const sb = {
    console,
    addEventListener: (tipo, f) => { (ouvintes[tipo] = ouvintes[tipo] || []).push(f); },
    document: {
      createElement: () => canvasFalso(),
      getElementById: () => canvasFalso(320, 224),
      fullscreenElement: null
    },
    requestAnimationFrame: f => { filaRAF.push(f); return filaRAF.length; },
    setTimeout: f => { f(); return 0; },
    setInterval: () => 0,
    clearInterval: () => {}
  };
  sb.window = sb;
  vm.createContext(sb);
  for (const s of scripts) {
    vm.runInContext(fs.readFileSync(path.join(raiz, s), "utf8"), sb, { filename: s });
  }
  (ouvintes.load || []).forEach(f => f());
  const primeiro = filaRAF.shift();
  filaRAF = [];
  if (primeiro) primeiro(0);            /* rAF -> setTimeout -> boot() */
  return sb.KT;
}

/* ---------------- utilitarios ---------------- */
function fnv(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
const f4 = v => +v.toFixed(4);
function media(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function semAcento(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

/* assinatura da pista: geometria + classificacao de terreno numa grade fixa */
function assinaturaPista(KT) {
  const Tk = KT.Track, pts = Tk.pts, N = Tk.N;
  let s = "";
  for (const p of pts) s += p.x.toFixed(4) + "," + p.y.toFixed(4) + ";";
  let t = "";
  for (let i = 0; i < N; i += 3) {
    for (let lat = -150; lat <= 150; lat += 7) {
      const p = Tk.pointAt(i, lat);
      t += Tk.terrainAt(p.x, p.y, i);
    }
  }
  return {
    N, total: f4(Tk.total), hashPontos: fnv(s), hashTerreno: fnv(t),
    checkpoints: Tk.checkpoints.slice(), faixasTurbo: Tk.boostPads.slice(),
    grid: Tk.startGrid.slice(0, 6).map(g => [f4(g.x), f4(g.y), g.i]),
    caixas: Tk.itemBoxes.map(b => [f4(b.x), f4(b.y), b.i]),
    amostras: [0, 150, 300, 450, 600, 750, 900, 1050].map(i =>
      [f4(pts[i].x), f4(pts[i].y), +pts[i].ang.toFixed(6), +pts[i].curv.toFixed(6)])
  };
}

/* ---------------- gravar referencia ---------------- */
if (require.main !== module) {
  module.exports = { carregarJogo, assinaturaPista };
} else {
if (opcao("--gravar-referencia")) {
  const raiz = path.resolve(valor("--raiz", PROJETO));
  const KT = carregarJogo(raiz);
  fs.mkdirSync(REF_DIR, { recursive: true });
  const arq = path.join(REF_DIR, "vulcano.json");
  fs.writeFileSync(arq, JSON.stringify(assinaturaPista(KT), null, 1));
  console.log("Referência gravada em " + path.relative(PROJETO, arq) + " (jogo de " + raiz + ")");
  process.exit(0);
}

/* ---------------- testes ---------------- */
const resultados = [];
function teste(nome, fn) {
  const t0 = Date.now();
  try {
    const detalhe = fn();
    resultados.push({ nome, ok: true, detalhe, ms: Date.now() - t0 });
    console.log("  OK    " + nome + (detalhe ? "  (" + detalhe + ")" : ""));
  } catch (e) {
    resultados.push({ nome, ok: false, detalhe: e.message, ms: Date.now() - t0 });
    console.log("  FALHA " + nome + "\n        " + e.message);
  }
}
function exigir(cond, msg) { if (!cond) throw new Error(msg); }

const nSementes = opcao("--rapido") ? 2 : parseInt(valor("--sementes", "8"), 10);
const sementes = Array.from({ length: nSementes }, (_, i) => 1000 + i * 7919);

console.log("\nKART TROVÃO 16 — QA automático");
console.log("projeto: " + PROJETO + "\n");

let KT = null;
teste("jogo carrega e faz o boot", () => {
  KT = carregarJogo(PROJETO);
  exigir(KT && KT.Track && KT.Teste, "KT.Teste não encontrado");
  return KT.DRIVERS.length + " pilotos, pista com " + KT.Track.N + " amostras";
});
if (!KT) { console.log("\nNão foi possível carregar o jogo."); process.exit(1); }

teste("regressão: geometria e terreno do Circuito Vulcano", () => {
  const arq = path.join(REF_DIR, "vulcano.json");
  exigir(fs.existsSync(arq), "referência ausente: rode --gravar-referencia");
  const ref = JSON.parse(fs.readFileSync(arq, "utf8"));
  const cur = assinaturaPista(KT);
  for (const k of Object.keys(ref)) {
    exigir(JSON.stringify(ref[k]) === JSON.stringify(cur[k]),
      "campo '" + k + "' mudou:\n        ref " + JSON.stringify(ref[k]).slice(0, 160) +
      "\n        atual " + JSON.stringify(cur[k]).slice(0, 160));
  }
  exigir(KT.Track.startGrid.length >= 8, "grid com menos de 8 posições");
  return "pontos " + cur.hashPontos + ", terreno " + cur.hashTerreno;
});

teste("determinismo: mesma semente = mesma corrida", () => {
  const a = KT.Teste.corrida({ semente: 424242 });
  const b = KT.Teste.corrida({ semente: 424242 });
  const outro = carregarJogo(PROJETO);
  const c = outro.Teste.corrida({ semente: 424242 });
  exigir(a.hash === b.hash, "repetição no mesmo jogo divergiu: " + a.hash + " x " + b.hash);
  exigir(a.hash === c.hash, "jogo recarregado divergiu: " + a.hash + " x " + c.hash);
  const d = KT.Teste.corrida({ semente: 424243 });
  exigir(d.hash !== a.hash, "sementes diferentes deram a mesma corrida");
  return "hash " + a.hash;
});

teste("progresso nunca salta (ré sobre a linha de chegada)", () => {
  const race = KT.Teste.preparar({ semente: 5 });
  const Tk = KT.Track, N = Tk.N, k = race.player;
  let i = k.idx, ant = k.progress, maxPasso = 0;
  /* anda pela linha central ate completar 1 volta + 10 amostras */
  let guarda = 0;
  while (k.lap < 2 && guarda++ < 3 * N) {
    i = (i + 2) % N;
    const p = Tk.pointAt(i, 0);
    k.x = p.x; k.y = p.y;
    k.updateProgress(race);
    const d = k.progress - ant;
    exigir(d >= 0 && d <= 10, "salto de " + d + " andando para frente (amostra " + i + ")");
    maxPasso = Math.max(maxPasso, d);
    ant = k.progress;
  }
  exigir(k.lap === 2, "não completou a volta (lap=" + k.lap + ")");
  for (let s = 0; s < 5; s++) { i = (i + 2) % N; const p = Tk.pointAt(i, 0); k.x = p.x; k.y = p.y; k.updateProgress(race); }
  const antesRe = k.progress;
  for (let s = 0; s < 20; s++) {
    i = (i - 2 + N) % N;
    const p = Tk.pointAt(i, 0);
    k.x = p.x; k.y = p.y;
    const a2 = k.progress;
    k.updateProgress(race);
    const d = k.progress - a2;
    exigir(d <= 0 && d >= -10, "ré mudou o progresso em " + d + " (amostra " + i + ")");
  }
  const queda = antesRe - k.progress;
  exigir(Math.abs(queda - 40) <= 2, "ré de 40 amostras mudou o progresso em " + queda);
  return "ré de 40 amostras = −" + queda;
});

teste("colisão entre karts não empurra ninguém para dentro do muro", () => {
  const race = KT.Teste.preparar({ semente: 9 });
  const Tk = KT.Track, T = Tk.T;
  const [a, b] = race.karts;
  /* afasta os demais karts */
  race.karts.slice(2).forEach((k, n) => { const p = Tk.pointAt(600 + n * 40, 0); k.x = p.x; k.y = p.y; k.idx = 600 + n * 40; });
  let casos = 0;
  for (let i = 0; i < Tk.N; i += 25) {
    for (const lado of [-1, 1]) {
      const lim = Tk.edgeAAt(i);
      const pa = Tk.pointAt(i, lado * (lim - 1.5));
      const pb = Tk.pointAt(i, lado * (lim - 1.5 - 16));
      a.x = pa.x; a.y = pa.y; a.idx = i;
      b.x = pb.x; b.y = pb.y; b.idx = i;
      if (Tk.terrainAt(a.x, a.y, i) === T.PAREDE) continue;
      KT.Teste.colisoes();
      exigir(Tk.terrainAt(a.x, a.y, a.idx) !== T.PAREDE, "kart A foi para o muro na amostra " + i);
      exigir(Tk.terrainAt(b.x, b.y, b.idx) !== T.PAREDE, "kart B foi para o muro na amostra " + i);
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      exigir(d >= 2 * KT.Kart.RADIUS - 0.01, "karts continuaram sobrepostos (" + d.toFixed(2) + ")");
      casos++;
    }
  }
  return casos + " casos junto ao muro";
});

teste("força da IA ≤ 1,00 e independente da posição de largada", () => {
  let n = 0;
  for (let s = 0; s < 40; s++) {
    const race = KT.Teste.preparar({ semente: 7000 + s, karts: 8 });
    for (const k of race.karts) if (k.ai) { exigir(k.aiSkill <= 1, "aiSkill " + k.aiSkill + " > 1"); n++; }
  }
  /* a pole deve variar entre as sementes (antes era sempre a mais lenta) */
  const poles = new Set();
  for (let s = 0; s < 40; s++) {
    const race = KT.Teste.preparar({ semente: 7000 + s, karts: 8 });
    const ia = race.karts.filter(k => k.ai);
    const ordem = ia.slice().sort((x, y) => x.aiSkill - y.aiSkill);
    poles.add(ordem.indexOf(race.karts[0]));
  }
  exigir(poles.size >= 4, "a pole tem sempre a mesma força relativa");
  return n + " karts de IA verificados";
});

/* ---------------- corridas completas ---------------- */
const relatorios = { k6: [], k8: [] };
teste("corridas completas: todos os karts terminam (6 e 8 karts)", () => {
  for (const s of sementes) {
    for (const nk of [6, 8]) {
      const r = KT.Teste.corrida({ semente: s, karts: nk });
      exigir(r.karts.length === nk, "grid com " + r.karts.length + " karts, esperado " + nk);
      const faltou = r.karts.filter(k => !k.terminou);
      exigir(!faltou.length, "semente " + s + ", " + nk + " karts: não terminaram " + faltou.map(k => k.nome).join(", "));
      relatorios["k" + nk].push(r);
    }
  }
  return sementes.length * 2 + " corridas";
});

teste("GP online: pistas por parte, pontos e empates", () => {
  const G = KT.GP;
  for (let liga = 0; liga < 3; liga++) for (let parte = 0; parte < 3; parte++) {
    const t = G.tracks(liga, 4, parte);
    exigir(t.length === 4 && new Set(t).size === 4 && t.every(id => Math.floor(id / 10) === liga), "liga " + liga + " parte " + parte + ": " + t);
  }
  exigir(G.tracks(1, 10, 0).join() === "10,11,12,13,14,15,16,17,18,19", "liga completa fora de ordem");
  const z = () => [0, 0, 0, 0, 0, 0, 0, 0];
  const gp = { stage: 0, scores: z(), last: z(), wins: z(), entries: z().map((_, i) => ({ name: "P" + i, driver: 1, human: i < 2, left: false })) };
  G.score(gp, [1, 2, 3, 4, 5, 6, 7, 8]);
  G.score(gp, [2, 1, 3, 4, 5, 6, 7, 8]);
  exigir(gp.stage === 2 && gp.scores.reduce((a, b) => a + b, 0) === 116, "soma errada: " + gp.scores);
  const t = G.table(gp);
  exigir(t[0].place === 1 && t[1].place === 1 && t[2].place === 3, "empate não compartilha posição: " + t.map(r => r.place));
  return "9 partes, 2 corridas pontuadas";
});

teste("GP online não mexe na copa solo", () => {
  const antes = KT.Career.exportSave();
  const copa = { cup: 0, stage: 3, level: 1, player: 1, drivers: [1, 2, 3, 4, 5, 6, 7, 0], scores: [9, 8, 7, 6, 5, 4, 3, 2] };
  KT.Career.data.activeCup = JSON.parse(JSON.stringify(copa));
  const k = { finished: true, pos: 1, di: 1 };
  KT.Career.finish({ mode: "online", level: 0, player: k, karts: [k], trackId: 3, cupStage: 3 });
  const depois = JSON.stringify(KT.Career.data.activeCup);
  KT.Career.importSave(antes);
  exigir(depois === JSON.stringify(copa), "activeCup mudou: " + depois);
  return "activeCup intacta";
});

teste("chegada não é regravada na volta extra do piloto automático", () => {
  /* No online a corrida espera todos, então o líder cruza a linha de novo no piloto automático. */
  const k = new KT.Kart(0, false), race = { time: 30, totalLaps: 3, banner() {} };
  k.lap = 3; k.lapStart = 20; k.lapTimes = [10, 10];
  k.onLap(race);
  exigir(k.finished && k.finishTime === 30, "não registrou a chegada");
  race.time = 55; k.onLap(race);
  exigir(k.finishTime === 30 && k.lapTimes.length === 3, "chegada regravada: finishTime " + k.finishTime + ", " + k.lapTimes.length + " voltas");
  return "finishTime mantido em 30 s";
});

teste("originalidade: nenhum termo proibido no projeto", () => {
  const termos = fs.readFileSync(path.join(__dirname, "termos-proibidos.txt"), "utf8")
    .split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#")).map(semAcento);
  const arquivos = [];
  (function varrer(dir) {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (nome === "node_modules" || nome === ".git" || nome === "relatorios" || nome === "referencia") continue;
      if (fs.statSync(p).isDirectory()) varrer(p);
      else if (/\.(js|html|css|md)$/i.test(nome)) arquivos.push(p);
    }
  })(PROJETO);
  const achados = [];
  for (const arq of arquivos) {
    if (path.resolve(arq) === path.resolve(__filename)) continue;
    const linhas = semAcento(fs.readFileSync(arq, "utf8")).split(/\r?\n/);
    linhas.forEach((ln, n) => {
      for (const t of termos) {
        const re = new RegExp("(^|[^a-z0-9])" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9])");
        if (re.test(ln)) achados.push(path.relative(PROJETO, arq) + ":" + (n + 1) + " → " + t);
      }
    });
  }
  exigir(!achados.length, achados.length + " ocorrência(s):\n        " + achados.join("\n        "));
  return arquivos.length + " arquivos, " + termos.length + " termos";
});

/* ---------------- metricas de base ---------------- */
function resumo(lista) {
  const karts = lista.flatMap(r => r.karts);
  const voltas = karts.flatMap(k => k.voltas);
  const melhores = karts.map(k => k.melhor).filter(v => v != null);
  const orb = lista.reduce((o, r) => { for (const k in r.orbes) o[k] = (o[k] || 0) + r.orbes[k]; return o; }, {});
  const escudos = karts.reduce((s, k) => s + (k.itens.shield || 0), 0);
  const ociosos = karts.reduce((s, k) => s + k.escudoOcioso, 0);
  const voltasTot = karts.reduce((s, k) => s + k.voltas.length, 0);
  return {
    corridas: lista.length,
    voltaMedia: +media(voltas).toFixed(2),
    melhorVoltaMedia: +media(melhores).toFixed(2),
    melhorVoltaMin: +Math.min(...melhores).toFixed(2),
    tempoTotalMedio: +media(karts.map(k => k.tempo)).toFixed(2),
    diferencaPrimeiroUltimo: +media(lista.map(r => r.karts[r.karts.length - 1].tempo - r.karts[0].tempo)).toFixed(2),
    foraPistaPct: +media(karts.map(k => k.foraPct)).toFixed(1),
    contatoPct: +media(karts.map(k => k.contatoPct)).toFixed(1),
    freandoPct: +media(karts.map(k => k.freandoPct)).toFixed(1),
    velRelMedia: +media(karts.map(k => k.velRel)).toFixed(3),
    muroPorVolta: +(karts.reduce((s, k) => s + k.muroQuadros, 0) / Math.max(1, voltasTot)).toFixed(2),
    derrapagensPorCorrida: +(karts.reduce((s, k) => s + k.derrapagens, 0) / lista.length).toFixed(1),
    cargaNivel1: karts.reduce((s, k) => s + k.carga1, 0),
    cargaNivel2: karts.reduce((s, k) => s + k.carga2, 0),
    escudosOciososPct: escudos ? +(100 * ociosos / escudos).toFixed(0) : 0,
    orbes: orb
  };
}

if (relatorios.k6.length) {
  const base = { data: new Date().toISOString(), sementes, k6: resumo(relatorios.k6), k8: resumo(relatorios.k8) };
  fs.mkdirSync(REL_DIR, { recursive: true });
  fs.writeFileSync(path.join(REL_DIR, "metricas-ia.json"), JSON.stringify(base, null, 1));
  const m = base.k6;
  console.log("\nMétricas da IA (6 karts, " + m.corridas + " corridas, Circuito Vulcano, 3 voltas):");
  console.log("  volta média " + m.voltaMedia + " s | melhor volta média " + m.melhorVoltaMedia + " s (mín " + m.melhorVoltaMin + ")");
  console.log("  fora da pista " + m.foraPistaPct + "% | freando " + m.freandoPct + "% | velocidade média " + (m.velRelMedia * 100).toFixed(1) + "% da máxima");
  console.log("  muro " + m.muroPorVolta + " quadros/volta | contato " + m.contatoPct + "% | 1º→último " + m.diferencaPrimeiroUltimo + " s");
  console.log("  derrapagens/corrida " + m.derrapagensPorCorrida + " | Carga Trovão nível 1: " + m.cargaNivel1 + ", nível 2: " + m.cargaNivel2);
  console.log("  esferas " + JSON.stringify(m.orbes) + " | escudos ociosos " + m.escudosOciososPct + "%");
  console.log("  (8 karts: volta média " + base.k8.voltaMedia + " s, contato " + base.k8.contatoPct + "%)");
  console.log("  relatório: ferramentas/relatorios/metricas-ia.json");
}

const falhas = resultados.filter(r => !r.ok);
console.log("\n" + (falhas.length ? falhas.length + " TESTE(S) FALHARAM" : "Todos os " + resultados.length + " testes passaram") + "\n");
process.exit(falhas.length ? 1 : 0);
}
