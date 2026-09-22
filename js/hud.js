/* ============================================================
   HUD - painel de corrida em pixel art (voltas, posicao,
   velocimetro, item, minimapa e avisos)
   ============================================================ */
KT.HUD = (function () {

  var mini = null, miniBox = { x: 0, y: 0, w: 62, h: 62 };
  var bounds = null;
  var icons = null;

  function init() {
    icons = KT.Sprites.buildIcons();
    buildMinimap();
  }

  function buildMinimap() {
    var pts = KT.Track.pts;
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, i;
    for (i = 0; i < pts.length; i++) {
      if (pts[i].x < minx) minx = pts[i].x;
      if (pts[i].x > maxx) maxx = pts[i].x;
      if (pts[i].y < miny) miny = pts[i].y;
      if (pts[i].y > maxy) maxy = pts[i].y;
    }
    var pad = 5;
    var sx = (miniBox.w - pad * 2) / (maxx - minx);
    var sy = (miniBox.h - pad * 2) / (maxy - miny);
    var s = Math.min(sx, sy);
    bounds = { minx: minx, miny: miny, s: s, pad: pad,
      ox: (miniBox.w - (maxx - minx) * s) / 2,
      oy: (miniBox.h - (maxy - miny) * s) / 2 };

    mini = KT.makeCanvas(miniBox.w, miniBox.h);
    var x = mini.getContext("2d");
    x.strokeStyle = "#6f6f95";
    x.lineWidth = 4; x.lineJoin = "round";
    x.beginPath();
    for (i = 0; i < pts.length; i++) {
      var px = bounds.ox + (pts[i].x - minx) * s;
      var py = bounds.oy + (pts[i].y - miny) * s;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath(); x.stroke();
    x.strokeStyle = "#c9c9e0"; x.lineWidth = 2; x.stroke();
    /* linha de largada */
    var p0 = pts[0];
    x.fillStyle = "#ffd24a";
    x.fillRect(bounds.ox + (p0.x - minx) * s - 1, bounds.oy + (p0.y - miny) * s - 1, 3, 3);
  }

  function mapPt(wx, wy) {
    return {
      x: miniBox.x + bounds.ox + (wx - bounds.minx) * bounds.s,
      y: miniBox.y + bounds.oy + (wy - bounds.miny) * bounds.s
    };
  }

  /* moldura estilo console 16 bits */
  function panel(ctx, x, y, w, h, fill) {
    ctx.fillStyle = "rgba(12,10,26,0.88)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill || "#5a5a8c";
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillStyle = "#2b2b46";
    ctx.fillRect(x + 1, y + 1, w - 2, 1);
  }

  function draw(ctx, race, W, H) {
    var p = race.player;

    /* ---- voltas e tempos ---- */
    panel(ctx, 4, 4, 84, 32);
    KT.Font.draw(ctx, "VOLTA " + Math.max(1, p.lap) + "/" + race.totalLaps, 9, 9, "#ffd24a", 1, "#3a2a10");
    KT.Font.draw(ctx, KT.fmtTime(race.time), 9, 19, "#e8e8ff", 1, "#20203a");
    KT.Font.draw(ctx, "MEL " + (p.bestLap ? KT.fmtTime(p.bestLap) : "--:--.--"), 9, 28, "#9aa0c8", 1);

    /* ---- posicao ---- */
    var posColor = p.pos === 1 ? "#ffd24a" : (p.pos <= 3 ? "#a8f0c0" : "#ff9a9a");
    KT.Font.right(ctx, p.pos + "º", W - 6, 6, posColor, 3, "#241028");
    KT.Font.right(ctx, "DE " + race.karts.length, W - 6, 32, "#c0c4e8", 1, "#20203a");

    /* ---- item ---- */
    var bx = W / 2 - 15;
    panel(ctx, bx, 4, 30, 30, p.item ? "#ffd24a" : "#5a5a8c");
    if (p.itemRoll > 0) {
      var keys = ["turbo", "orb", "goo", "shield"];
      var k = keys[Math.floor(race.time * 22) % 4];
      ctx.globalAlpha = 0.85;
      ctx.drawImage(icons[k], bx + 5, 9);
      ctx.globalAlpha = 1;
    } else if (p.item) {
      ctx.drawImage(icons[p.item], bx + 5, 9);
    }

    /* nome do item */
    if (p.item && !p.itemRoll) {
      KT.Font.center(ctx, KT.Items.LABEL[p.item], W / 2, 37, "#ffe9a8", 1, "#241028");
    }

    /* ---- velocimetro ---- */
    var sw = 92, sx = 6, sy = H - 20;
    panel(ctx, sx, sy, sw, 15);
    var frac = KT.clamp(Math.abs(p.sp) / (KT.Kart.TOP * 1.5), 0, 1);
    var bars = Math.round(frac * (sw - 8));
    for (var i = 0; i < bars; i++) {
      var t = i / (sw - 8);
      ctx.fillStyle = t > 0.82 ? "#ff5a3c" : (t > 0.6 ? "#ffd24a" : "#5ce07a");
      ctx.fillRect(sx + 4 + i, sy + 4, 1, 7);
    }
    KT.Font.right(ctx, Math.round(Math.abs(p.sp) * 1.08) + " KM/H", sx + sw - 3, H - 32, "#c0c4e8", 1, "#101024");

    /* Carga Trovao: cor + marcas dos limites + blocos de nivel ao lado,
       para o nivel ser legivel sem depender so da cor */
    if (p.drifting) {
      var nivel = p.driftCharge>2.7?3:p.driftCharge > 1.75 ? 2 : (p.driftCharge > 0.85 ? 1 : 0);
      var cc = nivel===3?"#b9ecff":nivel === 2 ? "#ff6748" : (nivel === 1 ? "#fff05a" : "#8a8ab0");
      var cw = Math.round(KT.clamp(p.driftCharge / 3.0, 0, 1) * 60);
      var bx0 = W / 2 - 30;
      panel(ctx, W / 2 - 32, H - 20, 64, 9);
      ctx.fillStyle = cc;
      ctx.fillRect(bx0, H - 18, Math.min(cw, 60), 5);
      ctx.fillStyle = "#e8e8ff";
      ctx.fillRect(bx0 + Math.round(0.85 / 3.0 * 60), H - 19, 1, 7);
      ctx.fillRect(bx0 + Math.round(1.75 / 3.0 * 60), H - 19, 1, 7);
      ctx.fillRect(bx0 + Math.round(2.7 / 3.0 * 60), H - 19, 1, 7);
      KT.Font.center(ctx,"CARGA "+nivel,W/2,H-30,cc,1,"#151323");
      for (var nv = 0; nv < nivel; nv++) {
        ctx.fillStyle = "#100c18";
        ctx.fillRect(W / 2 + 35 + nv * 6, H - 20, 5, 9);
        ctx.fillStyle = cc;
        ctx.fillRect(W / 2 + 36 + nv * 6, H - 19, 3, 7);
      }
    }

    /* ---- minimapa ---- */
    miniBox.x = W - miniBox.w - 4;
    miniBox.y = H - miniBox.h - 4;
    panel(ctx, miniBox.x - 2, miniBox.y - 2, miniBox.w + 4, miniBox.h + 4);
    ctx.drawImage(mini, miniBox.x, miniBox.y);
    for (var k2 = 0; k2 < race.karts.length; k2++) {
      var kk = race.karts[k2];
      var mp = mapPt(kk.x, kk.y);
      ctx.fillStyle = "#100c18";
      ctx.fillRect(Math.round(mp.x) - 2, Math.round(mp.y) - 2, 5, 5);
      ctx.fillStyle = kk.isPlayer ? "#ffffff" : kk.driver.cor;
      ctx.fillRect(Math.round(mp.x) - 1, Math.round(mp.y) - 1, 3, 3);
    }

    /* ---- avisos centrais ---- */
    if (race.bannerText && race.bannerTime > 0) {
      var a = Math.min(1, race.bannerTime * 3);
      ctx.globalAlpha = a;
      KT.Font.center(ctx, race.bannerText, W / 2, 74, "#ffd24a", race.bannerText.length>26?1:2, "#3a1020");
      ctx.globalAlpha = 1;
    }

    /* contagem regressiva */
    if (race.state === "countdown") {
      var n = Math.ceil(race.countdown);
      var txt = n > 0 ? String(n) : "VALENDO!";
      var sc = n > 0 ? 5 : 3;
      var pulse = 1 - (race.countdown - Math.floor(race.countdown));
      ctx.globalAlpha = 0.35 + 0.65 * (n > 0 ? pulse : 1);
      KT.Font.center(ctx, txt, W / 2, 78, n > 0 ? "#ffffff" : "#5cff8a", sc, "#20102a");
      ctx.globalAlpha = 1;
    }

    /* aviso de contramao */
    if (race.wrongWay > 0.4 && race.state === "race") {
      if (Math.floor(race.time * 4) % 2 === 0)
        KT.Font.center(ctx, "MÃO ERRADA!", W / 2, 120, "#ff4a4a", 2, "#280a0a");
    }
  }

  return { init: init, draw: draw, panel: panel, get icons() { return icons; }, mapPt: mapPt };
})();
