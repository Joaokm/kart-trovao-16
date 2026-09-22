/* ============================================================
   SPRITES - pixel art 16 bits desenhada a mao (matrizes de texto)
   Todos os desenhos sao originais deste projeto.
   ============================================================ */
KT.Sprites = (function () {

  var SW = 24, SH = 16;

  /* ---- frames do kart: 0 traseira, 1 tras 3/4, 2 lateral, 3 frente 3/4, 4 frente
     Cada frame olha para a DIREITA quando aplicavel; o lado esquerdo e espelhado. */
  var KART = [
    /* 0 - traseira */
    [
      "........................",
      ".........KKKKKK.........",
      "........KCCCCCCK........",
      "........KCWWWWCK........",
      "........KVVVVVVK........",
      ".......KKSSSSSSKK.......",
      "......KKBBBBBBBBKK......",
      ".....KKBBBBBBBBBBKK.....",
      "...KTTKKBBBBBBBBKKTTK...",
      "...KTTTTKBBBBBBKTTTTK...",
      "...KTttTKBmmmmBKTttTK...",
      "...KTttTKKmEEmKKTttTK...",
      "...KTTTTKKmmmmKKTTTTK...",
      "...KTTTTK.KKKK.KTTTTK...",
      "....KTTK...KK...KTTK....",
      "........................"
    ],
    /* 1 - traseira 3/4 */
    [
      "........................",
      ".........KKKKKK.........",
      "........KCCCCCCK........",
      "........KCWWVVKK........",
      ".......KKSSVVVVK........",
      "......KKBBBBBBBBKK......",
      ".....KKBBBBBBBBBBKK.....",
      "....KKBBBBBBBBBBBBKK....",
      "..KTTKKBBBBBBBBBBKKTTK..",
      "..KTTTTKBBBBBBBBKTTTTK..",
      "..KTttTKBmmmmmmBKTttTK..",
      "..KTttTKKmmEEmmKKTttTK..",
      "..KTTTTKKmmmmmmKKTTTTK..",
      "...KTTK..KKKKKKKK..KTTK.",
      "....KK..............KK..",
      "........................"
    ],
    /* 2 - lateral */
    [
      "........................",
      "..........KKKKK.........",
      ".........KCCCCCK........",
      ".........KCWWVKK........",
      "........KKSSVVK.........",
      ".......KKBBBBBBKK.......",
      "......KBBBBBBBBBBK......",
      ".....KKBBBBBBBBBBBBKK...",
      "....KTTKBBBBBBBBBBKTTK..",
      "...KTTTTKKBBBBBBKKTTTTK.",
      "...KTttTK.KmmmmK.KTttTK.",
      "...KTttTK.KmEEmK.KTttTK.",
      "...KTTTTK.KmmmmK.KTTTTK.",
      "....KTTK..KKKKKK..KTTK..",
      ".....KK............KK...",
      "........................"
    ],
    /* 3 - frente 3/4 */
    [
      "........................",
      ".........KKKKKK.........",
      "........KCCCCCCK........",
      "........KVVWWCCK........",
      ".......KVVVVSSKK........",
      "......KKBBBBBBBBKK......",
      ".....KKBBBBBBBBBBKK.....",
      "....KKBBBBBBBBBBBBKK....",
      "..KTTKKBBBBBBBBBBKKTTK..",
      "..KTTTTKBHHHHHHBKTTTTK..",
      "..KTttTKBHWWWWHBKTttTK..",
      "..KTttTKKMMMMMMKKTttTK..",
      "..KTTTTKKmmmmmmKKTTTTK..",
      "...KTTK..KKKKKKKK..KTTK.",
      "....KK..............KK..",
      "........................"
    ],
    /* 4 - frente */
    [
      "........................",
      ".........KKKKKK.........",
      "........KCCCCCCK........",
      "........KVVVVVVK........",
      "........KVWWWWVK........",
      ".......KKSSSSSSKK.......",
      "......KKBBBBBBBBKK......",
      ".....KKBBBBBBBBBBKK.....",
      "...KTTKKBBBBBBBBKKTTK...",
      "...KTTTTKBHHHHBKTTTTK...",
      "...KTttTKWWMMWWKTttTK...",
      "...KTttTKKMMMMKKTttTK...",
      "...KTTTTKKmmmmKKTTTTK...",
      "....KTTK.KKKKKK.KTTK....",
      ".....KK..........KK.....",
      "........................"
    ]
  ];

  /* clareia/escurece cor hexadecimal */
  function shade(hex, amt) {
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    r = KT.clamp(Math.round(r + 255 * amt), 0, 255);
    g = KT.clamp(Math.round(g + 255 * amt), 0, 255);
    b = KT.clamp(Math.round(b + 255 * amt), 0, 255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function kartPalette(body, helmet, skin) {
    return {
      "K": "#14121c",
      "B": body,
      "b": shade(body, -0.16),
      "H": shade(body, 0.28),
      "C": helmet,
      "W": "#f4f6ff",
      "V": "#2a3350",
      "S": skin,
      "s": shade(skin, -0.14),
      "T": "#1b1b22",
      "t": "#3d3d4b",
      "m": "#6f7688",
      "M": "#aeb6c8",
      "E": "#ff9a3c"
    };
  }

  /* gera os 9 frames (esquerda espelhada + centro + direita) de um kart */
  function buildKart(body, helmet, skin) {
    var pal = kartPalette(body, helmet, skin);
    var frames = [];
    for (var i = 0; i < KART.length; i++) {
      var c = KT.makeCanvas(SW, SH);
      KT.drawArt(c.getContext("2d"), KT.padArt(KART[i], SW), pal, 0, 0, 1);
      frames.push(c);
    }
    /* espelhados */
    var mirrored = [];
    for (var j = 0; j < frames.length; j++) {
      var m = KT.makeCanvas(SW, SH);
      var mx = m.getContext("2d");
      mx.translate(SW, 0); mx.scale(-1, 1);
      mx.drawImage(frames[j], 0, 0);
      mirrored.push(m);
    }
    return { right: frames, left: mirrored, w: SW, h: SH };
  }

  /* seleciona o frame conforme o angulo relativo (kart - camera) */
  function kartFrame(set, rel) {
    rel = KT.angDiff(rel, 0);              /* -PI..PI */
    var a = Math.abs(rel);
    var idx;
    if (a < 0.39) idx = 0;                  /* +-22.5 graus  -> traseira */
    else if (a < 1.18) idx = 1;             /* -> traseira 3/4 */
    else if (a < 1.96) idx = 2;             /* -> lateral */
    else if (a < 2.75) idx = 3;             /* -> frente 3/4 */
    else idx = 4;                           /* -> frente */
    return rel >= 0 ? set.right[idx] : set.left[idx];
  }

  /* ---------------- caixa de item ---------------- */
  var BOX = [
    "................",
    "....KKKKKKKK....",
    "...KAAAAAAAAK...",
    "..KAAWWWWWWAAK..",
    "..KAWQQQQQQWAK..",
    ".KAAWQQ??QQWAAK.",
    ".KAAWQ????QWAAK.",
    ".KAAWQQ??QQWAAK.",
    ".KAAWQQQQQQWAAK.",
    ".KAAWWWWWWWWAAK.",
    "..KAAAAAAAAAAK..",
    "..KBBAAAAAABBK..",
    "...KBBBBBBBBK...",
    "....KKKKKKKK....",
    "................",
    "................"
  ];

  function buildItemBox() {
    var hues = [
      { A: "#ffd23f", B: "#c78a12", Q: "#3fd0ff", W: "#ffffff", Z: "#1b2a4a" },
      { A: "#ff8a3f", B: "#c45a12", Q: "#7dff9b", W: "#ffffff", Z: "#1b2a4a" },
      { A: "#ff5fb0", B: "#c42b7a", Q: "#ffe66d", W: "#ffffff", Z: "#1b2a4a" },
      { A: "#8affd2", B: "#33b58c", Q: "#ff7de0", W: "#ffffff", Z: "#1b2a4a" }
    ];
    var out = [];
    for (var i = 0; i < hues.length; i++) {
      var c = KT.makeCanvas(16, 16);
      var pal = {
        "K": "#141020", "A": hues[i].A, "B": hues[i].B,
        "W": hues[i].W, "Q": hues[i].Q, "?": hues[i].Z
      };
      KT.drawArt(c.getContext("2d"), KT.padArt(BOX, 16), pal, 0, 0, 1);
      out.push(c);
    }
    return out;
  }

  /* ---------------- esfera de plasma ---------------- */
  var ORB = [
    "....KKKK....",
    "..KKQQQQKK..",
    ".KQQWWWWQQK.",
    ".KQWWZZWWQK.",
    "KQWWZZZZWWQK",
    "KQWZZZZZZWQK",
    "KQWZZZZZZWQK",
    "KQWWZZZZWWQK",
    ".KQWWZZWWQK.",
    ".KQQWWWWQQK.",
    "..KKQQQQKK..",
    "....KKKK...."
  ];

  function buildOrb() {
    var sets = [
      { Q: "#5ce1ff", W: "#c9f6ff", Z: "#1e6fd0" },
      { Q: "#a0f0ff", W: "#ffffff", Z: "#2f8ff0" }
    ];
    var out = [];
    for (var i = 0; i < sets.length; i++) {
      var c = KT.makeCanvas(12, 12);
      KT.drawArt(c.getContext("2d"), KT.padArt(ORB, 12),
        { "K": "#0c2038", "Q": sets[i].Q, "W": sets[i].W, "Z": sets[i].Z }, 0, 0, 1);
      out.push(c);
    }
    return out;
  }

  /* ---------------- poca de piche ---------------- */
  var GOO = [
    "......KKKKKKKK......",
    "...KKKAAAAAAAAKKK...",
    ".KKAAAAABBBBAAAAAKK.",
    "KAAAABBBBBBBBBBAAAAK",
    "KAAABBBBBBBBBBBBAAAK",
    ".KAAAABBBBBBBBAAAAK.",
    "..KKAAAAAAAAAAAAKK..",
    "....KKKKKKKKKKKK...."
  ];

  function buildGoo() {
    var c = KT.makeCanvas(20, 8);
    KT.drawArt(c.getContext("2d"), KT.padArt(GOO, 20),
      { "K": "#0b0b12", "A": "#241f2e", "B": "#3a3350" }, 0, 0, 1);
    return c;
  }

  /* ---------------- icones de item (HUD) 20x20 ---------------- */
  var ICONS = {
    turbo: [
      "....................",
      "........KKKK........",
      ".......KEEEEK.......",
      "......KEEWWEEK......",
      ".....KEEWWWWEEK.....",
      "....KEEWWFFWWEEK....",
      "....KEWWFFFFWWEK....",
      "...KEEWFFFFFFWEEK...",
      "...KEWWFFFFFFWWEK...",
      "...KEWFFFFFFFFWEK...",
      "...KEWFFFFFFFFWEK...",
      "...KEEWFFFFFFWEEK...",
      "....KEWWFFFFWWEK....",
      "....KEEWWFFWWEEK....",
      ".....KEEWWWWEEK.....",
      "......KEEWWEEK......",
      ".......KEEEEK.......",
      "........KKKK........",
      "....................",
      "...................."
    ],
    orb: [
      "....................",
      "......KKKKKK........",
      "....KKQQQQQQKK......",
      "...KQQWWWWWWQQK.....",
      "..KQWWZZZZZZWWQK....",
      "..KQWZZZZZZZZWQK....",
      ".KQWZZZZZZZZZZWQK...",
      ".KQWZZZZZZZZZZWQK...",
      ".KQWZZZZZZZZZZWQK...",
      ".KQWZZZZZZZZZZWQK...",
      "..KQWZZZZZZZZWQK....",
      "..KQWWZZZZZZWWQK....",
      "...KQQWWWWWWQQK.....",
      "....KKQQQQQQKK......",
      "......KKKKKK........",
      "....................",
      "....................",
      "....................",
      "....................",
      "...................."
    ],
    goo: [
      "....................",
      "....................",
      "......KKKKKK........",
      "....KKAAAAAAKK......",
      "..KKAAABBBBAAAKK....",
      ".KAAABBBBBBBBAAAK...",
      "KAABBBBBBBBBBBBAAK..",
      "KAABBBBBBBBBBBBAAK..",
      ".KAAABBBBBBBBAAAK...",
      "..KKAAAAAAAAAAKK....",
      "....KKKKKKKKKK......",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "...................."
    ],
    shield: [
      "....................",
      "......KKKKKK........",
      "....KKQQQQQQKK......",
      "...KQQWWWWWWQQK.....",
      "..KQWWQQQQQQWWQK....",
      "..KQWQQ....QQWQK....",
      ".KQWQQ......QQWQK...",
      ".KQWQ........QWQK...",
      ".KQWQ........QWQK...",
      ".KQWQQ......QQWQK...",
      "..KQWQQ....QQWQK....",
      "..KQWWQQQQQQWWQK....",
      "...KQQWWWWWWQQK.....",
      "....KKQQQQQQKK......",
      "......KKKKKK........",
      "....................",
      "....................",
      "....................",
      "....................",
      "...................."
    ]
  };

  function buildIcons() {
    var pal = {
      "K": "#141020", "E": "#ff7a1c", "W": "#ffe9a8", "F": "#fff6d0",
      "Q": "#5ce1ff", "Z": "#1e6fd0", "A": "#241f2e", "B": "#4a4270"
    };
    var out = {};
    for (var k in ICONS) {
      if (!ICONS.hasOwnProperty(k)) continue;
      var c = KT.makeCanvas(20, 20);
      KT.drawArt(c.getContext("2d"), KT.padArt(ICONS[k], 20), pal, 0, 0, 1);
      out[k] = c;
    }
    ["spring","magnet"].forEach(function(name){var c=KT.makeCanvas(20,20),x=c.getContext("2d");x.strokeStyle=name==="spring"?"#a9f093":"#ef93da";x.lineWidth=3;if(name==="spring"){x.beginPath();x.moveTo(4,15);for(var i=0;i<5;i++)x.lineTo(i%2?5:15,14-i*2.4);x.stroke();x.fillStyle="#edffb3";x.fillRect(3,16,14,2);}else{x.beginPath();x.moveTo(4,3);x.lineTo(4,12);x.quadraticCurveTo(10,22,16,12);x.lineTo(16,3);x.stroke();x.fillStyle="#ddf4ff";x.fillRect(2,2,5,4);x.fillRect(14,2,5,4);}out[name]=c;});
    return out;
  }

  /* ---------------- retrato do piloto 24x24 ---------------- */
  var FACE = [
    "........................",
    "......KKKKKKKKKKKK......",
    ".....KCCCCCCCCCCCCK.....",
    "....KCCCCCCCCCCCCCCK....",
    "...KCCCCCCWWWWCCCCCCK...",
    "...KCCCCCWWWWWWCCCCCK...",
    "...KCCCCCCCCCCCCCCCCK...",
    "...KVVVVVVVVVVVVVVVVK...",
    "..KKVVWWWWVVVVWWWWVVKK..",
    "..KVVVWWWWVVVVWWWWVVVK..",
    "..KVVVVVVVVVVVVVVVVVVK..",
    "..KSSSSSSSSSSSSSSSSSSK..",
    "..KSSSSSSSSSSSSSSSSSSK..",
    "...KSSSSSSssssSSSSSSK...",
    "...KSSSSSSSSSSSSSSSSK...",
    "....KSSSSSSSSSSSSSSK....",
    ".....KKSSSSSSSSSSKK.....",
    "......KKKKKKKKKKKK......",
    ".......KBBBBBBBBK.......",
    "......KBBBBBBBBBBK......",
    ".....KBBBBBBBBBBBBK.....",
    ".....KBBBBBBBBBBBBK.....",
    "......KKKKKKKKKKKK......",
    "........................"
  ];

  function buildFace(body, helmet, skin) {
    var c = KT.makeCanvas(24, 24);
    KT.drawArt(c.getContext("2d"), KT.padArt(FACE, 24), kartPalette(body, helmet, skin), 0, 0, 1);
    return c;
  }

  /* ---------------- fundo: ceu e montanhas ---------------- */
  function buildSky(w, h) {
    var c = KT.makeCanvas(w, h);
    var x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.00, "#120b2e");
    g.addColorStop(0.35, "#3a1f5c");
    g.addColorStop(0.62, "#8a3a5e");
    g.addColorStop(0.82, "#d9663f");
    g.addColorStop(1.00, "#f2a04a");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    /* estrelas no topo */
    for (var i = 0; i < 90; i++) {
      var sx = Math.floor(KT.rngVis() * w), sy = Math.floor(KT.rngVis() * h * 0.42);
      x.fillStyle = KT.rngVis() > 0.5 ? "#ffffff" : "#c9b8ff";
      x.globalAlpha = 0.35 + KT.rngVis() * 0.5;
      x.fillRect(sx, sy, 1, 1);
    }
    x.globalAlpha = 1;
    return c;
  }

  /* faixa de montanhas/vulcao que rola com a rotacao da camera */
  function buildMountains(w, h) {
    var c = KT.makeCanvas(w, h);
    var x = c.getContext("2d");

    function ridge(color, base, amp, seedStep, offset) {
      x.fillStyle = color;
      var prev = base;
      for (var i = 0; i < w; i++) {
        var t = (i + offset) * seedStep;
        var v = Math.sin(t) * amp + Math.sin(t * 2.3 + 1.1) * amp * 0.45 + Math.sin(t * 0.7) * amp * 0.7;
        var top = Math.round(base - Math.abs(v));
        x.fillRect(i, top, 1, h - top);
        prev = top;
      }
    }

    ridge("#2b1d47", h - 8, 22, 0.021, 0);
    ridge("#3d2757", h - 4, 15, 0.033, 90);
    /* vulcao central com brilho */
    var vx = Math.floor(w * 0.5);
    x.fillStyle = "#241a3c";
    for (var i = -34; i <= 34; i++) {
      var hh = Math.round(38 - Math.abs(i) * 1.05);
      if (hh > 0) x.fillRect(vx + i, h - hh, 1, hh);
    }
    x.fillStyle = "#ff8a3c";
    x.fillRect(vx - 5, h - 38, 10, 3);
    x.fillStyle = "#ffd24a";
    x.fillRect(vx - 3, h - 39, 6, 2);
    /* fumaca */
    x.fillStyle = "rgba(60,40,80,0.6)";
    for (var s = 0; s < 26; s++) {
      var sy = h - 42 - s * 1.4;
      var sw = 4 + Math.sin(s * 0.8) * 3 + s * 0.25;
      x.fillRect(Math.round(vx - sw / 2 + Math.sin(s * 0.5) * 4), Math.round(sy), Math.round(sw), 2);
    }
    return c;
  }

  return {
    buildKart: buildKart,
    kartFrame: kartFrame,
    buildItemBox: buildItemBox,
    buildOrb: buildOrb,
    buildGoo: buildGoo,
    buildIcons: buildIcons,
    buildFace: buildFace,
    buildSky: buildSky,
    buildMountains: buildMountains,
    shade: shade,
    W: SW, H: SH
  };
})();
