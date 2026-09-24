/* ============================================================
   ANIMAIS - pilotos animais e veículos temáticos em pixel art.
   Tudo é desenhado por código numa grade de caracteres (mesmo
   formato de KT.drawArt), com contorno automático. Determinístico:
   não usa sorteio, então não mexe na simulação nem no online.
   ============================================================ */
(function () {
  "use strict";

  var W = 32, H = 24;           /* frame do kart (antes 24×16) */

  /* ---------------- grade de pixels ---------------- */
  function Grade(w, h) {
    this.w = w; this.h = h; this.c = [];
    for (var i = 0; i < w * h; i++) this.c.push(".");
  }
  Grade.prototype.px = function (x, y, ch) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = ch;
  };
  Grade.prototype.get = function (x, y) {
    return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.c[y * this.w + x] : ".";
  };
  Grade.prototype.rect = function (x, y, w, h, ch) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.px(x + i, y + j, ch);
  };
  /* elipse preenchida pelo centro dos pixels */
  Grade.prototype.elipse = function (cx, cy, rx, ry, ch) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, ch);
      }
  };
  Grade.prototype.tri = function (ax, ay, bx, by, cx, cy, ch) {
    var x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.ceil(Math.max(ax, bx, cx));
    var y0 = Math.floor(Math.min(ay, by, cy)), y1 = Math.ceil(Math.max(ay, by, cy));
    function lado(px, py, qx, qy, rx, ry) { return (px - rx) * (qy - ry) - (qx - rx) * (py - ry); }
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var px = x + 0.5, py = y + 0.5;
      var d1 = lado(px, py, ax, ay, bx, by), d2 = lado(px, py, bx, by, cx, cy), d3 = lado(px, py, cx, cy, ax, ay);
      var neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(neg && pos)) this.px(x, y, ch);
    }
  };
  Grade.prototype.linha = function (x0, y0, x1, y1, ch) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (var i = 0; i <= n; i++) this.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, ch);
  };
  /* contorno escuro de 1 px em volta de tudo que foi pintado */
  Grade.prototype.contorno = function () {
    var novo = this.c.slice();
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) {
      if (this.get(x, y) !== ".") continue;
      var viz = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)];
      if (viz.some(function (v) { return v !== "." && v !== "K"; })) novo[y * this.w + x] = "K";
    }
    this.c = novo;
  };
  Grade.prototype.linhas = function () {
    var out = [];
    for (var y = 0; y < this.h; y++) out.push(this.c.slice(y * this.w, (y + 1) * this.w).join(""));
    return out;
  };

  /* ---------------- espécies ----------------
     F pelo, f pelo escuro, L claro (focinho/barriga), N nariz ou bico, I orelha por dentro, J juba/extra */
  var ESPECIES = {
    leao:       { F: "#d9a441", f: "#a8742a", L: "#f2d9a0", N: "#5a3020", I: "#e8a070", J: "#9a4f1c", orelha: "redonda", focinho: "curto", juba: true },
    raposa:     { F: "#e8742a", f: "#b3501a", L: "#f4ecdc", N: "#2a1a14", I: "#2a1a14", orelha: "pontuda", focinho: "curto", bochecha: true },
    coelha:     { F: "#f2e8f0", f: "#cbb8c8", L: "#ffffff", N: "#f28cb0", I: "#f49ac0", orelha: "longa", focinho: "curto" },
    rinoceronte:{ F: "#8c8f9a", f: "#62656f", L: "#a9acb6", N: "#3a3c44", I: "#b88a8a", J: "#efe6d0", orelha: "pequena", focinho: "longo", chifre: true },
    castor:     { F: "#8a5a32", f: "#62401f", L: "#c89868", N: "#2a1a14", I: "#c89868", orelha: "pequena", focinho: "curto", dentes: true },
    arara:      { F: "#e23a2e", f: "#a8261e", L: "#f7f0e0", N: "#2e2a2a", I: "#f4c430", J: "#2a7ae0", orelha: "crista", focinho: "bico", rostoClaro: true },
    tartaruga:  { F: "#7cb870", f: "#4f8a48", L: "#b8e0a8", N: "#2a3a20", orelha: "nenhuma", focinho: "achatado" },
    pinguim:    { F: "#262c40", f: "#10141e", L: "#f4f6ff", N: "#f4a02a", orelha: "nenhuma", focinho: "bico", rostoClaro: true },
    boto:       { F: "#f09ab8", f: "#c86c90", L: "#fcd0e0", N: "#c86c90", orelha: "nenhuma", focinho: "rostro" },
    komodo:     { F: "#6f7a4a", f: "#4a5230", L: "#a8b070", N: "#2a2e1a", J: "#ff6a5c", orelha: "nenhuma", focinho: "longo", lingua: true },
    falcao:     { F: "#8a6a4a", f: "#5a4430", L: "#efe6d4", N: "#f4c430", orelha: "nenhuma", focinho: "bico", mascara: true },
    onca:       { F: "#e8b040", f: "#b07a20", L: "#f6e6c0", N: "#5a3020", I: "#b07a20", orelha: "redonda", focinho: "curto", manchas: true }
  };

  /* ---------------- cabeça ----------------
     vista: "costas", "lado" (olhando para a direita) ou "frente". s = escala. */
  function cabeca(g, e, vista, cx, cy, s) {
    var rx = 4.3 * s, ry = 3.9 * s, i;
    if (e.juba) g.elipse(cx - (vista === "lado" ? 1.2 * s : 0), cy + 0.4 * s, 6.4 * s, 5.8 * s, "J");
    /* orelhas atrás da cabeça */
    var orelhas = vista === "lado" ? [-0.6] : [-1, 1];
    orelhas.forEach(function (lado) {
      var ox = cx + lado * 2.8 * s;
      if (e.orelha === "redonda") { g.elipse(ox, cy - 3.3 * s, 1.7 * s, 1.7 * s, "F"); if (vista !== "costas") g.elipse(ox, cy - 3.2 * s, 0.8 * s, 0.8 * s, "I"); }
      else if (e.orelha === "pequena") g.elipse(ox, cy - 3.4 * s, 1.2 * s, 1.1 * s, "F");
      else if (e.orelha === "pontuda") {
        g.tri(ox - 1.8 * s, cy - 2 * s, ox + 1.8 * s, cy - 2 * s, ox + lado * 0.6 * s, cy - 6.4 * s, "F");
        if (vista !== "costas") g.tri(ox - 0.8 * s, cy - 2.4 * s, ox + 0.8 * s, cy - 2.4 * s, ox + lado * 0.5 * s, cy - 5 * s, "I");
      } else if (e.orelha === "longa") {
        g.elipse(ox + lado * 0.4 * s, cy - 6.4 * s, 1.3 * s, 4 * s, "F");
        if (vista !== "costas") g.elipse(ox + lado * 0.4 * s, cy - 6.2 * s, 0.6 * s, 3 * s, "I");
      }
    });
    if (e.orelha === "crista") for (i = 0; i < 3; i++) g.elipse(cx - 1.5 * s + i * 1.5 * s - (vista === "lado" ? 1.5 * s : 0), cy - 3.8 * s - (i === 1 ? 0.8 * s : 0), 0.9 * s, 1.6 * s, i === 1 ? "I" : "J");

    g.elipse(cx, cy, rx, ry, "F");
    /* sombra embaixo da cabeça */
    for (i = Math.round(cx - rx * 0.7); i <= Math.round(cx + rx * 0.7); i++) g.px(i, Math.round(cy + ry - 1), "f");

    if (vista === "costas") {
      if (e.manchas) { g.px(cx - 2 * s, cy - 1 * s, "f"); g.px(cx + 1.5 * s, cy + 0.5 * s, "f"); g.px(cx, cy - 2 * s, "f"); }
      return;
    }

    if (vista === "lado") {
      var nx = cx + 3.2 * s, ny = cy + 1.1 * s;
      if (e.rostoClaro) g.elipse(cx + 1.4 * s, cy - 0.2 * s, 2.2 * s, 2.4 * s, "L");
      if (e.focinho === "curto") { g.elipse(nx, ny, 2 * s, 1.5 * s, "L"); g.px(nx + 1.6 * s, ny - 0.8 * s, "N"); }
      else if (e.focinho === "achatado") g.elipse(nx - 0.4 * s, ny, 1.6 * s, 1.3 * s, "L");
      else if (e.focinho === "longo") { g.elipse(nx + 0.6 * s, ny, 3 * s, 1.7 * s, "L"); g.px(nx + 3 * s, ny - 0.6 * s, "N"); }
      else if (e.focinho === "rostro") g.elipse(nx + 1.4 * s, ny + 0.4 * s, 3.4 * s, 1.1 * s, "L");
      else if (e.focinho === "bico") { g.tri(nx - 1 * s, ny - 1.6 * s, nx - 1 * s, ny + 1.2 * s, nx + 3 * s, ny + 0.6 * s, "N"); }
      if (e.chifre) g.tri(nx + 0.6 * s, ny - 1.4 * s, nx + 2.6 * s, ny - 1.4 * s, nx + 2.4 * s, ny - 4.4 * s, "J");
      if (e.dentes) g.px(nx + 1 * s, ny + 1.4 * s, "W");
      if (e.lingua) { g.px(nx + 3.6 * s, ny + 0.4 * s, "J"); g.px(nx + 4.4 * s, ny + 0.8 * s, "J"); }
      if (e.mascara) g.linha(cx + 1 * s, cy + 0.2 * s, cx + 2.6 * s, cy + 1.4 * s, "f");
      g.px(cx + 1.6 * s, cy - 1 * s, "K");
      if (s > 1) g.px(cx + 1.6 * s - 1, cy - 1 * s, "W");
      if (e.manchas) { g.px(cx - 2 * s, cy - 1 * s, "f"); g.px(cx - 1 * s, cy + 1.2 * s, "f"); }
      return;
    }

    /* frente */
    if (e.rostoClaro) g.elipse(cx, cy + 0.6 * s, 3.2 * s, 2.8 * s, "L");
    if (e.bochecha) { g.elipse(cx - 2.2 * s, cy + 1.4 * s, 1.8 * s, 1.4 * s, "L"); g.elipse(cx + 2.2 * s, cy + 1.4 * s, 1.8 * s, 1.4 * s, "L"); }
    if (e.mascara) { g.linha(cx - 2.6 * s, cy + 0.4 * s, cx - 1.6 * s, cy + 1.6 * s, "f"); g.linha(cx + 2.6 * s, cy + 0.4 * s, cx + 1.6 * s, cy + 1.6 * s, "f"); }
    var my = cy + 1.8 * s;
    if (e.focinho === "curto") { g.elipse(cx, my, 2.1 * s, 1.5 * s, "L"); g.elipse(cx, my - 0.9 * s, 0.9 * s, 0.6 * s, "N"); }
    else if (e.focinho === "achatado") { g.elipse(cx, my, 2.4 * s, 1.2 * s, "L"); g.px(cx - 0.6 * s, my, "N"); g.px(cx + 0.6 * s, my, "N"); }
    else if (e.focinho === "longo") { g.elipse(cx, my + 0.3 * s, 2.8 * s, 1.8 * s, "L"); g.px(cx - 1 * s, my, "N"); g.px(cx + 1 * s, my, "N"); }
    else if (e.focinho === "rostro") g.elipse(cx, my + 0.5 * s, 1.4 * s, 1.6 * s, "L");
    else if (e.focinho === "bico") g.tri(cx - 1.6 * s, my - 1.2 * s, cx + 1.6 * s, my - 1.2 * s, cx, my + 1.6 * s, "N");
    if (e.chifre) g.tri(cx - 1 * s, my - 0.6 * s, cx + 1 * s, my - 0.6 * s, cx, my - 3.8 * s, "J");
    if (e.dentes) { g.px(cx - 0.5 * s, my + 1 * s, "W"); g.px(cx + 0.5 * s, my + 1 * s, "W"); }
    if (e.lingua) g.px(cx, my + 1.6 * s, "J");
    if (e.manchas) { g.px(cx - 3 * s, cy - 1 * s, "f"); g.px(cx + 3 * s, cy - 0.4 * s, "f"); g.px(cx, cy - 2.6 * s, "f"); }
    /* olhos */
    [-1, 1].forEach(function (lado) {
      var ex = cx + lado * 1.7 * s, ey = cy - 0.8 * s;
      if (s > 1) { g.rect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2, "W"); g.px(ex + (lado < 0 ? 0 : -1), ey, "K"); }
      else g.px(ex, ey, "K");
    });
  }

  /* ---------------- veículo ----------------
     Vistas: 0 traseira, 1 traseira 3/4, 2 lateral (frente à direita), 3 frente 3/4, 4 frente. */
  function rodas(g, v, tipo) {
    if (tipo === "nenhuma") return;
    var grande = tipo === "grande";
    function roda(x, y, w, h) { g.rect(x, y, w, h, "T"); g.rect(x + 1, y + Math.floor(h / 2) - 1, Math.max(1, w - 2), 2, "t"); }
    if (v === 0 || v === 4) { roda(3, grande ? 11 : 14, 5, grande ? 11 : 8); roda(24, grande ? 11 : 14, 5, grande ? 11 : 8); }
    else if (v === 1) { roda(2, grande ? 10 : 13, 5, grande ? 12 : 9); roda(25, 15, 4, 6); }
    else if (v === 3) { roda(3, 15, 4, 6); roda(25, grande ? 10 : 13, 5, grande ? 12 : 9); }
    else {
      var rt = grande ? 4.4 : 3.2;
      g.elipse(9, 21 - rt + 1, rt, rt, "T"); g.elipse(9, 21 - rt + 1, 1.2, 1.2, "t");
      g.elipse(23, 21 - 2.2, 3.2, 3.2, "T"); g.elipse(23, 21 - 2.2, 1.2, 1.2, "t");
    }
  }

  function corpo(g, v, cor, baixo) {
    var topo = baixo ? 15 : 13;
    if (v === 0 || v === 4) {
      g.elipse(16, topo + 2, 8.5, 3.5, cor); g.rect(8, topo + 2, 16, 20 - topo - 2, cor);
      g.linha(10, 20, 21, 20, "b"); g.linha(11, topo, 20, topo, "H");
    } else if (v === 1 || v === 3) {
      g.elipse(16, topo + 2, 9.5, 3.5, cor); g.rect(7, topo + 2, 18, 20 - topo - 2, cor);
      g.linha(9, 20, 23, 20, "b"); g.linha(10, topo, 21, topo, "H");
    } else {
      g.rect(4, topo + 1, 23, 20 - topo - 1, cor); g.elipse(26, 18, 3.5, 2.6, cor);
      g.linha(5, topo + 1, 24, topo + 1, "H"); g.linha(5, 20, 27, 20, "b");
    }
  }

  var VEICULOS = {
    /* leão: muscle car com grade cor de juba, escapamentos e aerofólio */
    muscle: function (g, v) {
      rodas(g, v, "normal"); corpo(g, v, "B");
      if (v === 0 || v === 1) { g.rect(v === 0 ? 5 : 4, 13, 4, 2, "b"); g.rect(v === 0 ? 23 : 24, 13, 4, 2, "b"); g.px(11, 19, "M"); g.px(20, 19, "M"); g.rect(15, 14, 2, 6, "A"); }
      if (v === 4 || v === 3) { g.rect(12, 17, 8, 3, "J"); g.px(9, 16, "W"); g.px(22, 16, "W"); g.rect(15, 14, 2, 3, "A"); }
      if (v === 2) { g.rect(3, 12, 3, 2, "b"); g.linha(8, 17, 26, 17, "A"); g.px(29, 17, "W"); g.px(2, 19, "M"); }
    },
    /* raposa: esportivo baixo com a cauda saindo por trás */
    esportivo: function (g, v) {
      rodas(g, v, "normal"); corpo(g, v, "B", true);
      if (v === 0) { g.elipse(26, 10, 2.2, 4, "F"); g.elipse(26.5, 6.8, 1.6, 1.6, "L"); g.linha(11, 18, 20, 18, "A"); }
      if (v === 1) { g.elipse(5, 10, 2.2, 4, "F"); g.elipse(4.5, 6.8, 1.6, 1.6, "L"); }
      if (v === 2) { g.elipse(3, 12, 2, 3.6, "F"); g.elipse(2, 9.2, 1.5, 1.5, "L"); g.tri(10, 19, 14, 16, 18, 19, "A"); g.tri(15, 19, 19, 16, 23, 19, "A"); }
      if (v === 4 || v === 3) { g.px(9, 17, "W"); g.px(22, 17, "W"); g.linha(12, 19, 19, 19, "A"); }
    },
    /* coelha: buggy em forma de cenoura, santantônio e rama verde */
    buggy: function (g, v) {
      rodas(g, v, "normal"); corpo(g, v, "O");
      for (var x = 9; x <= 22; x += 3) g.px(v === 2 ? x + 2 : x, 17, "o");
      if (v === 0 || v === 1) { g.linha(13, 9, 12, 13, "G"); g.linha(16, 8, 16, 13, "g"); g.linha(19, 9, 20, 13, "G"); g.linha(10, 11, 10, 14, "B"); g.linha(21, 11, 21, 14, "B"); }
      if (v === 2) { g.linha(3, 12, 5, 15, "G"); g.linha(2, 14, 5, 16, "g"); g.linha(7, 10, 7, 14, "B"); g.linha(7, 10, 20, 10, "B"); g.linha(20, 10, 22, 14, "B"); }
      if (v === 4 || v === 3) { g.linha(9, 11, 9, 15, "B"); g.linha(22, 11, 22, 15, "B"); g.linha(9, 11, 22, 11, "B"); }
    },
    /* rinoceronte: trator blindado, rodas enormes e chaminé */
    trator: function (g, v) {
      rodas(g, v, "grande"); corpo(g, v, "B");
      if (v === 2) { g.rect(20, 9, 2, 5, "m"); g.px(20, 8, "M"); g.rect(6, 15, 12, 3, "M"); for (var x = 7; x < 18; x += 3) g.px(x, 16, "m"); }
      else { g.rect(10, 16, 12, 3, "M"); g.px(11, 17, "m"); g.px(16, 17, "m"); g.px(20, 17, "m"); if (v < 2) { g.rect(22, 7, 2, 7, "m"); g.px(22, 6, "M"); } }
    },
    /* castor: engenhoca de tábuas com engrenagens */
    engenhoca: function (g, v) {
      rodas(g, v, "normal"); corpo(g, v, "w");
      var y; for (y = 15; y <= 19; y += 2) g.linha(v === 2 ? 5 : 9, y, v === 2 ? 26 : 22, y, "x");
      if (v === 2) { g.elipse(15, 12, 2.4, 2.4, "M"); g.elipse(15, 12, 0.9, 0.9, "m"); g.rect(4, 16, 2, 3, "B"); }
      else { g.elipse(v === 1 ? 7 : 8, 15, 2.2, 2.2, "M"); g.elipse(v === 3 ? 25 : 24, 15, 2.2, 2.2, "M"); g.rect(14, 19, 4, 1, "B"); }
    },
    /* arara: planador com asas de folha */
    planador: function (g, v) {
      if (v === 2) { rodas(g, v, "normal"); corpo(g, v, "B", true); g.elipse(14, 15, 10, 1.4, "G"); g.linha(6, 15, 22, 15, "g"); g.tri(2, 12, 6, 16, 2, 17, "J"); return; }
      g.elipse(4, 16, 4.5, 2, "G"); g.elipse(27, 16, 4.5, 2, "G"); g.linha(1, 16, 7, 16, "g"); g.linha(24, 16, 30, 16, "g");
      rodas(g, v, "normal"); corpo(g, v, "B", true);
      if (v === 0 || v === 1) { g.tri(14, 20, 18, 20, 16, 23, "J"); g.px(16, 17, "I"); }
    },
    /* tartaruga: hidroplano em forma de casco, com boias */
    hidroplano: function (g, v) {
      if (v === 2) { g.rect(5, 19, 22, 2, "P"); g.elipse(15, 17, 11, 4, "S"); for (var x = 8; x <= 22; x += 4) g.elipse(x, 16.5, 1.2, 1.2, "s"); g.linha(3, 21, 7, 21, "U"); return; }
      g.rect(3, 18, 5, 3, "P"); g.rect(24, 18, 5, 3, "P");
      g.elipse(16, 17, 10, 4.2, "S"); g.elipse(12, 16, 1.4, 1.4, "s"); g.elipse(20, 16, 1.4, 1.4, "s"); g.elipse(16, 18, 1.4, 1.4, "s");
      g.linha(9, 20, 22, 20, "B");
      if (v === 0) { g.px(11, 22, "U"); g.px(20, 22, "U"); g.px(16, 23, "U"); }
    },
    /* pinguim: trenó de madeira com esquis curvos */
    treno: function (g, v) {
      if (v === 2) {
        g.rect(5, 15, 21, 4, "B"); g.linha(5, 15, 25, 15, "W"); g.linha(3, 21, 27, 21, "M"); g.linha(27, 21, 29, 18, "M"); g.px(29, 17, "M");
        g.linha(9, 19, 9, 20, "m"); g.linha(21, 19, 21, 20, "m"); return;
      }
      g.rect(7, 13, 18, 7, "B"); g.linha(7, 13, 24, 13, "W"); g.linha(8, 19, 23, 19, "b");
      g.rect(9, 20, 2, 2, "m"); g.rect(21, 20, 2, 2, "m"); g.linha(7, 21, 12, 21, "M"); g.linha(19, 21, 24, 21, "M");
      if (v >= 3) { g.px(8, 20, "M"); g.px(23, 20, "M"); }
    },
    /* boto: jet-ski anfíbio, sem rodas, com borrifo de água */
    jetski: function (g, v) {
      if (v === 2) { g.tri(4, 15, 4, 21, 29, 20, "B"); g.rect(4, 15, 14, 5, "B"); g.linha(5, 20, 27, 20, "W"); g.rect(18, 11, 1, 5, "m"); g.linha(17, 11, 20, 11, "M"); g.px(2, 21, "U"); g.px(1, 20, "U"); return; }
      g.elipse(16, 16.5, 9, 4.6, "B"); g.linha(9, 20, 22, 20, "W"); g.linha(11, 13, 20, 13, "H");
      if (v >= 3) { g.linha(11, 12, 20, 12, "M"); g.px(10, 12, "m"); g.px(21, 12, "m"); }
      if (v <= 1) { g.px(10, 22, "U"); g.px(13, 23, "U"); g.px(19, 23, "U"); g.px(22, 22, "U"); g.px(16, 22, "U"); }
    },
    /* komodo: kart-fornalha de ferro com grelha acesa e chaminé */
    fornalha: function (g, v) {
      rodas(g, v, "normal"); corpo(g, v, "D");
      if (v === 2) { g.rect(10, 16, 10, 3, "r"); for (var x = 11; x < 20; x += 2) g.px(x, 17, "R"); g.rect(5, 9, 3, 6, "D"); g.px(6, 8, "R"); g.linha(5, 20, 27, 20, "B"); return; }
      g.rect(11, 16, 10, 3, "r"); for (var i = 12; i < 21; i += 2) g.px(i, 17, "R");
      g.linha(9, 19, 22, 19, "B");
      if (v <= 1) { g.rect(21, 8, 3, 6, "D"); g.px(22, 7, "R"); g.px(21, 6, "r"); }
    },
    /* falcão: aerokart com asas enflechadas e leme */
    aerokart: function (g, v) {
      rodas(g, v, "normal");
      if (v === 2) { corpo(g, v, "B", true); g.tri(8, 15, 20, 15, 12, 12, "H"); g.tri(3, 16, 7, 16, 3, 10, "B"); return; }
      g.tri(1, 18, 9, 15, 9, 18, "B"); g.tri(31, 18, 23, 15, 23, 18, "B");
      corpo(g, v, "B", true);
      if (v <= 1) { g.tri(15, 16, 17, 16, 16, 9, "H"); g.px(16, 10, "A"); }
      else { g.px(9, 18, "W"); g.px(22, 18, "W"); }
    },
    /* onça: kart relâmpago com raios na lataria */
    raio: function (g, v) {
      rodas(g, v, "normal"); corpo(g, v, "B", true);
      if (v === 2) { g.linha(8, 16, 11, 19, "A"); g.linha(11, 19, 11, 16, "A"); g.linha(11, 16, 14, 19, "A"); g.linha(18, 16, 21, 19, "A"); g.linha(21, 19, 21, 16, "A"); g.linha(21, 16, 24, 19, "A"); return; }
      g.linha(10, 16, 12, 19, "A"); g.linha(12, 19, 13, 16, "A"); g.linha(18, 16, 19, 19, "A"); g.linha(19, 19, 21, 16, "A");
      g.px(15, 18, "f"); g.px(17, 16, "f");
      if (v >= 3) { g.px(9, 17, "W"); g.px(22, 17, "W"); }
    }
  };

  /* ---------------- montagem ---------------- */
  function paleta(def, corpoCor) {
    var e = ESPECIES[def.especie] || ESPECIES.raposa, sh = KT.Sprites.shade;
    return {
      "K": "#14121c", "B": corpoCor, "b": sh(corpoCor, -0.16), "H": sh(corpoCor, 0.26), "A": def.capacete,
      "T": "#1b1b22", "t": "#3d3d4b", "m": "#6f7688", "M": "#aeb6c8", "W": "#f4f6ff",
      "F": e.F, "f": e.f, "L": e.L, "N": e.N, "I": e.I || e.f, "J": e.J || e.f,
      "G": "#4caf50", "g": "#2e7d32", "O": "#f07d1e", "o": "#b85510", "w": "#a8703c", "x": "#6e4520",
      "D": "#3a3440", "R": "#ffd24a", "r": "#ff6a1c", "S": "#7a5a30", "s": "#4e3a1c", "U": "#bfe8ff", "P": "#e8eef8"
    };
  }

  var VISTA_CABECA = ["costas", "costas", "lado", "frente", "frente"];
  var DESLOCA = [0, -1, 0, 1, 0];

  function frame(def, v) {
    var g = new Grade(W, H), e = ESPECIES[def.especie] || ESPECIES.raposa;
    var baixo = def.veiculoArte === "esportivo" || def.veiculoArte === "raio" || def.veiculoArte === "planador" || def.veiculoArte === "aerokart";
    var cx = v === 2 ? 14 : 16 + DESLOCA[v], cy = baixo ? 10 : 9;
    if (def.veiculoArte === "treno" || def.veiculoArte === "jetski") cy = 11;
    cabeca(g, e, VISTA_CABECA[v], cx, cy, 1);
    (VEICULOS[def.veiculoArte] || VEICULOS.esportivo)(g, v);
    g.contorno();
    return g.linhas();
  }

  /* 5 vistas voltadas para a direita + espelhos; mesmo formato de antes */
  function buildKart(def, corpoCor) {
    if (typeof def === "string") def = KT.DRIVERS[1];   /* chamada antiga: cai na raposa */
    var pal = paleta(def, corpoCor || def.cor), frames = [], mirrored = [];
    for (var v = 0; v < 5; v++) {
      var c = KT.makeCanvas(W, H);
      KT.drawArt(c.getContext("2d"), frame(def, v), pal, 0, 0, 1);
      frames.push(c);
      var m = KT.makeCanvas(W, H), mx = m.getContext("2d");
      mx.translate(W, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0);
      mirrored.push(m);
    }
    return { right: frames, left: mirrored, w: W, h: H };
  }

  /* retrato 24×24 para menus e HUD */
  function buildFace(def) {
    if (typeof def === "string") def = KT.DRIVERS[1];
    var g = new Grade(24, 24), e = ESPECIES[def.especie] || ESPECIES.raposa;
    g.elipse(12, 24, 9, 4, "B");
    cabeca(g, e, "frente", 12, e.orelha === "longa" ? 15 : 13, 2);
    g.contorno();
    var c = KT.makeCanvas(24, 24);
    KT.drawArt(c.getContext("2d"), g.linhas(), paleta(def, def.cor), 0, 0, 1);
    return c;
  }

  KT.Sprites.buildKart = buildKart;
  KT.Sprites.buildFace = buildFace;
  KT.Sprites.W = W; KT.Sprites.H = H;
  KT.Animais = { ESPECIES: ESPECIES, VEICULOS: Object.keys(VEICULOS), frame: frame, Grade: Grade };
})();
