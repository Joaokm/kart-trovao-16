/* ============================================================
   KART TROVÃO 16 — laço principal, telas e corrida
   ============================================================ */
(function () {

  var W = 320, H = 224;
  var canvas, ctx, img;
  var state = "boot";
  var stateT = 0;
  var propCanvas = {};
  var boxSprites, orbSprites, gooSprite;
  var flameSprite;

  var cam = { x: 0, y: 0, ang: 0, h: 27, focal: 168, horizon: 92 };
  var attract = { i: 0 };

  var sel = { driver: 1, laps: 3, row: 0 };

  /* ============================================================
     CORRIDA
     ============================================================ */
  var race = {
    karts: [], orbs: [], hazards: [], particles: [],
    state: "countdown", countdown: 3.0, time: 0, totalLaps: 3,
    bannerText: "", bannerTime: 0, wrongWay: 0, player: null,
    finishTimer: 0, rocket: false, seed: 0, metr: null
  };

  function embaralhar(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(KT.rngSim() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* cfg (todos opcionais):
       jogador      indice do piloto do jogador (padrao: o escolhido na selecao)
       adversarios  indices dos rivais (padrao: os outros pilotos, embaralhados)
       karts        tamanho do grid (padrao: 8, limitado aos pilotos existentes;
                    passar um numero maior repete pilotos, util nos testes)
       slotJogador  posicao de largada do jogador, 0 = pole (padrao: karts - 3)
       voltas       voltas da corrida
       semente      semente da simulacao (padrao: nova a cada corrida)
       jogadorIA    true = o kart do jogador tambem e pilotado pela IA
     Compatibilidade: startRace(indicePiloto, voltas). */
  function startRace(cfg, laps) {
    if (typeof cfg === "number") cfg = { jogador: cfg, voltas: laps };
    cfg = cfg || {};
    var trackId=cfg.pista==null?0:KT.clamp(cfg.pista|0,0,KT.TRACKS.length-1);
    if(KT.Track.definition.id!==trackId || KT.Track.mirror!==!!cfg.espelho){
      KT.Track.build(trackId,!!cfg.espelho);KT.Mode7.init(W,H);KT.HUD.init();
    }
    var D = KT.DRIVERS, grid = KT.Track.startGrid, i;
    var jog = cfg.jogador != null ? cfg.jogador : sel.driver;

    race.seed = cfg.semente != null ? cfg.semente >>> 0 : KT.novaSemente();
    race.trackId=trackId;race.mirror=!!cfg.espelho;race.level=KT.clamp(cfg.nivel==null?1:cfg.nivel|0,0,3);
    race.mode=cfg.modo||"free";race.teste=!!cfg.teste;race.rewarded=false;race.result=null;race.cupStage=cfg.cupStage;
    KT.seedSim(race.seed);

    race.karts = [];
    race.orbs = []; race.hazards = []; race.particles = [];
    race.totalLaps = cfg.voltas || 3;
    race.time = 0;
    race.countdown = 3.0;
    race.state = "countdown";
    race.bannerText = ""; race.bannerTime = 0;
    race.wrongWay = 0;
    race.finishTimer = 0;
    race.rocket = false;
    race.metr = { orbes: { disparadas: 0, acertou: 0, muro: 0, escudo: 0, expirou: 0 } };

    var nK = race.mode==="tt"?1:(cfg.karts ? Math.min(cfg.karts, grid.length) : Math.min(8, grid.length, D.length));
    var rivais = cfg.adversarios ? cfg.adversarios.slice() : [];
    if (!cfg.adversarios) {
      var outros = [];
      for (i = 0; i < D.length; i++) if (i !== jog) outros.push(i);
      embaralhar(outros);
      for (i = 0; rivais.length < nK - 1; i++) rivais.push(outros[i % outros.length]);
    }

    var slot = KT.clamp(cfg.slotJogador != null ? cfg.slotJogador : nK - 3, 0, nK - 1);
    var ia = [], oi = 0;
    for (i = 0; i < nK; i++) {
      var k = cfg.drivers ? new KT.Kart(cfg.drivers[i],i===slot) : (i === slot) ? new KT.Kart(jog, true) : new KT.Kart(rivais[oi++], false);
      k.reset(grid[i]);
      if (k.ai) ia.push(k);
      race.karts.push(k);
    }
    race.player = race.karts[slot];

    /* forca da IA: independente da posicao no grid e nunca acima do
       proprio piloto (sera substituida pelo nivel D da IA nova) */
    var forca = [];
    for (i = 0; i < ia.length; i++) {
      var t = ia.length > 1 ? i / (ia.length - 1) : 0.5;
        forca.push(Math.min(1, KT.LEVELS[race.level].speed - .025 + .025*t + KT.rand(-.01,.01)));
    }
    embaralhar(forca);
    for (i = 0; i < ia.length; i++) { ia[i].aiSkill = forca[i]; ia[i].aiLine = KT.rand(-16, 16); }
    if (cfg.jogadorIA) { race.player.ai = true; race.player.aiSkill = KT.LEVELS[race.level].speed; }
    if(!race.teste)KT.Career.tune(race.player,race.mode==="tt"||race.mode==="online");
    KT.Ghost.start(race);

    var boxes = KT.Track.itemBoxes;
    for (i = 0; i < boxes.length; i++) { boxes[i].active = true; boxes[i].timer = 0; }

    updatePositions();
    KT.Audio.engineStart();
  }

  KT.race = race;   /* exposto para inspecao/depuracao no console */

  /* avanca a simulacao sem desenhar (util para testes no console) */
  KT.simular = function (passos, dt) {
    dt = dt || 1 / 60;
    for (var i = 0; i < passos; i++) { update(dt); KT.Input.endFrame(); }
    return state;
  };

  race.banner = function (txt, t) { race.bannerText = txt; race.bannerTime = t; };

  race.flash = function (k) {
    for (var i = 0; i < 16; i++) {
      race.particles.push({
        x: k.x, y: k.y, z: 6 + KT.rngVis() * 10,
        vx: KT.randV(-70, 70), vy: KT.randV(-70, 70), vz: KT.randV(10, 60),
        life: KT.randV(0.3, 0.7), max: 0.7, size: 3,
        col: KT.rngVis() > 0.5 ? "#ffd24a" : "#ff6a3c"
      });
    }
  };

  race.hasTargetAhead = function (k) {
    for (var i = 0; i < race.karts.length; i++) {
      var o = race.karts[i];
      if (o === k) continue;
      var dx = o.x - k.x, dy = o.y - k.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > 320) continue;
      if (Math.abs(KT.angDiff(Math.atan2(dx, dy), k.ang)) < 0.55) return true;
    }
    return false;
  };

  race.hasTargetBehind = function (k) {
    for (var i = 0; i < race.karts.length; i++) {
      var o = race.karts[i];
      if (o === k) continue;
      var dx = o.x - k.x, dy = o.y - k.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > 220) continue;
      if (Math.abs(KT.angDiff(Math.atan2(dx, dy), k.ang)) > 2.3) return true;
    }
    return false;
  };

  /* ha uma esfera inimiga a menos de 250 u? (mede escudo gasto a toa) */
  function orbeAmeacando(k) {
    for (var i = 0; i < race.orbs.length; i++) {
      var o = race.orbs[i];
      if (o.owner === k) continue;
      var dx = o.x - k.x, dy = o.y - k.y;
      if (dx * dx + dy * dy < 250 * 250) return true;
    }
    return false;
  }

  race.useItem = function (k) {
    if (!k.item || k.itemRoll > 0) return;
    var it = k.item;
    k.item = null;
    k.metr.itens[it] = (k.metr.itens[it] || 0) + 1;
    if (it === "shield" && !orbeAmeacando(k)) k.metr.escudoOcioso++;
    if (it === "orb") race.metr.orbes.disparadas++;
    if(it==="spring"){k.air=1.5;k.hop=1;k.boost=Math.max(k.boost,.35);KT.Audio.play("boost");}
    if(it==="magnet"){k.magnet=4;KT.Audio.play("shield");}
    if (it === "turbo") { k.boost = Math.max(k.boost, 1.5); if (k.isPlayer) KT.Audio.play("boost"); }
    else if (it === "orb") { race.orbs.push(new KT.Items.Orb(k)); if (k.isPlayer) KT.Audio.play("fire"); }
    else if (it === "goo") { race.hazards.push(new KT.Items.Goo(k)); if (k.isPlayer) KT.Audio.play("drop"); }
    else if (it === "shield") { k.shield = 7.5; if (k.isPlayer) KT.Audio.play("shield"); }
  };

  function updatePositions() {
    var arr = race.karts.slice();
    arr.sort(function (a, b) {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
    for (var i = 0; i < arr.length; i++) arr[i].pos = i + 1;
  }

  /* o ponto (x, y) e navegavel para o kart k? */
  function livre(k, x, y) {
    return KT.Track.terrainAt(x, y, k.idx) !== KT.Track.T.PAREDE;
  }

  /* desloca k em (dx, dy) so se o destino nao for muro */
  function empurrar(k, dx, dy) {
    if (!livre(k, k.x + dx, k.y + dy)) return false;
    k.x += dx; k.y += dy;
    return true;
  }

  function kartCollisions() {
    var R = KT.Kart.RADIUS * 2;
    for (var i = 0; i < race.karts.length; i++) {
      for (var j = i + 1; j < race.karts.length; j++) {
        var a = race.karts[i], b = race.karts[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > R * R || d2 < 0.01) continue;
        var d = Math.sqrt(d2);
        var overlap = (R - d) * 0.5;
        var nx = dx / d, ny = dy / d;
        a.tocou = true; b.tocou = true;
        /* separa sem jogar ninguem para dentro do muro: se um lado
           esta encostado, o outro absorve a separacao inteira */
        var aOk = livre(a, a.x - nx * overlap, a.y - ny * overlap);
        var bOk = livre(b, b.x + nx * overlap, b.y + ny * overlap);
        if (aOk && bOk) {
          var ashare=b.mass/(a.mass+b.mass),bshare=1-ashare;
          var ax=a.x-nx*overlap*2*ashare,ay=a.y-ny*overlap*2*ashare;
          var bx=b.x+nx*overlap*2*bshare,by=b.y+ny*overlap*2*bshare;
          if(livre(a,ax,ay)&&livre(b,bx,by)){a.x=ax;a.y=ay;b.x=bx;b.y=by;}
          else {a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;}
        } else if (aOk) {
          if (!empurrar(a, -nx * overlap * 2, -ny * overlap * 2)) empurrar(a, -nx * overlap, -ny * overlap);
        } else if (bOk) {
          if (!empurrar(b, nx * overlap * 2, ny * overlap * 2)) empurrar(b, nx * overlap, ny * overlap);
        }
        /* troca de energia: quem vem mais rapido empurra */
        var push = Math.abs(a.sp - b.sp) * 0.16;
        if (a.sp > b.sp) { a.sp -= push; b.sp += push * 0.6; }
        else { b.sp -= push; a.sp += push * 0.6; }
        if ((a.isPlayer || b.isPlayer) && push > 6) KT.Audio.play("bump");
      }
    }
  }

  function itemBoxes(dt) {
    if(race.mode==="tt")return;
    var boxes = KT.Track.itemBoxes;
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (!b.active) {
        b.timer -= dt;
        if (b.timer <= 0) b.active = true;
        continue;
      }
      for (var k = 0; k < race.karts.length; k++) {
        var kk = race.karts[k];
        if (kk.item || kk.itemRoll > 0) continue;
        var dx = kk.x - b.x, dy = kk.y - b.y;
        if (dx * dx + dy * dy < 19 * 19) {
          b.active = false; b.timer = 5;
          kk.itemRoll = 0.85;
          if (kk.isPlayer) KT.Audio.play("itemGet");
          for (var q = 0; q < 10; q++) {
            race.particles.push({
              x: b.x, y: b.y, z: 8 + KT.rngVis() * 12,
              vx: KT.randV(-60, 60), vy: KT.randV(-60, 60), vz: KT.randV(20, 70),
              life: 0.5, max: 0.5, size: 2, col: "#7de0ff"
            });
          }
          break;
        }
      }
    }
  }

  function emitParticles(k, dt) {
    if(!KT.Career.data.settings.motion)return;
    if (race.particles.length > 420) return;
    var Tk = KT.Track;
    var terr = k.terrain;
    var speed = Math.abs(k.sp);
    var rv = KT.rngVis, R = KT.randV;

    /* faiscas da Carga Trovao. O nivel aparece na cor E na forma:
       nivel 1 = centelhas finas amarelo-eletrico; nivel 2 = brasas de magma
       maiores e em dobro. */
    if (k.drifting && k.driftCharge > 0.85 && rv() < 0.75) {
      var n2 = k.driftCharge > 1.75;
      var porLado = n2 ? 2 : 1;
      for (var s = 0; s < 2; s++) {
        var side = s === 0 ? 1 : -1;
        var rx = k.x - Math.sin(k.ang) * 10 + Math.cos(k.ang) * 9 * side;
        var ry = k.y - Math.cos(k.ang) * 10 - Math.sin(k.ang) * 9 * side;
        for (var q = 0; q < porLado; q++) {
          race.particles.push({
            x: rx, y: ry, z: 3,
            vx: R(-40, 40) - Math.sin(k.ang) * 60,
            vy: R(-40, 40) - Math.cos(k.ang) * 60,
            vz: R(20, 60), life: 0.28, max: 0.28, size: n2 ? 3 : 2,
            col: n2 ? (rv() < 0.6 ? "#ff3a24" : "#ffb03a") : (rv() < 0.7 ? "#fff05a" : "#ffffff")
          });
        }
      }
    }
    /* fumaca da derrapagem */
    if (k.drifting && rv() < 0.5) {
      race.particles.push({
        x: k.x - Math.sin(k.ang) * 12, y: k.y - Math.cos(k.ang) * 12, z: 2,
        vx: R(-16, 16), vy: R(-16, 16), vz: 14,
        life: 0.5, max: 0.5, size: 4, col: "#9aa0b8"
      });
    }
    /* poeira fora do asfalto */
    if ((terr === Tk.T.GRAMA || terr === Tk.T.CINZAS) && speed > 60 && rv() < 0.6) {
      race.particles.push({
        x: k.x - Math.sin(k.ang) * 11, y: k.y - Math.cos(k.ang) * 11, z: 2,
        vx: R(-24, 24), vy: R(-24, 24), vz: R(12, 34),
        life: 0.6, max: 0.6, size: 4,
        col: terr === Tk.T.GRAMA ? "#4a7a4e" : "#6a5f68"
      });
    }
    /* rastro de fogo do impulso */
    if (k.boost > 0 && rv() < 0.8) {
      race.particles.push({
        x: k.x - Math.sin(k.ang) * 11, y: k.y - Math.cos(k.ang) * 11, z: 4,
        vx: R(-12, 12), vy: R(-12, 12), vz: R(8, 26),
        life: 0.26, max: 0.26, size: 2,
        col: rv() > 0.5 ? "#ffd24a" : "#ff6a1c"
      });
    }
  }

  function updateRace(dt) {
    var i;
    if(race.mode==='online'&&KT.Net&&KT.Net.step(dt,race,KT.Input))return;

    if (race.state === "countdown") {
      var before = Math.ceil(race.countdown);
      race.countdown -= dt;
      var after = Math.ceil(race.countdown);
      if (after !== before && after >= 0) KT.Audio.play(after === 0 ? "go" : "count");
      /* largada relampago: segurar acelerador no fim da contagem */
      if (race.countdown < 0.55 && race.countdown > 0 && KT.Input.held("up")) race.rocket = true;
      else if (race.countdown >= 0.75 && KT.Input.held("up")) race.rocket = false;
      if (race.countdown <= 0) {
        race.state = "race";
        KT.Audio.music("theme"+KT.THEMES[KT.Track.definition.theme].tune);
        if (race.rocket) {
          race.player.boost = 1.2;
          race.banner("ARRANCADA PERFEITA!", 1.8);
          KT.Audio.play("boost");
        }
        for (var ai = 0; ai < race.karts.length; ai++) {
          var kk = race.karts[ai];
          if (kk.ai && KT.rngSim() < 0.35) kk.boost = 0.9;
        }
      }
    } else if (race.state === "race") {
      race.time += dt;
    }

    for (i = 0; i < race.karts.length; i++) {
      var k = race.karts[i];
      k.update(dt, race);
      emitParticles(k, dt);
      if (k.itemRoll > 0) {
        k.itemRoll -= dt;
        if (k.isPlayer && KT.rngVis() < 0.3) KT.Audio.play("itemRoll");
        if (k.itemRoll <= 0) { k.itemRoll = 0; k.item = KT.Items.roll(k.pos, race.karts.length); }
      }
    }

    kartCollisions();
    itemBoxes(dt);

    for (i = race.orbs.length - 1; i >= 0; i--) {
      race.orbs[i].update(dt, race);
      if (race.orbs[i].dead) race.orbs.splice(i, 1);
    }
    for (i = race.hazards.length - 1; i >= 0; i--) {
      race.hazards[i].update(dt, race);
      if (race.hazards[i].dead) race.hazards.splice(i, 1);
    }
    for (i = race.particles.length - 1; i >= 0; i--) {
      var p = race.particles[i];
      p.life -= dt;
      if (p.life <= 0) { race.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.z += p.vz * dt; p.vz -= 90 * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.3; }
    }

    updatePositions();

    KT.Ghost.update(race,dt);
    if(race.mode==='online'&&KT.Net)KT.Net.afterStep(dt,race);

    if (race.bannerTime > 0) race.bannerTime -= dt;

    /* contramao */
    var pl = race.player;
    var pang = KT.Track.pts[pl.idx].ang;
    if (Math.abs(KT.angDiff(pang, pl.moveAng)) > 2.0 && Math.abs(pl.sp) > 30) race.wrongWay += dt;
    else race.wrongWay = Math.max(0, race.wrongWay - dt * 2);

    /* audio do motor */
    KT.Audio.engineUpdate(pl.rpm(), pl.drifting, pl.terrain === KT.Track.T.GRAMA || pl.terrain === KT.Track.T.CINZAS);

    /* fim de corrida */
    if(race.mode==='online'){
      var complete=race.karts.every(function(k){return k.finished;});
      if(complete||race.time>300)finishRace();
      return;
    }
    if (pl.finished) {
      /* espera os retardatarios cruzarem a linha antes do resultado */
      race.finishTimer += dt;
      var todos = true;
      for (i = 0; i < race.karts.length; i++) if (!race.karts[i].finished) todos = false;
      if (todos || race.finishTimer > 9) finishRace();
    } else {
      /* todos os adversarios ja chegaram: o jogador ainda tem um tempo extra */
      var restantes = 0;
      for (i = 0; i < race.karts.length; i++) if (!race.karts[i].finished) restantes++;
      if (restantes <= 1 && race.karts.length>1) {
        race.finishTimer += dt;
        if (race.finishTimer > 45) finishRace();
        else if (race.finishTimer > 40 && Math.floor(race.finishTimer * 2) % 2 === 0)
          race.banner("ÚLTIMA CHANCE!", 0.6);
      }
    }
  }

  function finishRace() {
    if(race.rewarded)return;
    race.newRecord=KT.Ghost.finish(race);
    race.result=KT.Career.finish(race);
    if(race.mode==='online'&&KT.Net)KT.Net.finish(race);
    /* Testes nunca gravam progresso nem abrem menus. */
    if(race.teste){race.rewarded=true;return;}
    state = "results";
    stateT = 0;
    KT.Audio.engineStop();
    KT.Audio.music(race.player.pos === 1 ? "victory" : "title");
    if(KT.UI)KT.UI.results(race);
  }

  /* ============================================================
     CÂMERA
     ============================================================ */
  function updateCamera(dt, instant) {
    var p = race.player;
    var target = p.moveAng + KT.angDiff(p.ang, p.moveAng) * 0.35;
    if (instant) cam.ang = target;
    else cam.ang += KT.angDiff(target, cam.ang) * KT.clamp(6.5 * dt, 0, 1);

    var dist = 62 + KT.clamp(Math.abs(p.sp) / KT.Kart.TOP, 0, 1.3) * 8 - (p.boost > 0 ? 7 : 0);
    cam.x = p.x - Math.sin(cam.ang) * dist;
    cam.y = p.y - Math.cos(cam.ang) * dist;
    cam.h = 27 + (p.hop > 0 ? p.hop * 4 : 0);
    cam.focal = 168 - (p.boost > 0 ? 9 : 0);
  }

  /* ============================================================
     DESENHO
     ============================================================ */
  function drawWorld(showKarts) {
    KT.Mode7.drawSky(ctx, cam, W, H);
    KT.Mode7.drawGround(img, cam, W, H);
    ctx.putImageData(img, 0, 0, 0, cam.horizon + 1, W, H - cam.horizon - 1);

    var list = [];
    var i, pr;

    /* decoracoes laterais */
    var props = KT.Track.props;
    for (i = 0; i < props.length; i++) {
      pr = KT.Mode7.project(cam, props[i].x, props[i].y, W);
      if (!pr || pr.fwd > 760) continue;
      list.push({ f: pr.fwd, kind: "prop", o: props[i], p: pr });
    }

    /* caixas de item */
    var boxes = KT.Track.itemBoxes;
    for (i = 0; i < boxes.length; i++) {
      if (!boxes[i].active || race.mode==="tt") continue;
      pr = KT.Mode7.project(cam, boxes[i].x, boxes[i].y, W);
      if (!pr || pr.fwd > 700 || pr.fwd<45) continue;
      list.push({ f: pr.fwd, kind: "box", o: boxes[i], p: pr });
    }

    /* armadilhas e projeteis */
    for (i = 0; i < race.hazards.length; i++) {
      pr = KT.Mode7.project(cam, race.hazards[i].x, race.hazards[i].y, W);
      if (!pr || pr.fwd > 700) continue;
      list.push({ f: pr.fwd, kind: "goo", o: race.hazards[i], p: pr });
    }
    for (i = 0; i < race.orbs.length; i++) {
      pr = KT.Mode7.project(cam, race.orbs[i].x, race.orbs[i].y, W);
      if (!pr || pr.fwd > 700) continue;
      list.push({ f: pr.fwd, kind: "orb", o: race.orbs[i], p: pr });
    }

    /* particulas */
    for (i = 0; i < race.particles.length; i++) {
      var pt = race.particles[i];
      pr = KT.Mode7.project(cam, pt.x, pt.y, W);
      if (!pr || pr.fwd > 500 || pr.fwd < 26) continue;
      list.push({ f: pr.fwd, kind: "part", o: pt, p: pr });
    }

    /* karts */
    if (showKarts) {
      for (i = 0; i < race.karts.length; i++) {
        var k = race.karts[i];
        pr = KT.Mode7.project(cam, k.x, k.y, W);
        if (!pr || pr.fwd > 900) continue;
        list.push({ f: pr.fwd, kind: "kart", o: k, p: pr });
      }
    }

    var ghost=KT.Ghost.point(race);
    if(showKarts&&ghost){pr=KT.Mode7.project(cam,ghost.x,ghost.y,W);if(pr)list.push({f:pr.fwd,kind:"ghost",o:ghost,p:pr});}
    for(i=0;i<KT.Track.dangers.length;i++){var danger=KT.Track.dangers[i];pr=KT.Mode7.project(cam,danger.x,danger.y,W);if(pr&&pr.fwd<700)list.push({f:pr.fwd,kind:"danger",o:danger,p:pr});}

    list.sort(function (a, b) { return b.f - a.f; });

    for (i = 0; i < list.length; i++) {
      var e = list[i];
      var fade = 1 - KT.clamp((e.f - 380) / 380, 0, 0.75);
      ctx.globalAlpha = fade;
      if (e.kind === "kart") drawKart(e.o, e.p);
      else if(e.kind==="ghost"){ctx.globalAlpha=fade*.35;drawKart(Object.assign({sprites:race.player.sprites,hop:0,boost:0,shield:0,spin:0},e.o),e.p);}
      else if(e.kind==="danger")drawDanger(e.o,e.p);
      else if (e.kind === "box") drawBox(e.o, e.p);
      else if (e.kind === "orb") drawOrb(e.o, e.p);
      else if (e.kind === "goo") drawGoo(e.o, e.p);
      else if (e.kind === "prop") drawProp(e.o, e.p);
      else drawParticle(e.o, e.p);
      ctx.globalAlpha = 1;
    }
  }

  function shadow(px, py, w, h) {
    ctx.fillStyle = "rgba(8,6,16,0.45)";
    ctx.beginPath();
    ctx.ellipse(px, py, w, h, 0, 0, KT.TAU);
    ctx.fill();
  }

  function drawKart(k, pr) {
    var s = pr.scale;
    var dw = Math.max(4, Math.round(26 * s));
    var dh = Math.max(3, Math.round(17 * s));
    var rel = KT.angDiff(k.ang, cam.ang);
    var frame = KT.Sprites.kartFrame(k.sprites, rel);
    var hopY = k.hop > 0 ? -Math.sin(k.hop * Math.PI) * 5 * s : 0;
    if(k.air>0)hopY-=Math.sin(k.air/1.5*Math.PI)*20*s;
    if(k.rescue>0){hopY-=Math.sin(k.rescue/1.4*Math.PI)*32*s;ctx.globalAlpha*=.55;}
    var px = Math.round(pr.x - dw / 2);
    var py = Math.round(pr.y - dh + hopY + 2 * s);

    shadow(pr.x, pr.y - 1, dw * 0.42, Math.max(1.5, dh * 0.16));

    /* chama do impulso */
    if (k.boost > 0) {
      var fw = dw * 0.5, fh = dh * 0.6;
      ctx.drawImage(flameSprite, Math.round(pr.x - fw / 2),
        Math.round(pr.y - fh * 0.9 + hopY), Math.round(fw), Math.round(fh));
    }

    ctx.drawImage(frame, px, py, dw, dh);
    if(k.magnet>0){ctx.strokeStyle="#f59ce9";ctx.lineWidth=1;ctx.beginPath();ctx.arc(pr.x,pr.y-dh/2,dw*.65,0,KT.TAU);ctx.stroke();}

    /* bolha de escudo */
    if (k.shield > 0) {
      ctx.strokeStyle = (Math.floor(race.time * 12) % 2) ? "#7de0ff" : "#c9f6ff";
      ctx.lineWidth = Math.max(1, s * 0.6);
      ctx.beginPath();
      ctx.ellipse(pr.x, pr.y - dh * 0.45 + hopY, dw * 0.46, dh * 0.66, 0, 0, KT.TAU);
      ctx.stroke();
    }
    /* estrelas de rodopio */
    if (k.spin > 0) {
      for (var q = 0; q < 3; q++) {
        var a = race.time * 9 + q * 2.09;
        ctx.fillStyle = q % 2 ? "#ffd24a" : "#fff6d0";
        ctx.fillRect(Math.round(pr.x + Math.cos(a) * dw * 0.42) - 1,
          Math.round(pr.y - dh - 3 * s + Math.sin(a) * 3 * s) - 1,
          Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
      }
    }
  }

  function drawBox(b, pr) {
    var s = Math.min(pr.scale,2.7);
    var d = Math.max(4, Math.round(20 * s));
    var bob = Math.sin(race.time * 3 + b.x * 0.05) * 3 * s;
    var f = boxSprites[Math.floor(race.time * 8) % boxSprites.length];
    shadow(pr.x, pr.y - 1, d * 0.35, Math.max(1, d * 0.12));
    ctx.drawImage(f, Math.round(pr.x - d / 2), Math.round(pr.y - d - 4 * s + bob), d, d);
  }

  function drawOrb(o, pr) {
    var s = pr.scale;
    var d = Math.max(3, Math.round(15 * s));
    var f = orbSprites[Math.floor(o.anim * 14) % orbSprites.length];
    ctx.drawImage(f, Math.round(pr.x - d / 2), Math.round(pr.y - d - 2 * s), d, d);
  }

  function drawGoo(g, pr) {
    var s = pr.scale;
    var dw = Math.max(4, Math.round(28 * s)), dh = Math.max(2, Math.round(11 * s));
    ctx.drawImage(gooSprite, Math.round(pr.x - dw / 2), Math.round(pr.y - dh * 0.7), dw, dh);
  }

  function drawDanger(h,p){
    if(h.kind!=="rocks"&&h.kind!=="lava")return;
    var s=p.scale,active=h.kind==="lava"&&(race.time+h.phase)%4>2.2;
    ctx.fillStyle=h.kind==="rocks"?"#8e8795":active?"#ff9a36":"#d65439";
    ctx.beginPath();ctx.moveTo(p.x-12*s,p.y);ctx.lineTo(p.x-7*s,p.y-(active?36:16)*s);ctx.lineTo(p.x+5*s,p.y-(active?44:21)*s);ctx.lineTo(p.x+13*s,p.y);ctx.fill();
    if(active){ctx.fillStyle="#ffe17b";ctx.fillRect(p.x-3*s,p.y-26*s,6*s,22*s);}
  }

  function drawProp(o, pr) {
    if(KT.Track.definition.id!==0){KT.Scenery.prop(ctx,KT.THEMES[KT.Track.definition.theme],o,pr,race.time);return;}
    var s = pr.scale;
    var c = propCanvas[o.type];
    var dw = Math.max(2, Math.round(c.width * s * 1.1));
    var dh = Math.max(3, Math.round(c.height * s * 1.1));
    ctx.drawImage(c, Math.round(pr.x - dw / 2), Math.round(pr.y - dh), dw, dh);
    if (o.type === "tocha") {
      var fl = 2 + Math.sin(race.time * 9 + o.ph) * 1.2;
      ctx.fillStyle = Math.floor(race.time * 14 + o.ph) % 2 ? "#ffd24a" : "#ff7a1c";
      ctx.fillRect(Math.round(pr.x - fl * s * 0.5), Math.round(pr.y - dh - fl * s),
        Math.max(1, Math.round(fl * s)), Math.max(1, Math.round(fl * s * 1.4)));
    }
  }

  function drawParticle(p, pr) {
    var s = pr.scale;
    var sz = KT.clamp(Math.round(p.size * s * 0.7), 1, 7);
    ctx.globalAlpha = ctx.globalAlpha * KT.clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.col;
    ctx.fillRect(Math.round(pr.x - sz / 2), Math.round(pr.y - p.z * s - sz / 2), sz, sz);
  }

  /* ============================================================
     TELAS
     ============================================================ */
  function drawTitle() {
    /* modo atrativo: camera passeando pelo circuito */
    drawWorld(false);

    ctx.fillStyle = "rgba(10,6,20,0.45)";
    ctx.fillRect(0, 0, W, H);

    var y = 30 + Math.sin(stateT * 2) * 2;
    /* faixa escura atras do logotipo */
    ctx.fillStyle = "rgba(12,6,24,0.58)";
    ctx.fillRect(0, y - 12, W, 68);
    ctx.fillStyle = "#ffd24a";
    ctx.fillRect(0, y - 12, W, 1);
    ctx.fillRect(0, y + 55, W, 1);
    KT.Font.center(ctx, "KART TROVÃO", W / 2, y, "#ffd24a", 3, "#7a1a10");
    KT.Font.center(ctx, "16", W / 2, y + 25, "#ff6a3c", 2, "#7a1a10");
    KT.Font.center(ctx, "GRAND TOUR - 30 CIRCUITOS", W / 2, y + 44, "#7de0ff", 1, "#0a2a4a");

    if (Math.floor(stateT * 2) % 2 === 0)
      KT.Font.center(ctx, "APERTE ENTER PARA COMEÇAR", W / 2, 158, "#ffffff", 1, "#20203a");

    KT.Font.center(ctx, "SETAS DIRIGIR  ESPAÇO DERRAPAR  Z ITEM", W / 2, 186, "#9aa0c8", 1);
    KT.Font.center(ctx, "JOGO ORIGINAL - PERSONAGENS E PISTA PRÓPRIOS", W / 2, 200, "#6f7396", 1);
    KT.Font.center(ctx, "M SILENCIA   F TELA CHEIA", W / 2, 212, "#6f7396", 1);
  }

  function drawSelect() {
    ctx.fillStyle = "#161028";
    ctx.fillRect(0, 0, W, H);
    /* faixas diagonais de fundo */
    for (var b = 0; b < 26; b++) {
      ctx.fillStyle = b % 2 ? "#1c1434" : "#191130";
      ctx.save();
      ctx.translate(-40 + b * 16 + Math.sin(stateT + b) * 2, 0);
      ctx.transform(1, 0, -0.3, 1, 0, 0);
      ctx.fillRect(0, 0, 9, H);
      ctx.restore();
    }

    KT.Font.center(ctx, "ESCOLHA SEU PILOTO", W / 2, 10, "#ffd24a", 2, "#3a1020");

    var startX = 32, startY = 32, sp = 88;
    for (var i = 0; i < KT.DRIVERS.length; i++) {
      var d = KT.DRIVERS[i];
      var x = startX + (i % 3) * sp;
      var y = startY + Math.floor(i / 3) * 66;
      var on = (i === sel.driver);
      KT.HUD.panel(ctx, x, y, 80, 54, on ? "#ffd24a" : "#5a5a8c");
      if (on) {
        ctx.fillStyle = "rgba(255,210,74,0.14)";
        ctx.fillRect(x + 1, y + 1, 78, 52);
      }
      ctx.drawImage(portraits[i], x + 3, y + 3, 48, 48);
      ctx.fillStyle = d.cor;
      ctx.fillRect(x + 54, y + 7, 20, 40);
      ctx.fillStyle = "#141020";
      ctx.fillRect(x + 54, y + 7, 20, 1);
      ctx.fillRect(x + 54, y + 46, 20, 1);
      KT.Font.draw(ctx, d.nome.slice(0, 12), x, y + 56, on ? "#ffffff" : "#a0a4c8", 1, "#141020");
    }

    var dsel = KT.DRIVERS[sel.driver];
    KT.HUD.panel(ctx, 14, 172, W - 28, 34);
    KT.Font.draw(ctx, dsel.nome, 20, 177, "#ffd24a", 1, "#3a1020");
    KT.Font.draw(ctx, dsel.perfil, 20, 187, "#7de0ff", 1);
    KT.Font.draw(ctx, "VOLTAS " + sel.laps + " (CIMA/BAIXO)", 20, 197, "#c0c4e8", 1);
    bar(ctx, 190, 177, "VEL", dsel.vel, "#ff6a3c");
    bar(ctx, 190, 187, "ACL", dsel.acel, "#5cff8a");
    bar(ctx, 190, 197, "ADR", dsel.grip, "#7de0ff");

    if (Math.floor(stateT * 2) % 2 === 0)
      KT.Font.center(ctx, "ENTER CONFIRMA   ESC VOLTA", W / 2, 212, "#ffffff", 1, "#20203a");
  }

  function bar(ctx2, x, y, label, v, col) {
    KT.Font.draw(ctx2, label, x, y, "#9aa0c8", 1);
    var n = Math.round((v - 0.85) / 0.3 * 10);
    n = KT.clamp(n, 1, 10);
    for (var i = 0; i < 10; i++) {
      ctx2.fillStyle = i < n ? col : "#33334a";
      ctx2.fillRect(x + 22 + i * 5, y + 1, 4, 5);
    }
  }

  function drawResults() {
    ctx.fillStyle = "#120c22";
    ctx.fillRect(0, 0, W, H);
    for (var b = 0; b < 30; b++) {
      ctx.fillStyle = b % 2 ? "#181030" : "#150e2a";
      ctx.fillRect(0, b * 8 + (Math.floor(stateT * 20) % 8), W, 4);
    }

    var win = race.player.pos === 1;
    KT.Font.center(ctx, win ? "VITÓRIA!" : "FIM DE CORRIDA", W / 2, 12,
      win ? "#ffd24a" : "#e8e8ff", 2, "#3a1020");

    var arr = race.karts.slice().sort(function (a, b) { return a.pos - b.pos; });
    var rowH = Math.min(22, Math.floor(140 / arr.length));   /* 6 karts: 22; 8 karts: 17 */
    for (var i = 0; i < arr.length; i++) {
      var k = arr[i];
      var y = 40 + i * rowH;
      var mine = k.isPlayer;
      KT.HUD.panel(ctx, 14, y - 4, W - 28, rowH - 2, mine ? "#ffd24a" : "#5a5a8c");
      KT.Font.draw(ctx, k.pos + "º", 20, y + 2, i === 0 ? "#ffd24a" : "#c0c4e8", 1, "#141020");
      ctx.fillStyle = k.driver.cor;
      ctx.fillRect(38, y, 8, 10);
      ctx.fillStyle = "#141020";
      ctx.strokeStyle = "#141020";
      KT.Font.draw(ctx, k.driver.nome, 50, y + 2, mine ? "#ffffff" : "#c0c4e8", 1, "#141020");
      KT.Font.right(ctx, k.finished ? KT.fmtTime(k.finishTime) : "NÃO TERMINOU",
        W - 20, y + 2, "#9aa0c8", 1);
    }

    KT.Font.center(ctx, "MELHOR VOLTA: " + (race.player.bestLap ? KT.fmtTime(race.player.bestLap) : "--"),
      W / 2, 182, "#7de0ff", 1, "#0a2a4a");
    if (Math.floor(stateT * 2) % 2 === 0)
      KT.Font.center(ctx, "ENTER CORRER DE NOVO   ESC MENU", W / 2, 202, "#ffffff", 1, "#20203a");
  }

  function drawPause() {
    ctx.fillStyle = "rgba(8,6,18,0.72)";
    ctx.fillRect(0, 0, W, H);
    KT.Font.center(ctx, "PAUSA", W / 2, 92, "#ffd24a", 3, "#3a1020");
    KT.Font.center(ctx, "ENTER CONTINUA", W / 2, 128, "#ffffff", 1, "#20203a");
    KT.Font.center(ctx, "ESC ABANDONA", W / 2, 142, "#c0c4e8", 1, "#20203a");
    KT.Font.center(ctx,"C MODO FOTO",W/2,158,"#7de0ff",1);
  }

  /* ============================================================
     RECURSOS
     ============================================================ */
  var portraits = [];

  var TOCHA = [
    "..KKKK..",
    ".KMMMMK.",
    ".KMEEMK.",
    ".KMMMMK.",
    "..KmmK..",
    "..KmmK..",
    "..KmmK..",
    "..KmmK..",
    "..KmmK..",
    "..KmmK..",
    "..KmmK..",
    ".KMmmMK.",
    ".KMMMMK.",
    "KMMMMMMK",
    "KKKKKKKK"
  ];
  var TOTEM = [
    "..KKKKKK..",
    ".KAAAAAAK.",
    ".KABBBBAK.",
    ".KABEEBAK.",
    ".KABBBBAK.",
    ".KAAAAAAK.",
    "..KAAAAK..",
    "..KAAAAK..",
    ".KAAAAAAK.",
    ".KABBBBAK.",
    ".KABBBBAK.",
    ".KAAAAAAK.",
    "..KAAAAK..",
    "..KAAAAK..",
    ".KAAAAAAK.",
    "KAAAAAAAAK",
    "KKKKKKKKKK"
  ];
  var FLAME = [
    "..EE..",
    ".EWWE.",
    ".EWWE.",
    "EWFFWE",
    "EWFFWE",
    ".EWWE.",
    "..EE..",
    "...."
  ];

  function buildProps() {
    var palT = { "K": "#141020", "M": "#7a5a3a", "m": "#4a3626", "E": "#ff7a1c" };
    var c = KT.makeCanvas(8, 15);
    KT.drawArt(c.getContext("2d"), KT.padArt(TOCHA, 8), palT, 0, 0, 1);
    propCanvas.tocha = c;

    var palO = { "K": "#141020", "A": "#5a4258", "B": "#3b2c40", "E": "#ff9a3c" };
    var c2 = KT.makeCanvas(10, 17);
    KT.drawArt(c2.getContext("2d"), KT.padArt(TOTEM, 10), palO, 0, 0, 1);
    propCanvas.totem = c2;

    var c3 = KT.makeCanvas(6, 8);
    KT.drawArt(c3.getContext("2d"), KT.padArt(FLAME, 6),
      { "E": "#ff5a1c", "W": "#ff9a3c", "F": "#ffe66d" }, 0, 0, 1);
    flameSprite = c3;
  }

  function boot() {
    canvas = document.getElementById("screen");
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    img = ctx.createImageData(W, H);

    KT.Track.build();
    if(KT.UI)KT.UI.init();
    KT.Mode7.init(W, H);
    KT.HUD.init();
    buildProps();
    boxSprites = KT.Sprites.buildItemBox();
    orbSprites = KT.Sprites.buildOrb();
    gooSprite = KT.Sprites.buildGoo();
    for (var i = 0; i < KT.DRIVERS.length; i++) {
      var d = KT.DRIVERS[i];
      portraits.push(KT.Sprites.buildFace(d.cor, d.capacete, d.pele));
    }

    /* corrida de fundo do modo atrativo */
    startRace(1, 3);
    race.state = "attract";

    document.getElementById("loading").style.display = "none";
    state = "title";
    stateT = 0;
  }

  /* ============================================================
     LAÇO PRINCIPAL
     ============================================================ */
  var last = 0, acc = 0;
  var STEP = 1 / 60;

  /* troca de tela; pausar e voltar da pausa preservam o relogio da tela */
  function irPara(nome, manterTempo) {
    state = nome;
    if(KT.UI){if(nome==="select")KT.UI.show();else if(nome!=="results")KT.UI.hide();}
    if (!manterTempo) stateT = 0;
  }

  function comecarCorrida(dt) {
    startRace(sel.driver, sel.laps);
    updateCamera(dt, true);
    irPara("race");
  }

  function drawRaceScreen() {
    drawWorld(true);
    KT.HUD.draw(ctx, race, W, H);
  }

  /* cada tela: update(dt, entrada) e draw() */
  var TELAS = {
    title: {
      update: function (dt, I) {
        /* passeio de camera pela pista */
        attract.i = (attract.i + dt * 44) % KT.Track.N;
        var idx = Math.floor(attract.i);
        var p = KT.Track.pointAt(idx, Math.sin(stateT * 0.4) * 22);
        cam.x = p.x - Math.sin(p.ang) * 40;
        cam.y = p.y - Math.cos(p.ang) * 40;
        cam.ang += KT.angDiff(p.ang, cam.ang) * KT.clamp(3 * dt, 0, 1);
        cam.h = 30; cam.focal = 168;
        if (I.hit("start")) {
          KT.Audio.resume(); KT.Audio.play("confirm"); KT.Audio.music("title");
          irPara("select");
        }
        if (I.hit("item") || I.hit("drift")) KT.Audio.resume();
      },
      draw: drawTitle
    },

    select: {
      update: function (dt, I) {
        if(KT.UI){KT.UI.update(I);return;}
        var nD = KT.DRIVERS.length;
        if (I.hit("left")) { sel.driver = (sel.driver + nD - 1) % nD; KT.Audio.play("select"); }
        if (I.hit("right")) { sel.driver = (sel.driver + 1) % nD; KT.Audio.play("select"); }
        if (I.hit("up")) { sel.laps = Math.min(5, sel.laps + 1); KT.Audio.play("select"); }
        if (I.hit("down")) { sel.laps = Math.max(1, sel.laps - 1); KT.Audio.play("select"); }
        if (I.hit("start")) {
          KT.Audio.play("confirm");
          KT.Audio.stopMusic();
          comecarCorrida(dt);
        }
        if (I.hit("pause")) { KT.Audio.play("cancel"); irPara("title"); }
      },
      draw: drawSelect
    },

    race: {
      update: function (dt, I) {
        if(race.mode==='online'&&I.hit('pause')){race.banner('ONLINE NÃO PAUSA. MENU PARA SAIR.',2);}
        if (I.hit("pause")&&race.mode!=='online') { irPara("paused", true); KT.Audio.play("cancel"); KT.Audio.engineStop(); return; }
        updateRace(dt);
        updateCamera(dt, false);
      },
      draw: drawRaceScreen
    },

    paused: {
      update: function (dt, I) {
        if(I.hit("photo")){irPara("photo",true);return;}
        if (I.hit("start")) { irPara("race", true); KT.Audio.play("confirm"); KT.Audio.engineStart(); }
        if (I.hit("pause")) { irPara("select"); KT.Audio.music("title"); }
      },
      draw: function () { drawRaceScreen(); drawPause(); }
    },

    photo:{update:function(dt,I){if(I.hit("pause")){irPara("paused",true);return;}cam.ang+=I.axisX()*dt;cam.h=KT.clamp(cam.h+(I.held("up")?1:I.held("down")?-1:0)*dt*25,10,100);if(I.hit("start")&&KT.UI)KT.UI.capture();},draw:function(){drawWorld(true);KT.Font.center(ctx,"FOTO: SETAS CÂMERA  ENTER SALVAR  ESC",W/2,210,"#ffffff",1,"#141020");}},

    results: {
      update: function (dt, I) {
        if(KT.UI){KT.UI.update(I);return;}
        if (I.hit("start")) {
          KT.Audio.play("confirm"); KT.Audio.stopMusic();
          comecarCorrida(dt);
        }
        if (I.hit("pause")) { KT.Audio.play("cancel"); KT.Audio.music("title"); irPara("select"); }
      },
      draw: drawResults
    }
  };

  function update(dt) {
    stateT += dt;
    var I = KT.Input;
    if(KT.Controls)KT.Controls.poll();

    if (I.hit("fullscreen")) {
      var el = document.getElementById("cabinet");
      if (!document.fullscreenElement) { if (el.requestFullscreen) el.requestFullscreen(); }
      else document.exitFullscreen();
    }
    if (I.hit("mute")) KT.Audio.toggleMute();
    if(I.hit("photo")&&state==="race"&&race.mode!=='online'){KT.Audio.engineStop();irPara("photo",true);return;}

    TELAS[state].update(dt, I);
  }

  function render() {
    TELAS[state].draw();
  }

  /* ============================================================
     TESTES AUTOMATICOS
     Roda uma corrida inteira sem telas e sem desenhar e devolve as
     medidas de cada kart. Usado por ferramentas/qa.js; no console:
       KT.Teste.corrida({ semente: 7, karts: 8 })
     (substitui a corrida em andamento: recarregue a pagina depois).
     ============================================================ */
  function r2(v) { return v == null ? null : Math.round(v * 100) / 100; }

  function hashTexto(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }

  function relatorioCorrida(tempo) {
    var arr = race.karts.slice().sort(function (a, b) { return a.pos - b.pos; });
    var out = {
      semente: race.seed, voltas: race.totalLaps, karts: [], tempoSimulado: r2(tempo),
      orbes: race.metr.orbes
    };
    var assinatura = "";
    for (var i = 0; i < arr.length; i++) {
      var k = arr[i], m = k.metr, q = Math.max(1, m.quadros);
      out.karts.push({
        pos: k.pos, nome: k.driver.nome, piloto: k.di, slot: race.karts.indexOf(k),
        jogador: k.isPlayer, aiSkill: r2(k.aiSkill), terminou: k.finished,
        tempo: k.finished ? r2(k.finishTime) : null,
        voltas: k.lapTimes.map(r2), melhor: r2(k.bestLap),
        foraPct: r2(100 * m.foraPista / q), zebraPct: r2(100 * m.zebra / q),
        contatoPct: r2(100 * m.contato / q), freandoPct: r2(100 * m.freando / q),
        velRel: r2(m.velRel / q), muroQuadros: m.muro,
        derrapagens: m.derrapagens, carga1: m.carga1, carga2: m.carga2,
        carga3:m.carga3,
        golpes: m.golpes, itens: m.itens, escudoOcioso: m.escudoOcioso
      });
      assinatura += k.di + ":" + k.x.toFixed(3) + "," + k.y.toFixed(3) + ":" +
        k.finishTime.toFixed(4) + ":" + k.lapTimes.join(",") + "|";
    }
    out.hash = hashTexto(assinatura);
    return out;
  }

  KT.Teste = {
    /* cfg: os mesmos campos de startRace + tempoMax (s simulados, padrao 480).
       Por padrao o kart do jogador tambem e pilotado pela IA. */
    corrida: function (cfg) {
      var c = {}, key;
      cfg = cfg || {};
      for (key in cfg) if (cfg.hasOwnProperty(key)) c[key] = cfg[key];
      if (c.jogadorIA == null) c.jogadorIA = true;
      var dt = 1 / 60, limite = Math.round((c.tempoMax || 480) / dt), q = 0;
      c.teste=true;startRace(c);
      irPara("race");
      while (q < limite) {
        updateRace(dt);
        KT.Input.endFrame();
        q++;
        var todos = true;
        for (var i = 0; i < race.karts.length; i++) if (!race.karts[i].finished) { todos = false; break; }
        if (todos) break;
      }
      return relatorioCorrida(q * dt);
    },
    /* monta a corrida sem simular nada (testes de unidade) */
    preparar: function (cfg) { startRace(Object.assign({},cfg,{teste:true})); irPara("race"); return race; },
    colisoes: function () { kartCollisions(); }
  };

  KT.Game={get state(){return state;},start:function(cfg){if(!cfg||cfg.jogador==null)cfg=Object.assign({jogador:1},cfg);startRace(cfg);KT.Audio.resume();KT.Audio.stopMusic();updateCamera(1/60,true);irPara("race");},menu:function(keepOnline){if(!keepOnline&&KT.Net&&KT.Net.connected)KT.Net.leave();KT.Audio.engineStop();KT.Audio.music("title");irPara("select");},photo:function(){if(race.mode==='online')return;KT.Audio.engineStop();irPara("photo",true);},resume:function(){updateCamera(1/60,true);KT.Audio.engineStart();irPara("race",true);},preview:function(id,mirror){KT.Track.build(id,mirror);KT.Mode7.init(W,H);KT.HUD.init();},render:render,finishOnline:finishRace,photoFrame:function(){drawWorld(true);return canvas.toDataURL('image/png');}};

  function frame(now) {
    if (!last) last = now;
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    var guard = 0;
    while (acc >= STEP && guard < 5) { update(STEP); acc -= STEP; guard++; KT.Input.endFrame(); }
    /* Mantém presses até pelo menos um passo de simulação processá-los. */
    render();
    requestAnimationFrame(frame);
  }

  window.addEventListener("load", function () {
    requestAnimationFrame(function () {
      setTimeout(function () {
        boot();
        requestAnimationFrame(frame);
      }, 30);
    });
  });

  /* primeiro toque libera o audio no navegador */
  window.addEventListener("keydown", function () { KT.Audio.resume(); }, { once: true });
  window.addEventListener("pointerdown", function () { KT.Audio.resume(); }, { once: true });
})();
