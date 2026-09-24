/* ============================================================
   ITENS - arte das caixas, da Esfera de Plasma, do piche e dos
   ícones do HUD. Só aparência: raios, tempos e sorteios ficam em
   items.js e game.js. Nada aqui usa sorteio.
   ============================================================ */
(function () {
  "use strict";
  var Grade = KT.Animais.Grade;

  function pintar(g, pal) {
    g.contorno();
    var c = KT.makeCanvas(g.w, g.h);
    KT.drawArt(c.getContext("2d"), g.linhas(), pal, 0, 0, 1);
    return c;
  }

  /* "?" 5×7 */
  var INTERROGA = [".###.", "#...#", "....#", "..##.", "..#..", ".....", "..#.."];
  function glifo(g, x0, y0, ch) {
    for (var y = 0; y < INTERROGA.length; y++)
      for (var x = 0; x < 5; x++) if (INTERROGA[y].charAt(x) === "#") g.px(x0 + x, y0 + y, ch);
  }

  /* ---------------- caixa: cubo girando em 8 quadros, 4 tons ---------------- */
  var TONS = [
    { A: "#ffd23f", B: "#c78a12", H: "#fff3a8", Q: "#1b2a4a" },
    { A: "#ff8a3f", B: "#c45a12", H: "#ffd0a0", Q: "#1b2a4a" },
    { A: "#ff5fb0", B: "#c42b7a", H: "#ffc0e0", Q: "#1b2a4a" },
    { A: "#6fe8ff", B: "#2a9ec4", H: "#d8f8ff", Q: "#1b2a4a" }
  ];
  function buildItemBox() {
    var sets = [];
    TONS.forEach(function (t) {
      var frames = [];
      for (var f = 0; f < 8; f++) {
        var g = new Grade(24, 24), a = f / 8 * Math.PI / 2, S = 15;
        var w1 = Math.round(S * Math.cos(a)), w2 = Math.round(S * Math.sin(a)), x0 = Math.round(12 - (w1 + w2) / 2);
        g.rect(x0, 7, w1 + w2, 14, "A");
        if (w2 > 0) g.rect(x0 + w1, 7, w2, 14, "B");
        g.rect(x0, 4, w1 + w2, 3, "H");                 /* tampa */
        g.linha(x0, 20, x0 + w1 + w2 - 1, 20, "B");
        /* o "?" fica sempre na face mais larga */
        if (w1 >= w2) glifo(g, x0 + Math.round(w1 / 2) - 2, 10, "Q");
        else glifo(g, x0 + w1 + Math.round(w2 / 2) - 2, 10, "Q");
        /* brilho que corre pela aresta */
        g.px(x0 + w1, 5, "W"); if (f % 2 === 0) { g.px(x0 + 1, 8, "W"); g.px(x0 + 2, 8, "W"); }
        frames.push(pintar(g, { K: "#141020", A: t.A, B: t.B, H: t.H, Q: t.Q, W: "#ffffff" }));
      }
      sets.push(frames);
    });
    return sets;
  }

  /* ---------------- Esfera de Plasma: 4 quadros, brilho girando ---------------- */
  function buildOrb() {
    var out = [];
    for (var f = 0; f < 4; f++) {
      var g = new Grade(16, 16), a = f / 4 * Math.PI * 2;
      g.elipse(8, 8, 6.5, 6.5, "Q"); g.elipse(8, 8, 5, 5, "Z"); g.elipse(8, 8, 2.6, 2.6, "W");
      g.px(8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, "W");
      g.px(8 - Math.cos(a) * 4, 8 - Math.sin(a) * 4, "Q");
      g.px(5, 5, "W");
      out.push(pintar(g, { K: "#0c2038", Q: "#5ce1ff", Z: "#1e6fd0", W: "#e8fcff" }));
    }
    return out;
  }

  /* ---------------- Poça de Piche: 2 quadros com bolhas ---------------- */
  function buildGoo() {
    var out = [];
    for (var f = 0; f < 2; f++) {
      var g = new Grade(26, 11);
      g.elipse(13, 6, 11.5, 4.2, "A"); g.elipse(12, 6, 8, 2.6, "B"); g.elipse(9, 5, 3, 1, "H");
      g.px(f ? 17 : 7, f ? 4 : 7, "H"); g.px(f ? 6 : 18, f ? 7 : 5, "B");
      out.push(pintar(g, { K: "#0b0b12", A: "#241f2e", B: "#3a3350", H: "#6a5f8a" }));
    }
    return out;
  }

  /* ---------------- ícones do HUD 20×20 ---------------- */
  var ICONES = {
    turbo: function (g) {
      g.elipse(10, 12, 5.5, 6, "E"); g.tri(4.6, 11, 15.4, 11, 10, 1, "E");
      g.elipse(10, 13, 3.6, 4, "W"); g.tri(6.6, 12, 13.4, 12, 10, 4.5, "W");
      g.elipse(10, 14, 1.8, 2.2, "F");
    },
    orb: function (g) {
      g.elipse(10, 10, 7, 7, "Q"); g.elipse(10, 10, 5.4, 5.4, "Z"); g.elipse(10, 10, 2.6, 2.6, "W");
      g.px(7, 7, "W"); g.px(15, 3, "W"); g.px(16, 4, "W"); g.px(14, 4, "W"); g.px(15, 5, "W");
    },
    goo: function (g) {
      g.elipse(10, 12, 8, 4.5, "A"); g.elipse(9, 12, 5.5, 2.8, "B");
      g.elipse(13, 7, 1.8, 1.8, "B"); g.elipse(6, 8, 1.2, 1.2, "B"); g.px(8, 11, "H");
    },
    shield: function (g) {
      g.elipse(10, 10, 7.5, 7.5, "Q"); g.elipse(10, 10, 5.5, 5.5, "S");
      g.linha(6, 10, 14, 10, "Q"); g.linha(8, 6, 12, 14, "Q"); g.linha(12, 6, 8, 14, "Q");
      g.px(7, 6, "W"); g.px(6, 7, "W");
    },
    spring: function (g) {
      g.rect(4, 3, 12, 2, "M");
      for (var i = 0; i < 4; i++) { g.linha(5, 6 + i * 3, 15, 7.5 + i * 3, "G"); g.linha(15, 7.5 + i * 3, 5, 9 + i * 3, "g"); }
      g.rect(4, 17, 12, 2, "M");
    },
    magnet: function (g) {
      g.elipse(10, 9, 6.5, 6.5, "R"); g.elipse(10, 9, 3, 3, ".");
      g.rect(3.5, 9, 13, 8, "."); g.rect(4, 9, 4, 6, "R"); g.rect(12, 9, 4, 6, "R");
      g.rect(4, 15, 4, 3, "M"); g.rect(12, 15, 4, 3, "M");
      g.px(1, 16, "W"); g.px(18, 16, "W"); g.px(2, 18, "W"); g.px(17, 18, "W");
    }
  };
  function buildIcons() {
    var pal = { K: "#141020", E: "#ff7a1c", W: "#ffe9a8", F: "#fff6d0", Q: "#5ce1ff", Z: "#1e6fd0", S: "#1a4a6a",
                A: "#241f2e", B: "#4a4270", H: "#8a80b0", M: "#c8d0e0", G: "#a9f093", g: "#5fb04a", R: "#ef5a6a" };
    var out = {};
    Object.keys(ICONES).forEach(function (k) {
      var g = new Grade(20, 20);
      ICONES[k](g);
      out[k] = pintar(g, pal);
    });
    return out;
  }

  KT.Sprites.buildItemBox = buildItemBox;
  KT.Sprites.buildOrb = buildOrb;
  KT.Sprites.buildGoo = buildGoo;
  KT.Sprites.buildIcons = buildIcons;
})();
