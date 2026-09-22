/* ============================================================
   AUDIO - sintese chiptune original via WebAudio.
   Nenhum arquivo de audio externo, nenhuma musica de terceiros.
   ============================================================ */
KT.Audio = (function () {
  var ac = null, master = null, musicGain = null, sfxGain = null;
  var engineOsc = null, engineGain = null, engineFilter = null, noiseSrc = null, noiseGain = null;
  var enabled = true, started = false;
  var seqTimer = null, step = 0, tempo = 0.125, nextTime = 0, currentSong = null;

  /* ---- tabela de notas (Hz) ---- */
  function n(name) {
    var names = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
    var m = /^([A-G]#?)(-?\d)$/.exec(name);
    if (!m) return 0;
    var semi = names[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (semi - 69) / 12);
  }

  /* --- musicas (compostas para este projeto) --- */
  var SONGS = {
    title: {
      tempo: 0.14,
      lead: ["A4", "-", "C5", "-", "E5", "-", "D5", "C5", "A4", "-", "G4", "-", "A4", "-", "-", "-",
             "F4", "-", "A4", "-", "C5", "-", "B4", "A4", "G4", "-", "E4", "-", "G4", "-", "-", "-"],
      bass: ["A2", "-", "A2", "-", "E2", "-", "E2", "-", "F2", "-", "F2", "-", "G2", "-", "G2", "-",
             "F2", "-", "F2", "-", "C3", "-", "C3", "-", "G2", "-", "G2", "-", "E2", "-", "E2", "-"],
      drum: ["K", "-", "H", "-", "S", "-", "H", "H", "K", "-", "H", "-", "S", "-", "H", "-",
             "K", "-", "H", "-", "S", "-", "H", "H", "K", "-", "H", "-", "S", "H", "S", "H"]
    },
    race: {
      tempo: 0.1,
      lead: ["E5", "B4", "E5", "G5", "F#5", "E5", "D5", "E5", "C5", "G4", "C5", "E5", "D5", "C5", "B4", "C5",
             "A4", "E4", "A4", "C5", "B4", "A4", "G4", "A4", "B4", "-", "D5", "-", "F#5", "-", "A5", "-"],
      bass: ["E2", "E2", "E3", "E2", "E2", "E2", "E3", "E2", "C2", "C2", "C3", "C2", "C2", "C2", "C3", "C2",
             "A2", "A2", "A3", "A2", "A2", "A2", "A3", "A2", "B2", "B2", "B3", "B2", "D3", "D3", "F#3", "F#3"],
      drum: ["K", "H", "S", "H", "K", "H", "S", "H", "K", "H", "S", "H", "K", "H", "S", "H",
             "K", "H", "S", "H", "K", "H", "S", "H", "K", "H", "S", "H", "K", "K", "S", "S"]
    },
    victory: {
      tempo: 0.13,
      lead: ["C5", "-", "E5", "-", "G5", "-", "C6", "-", "G5", "-", "C6", "-", "E6", "-", "-", "-"],
      bass: ["C3", "-", "C3", "-", "G2", "-", "G2", "-", "C3", "-", "E3", "-", "C3", "-", "-", "-"],
      drum: ["K", "-", "-", "-", "K", "-", "-", "-", "K", "-", "S", "-", "K", "S", "K", "S"]
    }
  };

  /* Oito temas com melodias e ritmos próprios. Sequências originais de 32 passos. */
  var motifs=[
    "E5 B4 G5 F#5 E5 D5 B4 E5 G5 A5 G5 E5 D5 F#5 A5 B5",
    "D5 F#5 A5 F#5 E5 D5 B4 A4 D5 E5 F#5 A5 B5 A5 F#5 E5",
    "A4 C5 E5 G5 E5 D5 C5 A4 B4 D5 E5 G5 A5 G5 E5 C5",
    "C5 G5 E5 B5 A5 E5 D5 G5 E5 C5 A4 E5 G5 B5 A5 G5",
    "D5 D#5 F#5 A5 G5 F#5 D#5 D5 C5 D5 F#5 G5 A5 G5 F#5 D5",
    "F#5 A5 C#6 E5 F#5 C#5 E5 A5 G#5 E5 C#5 B4 C#5 E5 A5 G#5",
    "G5 D5 B5 A5 G5 E5 D5 B4 C5 E5 G5 B5 A5 G5 E5 D5",
    "B4 D5 F#5 A5 F#5 E5 D5 B4 C#5 E5 G5 B5 A5 F#5 E5 D5"
  ],roots=["E2","D2","A2","C3","D2","F#2","G2","B2"];
  motifs.forEach(function(m,t){var notes=m.split(' '),lead=[],bass=[],drum=[];for(var i=0;i<32;i++){lead.push(i%4===3&&t%2===1?'-':notes[(i+Math.floor(i/16)*3)%16]);bass.push(i%2===0?roots[t]:'-');drum.push(i%8===0?'K':i%8===4?'S':i%2===0?'H':'-');}SONGS['theme'+t]={tempo:[.1,.125,.12,.145,.115,.105,.135,.095][t],lead:lead,bass:bass,drum:drum};});

  function init() {
    if (ac) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ac = new AC();
    } catch (e) { enabled = false; return; }
    master = ac.createGain(); master.gain.value = KT.Career.data.settings.volume/100*.5; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.30; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master);
  }

  function resume() {
    init();
    if (ac && ac.state === "suspended") ac.resume();
    started = true;
  }

  /* ---------- SFX genericos ---------- */
  function blip(freq, dur, type, vol, slideTo) {
    if (!ac || !enabled) return;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ac.currentTime + dur);
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(); o.stop(ac.currentTime + dur + 0.02);
  }

  function noiseBurst(dur, vol, freq, q) {
    if (!ac || !enabled) return;
    var len = Math.floor(ac.sampleRate * dur);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var s = ac.createBufferSource(); s.buffer = buf;
    var f = ac.createBiquadFilter(); f.type = "bandpass";
    f.frequency.value = freq || 1200; f.Q.value = q || 1;
    var g = ac.createGain(); g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(sfxGain);
    s.start();
  }

  var SFX = {
    select: function () { blip(880, 0.06, "square", 0.22); },
    confirm: function () { blip(660, 0.07, "square", 0.25); setTimeout(function () { blip(990, 0.12, "square", 0.25); }, 70); },
    cancel: function () { blip(400, 0.1, "square", 0.2, 200); },
    count: function () { blip(440, 0.14, "square", 0.3); },
    go: function () { blip(880, 0.35, "square", 0.35); blip(1320, 0.35, "triangle", 0.2); },
    itemRoll: function () { blip(1200, 0.04, "square", 0.14); },
    itemGet: function () { blip(700, 0.06, "square", 0.25); setTimeout(function () { blip(1050, 0.06, "square", 0.25); }, 60); setTimeout(function () { blip(1400, 0.1, "square", 0.25); }, 120); },
    boost: function () { noiseBurst(0.45, 0.35, 900, 0.7); blip(300, 0.4, "sawtooth", 0.18, 1400); },
    hit: function () { noiseBurst(0.35, 0.45, 380, 0.8); blip(180, 0.3, "square", 0.28, 60); },
    bump: function () { noiseBurst(0.12, 0.3, 260, 1.5); },
    fire: function () { blip(1200, 0.22, "sawtooth", 0.25, 350); },
    drop: function () { blip(240, 0.18, "triangle", 0.25, 120); },
    slip: function () { blip(500, 0.3, "sine", 0.22, 160); },
    lap: function () { blip(880, 0.08, "square", 0.28); setTimeout(function () { blip(1320, 0.14, "square", 0.28); }, 90); },
    shield: function () { blip(500, 0.1, "sine", 0.2, 1200); setTimeout(function () { blip(900, 0.2, "sine", 0.16, 1500); }, 90); },
    finish: function () { blip(660, 0.1, "square", 0.3); setTimeout(function () { blip(880, 0.1, "square", 0.3); }, 100); setTimeout(function () { blip(1320, 0.3, "square", 0.3); }, 200); }
  };

  function play(name) { if (SFX[name] && enabled && ac) SFX[name](); }

  /* ---------- motor do kart ---------- */
  function engineStart() {
    if (!ac || !enabled || engineOsc) return;
    engineOsc = ac.createOscillator();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 60;
    engineFilter = ac.createBiquadFilter();
    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 700;
    engineGain = ac.createGain();
    engineGain.gain.value = 0.0;
    engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master);
    engineOsc.start();

    /* ruido de rolagem */
    var len = Math.floor(ac.sampleRate * 2);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseSrc = ac.createBufferSource(); noiseSrc.buffer = buf; noiseSrc.loop = true;
    var nf = ac.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 800; nf.Q.value = 0.6;
    noiseGain = ac.createGain(); noiseGain.gain.value = 0;
    noiseSrc.connect(nf); nf.connect(noiseGain); noiseGain.connect(master);
    noiseSrc.start();
  }

  function engineStop() {
    if (engineOsc) { try { engineOsc.stop(); } catch (e) {} engineOsc = null; }
    if (noiseSrc) { try { noiseSrc.stop(); } catch (e) {} noiseSrc = null; }
    engineGain = null; noiseGain = null;
  }

  /* rpm 0..1, drift 0..1 */
  function engineUpdate(rpm, drifting, offroad) {
    if (!engineOsc || !ac) return;
    var t = ac.currentTime;
    engineOsc.frequency.setTargetAtTime(55 + rpm * 190, t, 0.05);
    engineFilter.frequency.setTargetAtTime(420 + rpm * 1500, t, 0.08);
    engineGain.gain.setTargetAtTime(enabled ? (0.045 + rpm * 0.085) : 0, t, 0.1);
    var nv = (drifting ? 0.11 : 0) + (offroad ? 0.07 : 0);
    noiseGain.gain.setTargetAtTime(enabled ? nv : 0, t, 0.06);
  }

  /* ---------- sequenciador de musica ---------- */
  function playNote(freq, time, dur, type, vol, dest) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g); g.connect(dest);
    o.start(time); o.stop(time + dur + 0.02);
  }

  function playDrum(kind, time) {
    var len = Math.floor(ac.sampleRate * 0.14);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, kind === "K" ? 6 : 3);
    var s = ac.createBufferSource(); s.buffer = buf;
    var f = ac.createBiquadFilter();
    if (kind === "K") { f.type = "lowpass"; f.frequency.value = 160; }
    else if (kind === "S") { f.type = "bandpass"; f.frequency.value = 1500; f.Q.value = 0.8; }
    else { f.type = "highpass"; f.frequency.value = 5000; }
    var g = ac.createGain(); g.gain.value = kind === "H" ? 0.10 : 0.24;
    s.connect(f); f.connect(g); g.connect(musicGain);
    s.start(time);
  }

  function scheduler() {
    if (!currentSong || !ac) return;
    var song = SONGS[currentSong];
    while (nextTime < ac.currentTime + 0.25) {
      var i = step % song.lead.length;
      var L = song.lead[i], B = song.bass[i], D = song.drum[i];
      if (L && L !== "-") playNote(n(L), nextTime, song.tempo * 0.9, "square", 0.16, musicGain);
      if (B && B !== "-") playNote(n(B), nextTime, song.tempo * 0.85, "triangle", 0.22, musicGain);
      if (D && D !== "-") playDrum(D, nextTime);
      nextTime += song.tempo;
      step++;
    }
  }

  function music(name) {
    init();
    if (!ac || !enabled) { currentSong = name; return; }
    if (currentSong === name && seqTimer) return;
    stopMusic();
    if (!name) return;
    currentSong = name;
    step = 0;
    nextTime = ac.currentTime + 0.06;
    seqTimer = setInterval(scheduler, 40);
  }

  function stopMusic() {
    if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
    currentSong = null;
  }

  function toggleMute() {
    enabled = !enabled;
    if (master) master.gain.setTargetAtTime(enabled ? KT.Career.data.settings.volume/100*.5 : 0, ac.currentTime, 0.05);
    return enabled;
  }

  return {
    setVolume:function(v){if(master)master.gain.setTargetAtTime(enabled?KT.clamp(v,0,1)*.5:0,ac.currentTime,.05);},
    resume: resume, play: play, music: music, stopMusic: stopMusic,
    engineStart: engineStart, engineStop: engineStop, engineUpdate: engineUpdate,
    toggleMute: toggleMute, isMuted: function () { return !enabled; }
  };
})();
