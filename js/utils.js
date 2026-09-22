/* ============================================================
   KART TROVAO 16 - utilitarios, matematica, entrada e fonte
   Conteudo 100% original.
   ============================================================ */
var KT = window.KT || {};
window.KT = KT;

/* ---------- matematica ---------- */
KT.TAU = Math.PI * 2;
KT.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
KT.lerp = function (a, b, t) { return a + (b - a) * t; };
KT.sign = function (v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); };

/* ---------- numeros aleatorios com semente ----------
   Dois fluxos independentes:
     rngSim - tudo que muda o resultado da corrida (IA, itens, grid, largada)
     rngVis - so aparencia (textura, estrelas, particulas)
   Com a mesma semente a corrida se repete quadro a quadro, e desenhar
   mais ou menos particulas nunca altera a simulacao. */
KT.RNG = function (seed) {
  var a = seed >>> 0;
  var r = function () {
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.seed = seed >>> 0;
  return r;
};
KT.rngSim = KT.RNG(1);
KT.rngVis = KT.RNG(1);
KT.seedSim = function (s) { KT.rngSim = KT.RNG(s); };
KT.seedVis = function (s) { KT.rngVis = KT.RNG(s); };
KT.novaSemente = function () { return (Math.random() * 4294967296) >>> 0; };
KT.rand = function (a, b) { return a + KT.rngSim() * (b - a); };
KT.randV = function (a, b) { return a + KT.rngVis() * (b - a); };

/* diferenca angular normalizada em [-PI, PI] */
KT.angDiff = function (target, current) {
  var d = (target - current) % KT.TAU;
  if (d > Math.PI) d -= KT.TAU;
  if (d < -Math.PI) d += KT.TAU;
  return d;
};
KT.normAng = function (a) {
  a = a % KT.TAU;
  if (a < 0) a += KT.TAU;
  return a;
};

KT.approach = function (a, b, step) {
  if (a < b) return Math.min(a + step, b);
  return Math.max(a - step, b);
};

KT.fmtTime = function (sec) {
  if (sec == null || sec < 0 || !isFinite(sec)) return "--:--.--";
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  var c = Math.floor((sec * 100) % 100);
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s + "." + (c < 10 ? "0" : "") + c;
};

/* cria canvas offscreen sem suavizacao */
KT.makeCanvas = function (w, h) {
  var c = document.createElement("canvas");
  c.width = w; c.height = h;
  var x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  return c;
};

/* normaliza matriz de arte para largura fixa */
KT.padArt = function (rows, w) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.length > w) r = r.slice(0, w);
    while (r.length < w) r += ".";
    out.push(r);
  }
  return out;
};

/* desenha arte de caracteres num contexto usando mapa de cores */
KT.drawArt = function (ctx, rows, palette, ox, oy, px) {
  px = px || 1;
  for (var y = 0; y < rows.length; y++) {
    var row = rows[y];
    for (var x = 0; x < row.length; x++) {
      var col = palette[row.charAt(x)];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x * px, oy + y * px, px, px);
    }
  }
};

/* ============================================================
   ENTRADA
   ============================================================ */
KT.Input = (function () {
  var down = {}, pressed = {};
  var map = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
    Space: "drift", ShiftLeft: "drift", ShiftRight: "drift",
    ControlLeft: "item", ControlRight: "item", KeyZ: "item",
    Enter: "start", NumpadEnter: "start", Escape: "pause", KeyP: "pause",
    KeyF: "fullscreen", KeyM: "mute", KeyC:"photo", Backspace: "back"
  };

  window.addEventListener("keydown", function (e) {
    if(e.target&&/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName))return;
    var a = map[e.code];
    if (!a) return;
    e.preventDefault();
    if (!down[a]) pressed[a] = true;
    down[a] = true;
  });
  window.addEventListener("keyup", function (e) {
    var a = map[e.code];
    if (!a) return;
    e.preventDefault();
    down[a] = false;
  });
  window.addEventListener("blur", function () { down = {};pressed={}; });

  return {
    virtual:function(a,on){if(on&&!down[a])pressed[a]=true;down[a]=!!on;},
    held: function (a) { return !!down[a]; },
    hit: function (a) { return !!pressed[a]; },
    endFrame: function () { pressed = {}; },
    axisX: function () { return (down.right ? 1 : 0) - (down.left ? 1 : 0); },
    axisY: function () { return (down.up ? 1 : 0) - (down.down ? 1 : 0); }
  };
})();

/* ============================================================
   FONTE BITMAP 5x7 (desenhada a mao)
   Acentos sao marcas combinantes desenhadas sobre a base.
   ============================================================ */
KT.Font = (function () {
  var G = {
    "A": "01110/10001/10001/11111/10001/10001/10001",
    "B": "11110/10001/10001/11110/10001/10001/11110",
    "C": "01110/10001/10000/10000/10000/10001/01110",
    "D": "11100/10010/10001/10001/10001/10010/11100",
    "E": "11111/10000/10000/11110/10000/10000/11111",
    "F": "11111/10000/10000/11110/10000/10000/10000",
    "G": "01110/10001/10000/10111/10001/10001/01111",
    "H": "10001/10001/10001/11111/10001/10001/10001",
    "I": "11111/00100/00100/00100/00100/00100/11111",
    "J": "00111/00010/00010/00010/00010/10010/01100",
    "K": "10001/10010/10100/11000/10100/10010/10001",
    "L": "10000/10000/10000/10000/10000/10000/11111",
    "M": "10001/11011/10101/10101/10001/10001/10001",
    "N": "10001/11001/10101/10011/10001/10001/10001",
    "O": "01110/10001/10001/10001/10001/10001/01110",
    "P": "11110/10001/10001/11110/10000/10000/10000",
    "Q": "01110/10001/10001/10001/10101/10010/01101",
    "R": "11110/10001/10001/11110/10100/10010/10001",
    "S": "01111/10000/10000/01110/00001/00001/11110",
    "T": "11111/00100/00100/00100/00100/00100/00100",
    "U": "10001/10001/10001/10001/10001/10001/01110",
    "V": "10001/10001/10001/10001/10001/01010/00100",
    "W": "10001/10001/10001/10101/10101/11011/10001",
    "X": "10001/10001/01010/00100/01010/10001/10001",
    "Y": "10001/10001/01010/00100/00100/00100/00100",
    "Z": "11111/00001/00010/00100/01000/10000/11111",
    "0": "01110/10001/10011/10101/11001/10001/01110",
    "1": "00100/01100/00100/00100/00100/00100/01110",
    "2": "01110/10001/00001/00010/00100/01000/11111",
    "3": "11111/00010/00100/00010/00001/10001/01110",
    "4": "00010/00110/01010/10010/11111/00010/00010",
    "5": "11111/10000/11110/00001/00001/10001/01110",
    "6": "00110/01000/10000/11110/10001/10001/01110",
    "7": "11111/00001/00010/00100/01000/01000/01000",
    "8": "01110/10001/10001/01110/10001/10001/01110",
    "9": "01110/10001/10001/01111/00001/00010/01100",
    " ": "00000/00000/00000/00000/00000/00000/00000",
    ".": "00000/00000/00000/00000/00000/01100/01100",
    ",": "00000/00000/00000/00000/01100/01100/01000",
    ":": "00000/01100/01100/00000/01100/01100/00000",
    "!": "00100/00100/00100/00100/00100/00000/00100",
    "?": "01110/10001/00001/00010/00100/00000/00100",
    "-": "00000/00000/00000/11111/00000/00000/00000",
    "_": "00000/00000/00000/00000/00000/00000/11111",
    "/": "00001/00010/00010/00100/01000/01000/10000",
    "%": "11001/11010/00010/00100/01000/01011/10011",
    "(": "00010/00100/01000/01000/01000/00100/00010",
    ")": "01000/00100/00010/00010/00010/00100/01000",
    "+": "00000/00100/00100/11111/00100/00100/00000",
    "=": "00000/00000/11111/00000/11111/00000/00000",
    "<": "00010/00100/01000/10000/01000/00100/00010",
    ">": "01000/00100/00010/00001/00010/00100/01000",
    "*": "00000/10101/01110/11111/01110/10101/00000",
    "º": "01100/10010/10010/01100/00000/00000/00000",
    "ª": "01110/00010/01110/10010/01110/00000/01110",
    "·": "00000/00000/00000/01100/01100/00000/00000"
  };

  /* marcas combinantes: [linhas, deslocamento vertical] */
  var MARK = {
    acute: ["00011/00110", -3],
    grave: ["11000/01100", -3],
    circ: ["00100/01010", -3],
    tilde: ["01101/10110", -3],
    trema: ["01010/00000", -3],
    ced: ["00100/01000", 7]
  };
  var ACC = {
    "Á": ["A", "acute"], "À": ["A", "grave"], "Â": ["A", "circ"], "Ã": ["A", "tilde"],
    "É": ["E", "acute"], "Ê": ["E", "circ"], "È": ["E", "grave"],
    "Í": ["I", "acute"], "Î": ["I", "circ"],
    "Ó": ["O", "acute"], "Ô": ["O", "circ"], "Õ": ["O", "tilde"], "Ò": ["O", "grave"],
    "Ú": ["U", "acute"], "Ü": ["U", "trema"], "Û": ["U", "circ"],
    "Ç": ["C", "ced"], "Ñ": ["N", "tilde"]
  };

  var W = 5, H = 7, ADV = 6, LINE = 10;
  var cache = {};

  function glyphCanvas(ch, color) {
    var key = ch + "|" + color;
    if (cache[key]) return cache[key];
    var base = ch, mark = null;
    if (ACC[ch]) { base = ACC[ch][0]; mark = ACC[ch][1]; }
    var art = G[base];
    if (!art) art = G["?"];
    var c = KT.makeCanvas(W, H + 6);
    var x = c.getContext("2d");
    x.fillStyle = color;
    var rows = art.split("/"), r, q;
    for (r = 0; r < rows.length; r++)
      for (q = 0; q < rows[r].length; q++)
        if (rows[r].charAt(q) === "1") x.fillRect(q, r + 3, 1, 1);
    if (mark) {
      var m = MARK[mark], mr = m[0].split("/");
      for (r = 0; r < mr.length; r++)
        for (q = 0; q < mr[r].length; q++)
          if (mr[r].charAt(q) === "1") x.fillRect(q, r + 3 + m[1], 1, 1);
    }
    cache[key] = c;
    return c;
  }

  function width(text, scale) {
    scale = scale || 1;
    return String(text).length * ADV * scale - scale;
  }

  function draw(ctx, text, x, y, color, scale, shadow) {
    scale = scale || 1;
    text = String(text).toUpperCase();
    var i, ch, gc;
    if (shadow) {
      for (i = 0; i < text.length; i++) {
        ch = text.charAt(i);
        if (ch === " ") continue;
        gc = glyphCanvas(ch, shadow);
        ctx.drawImage(gc, x + i * ADV * scale + scale, y - 3 * scale + scale,
          W * scale, (H + 6) * scale);
      }
    }
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      if (ch === " ") continue;
      gc = glyphCanvas(ch, color);
      ctx.drawImage(gc, x + i * ADV * scale, y - 3 * scale, W * scale, (H + 6) * scale);
    }
  }

  function center(ctx, text, cx, y, color, scale, shadow) {
    scale = scale || 1;
    draw(ctx, text, Math.round(cx - width(text, scale) / 2), y, color, scale, shadow);
  }

  function right(ctx, text, rx, y, color, scale, shadow) {
    scale = scale || 1;
    draw(ctx, text, Math.round(rx - width(text, scale)), y, color, scale, shadow);
  }

  return { draw: draw, center: center, right: right, width: width, LINE: LINE, ADV: ADV, H: H };
})();
