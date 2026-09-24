/* ============================================================
   PISTA - CIRCUITO VULCANO
   Gera proceduralmente: textura do mapa (usada pelo mode 7),
   classificacao analitica de terreno, linha central, checkpoints,
   caixas de item, grid de largada e decoracoes laterais.
   Traçado 100% original.
   ============================================================ */
KT.Track = (function () {

  /* Fase 2: traçados esticados e pista mais larga. Com escala 1 e largura 1 a geometria
     é idêntica à original (a regressão do QA confere isso). */
  var ESCALA = 2.0, LARGURA = 1.15;
  var escala = ESCALA, largura = LARGURA;
  var SIZE = 1536;
  var CX = 768, CY = 768;
  var ROAD = 88;            /* largura do asfalto */
  var HALF = ROAD / 2;
  var CURB = 9;             /* zebra de cada lado */
  var GRASS = 40;           /* faixa de grama depois da zebra */
  var ASH = 46;             /* faixa de cinzas depois da grama */
  var EDGE = HALF + CURB;                 /* limite da zebra */
  var EDGE_G = EDGE + GRASS;              /* limite da grama */
  var EDGE_A = EDGE_G + ASH;              /* limite navegavel (muro) */
  var N = 1200;             /* amostras da linha central */
  var GRID = 8;             /* posicoes de largada */
  var SEMENTE_VISUAL = 16;  /* textura identica a cada carga */

  var T = { ASFALTO: 0, ZEBRA: 1, GRAMA: 2, CINZAS: 3, TURBO: 4, PAREDE: 5 };

  var PROPS = [
    { name: "asfalto", speed: 1.00, grip: 1.00, rough: 0 },
    { name: "zebra",   speed: 0.94, grip: 0.88, rough: 1 },
    { name: "grama",   speed: 0.52, grip: 0.60, rough: 2 },
    { name: "cinzas",  speed: 0.68, grip: 0.72, rough: 2 },
    { name: "turbo",   speed: 1.00, grip: 1.00, rough: 0 },
    { name: "parede",  speed: 0.15, grip: 0.40, rough: 3 }
  ];

  var pts = [];
  var total = 0;
  var texture = null;
  var texData = null;
  var checkpoints = [];
  var itemBoxes = [];
  var boostPads = [];
  var props = [];
  var startGrid = [];
  var turboZone = null;     /* 1 nas amostras cobertas por faixa de turbo */
  var definition = KT.TRACKS[0], mirrored = false, dangers = [];

  function radius(th) {
    if (definition.id !== 0) {
      var w=definition.waves;
      return definition.radius+w[0]*Math.sin(w[1]*th+w[2])+w[3]*Math.sin(w[4]*th+w[5])+w[6]*Math.cos(w[7]*th+w[8]);
    }
    return 380
      + 105 * Math.sin(3 * th + 0.4)
      + 52 * Math.sin(5 * th)
      + 28 * Math.cos(2 * th + 0.9);
  }

  function buildPath() {
    pts.length = 0;
    var i, th, r, raw = [], reach = 0;
    for (i = 0; i < N; i++) {
      th = (i / N) * KT.TAU;
      r = radius(th) * escala;
      raw.push([Math.cos(th) * r * definition.sx * (mirrored ? -1 : 1), Math.sin(th) * r * definition.sy]);
      reach = Math.max(reach, Math.abs(raw[i][0]), Math.abs(raw[i][1]));
    }
    /* A textura cresce com o traçado; nunca fica menor que a original. */
    SIZE = Math.max(1536, Math.ceil(2 * (reach + EDGE_A + 40) / 64) * 64);
    CX = CY = SIZE / 2;
    for (i = 0; i < N; i++) pts.push({ x: CX + raw[i][0], y: CY + raw[i][1], ang: 0, s: 0, len: 0, curv: 0 });
    total = 0;
    for (i = 0; i < N; i++) {
      var a = pts[i], b = pts[(i + 1) % N];
      var dx = b.x - a.x, dy = b.y - a.y;
      a.ang = Math.atan2(dx, dy);        /* frente = (sin ang, cos ang) */
      a.len = Math.sqrt(dx * dx + dy * dy);
      a.s = total;
      total += a.len;
    }
    for (i = 0; i < N; i++) {
      var p0 = pts[(i - 7 + N) % N], p2 = pts[(i + 7) % N];
      pts[i].curv = Math.abs(KT.angDiff(p2.ang, p0.ang));
    }
    var sm = [];
    for (i = 0; i < N; i++) {
      var acc = 0;
      for (var k = -9; k <= 9; k++) acc += pts[(i + k + N) % N].curv;
      sm.push(acc / 19);
    }
    for (i = 0; i < N; i++) pts[i].curv = sm[i];
  }

  function pathTo(ctx) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < N; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }

  function strokeAll(ctx, color, w) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    pathTo(ctx);
    ctx.stroke();
  }

  /* ---------- textura visual do mapa ---------- */
  function buildTexture() {
    var c = KT.makeCanvas(SIZE, SIZE);
    var x = c.getContext("2d");
    var i, j;

    /* rocha vulcanica fora dos limites */
    x.fillStyle = "#171020";
    x.fillRect(0, 0, SIZE, SIZE);
    var rv = KT.rngVis;
    var area = (SIZE / 1536) * (SIZE / 1536);
    for (i = 0; i < 24000 * area; i++) {
      x.fillStyle = rv() > 0.5 ? "#221729" : "#120c1a";
      x.fillRect(rv() * SIZE | 0, rv() * SIZE | 0, 2, 2);
    }
    for (i = 0; i < 30; i++) {
      var lx = rv() * SIZE, ly = rv() * SIZE, la = rv() * KT.TAU;
      x.strokeStyle = "#7a2a18"; x.lineWidth = 3;
      x.beginPath(); x.moveTo(lx, ly);
      for (j = 0; j < 14; j++) {
        la += KT.randV(-0.6, 0.6);
        lx += Math.cos(la) * 16; ly += Math.sin(la) * 16;
        x.lineTo(lx, ly);
      }
      x.stroke();
      x.strokeStyle = "#d4622a"; x.lineWidth = 1; x.stroke();
    }

    /* muro de contencao (borda de pedra clara) */
    strokeAll(x, "#5a4258", 2 * EDGE_A + 14);
    strokeAll(x, "#3b2c40", 2 * EDGE_A + 6);

    /* faixa de cinzas */
    strokeAll(x, "#4c434e", 2 * EDGE_A);
    /* faixa de grama */
    strokeAll(x, "#2c4a30", 2 * EDGE_G);

    /* zebras vermelhas e brancas */
    x.lineJoin = "round"; x.lineCap = "butt";
    x.lineWidth = 2 * EDGE;
    for (i = 0; i < N; i++) {
      var a = pts[i], b = pts[(i + 1) % N];
      x.strokeStyle = (Math.floor(i / 9) % 2 === 0) ? "#d83a3a" : "#ececf4";
      x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
    }

    /* asfalto */
    strokeAll(x, "#d6d6e2", ROAD);        /* borda branca */
    strokeAll(x, "#3b3b4c", ROAD - 7);

    /* granulado: pontilhado colocado faixa a faixa ao longo do traçado
       (nada de clip por caminho fechado, que recortaria o miolo do circuito) */
    var GRAMA_N = ["#3a5f3d", "#26412b", "#1f3624", "#456b46"];
    var CINZA_N = ["#5a5058", "#413a44", "#655a62", "#372f3a"];
    var ASF_N = ["#45455a", "#353546", "#30303f", "#414152"];
    for (i = 0; i < N; i++) {
      var pn = pts[i];
      var nnx = Math.cos(pn.ang), nny = -Math.sin(pn.ang);
      for (var dn = 0; dn < 44 * escala * largura; dn++) {
        var lat = KT.randV(-EDGE_A, EDGE_A);
        var al = Math.abs(lat);
        var col;
        if (al < HALF - 4) col = ASF_N[(rv() * 4) | 0];
        else if (al < EDGE + 2) continue;                  /* zebra fica limpa */
        else if (al < EDGE_G) col = GRAMA_N[(rv() * 4) | 0];
        else col = CINZA_N[(rv() * 4) | 0];
        x.fillStyle = col;
        x.fillRect((pn.x + nnx * lat + KT.randV(-1.5, 1.5)) | 0,
                   (pn.y + nny * lat + KT.randV(-1.5, 1.5)) | 0, 2, 2);
      }
    }

    /* marcas de pneu na trajetoria ideal */
    x.save();
    x.globalAlpha = 0.20;
    x.strokeStyle = "#1d1d28"; x.lineWidth = 4;
    for (i = 0; i < N; i++) {
      var p3 = pts[i], p4 = pts[(i + 1) % N];
      var n3x = Math.cos(p3.ang), n3y = -Math.sin(p3.ang);
      var n4x = Math.cos(p4.ang), n4y = -Math.sin(p4.ang);
      var o = 11;
      x.beginPath();
      x.moveTo(p3.x + n3x * o, p3.y + n3y * o);
      x.lineTo(p4.x + n4x * o, p4.y + n4y * o);
      x.stroke();
      x.beginPath();
      x.moveTo(p3.x - n3x * o, p3.y - n3y * o);
      x.lineTo(p4.x - n4x * o, p4.y - n4y * o);
      x.stroke();
    }
    x.globalAlpha = 1;
    x.restore();

    /* faixas de turbo */
    for (var b2 = 0; b2 < boostPads.length; b2++) {
      var pp = pts[boostPads[b2]];
      x.save();
      x.translate(pp.x, pp.y);
      x.rotate(-pp.ang);
      x.fillStyle = "#2a1608";
      x.fillRect(-HALF + 8, -16, ROAD - 16, 32);
      for (var ch = 0; ch < 3; ch++) {
        x.fillStyle = ch === 2 ? "#ffd24a" : (ch === 1 ? "#ff9a3c" : "#ff6a1c");
        var yy = -13 + ch * 9;
        var wtot = ROAD - 20;
        for (var w = 0; w < wtot; w++) {
          var hgt = 6 - Math.abs(w - wtot / 2) * 0.05;
          x.fillRect(-HALF + 10 + w, yy, 1, Math.max(2, hgt));
        }
      }
      x.restore();
    }

    /* linha de chegada quadriculada */
    var sp = pts[0];
    x.save();
    x.translate(sp.x, sp.y);
    x.rotate(-sp.ang);
    var cells = 11, cw = (2 * EDGE) / cells;
    for (var r = 0; r < 4; r++)
      for (var cN = 0; cN < cells; cN++) {
        x.fillStyle = ((r + cN) % 2 === 0) ? "#f2f2fa" : "#1b1b26";
        x.fillRect(-EDGE + cN * cw, -10 + r * 5, cw + 0.6, 5.2);
      }
    x.restore();

    if (definition.id !== 0) {
      var theme=KT.THEMES[definition.theme];
      /* Recria o piso com a paleta do bioma; detalhes continuam em pixel art. */
      x.globalCompositeOperation="source-over";
      x.fillStyle=theme.ground;x.fillRect(0,0,SIZE,SIZE);
      strokeAll(x,theme.soil,2*EDGE_A+12);
      strokeAll(x,theme.grass,2*EDGE_G);
      x.lineWidth=2*EDGE;x.lineCap="butt";
      for(i=0;i<N;i++){var pa=pts[i],pb=pts[(i+1)%N];x.strokeStyle=Math.floor(i/9)%2?"#e8ebed":theme.curb;x.beginPath();x.moveTo(pa.x,pa.y);x.lineTo(pb.x,pb.y);x.stroke();}
      strokeAll(x,"#dce2e1",ROAD);strokeAll(x,theme.road,ROAD-6);
      for(i=0;i<14000*escala*largura;i++){var pp2=pts[(rv()*N)|0],lat2=KT.randV(-EDGE_A,EDGE_A);x.fillStyle=Math.abs(lat2)<HALF?"#ffffff":"#101f2b";x.globalAlpha=.12;x.fillRect(pp2.x+Math.cos(pp2.ang)*lat2,pp2.y-Math.sin(pp2.ang)*lat2,2,2);}x.globalAlpha=1;
      /* Turbo, chegada e setores perigosos pertencem à geometria da pista. */
      boostPads.forEach(function(idx){var p=pts[idx];x.save();x.translate(p.x,p.y);x.rotate(-p.ang);x.fillStyle="#18232e";x.fillRect(-HALF+8,-16,ROAD-16,32);for(var a=0;a<3;a++){x.fillStyle=theme.accent;x.beginPath();x.moveTo(-HALF+12,-10+a*9);x.lineTo(0,-15+a*9);x.lineTo(HALF-12,-10+a*9);x.lineWidth=3;x.strokeStyle=theme.accent;x.stroke();}x.restore();});
      var pstart=pts[0];x.save();x.translate(pstart.x,pstart.y);x.rotate(-pstart.ang);for(var rr=0;rr<4;rr++)for(var cc=0;cc<12;cc++){x.fillStyle=(rr+cc)%2?"#172330":"#ffffff";x.fillRect(-HALF+cc*ROAD/12,-10+rr*5,ROAD/12+1,5);}x.restore();
      dangers.forEach(function(h){x.save();x.translate(h.x,h.y);x.fillStyle=h.kind==="ice"?"#b4eaff":h.kind==="water"?"#408ebc":h.kind==="sand"?"#e4bf7c":h.kind==="lava"?"#793326":"#191d2b";x.beginPath();x.ellipse(0,0,h.radius,h.radius*.7,0,0,KT.TAU);x.fill();x.strokeStyle=theme.accent;x.lineWidth=2;x.stroke();x.restore();});
      if(definition.hazard==="fall")for(i=270;i<410;i+=5){var fp=pointAt(i,HALF+5);x.fillStyle="#ffe59b";x.fillRect(fp.x-3,fp.y-3,6,6);fp=pointAt(i,-HALF-5);x.fillRect(fp.x-3,fp.y-3,6,6);}
    }
    texture = c;
    texData = x.getImageData(0, 0, SIZE, SIZE).data;
  }

  /* ---------- objetos ---------- */
  function buildObjects() {
    itemBoxes.length = 0;
    props.length = 0;

    var rows = [90, 260, 430, 600, 770, 940, 1110];
    for (var r = 0; r < rows.length; r++) {
      var idx = rows[r] % N;
      var p = pts[idx];
      var nx = Math.cos(p.ang), ny = -Math.sin(p.ang);
      for (var k = -1; k <= 1; k++) {
        itemBoxes.push({
          x: p.x + nx * k * 27 * largura, y: p.y + ny * k * 27 * largura,
          active: true, timer: 0, i: idx
        });
      }
    }

    var passoDeco = Math.round(38 / escala);
    for (var i = 0; i < N; i += passoDeco) {
      var q = pts[i];
      var qx = Math.cos(q.ang), qy = -Math.sin(q.ang);
      var off = EDGE_A - 10;
      var kind = (i / passoDeco) % 3 === 0 ? "totem" : "tocha";
      props.push({ x: q.x + qx * off, y: q.y + qy * off, type: kind, ph: KT.rngVis() * 6 });
      props.push({ x: q.x - qx * off, y: q.y - qy * off, type: kind === "totem" ? "tocha" : "totem", ph: KT.rngVis() * 6 });
    }

    startGrid.length = 0;
    for (var g = 0; g < GRID; g++) {
      var gi = (N - Math.round(16 / escala) - g * Math.round(12 / escala)) % N;
      var gp = pts[gi];
      var gx = Math.cos(gp.ang), gy = -Math.sin(gp.ang);
      var lateral = ((g % 2 === 0) ? -20 : 20) * largura;
      startGrid.push({ x: gp.x + gx * lateral, y: gp.y + gy * lateral, ang: gp.ang, i: gi });
    }
  }

  /* opts.escala / opts.largura só existem para o QA comparar com a geometria original. */
  function build(id, mirror, opts) {
    definition=KT.TRACKS[id || 0] || KT.TRACKS[0];mirrored=!!mirror;
    escala=opts&&opts.escala!=null?opts.escala:ESCALA;largura=opts&&opts.largura!=null?opts.largura:LARGURA;
    ROAD=definition.width*largura;HALF=ROAD/2;EDGE=HALF+CURB;EDGE_G=EDGE+GRASS*largura;EDGE_A=EDGE_G+ASH*largura;
    KT.seedVis(definition.seed);
    buildPath();
    boostPads = definition.pads.slice();
    /* cobertura das faixas de turbo por amostra: ~18 unidades para cada lado */
    turboZone = new Uint8Array(N);
    var zona = Math.round(7 / escala);
    for (var b = 0; b < boostPads.length; b++)
      for (var k = -zona; k <= zona; k++) turboZone[(boostPads[b] + k + N) % N] = 1;
    buildObjects();
    dangers=[];
    if(definition.hazard && definition.hazard!=="fall" && definition.hazard!=="wind") {
      [285,635,980].forEach(function(i,n){var p=pointAt(i,(n%2?1:-1)*(HALF*.37));dangers.push({i:i,x:p.x,y:p.y,kind:definition.hazard,radius:(definition.hazard==="rocks"?12:19)*largura,phase:n*1.7});});
    }
    buildTexture();
    checkpoints.length = 0;
    var CP = 24;
    for (var i = 0; i < CP; i++) checkpoints.push(Math.floor(i * N / CP));
  }

  /* perfil transversal por amostra. Hoje a largura e constante;
     a partir das pistas por dados cada amostra tera o seu. */
  function halfAt(i) { return HALF; }
  function edgeAt(i) { return EDGE; }
  function edgeGAt(i) { return EDGE_G; }
  function edgeAAt(i) { return EDGE_A; }

  /* indice mais proximo da linha central (usa dica para busca local) */
  function nearestIndex(x, y, hint) {
    var best = 0, bestD = 1e9, i, dx, dy, d;
    if (hint == null) {
      for (i = 0; i < N; i += 3) {
        dx = pts[i].x - x; dy = pts[i].y - y;
        d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = i; }
      }
      hint = best; bestD = 1e9;
    }
    for (var k = -60; k <= 60; k++) {
      i = (hint + k + N) % N;
      dx = pts[i].x - x; dy = pts[i].y - y;
      d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function lateralOffset(x, y, i) {
    var p = pts[i];
    return (x - p.x) * Math.cos(p.ang) - (y - p.y) * Math.sin(p.ang);
  }

  /* terreno analitico: exato e sem custo de bitmap */
  function terrainAt(x, y, hint) {
    var i = nearestIndex(x, y, hint);
    var lat = Math.abs(lateralOffset(x, y, i));
    var half = halfAt(i);
    if (lat <= half) {
      if (turboZone[i] && lat < half - 8) return T.TURBO;
      return T.ASFALTO;
    }
    if (lat <= edgeAt(i)) return T.ZEBRA;
    if (lat <= edgeGAt(i)) return T.GRAMA;
    if (lat <= edgeAAt(i)) return T.CINZAS;
    return T.PAREDE;
  }

  function pointAt(i, lateral) {
    var p = pts[((i % N) + N) % N];
    var nx = Math.cos(p.ang), ny = -Math.sin(p.ang);
    return { x: p.x + nx * lateral, y: p.y + ny * lateral, ang: p.ang };
  }

  return {
    build: build,
    get definition(){return definition;},get mirror(){return mirrored;},get dangers(){return dangers;},
    /* getters: dimensoes passam a depender da pista carregada */
    get SIZE() { return SIZE; }, get N() { return N; }, get ROAD() { return ROAD; },
    get CX() { return CX; }, get escala() { return escala; }, get largura() { return largura; },
    get HALF() { return HALF; }, get EDGE() { return EDGE; },
    get EDGE_G() { return EDGE_G; }, get EDGE_A() { return EDGE_A; },
    T: T, PROPS: PROPS,
    halfAt: halfAt, edgeAt: edgeAt, edgeGAt: edgeGAt, edgeAAt: edgeAAt,
    get pts() { return pts; },
    get texData() { return texData; },
    get texture() { return texture; },
    get total() { return total; },
    checkpoints: checkpoints,
    get itemBoxes() { return itemBoxes; },
    get props() { return props; },
    get startGrid() { return startGrid; },
    get boostPads() { return boostPads; },
    terrainAt: terrainAt,
    nearestIndex: nearestIndex,
    lateralOffset: lateralOffset,
    pointAt: pointAt
  };
})();
