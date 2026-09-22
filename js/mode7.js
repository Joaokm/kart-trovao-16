/* ============================================================
   MODE 7 - renderizador de plano perspectivo por scanline.
   Recria a sensacao de profundidade e rotacao dos jogos 16 bits:
   cada linha da tela amostra o mapa do circuito com escala propria.
   ============================================================ */
KT.Mode7 = (function () {

  var FAR = 940;        /* distancia maxima visivel */
  var FOG_START = 250;   /* onde a neblina comeca */
  var FOG = [92, 58, 76];/* cor da neblina (casa com o horizonte) */

  var sky = null, mountains = null;

  function init(W, H) {
    FOG=KT.THEMES[KT.Track.definition.theme].fog;
    sky = KT.Sprites.buildSky(W, Math.floor(H * 0.55));
    mountains = KT.Sprites.buildMountains(W * 4, 58);
  }

  /* desenha ceu + montanhas com rolagem paralaxe conforme o angulo */
  function drawSky(ctx, cam, W, H) {
    if(KT.Track.definition.id!==0){KT.Scenery.sky(ctx,cam,W,H);return;}
    ctx.drawImage(sky, 0, 0, W, cam.horizon + 2);

    var mw = mountains.width;
    var off = -(KT.normAng(cam.ang) / KT.TAU) * mw;
    off = off % mw;
    var y = cam.horizon - mountains.height + 2;
    for (var k = -1; k <= Math.ceil(W / mw) + 1; k++) {
      ctx.drawImage(mountains, Math.round(off + k * mw), y);
    }
    /* linha do horizonte quente */
    ctx.fillStyle = "#6b3c52";
    ctx.fillRect(0, cam.horizon, W, 1);
    ctx.fillStyle = "#8a4a5c";
    ctx.fillRect(0, cam.horizon + 1, W, 1);
  }

  /* rasteriza o chao dentro do ImageData (linhas abaixo do horizonte) */
  function drawGround(img, cam, W, H) {
    var data = img.data;
    var tex = KT.Track.texData;
    var SIZE = KT.Track.SIZE;
    var sin = Math.sin(cam.ang), cos = Math.cos(cam.ang);
    var fr = FOG[0], fg = FOG[1], fb = FOG[2];

    for (var sy = cam.horizon + 1; sy < H; sy++) {
      var rowOff = sy * W * 4;
      var depth = sy - cam.horizon;
      var dz = cam.h * cam.focal / depth;

      if (dz > FAR) {
        for (var q = 0; q < W; q++) {
          var o0 = rowOff + q * 4;
          data[o0] = fr; data[o0 + 1] = fg; data[o0 + 2] = fb; data[o0 + 3] = 255;
        }
        continue;
      }

      var scale = dz / cam.focal;
      /* posicao no mundo da coluna 0 desta linha */
      var wx = cam.x + sin * dz + cos * (-W / 2) * scale;
      var wy = cam.y + cos * dz - sin * (-W / 2) * scale;
      var dwx = cos * scale;
      var dwy = -sin * scale;

      /* neblina e sombreamento por distancia */
      var fog = (dz - FOG_START) / (FAR - FOG_START);
      if (fog < 0) fog = 0; else if (fog > 1) fog = 1;
      fog = fog * fog;
      var lum = 1.0 - fog * 0.15;
      var inv = 1 - fog;

      for (var sx = 0; sx < W; sx++) {
        var o = rowOff + sx * 4;
        /* amostragem com bordas fixadas: a rocha da moldura continua ao longe */
        var tx = wx | 0, ty = wy | 0;
        if (tx < 0) tx = 0; else if (tx >= SIZE) tx = SIZE - 1;
        if (ty < 0) ty = 0; else if (ty >= SIZE) ty = SIZE - 1;
        var ti = (ty * SIZE + tx) * 4;
        var r = tex[ti], g = tex[ti + 1], b = tex[ti + 2];
        r = r * lum; g = g * lum; b = b * lum;
        data[o] = r * inv + fr * fog;
        data[o + 1] = g * inv + fg * fog;
        data[o + 2] = b * inv + fb * fog;
        data[o + 3] = 255;
        wx += dwx; wy += dwy;
      }
    }
  }

  /* projeta um ponto do mundo na tela; devolve null se atras da camera */
  function project(cam, wx, wy, W) {
    var dx = wx - cam.x, dy = wy - cam.y;
    var sin = Math.sin(cam.ang), cos = Math.cos(cam.ang);
    var fwd = dx * sin + dy * cos;
    if (fwd < 12) return null;
    var lat = dx * cos - dy * sin;
    var k = cam.focal / fwd;
    return {
      x: W / 2 + lat * k,
      y: cam.horizon + cam.h * k,
      scale: k,
      fwd: fwd
    };
  }

  return {
    init: init, drawSky: drawSky, drawGround: drawGround, project: project,
    FAR: FAR
  };
})();
