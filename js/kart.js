/* ============================================================
   KART - fisica arcade, derrapagem, terreno, colisao e IA
   ============================================================ */

/* pilotos originais do Kart Trovao 16 */
KT.DRIVERS = [
  { nome: "ZECA TURBO",  cor: "#e0492a", capacete: "#ffd24a", pele: "#c98b60", vel: 1.06, acel: 0.94, grip: 0.98, perfil: "VELOCISTA" },
  { nome: "LUNA VOLT",   cor: "#2ad0e0", capacete: "#f2f4ff", pele: "#e0b08a", vel: 1.00, acel: 1.00, grip: 1.00, perfil: "EQUILIBRADA" },
  { nome: "KIKA NEON",   cor: "#ee5aa8", capacete: "#3a2a55", pele: "#8a5a3c", vel: 0.96, acel: 1.10, grip: 1.02, perfil: "ARRANCADA" },
  { nome: "BRUTO FERRO", cor: "#c07a2a", capacete: "#5a4a3a", pele: "#a8724a", vel: 1.08, acel: 0.88, grip: 0.92, perfil: "PESO PESADO" },
  { nome: "DR. PARAFUSO",cor: "#8a5ad0", capacete: "#c9d0ff", pele: "#d8a882", vel: 0.98, acel: 1.00, grip: 1.10, perfil: "ADERÊNCIA" },
  { nome: "TAINÁ VENTO", cor: "#4ac06a", capacete: "#ffe0a8", pele: "#7a4c30", vel: 0.99, acel: 1.06, grip: 1.04, perfil: "LEVE" },
  { nome: "BENTO MARÉ", cor: "#277ac0", capacete: "#ffd78a", pele: "#ab704b", vel: 1.02, acel: 1.01, grip: .99, perfil: "NAVEGADOR" },
  { nome: "NARA POLAR", cor: "#a6dce8", capacete: "#3d5d92", pele: "#e6ba99", vel: .98, acel: 1.05, grip: 1.08, perfil: "PRECISÃO" },
  { nome: "IARA FLUXO", cor: "#8fe0b3", capacete: "#e2ff93", pele: "#895c48", vel: 1.03, acel: 1.03, grip: 1.03, perfil: "5 VITÓRIAS" },
  { nome: "DONA BRASA", cor: "#e67e43", capacete: "#ffe3a6", pele: "#946242", vel: 1.07, acel: .94, grip: 1.02, perfil: "RIVAL FAÍSCA" },
  { nome: "CAIO CICLONE", cor: "#56c4c9", capacete: "#e5e7f9", pele: "#c08d65", vel: 1.03, acel: 1.02, grip: 1.06, perfil: "RIVAL CICLONE" },
  { nome: "MAESTRA RAIO", cor: "#ac83e7", capacete: "#fff099", pele: "#815840", vel: 1.05, acel: 1.00, grip: 1.05, perfil: "RIVAL TROVÃO" }
];

KT.Kart = (function () {

  var TOP = 305;          /* velocidade base no asfalto (unidades/s) */
  var ACCEL = 185;
  var BRAKE = 300;
  var REVERSE = 105;
  var RADIUS = 13;        /* raio de colisao */

  function Kart(driverIndex, isPlayer) {
    var d = KT.DRIVERS[driverIndex];
    this.driver = d;
    this.mass = [1.05,1,.85,1.5,1.15,.8,1.1,.95,.9,1.3,1.1,1.2][driverIndex] || 1;
    this.air = 0; this.rescue = 0; this.magnet = 0; this.dangerCooldown = 0;
    this.di = driverIndex;
    this.isPlayer = !!isPlayer;
    this.sprites = KT.Sprites.buildKart(d.cor, d.capacete, d.pele);

    this.x = 0; this.y = 0;
    this.ang = 0;         /* direcao para onde o kart aponta */
    this.moveAng = 0;     /* direcao real do movimento (gera o deslize) */
    this.sp = 0;

    this.drifting = false;
    this.driftDir = 0;
    this.driftCharge = 0;
    this.hop = 0;
    this.boost = 0;
    this.spin = 0;
    this.shield = 0;
    this.slowTimer = 0;

    this.item = null;
    this.itemRoll = 0;

    this.idx = 0;
    this.lap = 0;
    this.cpNext = 0;
    this.pos = 1;
    this.progress = 0;
    this.finished = false;
    this.finishTime = 0;
    this.lapTimes = [];
    this.lapStart = 0;
    this.bestLap = null;
    this.terrain = 0;

    /* IA */
    this.ai = !isPlayer;
    this.aiLine = KT.rand(-16, 16);
    this.aiLineTimer = KT.rand(1, 4);
    this.aiSkill = 1;
    this.aiItemTimer = KT.rand(0.6, 2.2);
    this.aiReact = KT.rand(0.05, 0.16);

    this.wobble = 0;
    this.smokeT = 0;
    this.metr = novaMetrica();
    this.bateu = false;
    this.tocou = false;
  }

  /* telemetria da corrida: alimenta o QA automatico e futuras telas de estatistica */
  function novaMetrica() {
    return {
      quadros: 0, foraPista: 0, zebra: 0, muro: 0, contato: 0, freando: 0, velRel: 0,
      derrapagens: 0, carga1: 0, carga2: 0, carga3:0, golpes: 0,
      itens: {}, escudoOcioso: 0
    };
  }

  Kart.prototype.reset = function (g) {
    this.x = g.x; this.y = g.y;
    this.ang = g.ang; this.moveAng = g.ang;
    this.sp = 0;
    this.idx = g.i;
    this.lap = 0; this.cpNext = 0;
    this.boost = 0; this.spin = 0; this.shield = 0; this.slowTimer = 0;
    this.drifting = false; this.driftCharge = 0; this.hop = 0;
    this.item = null; this.itemRoll = 0;
    this.finished = false; this.lapTimes = []; this.bestLap = null;
    this.calcProgress();
    this.metr = novaMetrica();
  };

  Kart.prototype.topSpeed = function () {
    var t = TOP * this.driver.vel;
    var terr = KT.Track.PROPS[this.terrain];
    t *= terr.speed;
    if (this.boost > 0) t *= 1.42;
    if (this.slowTimer > 0) t *= 0.55;
    if (this.ai) t *= this.aiSkill;
    return t;
  };

  /* ---------------- controles ---------------- */
  Kart.prototype.playerControls = function () {
    if(this.remoteInput){var input=Object.assign({},this.remoteInput);this.remoteInput.useItem=false;return input;}
    var I = KT.Input;
    return {
      throttle: I.held("up") ? 1 : 0,
      brake: I.held("down") ? 1 : 0,
      steer: I.axisX(),
      drift: I.held("drift"),
      useItem: I.hit("item")
    };
  };

  /* Controles da IA são definidos em ai.js. */

  /* ---------------- atualizacao ---------------- */
  Kart.prototype.update = function (dt, race) {
    var Tk = KT.Track;

    /* terreno atual */
    this.terrain = Tk.terrainAt(this.x, this.y, this.idx);
    var terr = Tk.PROPS[this.terrain];

    var c;
    if (race.state === "countdown") {
      c = { throttle: 0, brake: 0, steer: 0, drift: false, useItem: false };
    } else if (this.ai || this.finished) {
      /* apos cruzar a chegada o kart segue em piloto automatico */
      c = this.aiControls(dt, race);
      if (this.finished) { c.throttle *= 0.55; c.useItem = false; c.drift = false; }
    } else {
      c = this.playerControls();
    }

    if (c.useItem) race.useItem(this);

    /* rodopio apos ser atingido */
    if (this.spin > 0) {
      this.spin -= dt;
      this.ang += 11 * dt;
      this.sp = KT.approach(this.sp, 30, 420 * dt);
      c.steer = 0; c.throttle = 0; this.drifting = false; this.driftCharge = 0;
    }

    var top = this.topSpeed();

    /* ---- aceleracao ---- */
    if (this.spin <= 0) {
      var acc = ACCEL * this.driver.acel * (this.boost > 0 ? 2.1 : 1);
      if (c.throttle > 0) {
        if (this.sp < top) this.sp = Math.min(this.sp + acc * c.throttle * dt, top);
        else this.sp = KT.approach(this.sp, top, 160 * dt);
      } else if (c.brake > 0) {
        this.sp -= BRAKE * c.brake * dt;
        if (this.sp < -REVERSE) this.sp = -REVERSE;
      } else {
        this.sp = KT.approach(this.sp, 0, 95 * dt);
      }
      /* excesso de velocidade fora do asfalto cai rapido */
      if (this.sp > top) this.sp = KT.approach(this.sp, top, 260 * dt);
    }

    /* ---- direcao e derrapagem ---- */
    var spRatio = KT.clamp(Math.abs(this.sp) / (TOP * this.driver.vel), 0, 1);
    var steerRate = 2.35 * (0.42 + 0.58 * (1 - spRatio * 0.75));
    if (this.sp < 0) steerRate *= -1;

    if (this.spin <= 0) {
      if (c.drift && !this.drifting && Math.abs(c.steer) > 0.2 && this.sp > top * 0.42) {
        this.drifting = true;
        this.driftDir = KT.sign(c.steer);
        this.driftCharge = 0;
        this.hop = 1;
        this.metr.derrapagens++;
        KT.Audio.play("bump");
      }
      if (this.drifting) {
        if (!c.drift || Math.abs(this.sp) < top * 0.28) {
          /* solta o drift: Carga Trovao conforme o tempo acumulado */
          if (this.driftCharge > 2.7) { this.boost = Math.max(this.boost, 1.55); this.metr.carga3++; KT.Audio.play("boost"); }
          else if (this.driftCharge > 1.75) { this.boost = Math.max(this.boost, 1.05); this.metr.carga2++; KT.Audio.play("boost"); }
          else if (this.driftCharge > 0.85) { this.boost = Math.max(this.boost, 0.6); this.metr.carga1++; KT.Audio.play("boost"); }
          this.drifting = false;
          this.driftCharge = 0;
        } else {
          this.driftCharge += dt;
        }
      }
    }

    var steerAmount = c.steer;
    if (this.drifting) {
      /* durante a derrapagem o kart mantem o giro para o lado escolhido */
      steerAmount = this.driftDir * (0.62 + 0.38 * KT.clamp(c.steer * this.driftDir, -0.5, 1));
      steerRate *= 1.55;
    }

    var iceGrip=this.iceTimer>0?.48:1;
    this.ang += steerAmount * steerRate * dt * terr.grip * this.driver.grip * iceGrip;
    this.ang = KT.normAng(this.ang);

    /* a direcao do movimento persegue a do kart; devagar quando derrapa */
    var chase = (this.drifting ? 3.1 : (8.5 * terr.grip * this.driver.grip))*iceGrip;
    this.moveAng += KT.angDiff(this.ang, this.moveAng) * KT.clamp(chase * dt, 0, 1);

    /* ---- deslocamento e colisao com os limites ---- */
    var vx = Math.sin(this.moveAng) * this.sp * dt;
    var vy = Math.cos(this.moveAng) * this.sp * dt;
    this.bateu = false;
    this.moveWithCollision(vx, vy);

    /* ---- temporizadores ---- */
    if (this.boost > 0) this.boost -= dt;
    if (this.shield > 0) this.shield -= dt;
    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.hop > 0) this.hop = Math.max(0, this.hop - dt * 4.5);
    this.wobble += dt * (4 + spRatio * 12);

    /* faixa de turbo no chao */
    if (this.terrain === Tk.T.TURBO && this.boost < 0.5) {
      this.boost = 0.85;
      if (this.isPlayer) KT.Audio.play("boost");
    }

    this.updateProgress(race);

    /* ---- telemetria ---- */
    if (race.state === "race" && !this.finished) {
      var m = this.metr;
      m.quadros++;
      if (this.terrain === Tk.T.GRAMA || this.terrain === Tk.T.CINZAS) m.foraPista++;
      else if (this.terrain === Tk.T.ZEBRA) m.zebra++;
      if (this.bateu) m.muro++;
      if (this.tocou) m.contato++;
      if (c.brake > 0) m.freando++;
      m.velRel += Math.abs(this.sp) / (TOP * this.driver.vel);
    }
    this.tocou = false;   /* marcado por kartCollisions (game.js) */
  };

  /* ---- progresso, checkpoints e voltas ----
     progress = distancia de corrida em amostras, contada a partir do ultimo
     checkpoint validado. Nunca salta: dar re sobre a linha de chegada logo
     depois de completar uma volta so diminui o valor (antes somava quase
     uma volta inteira e jogava o kart para a lideranca). */
  Kart.prototype.updateProgress = function (race) {
    var Tk = KT.Track, N = Tk.N;
    this.idx = Tk.nearestIndex(this.x, this.y, this.idx);

    var CP = Tk.checkpoints.length;
    var cpIdx = Tk.checkpoints[this.cpNext % CP];
    var d = (this.idx - cpIdx + N) % N;
    if (d < 150) {
      this.cpNext++;
      if (this.cpNext % CP === 1 && this.cpNext > 1) {
        /* cruzou a linha de chegada com todos os setores validados */
        this.onLap(race);
      } else if (this.cpNext === 1) {
        this.lap = 1;
        this.lapStart = race.time;
      }
    }
    this.calcProgress();
  };

  Kart.prototype.calcProgress = function () {
    var Tk = KT.Track, N = Tk.N, CP = Tk.checkpoints.length;
    /* no grid (antes da linha) a referencia e a propria linha: valor negativo */
    var ref = 0, base = 0;
    if (this.cpNext > 0) {
      var ult = this.cpNext - 1;
      ref = Tk.checkpoints[ult % CP];
      base = Math.floor(ult / CP) * N + ref;
    }
    var fd = (this.idx - ref + N) % N;
    if (fd > N / 2) fd -= N;          /* atras do checkpoint: deu re */
    this.progress = base + fd;
  };

  Kart.prototype.onLap = function (race) {
    /* no piloto automatico pos-chegada o kart cruza a linha de novo; sem isto o
       finishTime era regravado e o vencedor caia de posicao no online (que espera todos) */
    if (this.finished) return;
    var t = race.time - this.lapStart;
    this.lapTimes.push(t);
    if (this.bestLap == null || t < this.bestLap) this.bestLap = t;
    this.lapStart = race.time;
    this.lap++;
    if (this.lap > race.totalLaps) {
      this.finished = true;
      this.finishTime = race.time;
      this.lap = race.totalLaps;
      if (this.isPlayer) KT.Audio.play("finish");
    } else if (this.isPlayer) {
      KT.Audio.play("lap");
      race.banner(this.lap === race.totalLaps ? "ÚLTIMA VOLTA!" : "VOLTA " + this.lap, 1.6);
    }
  };

  Kart.prototype.moveWithCollision = function (vx, vy) {
    var Tk = KT.Track;
    var nx = this.x + vx, ny = this.y + vy;
    var blockedX = Tk.terrainAt(nx, this.y, this.idx) === Tk.T.PAREDE;
    var blockedY = Tk.terrainAt(this.x, ny, this.idx) === Tk.T.PAREDE;

    if (!blockedX) this.x = nx;
    if (!blockedY) this.y = ny;

    if (blockedX || blockedY) {
      this.bateu = true;
      this.sp *= 0.62;
      if (this.drifting) { this.drifting = false; this.driftCharge = 0; }
      if (this.isPlayer && Math.abs(this.sp) > 40) KT.Audio.play("bump");
      /* empurra de volta para dentro */
      var i = Tk.nearestIndex(this.x, this.y, this.idx);
      var lat = Tk.lateralOffset(this.x, this.y, i);
      var p = Tk.pts[i];
      var lim = Tk.edgeAAt(i) - 2;
      var push = (Math.abs(lat) - lim) * KT.sign(lat);
      if (Math.abs(lat) > lim) {
        this.x -= Math.cos(p.ang) * push;
        this.y += Math.sin(p.ang) * push;
      }
    }
  };

  Kart.prototype.hit = function (kind) {
    if (this.shield > 0) { this.shield = 0; KT.Audio.play("shield"); return false; }
    this.metr.golpes++;
    if (kind === "goo") {
      this.slowTimer = Math.max(this.slowTimer, 1.4);
      this.sp *= 0.55;
      this.drifting = false; this.driftCharge = 0;
      if (this.isPlayer) KT.Audio.play("slip");
    } else {
      this.spin = Math.max(this.spin, 1.15);
      this.boost = 0;
      this.sp *= 0.35;
      if (this.isPlayer) KT.Audio.play("hit");
    }
    return true;
  };

  Kart.prototype.rpm = function () {
    var top = TOP * this.driver.vel;
    return KT.clamp(Math.abs(this.sp) / top, 0, 1.35);
  };

  Kart.RADIUS = RADIUS;
  Kart.TOP = TOP;
  return Kart;
})();
