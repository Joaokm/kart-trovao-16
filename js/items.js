/* ============================================================
   ITENS - sorteio, projetil e armadilha
   Itens originais:
     turbo  - TURBINA DE MAGMA (impulso)
     orb    - ESFERA DE PLASMA (projetil que roda o adversario)
     goo    - POÇA DE PICHE (armadilha deixada para tras)
     shield - BOLHA DE FORÇA (anula o proximo golpe)
   ============================================================ */
KT.Items = (function () {

  var LABEL = {
    turbo: "TURBINA DE MAGMA",
    orb: "ESFERA DE PLASMA",
    goo: "POÇA DE PICHE",
    shield: "BOLHA DE FORÇA",spring:"MOLA SALTADORA",magnet:"ÍMÃ DE REBOQUE"
  };

  /* tabelas por posicao: quem esta atras recebe itens melhores */
  var TABLES = {
    frente: [["goo", 28], ["turbo", 25], ["shield", 20], ["orb", 10],["spring",17]],
    meio:   [["orb", 24], ["turbo", 25], ["goo", 10], ["shield", 16],["spring",12],["magnet",13]],
    fundo:  [["turbo", 30], ["orb", 22], ["shield", 15], ["goo", 5],["spring",10],["magnet",18]]
  };

  function roll(pos, total) {
    var t = pos <= Math.max(1, Math.floor(total * 0.25)) ? TABLES.frente
      : (pos <= Math.ceil(total * 0.66) ? TABLES.meio : TABLES.fundo);
    var sum = 0, i;
    for (i = 0; i < t.length; i++) sum += t[i][1];
    var r = KT.rngSim() * sum;
    for (i = 0; i < t.length; i++) {
      r -= t[i][1];
      if (r <= 0) return t[i][0];
    }
    return t[0][0];
  }

  /* ---------------- projetil ---------------- */
  function Orb(owner) {
    this.owner = owner;
    this.x = owner.x + Math.sin(owner.ang) * 22;
    this.y = owner.y + Math.cos(owner.ang) * 22;
    this.ang = owner.ang;
    this.sp = 360;
    this.life = 4.2;
    this.i = KT.Track.nearestIndex(this.x, this.y, owner.idx);
    this.dead = false;
    this.anim = 0;
  }

  Orb.prototype.update = function (dt, race) {
    var Tk = KT.Track;
    this.anim += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; race.metr.orbes.expirou++; return; }

    /* leve perseguicao ao alvo mais proximo a frente */
    var best = null, bestD = 1e9;
    for (var k = 0; k < race.karts.length; k++) {
      var o = race.karts[k];
      if (o === this.owner) continue;
      var dx = o.x - this.x, dy = o.y - this.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var want = Math.atan2(dx, dy);
      if (Math.abs(KT.angDiff(want, this.ang)) < 0.9 && dist < bestD) { bestD = dist; best = o; }
    }
    if (best) {
      var w = Math.atan2(best.x - this.x, best.y - this.y);
      this.ang += KT.angDiff(w, this.ang) * KT.clamp(2.6 * dt, 0, 1);
    }

    this.x += Math.sin(this.ang) * this.sp * dt;
    this.y += Math.cos(this.ang) * this.sp * dt;
    this.i = Tk.nearestIndex(this.x, this.y, this.i);

    if (Tk.terrainAt(this.x, this.y, this.i) === Tk.T.PAREDE) { this.dead = true; race.metr.orbes.muro++; return; }

    for (var j = 0; j < race.karts.length; j++) {
      var kk = race.karts[j];
      if (kk === this.owner) continue;
      var ddx = kk.x - this.x, ddy = kk.y - this.y;
      if (ddx * ddx + ddy * ddy < 20 * 20) {
        if (kk.hit("orb")) race.metr.orbes.acertou++;
        else race.metr.orbes.escudo++;
        race.flash(kk);
        this.dead = true;
        if (kk.isPlayer || this.owner.isPlayer) KT.Audio.play("hit");
        return;
      }
    }
  };

  /* ---------------- armadilha ---------------- */
  function Goo(owner) {
    this.owner = owner;
    this.x = owner.x - Math.sin(owner.ang) * 30;
    this.y = owner.y - Math.cos(owner.ang) * 30;
    this.i = KT.Track.nearestIndex(this.x, this.y, owner.idx);
    this.life = 24;
    this.dead = false;
    this.grace = 0.6;
  }

  Goo.prototype.update = function (dt, race) {
    this.life -= dt;
    this.grace -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    for (var j = 0; j < race.karts.length; j++) {
      var kk = race.karts[j];
      if (kk === this.owner && this.grace > 0) continue;
      var dx = kk.x - this.x, dy = kk.y - this.y;
      if (dx * dx + dy * dy < 17 * 17) {
        if (kk.hit("goo")) race.flash(kk);
        this.dead = true;
        return;
      }
    }
  };

  return { roll: roll, Orb: Orb, Goo: Goo, LABEL: LABEL };
})();
