/* OVERWORKING — js/audio.js
 * Audio 100% sintetizado con WebAudio (sin ficheros).
 * API pública (OW.Audio): init, play, startMusic, stopMusic, setIntensity, setVolume, mute.
 * Script clásico; nunca lanza excepciones; sin AudioContext todo es no-op.
 */
(function () {
  'use strict';
  window.OW = window.OW || {};

  var AC = window.AudioContext || window.webkitAudioContext || null;

  var ctx = null;
  var master = null, comp = null, musicBus = null, sfxBus = null;
  var sfxVerb = null, sfxVerbSend = null, musicVerb = null;
  var noiseBuf = null;
  var hasPanner = false;

  var musicVol = 0.6, sfxVol = 0.8, muted = false;
  var intensity = 0, smoothInt = 0;
  var pendingTrack = null;     // startMusic pedido antes de init
  var tracks = [];             // instancias de pista activas (incluye las que se desvanecen)
  var timer = null;
  var voices = {};             // name -> [endTimes] para limitar polifonía

  // ---------------------------------------------------------------- utilidades
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function now() { return ctx ? ctx.currentTime : 0; }

  function makeRng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return (s % 100000) / 100000;
    };
  }

  function makeImpulse(seconds, decay) {
    var rate = ctx.sampleRate, len = Math.max(1, (rate * seconds) | 0);
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  // ---------------------------------------------------------------- grafo
  function build() {
    ctx = new AC();
    hasPanner = typeof ctx.createStereoPanner === 'function';

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
    master.connect(comp); comp.connect(ctx.destination);

    musicBus = ctx.createGain(); musicBus.gain.value = musicVol * 0.55; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(master);

    sfxVerb = ctx.createConvolver(); sfxVerb.buffer = makeImpulse(1.4, 3);
    sfxVerbSend = ctx.createGain(); sfxVerbSend.gain.value = 0.25;
    sfxVerbSend.connect(sfxVerb); sfxVerb.connect(sfxBus);

    musicVerb = ctx.createConvolver(); musicVerb.buffer = makeImpulse(2.2, 2.6);
    musicVerb.connect(musicBus);

    var len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
  }

  // ---------------------------------------------------------------- primitivas
  // Envolvente percusiva/ADSR sencilla sobre un GainNode.
  function env(g, t, vol, a, d, s, hold, r) {
    var p = g.gain;
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(vol, t + a);
    if (s > 0) {
      p.setTargetAtTime(vol * s, t + a, Math.max(0.005, d / 3));
      p.setTargetAtTime(0.0001, t + a + hold, Math.max(0.005, r / 4));
      return t + a + hold + r * 1.3;
    }
    p.exponentialRampToValueAtTime(0.0001, t + a + d);
    return t + a + d + 0.02;
  }

  // Oscilador con envolvente y rampa de frecuencia opcional.
  function tone(dest, t, o) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'sine';
    var f = o.freq || 440;
    osc.frequency.setValueAtTime(f, t);
    if (o.to) {
      var ft = t + (o.glide || o.d || 0.1);
      if (o.lin) osc.frequency.linearRampToValueAtTime(o.to, ft);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), ft);
    }
    if (o.detune) osc.detune.value = o.detune;
    var node = osc;
    if (o.lp || o.hp || o.bp) {
      var fl = ctx.createBiquadFilter();
      fl.type = o.lp ? 'lowpass' : o.hp ? 'highpass' : 'bandpass';
      fl.frequency.value = o.lp || o.hp || o.bp;
      fl.Q.value = o.q || 0.8;
      if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + (o.lpTime || o.d || 0.2));
      osc.connect(fl); node = fl;
    }
    if (o.vib) {
      var l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = o.vib; lg.gain.value = o.vibDepth || 30;
      l.connect(lg); lg.connect(osc.detune);
      l.start(t); l.stop(t + (o.a || 0.005) + (o.d || 0.1) + (o.hold || 0) + (o.r || 0.1) + 0.3);
    }
    node.connect(g);
    connectAll(g, dest);
    var end = env(g, t, o.v == null ? 0.3 : o.v, o.a || 0.005, o.d || 0.1, o.s || 0, o.hold || 0, o.r || 0.1);
    osc.start(t); osc.stop(end + 0.05);
    return osc;
  }

  // Ruido filtrado con envolvente.
  function noise(dest, t, o) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    if (o.rate) src.playbackRate.value = o.rate;
    var fl = ctx.createBiquadFilter();
    fl.type = o.type || 'bandpass';
    fl.frequency.setValueAtTime(o.f || 1000, t);
    fl.Q.value = o.q == null ? 1 : o.q;
    if (o.to) fl.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.glide || o.d || 0.1));
    if (o.to2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, o.to2), t + (o.glide2 || (o.d || 0.1) * 2));
    var g = ctx.createGain();
    src.connect(fl); fl.connect(g); connectAll(g, dest);
    var end = env(g, t, o.v == null ? 0.3 : o.v, o.a || 0.002, o.d || 0.1, o.s || 0, o.hold || 0, o.r || 0.1);
    src.start(t, Math.random() * 1.5);
    src.stop(end + 0.05);
    return g;
  }

  function connectAll(node, dest) {
    if (Array.isArray(dest)) { for (var i = 0; i < dest.length; i++) if (dest[i]) node.connect(dest[i]); }
    else node.connect(dest);
  }

  // ================================================================= SFX
  // Cada SFX: function(out, t, p) donde out = [salida seca, envío reverb], p = factor de pitch.
  // Devuelve duración aproximada (para la polifonía).
  var SFX = {
    pickup: function (o, t, p) {
      tone(o, t, { type: 'square', freq: 520 * p, to: 900 * p, glide: 0.06, v: 0.12, d: 0.08, lp: 3000 });
      tone(o, t + 0.03, { type: 'sine', freq: 1320 * p, v: 0.12, d: 0.08 });
      return 0.12;
    },
    drop: function (o, t, p) {
      tone(o[0], t, { type: 'sine', freq: 320 * p, to: 110 * p, glide: 0.08, v: 0.35, d: 0.1 });
      noise(o[0], t, { type: 'lowpass', f: 900, v: 0.2, d: 0.05 });
      return 0.12;
    },
    type: function (o, t, p) {
      // clic mecánico: "clack" agudo + "thock" grave + chasquido
      var f = rnd(2600, 4800) * p;
      noise(o[0], t, { type: 'bandpass', f: f, q: rnd(1.2, 2.5), v: rnd(0.25, 0.4), d: rnd(0.015, 0.03) });
      noise(o[0], t + rnd(0.004, 0.012), { type: 'bandpass', f: rnd(500, 900) * p, q: 2, v: rnd(0.15, 0.28), d: 0.04 });
      tone(o[0], t, { type: 'square', freq: rnd(1600, 2200) * p, v: 0.04, d: 0.006, hp: 1200 });
      return 0.05;
    },
    compile_start: function (o, t, p) {
      tone(o[0], t, { type: 'sawtooth', freq: 70 * p, to: 240 * p, glide: 0.6, v: 0.12, a: 0.05, d: 0.6, s: 0.6, hold: 0.45, r: 0.15, lp: 900 });
      tone(o, t + 0.05, { type: 'square', freq: 660 * p, v: 0.08, d: 0.06, lp: 2500 });
      tone(o, t + 0.15, { type: 'square', freq: 880 * p, v: 0.08, d: 0.06, lp: 2500 });
      noise(o[0], t, { type: 'bandpass', f: 400, to: 1800, glide: 0.6, q: 3, v: 0.06, a: 0.1, d: 0.6 });
      return 0.7;
    },
    compile_done: function (o, t, p) {
      // ding agradable de dos tonos (campana con parciales)
      var f1 = mtof(88) * p, f2 = mtof(84) * p;
      tone(o, t, { type: 'sine', freq: f1, v: 0.3, d: 1.2 });
      tone(o, t, { type: 'sine', freq: f1 * 2.76, v: 0.06, d: 0.4 });
      tone(o, t + 0.12, { type: 'sine', freq: f2, v: 0.28, d: 1.4 });
      tone(o, t + 0.12, { type: 'sine', freq: f2 * 2.0, v: 0.08, d: 0.6 });
      tone(o, t + 0.12, { type: 'triangle', freq: f2 / 2, v: 0.08, d: 0.5 });
      return 1.4;
    },
    warning: function (o, t, p) {
      for (var i = 0; i < 3; i++) {
        var tt = t + i * 0.16;
        tone(o, tt, { type: 'square', freq: 1046 * p, v: 0.12, a: 0.003, d: 0.07, s: 0.9, hold: 0.06, r: 0.02, lp: 4000 });
        tone(o[0], tt + 0.08, { type: 'square', freq: 784 * p, v: 0.1, a: 0.003, d: 0.05, s: 0.9, hold: 0.04, r: 0.02, lp: 4000 });
      }
      return 0.5;
    },
    fire: function (o, t, p) {
      noise(o, t, { type: 'bandpass', f: 250 * p, to: 1400 * p, glide: 0.35, to2: 500, glide2: 0.9, q: 0.9, v: 0.35, a: 0.12, d: 0.5, s: 0.5, hold: 0.3, r: 0.4 });
      noise(o[0], t, { type: 'lowpass', f: 200, v: 0.25, a: 0.1, d: 0.6 });
      for (var i = 0; i < 14; i++) {
        noise(o[0], t + rnd(0.02, 0.9), { type: 'highpass', f: rnd(2000, 6000), q: 0.7, v: rnd(0.08, 0.25), d: rnd(0.005, 0.02) });
      }
      return 1.0;
    },
    extinguish: function (o, t, p) {
      // siseo de espuma + burbujeo
      noise(o, t, { type: 'highpass', f: 3500 * p, q: 0.6, v: 0.25, a: 0.03, d: 0.3, s: 0.7, hold: 0.45, r: 0.25 });
      var g = noise(o[0], t, { type: 'bandpass', f: 1200 * p, q: 2, v: 0.18, a: 0.05, d: 0.3, s: 0.8, hold: 0.4, r: 0.2 });
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.type = 'square'; lfo.frequency.value = rnd(18, 26); lg.gain.value = 0.08;
      lfo.connect(lg); lg.connect(g.gain); lfo.start(t); lfo.stop(t + 1.0);
      return 0.9;
    },
    test_ok: function (o, t, p) {
      [72, 76, 79].forEach(function (m, i) {
        tone(o, t + i * 0.07, { type: 'triangle', freq: mtof(m + 12) * p, v: 0.2, d: 0.18 });
      });
      tone(o, t + 0.21, { type: 'sine', freq: mtof(96) * p, v: 0.08, d: 0.4 });
      return 0.5;
    },
    bug_spawn: function (o, t, p) {
      for (var i = 0; i < 3; i++) {
        var tt = t + i * rnd(0.08, 0.11);
        var osc = tone(o[0], tt, { type: 'sawtooth', freq: rnd(3200, 4200) * p, to: rnd(2400, 3000), glide: 0.06, v: 0.07, d: 0.06, bp: 3500, q: 2 });
        var lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = rnd(45, 70); lg.gain.value = 900;
        lfo.connect(lg); lg.connect(osc.frequency); lfo.start(tt); lfo.stop(tt + 0.1);
      }
      // patitas
      for (var k = 0; k < 6; k++) noise(o[0], t + 0.3 + k * 0.035, { type: 'highpass', f: 5000, v: 0.05, d: 0.008 });
      return 0.55;
    },
    squash: function (o, t, p) {
      noise(o[0], t, { type: 'lowpass', f: 1600 * p, to: 180, glide: 0.15, q: 3, v: 0.55, d: 0.18 });
      tone(o[0], t, { type: 'sine', freq: 190 * p, to: 45, glide: 0.12, v: 0.4, d: 0.14 });
      for (var i = 0; i < 4; i++) noise(o[0], t + rnd(0.03, 0.15), { type: 'bandpass', f: rnd(1500, 3500), q: 4, v: 0.08, d: 0.02 });
      return 0.25;
    },
    deliver: function (o, t, p) {
      // arpegio triunfal
      var notes = [72, 76, 79, 84, 88];
      notes.forEach(function (m, i) {
        var last = i === notes.length - 1;
        tone(o, t + i * 0.075, { type: 'square', freq: mtof(m) * p, v: 0.1, a: 0.004, d: last ? 0.3 : 0.1, s: last ? 0.6 : 0, hold: last ? 0.35 : 0, r: 0.3, lp: 3500 });
        tone(o, t + i * 0.075, { type: 'triangle', freq: mtof(m - 12) * p, v: 0.12, d: last ? 0.8 : 0.12 });
      });
      // cohete: whoosh ascendente + rumor
      var tr = t + 0.25;
      noise(o, tr, { type: 'bandpass', f: 180, to: 3200, glide: 1.1, q: 1.4, v: 0.3, a: 0.2, d: 0.6, s: 0.6, hold: 0.5, r: 0.4 });
      noise(o[0], tr, { type: 'lowpass', f: 160, to: 60, glide: 1.2, v: 0.35, a: 0.1, d: 1.2 });
      return 1.6;
    },
    order_new: function (o, t, p) {
      tone(o, t, { type: 'sine', freq: 880 * p, v: 0.2, d: 0.35 });
      tone(o, t + 0.1, { type: 'sine', freq: 1175 * p, v: 0.2, d: 0.45 });
      tone(o[0], t, { type: 'triangle', freq: 1760 * p, v: 0.04, d: 0.1 });
      return 0.55;
    },
    order_fail: function (o, t, p) {
      // trombón triste: wah wah wah waaaah
      var notes = [55, 54, 53, 52];
      notes.forEach(function (m, i) {
        var last = i === 3;
        var tt = t + i * 0.28;
        tone(o, tt, { type: 'sawtooth', freq: mtof(m) * p, v: 0.16, a: 0.04, d: 0.1, s: 0.8, hold: last ? 0.6 : 0.18, r: 0.12,
          lp: 500, lpTo: 1400, lpTime: 0.15, q: 3, vib: last ? 6 : 0, vibDepth: 40 });
      });
      return 1.6;
    },
    wrong: function (o, t, p) {
      tone(o[0], t, { type: 'square', freq: 140 * p, v: 0.13, a: 0.005, d: 0.05, s: 0.9, hold: 0.28, r: 0.05, lp: 1400 });
      tone(o[0], t, { type: 'square', freq: 147 * p, v: 0.13, a: 0.005, d: 0.05, s: 0.9, hold: 0.28, r: 0.05, lp: 1400 });
      return 0.4;
    },
    coffee: function (o, t, p) {
      // gorgoteo de cafetera: burbujas + vapor
      for (var i = 0; i < 12; i++) {
        var tt = t + i * rnd(0.05, 0.09);
        var f = rnd(220, 500) * p;
        tone(o[0], tt, { type: 'sine', freq: f, to: f * rnd(1.6, 2.6), glide: 0.05, v: rnd(0.1, 0.22), d: 0.06 });
        noise(o[0], tt, { type: 'bandpass', f: rnd(400, 900), q: 5, v: 0.05, d: 0.04 });
      }
      noise(o, t + 0.5, { type: 'highpass', f: 4000, v: 0.08, a: 0.2, d: 0.3, s: 0.6, hold: 0.3, r: 0.4 });
      return 1.3;
    },
    dash: function (o, t, p) {
      noise(o[0], t, { type: 'bandpass', f: 500 * p, to: 2600 * p, glide: 0.15, q: 1.2, v: 0.3, a: 0.02, d: 0.18 });
      return 0.22;
    },
    ui_move: function (o, t, p) {
      tone(o[0], t, { type: 'square', freq: 980 * p, v: 0.06, d: 0.03, lp: 3000 });
      return 0.05;
    },
    ui_select: function (o, t, p) {
      tone(o, t, { type: 'square', freq: 660 * p, v: 0.08, d: 0.06, lp: 3000 });
      tone(o, t + 0.06, { type: 'square', freq: 990 * p, v: 0.08, d: 0.12, lp: 3000 });
      return 0.2;
    },
    ui_back: function (o, t, p) {
      tone(o[0], t, { type: 'square', freq: 660 * p, v: 0.08, d: 0.06, lp: 2500 });
      tone(o[0], t + 0.06, { type: 'square', freq: 440 * p, v: 0.08, d: 0.1, lp: 2500 });
      return 0.18;
    },
    countdown: function (o, t, p) {
      tone(o, t, { type: 'square', freq: 880 * p, v: 0.12, a: 0.003, d: 0.05, s: 0.7, hold: 0.12, r: 0.06, lp: 3000 });
      return 0.25;
    },
    go: function (o, t, p) {
      [76, 79, 84].forEach(function (m) {
        tone(o, t, { type: 'square', freq: mtof(m + 12) * p, v: 0.08, a: 0.005, d: 0.1, s: 0.7, hold: 0.35, r: 0.25, lp: 4000 });
      });
      tone(o[0], t, { type: 'triangle', freq: mtof(60) * p, v: 0.2, d: 0.6 });
      return 0.8;
    },
    timeup: function (o, t, p) {
      // bocina de fin de tiempo
      [0, 0.22].forEach(function (dt, i) {
        [48, 55, 60].forEach(function (m) {
          tone(o, t + dt, { type: 'sawtooth', freq: mtof(m - i * 2) * p, v: 0.09, a: 0.02, d: 0.1, s: 0.9, hold: i ? 0.6 : 0.15, r: 0.15, lp: 1800 });
        });
      });
      return 1.2;
    },
    star: function (o, t, p) {
      var notes = [84, 88, 91, 96, 100];
      notes.forEach(function (m, i) {
        tone(o, t + i * 0.05, { type: 'sine', freq: mtof(m) * p, v: 0.12, d: 0.4 });
        tone(o, t + i * 0.05, { type: 'triangle', freq: mtof(m + 12) * p, v: 0.03, d: 0.15 });
      });
      noise(o, t, { type: 'highpass', f: 8000, v: 0.05, a: 0.05, d: 0.5 });
      return 0.8;
    },
    manager: function (o, t, p) { return blabla(o, t, p); },
    stun: function (o, t, p) {
      tone(o[0], t, { type: 'sine', freq: 900 * p, to: 260 * p, glide: 0.5, v: 0.2, d: 0.55, vib: 12, vibDepth: 120 });
      for (var i = 0; i < 4; i++) {
        tone(o, t + 0.15 + i * 0.13, { type: 'sine', freq: rnd(2200, 3000), to: rnd(3200, 3800), glide: 0.05, v: 0.06, d: 0.06 });
      }
      return 0.8;
    },
    trash: function (o, t, p) {
      for (var i = 0; i < 5; i++) {
        noise(o[0], t + i * rnd(0.03, 0.06), { type: 'bandpass', f: rnd(1500, 5000), q: 1.5, v: rnd(0.1, 0.2), d: rnd(0.02, 0.05) });
      }
      var tt = t + 0.25;
      [380, 1020, 1710].forEach(function (f, k) {
        tone(o, tt, { type: 'sine', freq: f * p, v: 0.12 / (k + 1), d: 0.3 });
      });
      noise(o[0], tt, { type: 'lowpass', f: 600, v: 0.25, d: 0.06 });
      return 0.6;
    },
    review_done: function (o, t, p) {
      noise(o[0], t, { type: 'bandpass', f: 2500, to: 5000, glide: 0.12, q: 0.8, v: 0.12, d: 0.12 });
      tone(o, t + 0.08, { type: 'triangle', freq: mtof(79) * p, v: 0.18, d: 0.2 });
      tone(o, t + 0.16, { type: 'triangle', freq: mtof(84) * p, v: 0.2, d: 0.4 });
      return 0.6;
    },
    blackout: function (o, t, p) {
      // golpe de relé + caída de tensión (zumbido que se hunde) + parpadeo
      noise(o, t, { type: 'lowpass', f: 1200, v: 0.5, d: 0.06 });
      tone(o[0], t, { type: 'sawtooth', freq: 120, to: 22, glide: 1.6, v: 0.28, a: 0.01, d: 1.6, lp: 1500, lpTo: 90, lpTime: 1.5 });
      tone(o[0], t, { type: 'sine', freq: 1400 * p, to: 60, glide: 1.3, v: 0.06, d: 1.3 });
      var buzz = ctx.createOscillator(), bg = ctx.createGain(), bf = ctx.createBiquadFilter();
      buzz.type = 'square'; buzz.frequency.value = 50; bf.type = 'lowpass'; bf.frequency.value = 800;
      buzz.connect(bf); bf.connect(bg); bg.connect(o[0]);
      bg.gain.setValueAtTime(0, t);
      for (var i = 0; i < 10; i++) bg.gain.setValueAtTime(Math.random() < 0.5 ? 0 : rnd(0.04, 0.1), t + 0.05 + i * 0.05);
      bg.gain.setValueAtTime(0, t + 0.6);
      buzz.start(t); buzz.stop(t + 0.65);
      return 1.7;
    },
    conveyor: function (o, t, p) {
      tone(o[0], t, { type: 'sawtooth', freq: 55 * p, v: 0.12, a: 0.03, d: 0.1, s: 0.7, hold: 0.25, r: 0.1, lp: 300 });
      noise(o[0], t, { type: 'bandpass', f: 1800, q: 3, v: 0.12, d: 0.02 });
      noise(o[0], t + 0.18, { type: 'bandpass', f: 1600, q: 3, v: 0.1, d: 0.02 });
      return 0.45;
    }
  };

  // Murmullo de voz con formantes ("bla bla bla... ¿5 minutitos?")
  var VOWELS = [[800, 1200, 2500], [400, 2000, 2550], [450, 800, 2830], [300, 2300, 3000], [350, 700, 2400]];
  function blabla(o, t, p) {
    var n = 5 + ((Math.random() * 4) | 0);
    var src = ctx.createOscillator(); src.type = 'sawtooth';
    var mix = ctx.createGain(); mix.gain.value = 0;
    var f0 = rnd(105, 135) * p;
    var filters = [], gains = [0.9, 0.5, 0.25];
    for (var k = 0; k < 3; k++) {
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = k === 0 ? 6 : 9;
      var fg = ctx.createGain(); fg.gain.value = gains[k] * 3;
      src.connect(bp); bp.connect(fg); fg.connect(mix);
      filters.push(bp);
    }
    connectAll(mix, o);
    var tt = t;
    for (var i = 0; i < n; i++) {
      var d = rnd(0.08, 0.15), gap = rnd(0.02, 0.06);
      var last = i === n - 1;
      var v = pick(VOWELS);
      for (k = 0; k < 3; k++) filters[k].frequency.setTargetAtTime(v[k] * rnd(0.95, 1.05), tt, 0.015);
      var pitch = f0 * (1 - i * 0.025) * rnd(0.94, 1.08);
      src.frequency.setTargetAtTime(pitch, tt, 0.02);
      if (last) { src.frequency.setTargetAtTime(f0 * 1.45, tt + d * 0.4, 0.06); d *= 1.8; }
      mix.gain.setTargetAtTime(0.35, tt, 0.012);
      mix.gain.setTargetAtTime(0.0001, tt + d, 0.02);
      noise(o[0], tt, { type: 'lowpass', f: 600, v: 0.06, d: 0.02 }); // "b"
      tt += d + gap;
    }
    src.start(t); src.stop(tt + 0.2);
    return tt - t;
  }

  var MAXV = { type: 4, fire: 3, warning: 2, ui_move: 3, conveyor: 3, coffee: 2, manager: 2, blackout: 1 };
  var MIN_GAP = { type: 0.025, ui_move: 0.03 };

  function canPlay(name, t) {
    var list = voices[name] || (voices[name] = []);
    var i = 0;
    while (i < list.length) { if (list[i].end < t) list.splice(i, 1); else i++; }
    var max = MAXV[name] || 8;
    if (list.length >= max) return false;
    var gap = MIN_GAP[name];
    if (gap && list.length && t - list[list.length - 1].start < gap) return false;
    return true;
  }

  // ================================================================= MÚSICA
  // Instrumentos melódicos (para voice())
  var INST = {
    rhodes:  { w: [['sine', 1, 0, 1], ['sine', 2, 3, 0.18], ['triangle', 1, -4, 0.15]], a: 0.006, d: 1.2, s: 0.25, r: 0.4, lp: 2400 },
    epiano:  { w: [['sine', 1, 0, 1], ['sine', 3, 0, 0.06]], a: 0.004, d: 0.6, s: 0.2, r: 0.3, lp: 3000 },
    pad:     { w: [['sawtooth', 1, -8, 0.5], ['sawtooth', 1, 8, 0.5]], a: 0.25, d: 0.8, s: 0.7, r: 0.6, lp: 1400 },
    darkpad: { w: [['sawtooth', 1, -10, 0.5], ['sawtooth', 1, 10, 0.5], ['sawtooth', 0.5, 0, 0.3]], a: 0.4, d: 1, s: 0.8, r: 0.8, lp: 900 },
    stab:    { w: [['sawtooth', 1, -6, 0.5], ['square', 1, 6, 0.4]], a: 0.004, d: 0.18, s: 0, r: 0.1, lp: 2600, lpEnv: 2 },
    chip:    { w: [['square', 1, 0, 1]], a: 0.002, d: 0.12, s: 0.35, r: 0.05, lp: 5000 },
    pulse:   { w: [['square', 1, 0, 0.7], ['square', 1, 12, 0.3]], a: 0.002, d: 0.2, s: 0.5, r: 0.06, lp: 3800 },
    tri:     { w: [['triangle', 1, 0, 1]], a: 0.003, d: 0.2, s: 0.6, r: 0.06 },
    lead:    { w: [['sawtooth', 1, -5, 0.5], ['square', 1, 5, 0.4]], a: 0.01, d: 0.2, s: 0.6, r: 0.12, lp: 3200, vib: 5.5, vibD: 12 },
    synlead: { w: [['square', 1, 0, 0.6], ['sawtooth', 2, 4, 0.2]], a: 0.005, d: 0.25, s: 0.5, r: 0.2, lp: 2600, vib: 5, vibD: 10 },
    flute:   { w: [['sine', 1, 0, 1], ['triangle', 2, 0, 0.08]], a: 0.04, d: 0.3, s: 0.8, r: 0.12, vib: 5, vibD: 18 },
    vibes:   { w: [['sine', 1, 0, 1], ['sine', 4, 0, 0.12]], a: 0.003, d: 1.0, s: 0.0, r: 0.3, trem: 5.5 },
    brass:   { w: [['sawtooth', 1, -6, 0.6], ['sawtooth', 1, 6, 0.6]], a: 0.03, d: 0.3, s: 0.8, r: 0.2, lp: 1200, lpEnv: 1.5 },
    // bajos
    sinebass:{ w: [['sine', 1, 0, 1], ['triangle', 1, 0, 0.3]], a: 0.005, d: 0.3, s: 0.7, r: 0.08 },
    chipbass:{ w: [['square', 1, 0, 0.6], ['triangle', 1, 0, 0.6]], a: 0.002, d: 0.15, s: 0.6, r: 0.04, lp: 1400 },
    sawbass: { w: [['sawtooth', 1, 0, 0.8], ['square', 0.5, 0, 0.4]], a: 0.003, d: 0.15, s: 0.5, r: 0.05, lp: 700, lpEnv: 2.5 },
    reese:   { w: [['sawtooth', 1, -14, 0.6], ['sawtooth', 1, 14, 0.6], ['sine', 0.5, 0, 0.7]], a: 0.005, d: 0.2, s: 0.8, r: 0.06, lp: 650, lpEnv: 1.2 },
    upright: { w: [['triangle', 1, 0, 1], ['sine', 2, 0, 0.2]], a: 0.004, d: 0.35, s: 0.15, r: 0.1, lp: 900 }
  };

  function voice(dest, t, freq, dur, inst, vol) {
    var g = ctx.createGain();
    var head = g;
    var fl = null;
    if (inst.lp) {
      fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 0.9;
      if (inst.lpEnv) {
        fl.frequency.setValueAtTime(inst.lp * (1 + inst.lpEnv), t);
        fl.frequency.exponentialRampToValueAtTime(inst.lp, t + 0.15);
      } else fl.frequency.value = inst.lp;
      fl.connect(g); head = fl;
    }
    var end = env(g, t, vol, inst.a, inst.d, inst.s, Math.max(0, dur - inst.a), inst.r);
    var lfo = null, lg;
    if (inst.vib) {
      lfo = ctx.createOscillator(); lg = ctx.createGain();
      lfo.frequency.value = inst.vib; lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(inst.vibD, t + Math.min(0.3, dur));
      lfo.connect(lg);
    }
    for (var i = 0; i < inst.w.length; i++) {
      var w = inst.w[i];
      var osc = ctx.createOscillator(); osc.type = w[0];
      osc.frequency.value = freq * w[1]; osc.detune.value = w[2];
      var og = ctx.createGain(); og.gain.value = w[3];
      osc.connect(og); og.connect(head);
      if (lfo) lg.connect(osc.detune);
      osc.start(t); osc.stop(end + 0.05);
    }
    if (inst.trem) {
      var tl = ctx.createOscillator(), tg = ctx.createGain();
      tl.frequency.value = inst.trem; tg.gain.value = vol * 0.25;
      tl.connect(tg); tg.connect(g.gain); tl.start(t); tl.stop(end + 0.05);
    }
    if (lfo) { lfo.start(t); lfo.stop(end + 0.05); }
    connectAll(g, dest);
  }

  // Batería sintetizada
  function kick(dest, t, v, tight) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.frequency.setValueAtTime(tight ? 180 : 150, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + (tight ? 0.07 : 0.12));
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (tight ? 0.25 : 0.4));
    osc.connect(g); connectAll(g, dest);
    osc.start(t); osc.stop(t + 0.45);
    noise(dest, t, { type: 'highpass', f: 3000, v: v * 0.15, d: 0.008 });
  }
  function snare(dest, t, v, kind) {
    if (kind === 'rim') {
      tone(dest, t, { type: 'square', freq: 1700, v: v * 0.25, d: 0.02, bp: 1800, q: 3 });
      noise(dest, t, { type: 'bandpass', f: 2500, q: 4, v: v * 0.3, d: 0.025 });
      return;
    }
    if (kind === 'clap') {
      for (var i = 0; i < 3; i++) noise(dest, t + i * 0.01, { type: 'bandpass', f: 1400, q: 1.5, v: v * 0.5, d: i === 2 ? 0.15 : 0.01 });
      return;
    }
    var lofi = kind === 'lofi';
    tone(dest, t, { type: 'triangle', freq: 190, to: 140, glide: 0.08, v: v * 0.45, d: 0.1 });
    noise(dest, t, { type: lofi ? 'bandpass' : 'highpass', f: lofi ? 2200 : 1500, q: lofi ? 0.7 : 0.5, v: v * 0.55, d: kind === 'gated' ? 0.22 : 0.16 });
  }
  function hat(dest, t, v, open) {
    noise(dest, t, { type: 'highpass', f: open ? 6500 : 8000, q: 0.6, v: v, d: open ? 0.22 : 0.035 });
  }
  function shaker(dest, t, v) {
    noise(dest, t, { type: 'bandpass', f: 6000, q: 1.2, v: v, a: 0.012, d: 0.05 });
  }

  // ---------------------------------------------------------------- pistas
  // Patrones: 'x' = golpe, 'o' = suave, '.' = silencio. Longitud 16 o 32 (pasos de semicorchea).
  // Bajo: '1' raíz, '3' tercera del acorde, '5' quinta, '8' octava, '.' silencio.
  var TRACKS = {
    menu: { // lo-fi chill con acordes jazz
      bpm: 76, swing: 0.2, lowpass: 2600, verb: 0.35, vol: 1, crackle: true, seed: 11,
      chords: [[50, 53, 57, 60, 64], [55, 59, 64, 65, 69], [48, 52, 55, 59, 62], [45, 49, 55, 58, 64]], // Dm9 G13 Cmaj9 A7(b13)
      key: 62, scale: [0, 2, 3, 5, 7, 9, 10],
      kick: 'x.........x..o..', snare: '....x.......x...', snareKind: 'lofi',
      hat: '..x...x...x...xo', hatVol: 0.08,
      bass: '1.........5..1..', bassInst: 'sinebass', bassVol: 0.32,
      chord: 'x.......o.....x.', chordInst: 'rhodes', chordVol: 0.07, chordGate: 1,
      lead: { inst: 'epiano', vol: 0.1, oct: 74, rhythms: ['x.....x...x.....', '....x...x.....x.', 'x...............', '..x...x.x.......'], delay: 0.35 },
      arpInst: 'epiano', arpVol: 0.05, arpRate: 2
    },
    garage: { // indie chiptune alegre
      bpm: 124, swing: 0, lowpass: 9000, verb: 0.15, vol: 0.9, seed: 23,
      chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], // C G Am F
      key: 60, scale: [0, 2, 4, 5, 7, 9, 11],
      kick: 'x.....x.x.......', snare: '....x.......x...', snareKind: 'normal',
      hat: 'x.x.x.x.x.x.x.x.', hatVol: 0.07,
      bass: '1.1.8.1.5.1.8.5.', bassInst: 'chipbass', bassVol: 0.22,
      chord: '..x...x...x...x.', chordInst: 'chip', chordVol: 0.045, chordGate: 0.4,
      lead: { inst: 'pulse', vol: 0.07, oct: 72, rhythms: ['x.x.x...x.x.x...', 'x...x.x.x...x...', 'x.xxx...x...x.x.', 'x.......x.x.x.x.'], delay: 0.2 },
      arpInst: 'chip', arpVol: 0.035, arpRate: 1
    },
    openspace: { // synth-pop animado
      bpm: 116, swing: 0, lowpass: 12000, verb: 0.25, vol: 0.85, seed: 37,
      chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], // Am F C G
      key: 57, scale: [0, 2, 3, 5, 7, 8, 10],
      kick: 'x...x...x...x...', snare: '....x.......x...', snareKind: 'clap',
      hat: '..x...x...x...x.', hatOpen: true, hatVol: 0.06,
      bass: '.8.8.8.8.8.8.8.8', bassBase: true, bassInst: 'sawbass', bassVol: 0.2,
      chord: 'x...............', chordInst: 'pad', chordVol: 0.05, chordGate: 1,
      lead: { inst: 'synlead', vol: 0.07, oct: 72, rhythms: ['x..x..x.x.......', 'x.x.x..x..x.x...', '..x..x..x...x...', 'x.....x.x..x....'], delay: 0.3 },
      arpInst: 'chip', arpVol: 0.03, arpRate: 1
    },
    consulting: { // bossa nova / música de ascensor irónica
      bpm: 104, swing: 0.05, lowpass: 5000, verb: 0.4, vol: 0.9, seed: 41,
      chords: [[48, 52, 55, 59], [50, 53, 57, 60], [52, 55, 59, 62], [45, 49, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [48, 52, 55, 57]],
      key: 60, scale: [0, 2, 4, 5, 7, 9, 11],
      kick: 'x......xx......x', kickVol: 0.5, snare: 'x..x..x...x..x..', snareKind: 'rim',
      hat: 'xxxxxxxxxxxxxxxx', shaker: true, hatVol: 0.035,
      bass: '1..5.5..1..5.5..', bassInst: 'upright', bassVol: 0.3,
      chord: 'x..x..x...x..x..', chordInst: 'vibes', chordVol: 0.045, chordGate: 0.7,
      lead: { inst: 'flute', vol: 0.08, oct: 76, rhythms: ['x.......x...x...', 'x.x.x...........', '....x...x.x.x...', 'x...............'], delay: 0.2 },
      arpInst: 'vibes', arpVol: 0.04, arpRate: 2
    },
    datacenter: { // synthwave oscuro
      bpm: 98, swing: 0, lowpass: 4200, verb: 0.45, vol: 0.9, seed: 53,
      chords: [[45, 48, 52], [41, 45, 48], [38, 41, 45], [40, 44, 47]], // Am F Dm E
      key: 57, scale: [0, 2, 3, 5, 7, 8, 11],
      kick: 'x.......x.......', snare: '....x.......x...', snareKind: 'gated',
      hat: '..x...x...x...x.', hatVol: 0.05,
      bass: '1111111111111111', bassBase: true, bassInst: 'sawbass', bassVol: 0.13, bassGate: 0.6,
      chord: 'x...............', chordInst: 'darkpad', chordVol: 0.06, chordGate: 1, chordUp: 12,
      lead: { inst: 'lead', vol: 0.06, oct: 69, rhythms: ['x.......x...x...', 'x...........x...', 'x.....x.....x...', 'x...............'], delay: 0.45 },
      arpInst: 'pulse', arpVol: 0.035, arpRate: 1
    },
    deploy: { // drum&bass / chiptune frenético
      bpm: 172, swing: 0, lowpass: 10000, verb: 0.2, vol: 0.85, seed: 67, kickTight: true,
      chords: [[52, 55, 59], [48, 52, 55], [50, 54, 57], [47, 50, 54]], // Em C D Bm
      key: 64, scale: [0, 2, 3, 5, 7, 8, 10],
      kick: 'x.........x.....x.x.......x.....', snare: '....x.......x.......x..o....x..o', snareKind: 'normal',
      hat: 'x.xxx.xxx.xxx.xx', hatVol: 0.05,
      bass: '1.....1...1.....', bassInst: 'reese', bassVol: 0.22,
      chord: 'x.......x.......', chordInst: 'stab', chordVol: 0.04, chordGate: 0.3,
      lead: { inst: 'chip', vol: 0.06, oct: 76, rhythms: ['x.x.x.x.x.x.x.x.', 'xx.xx.x.x.xx.x..', 'x...x.x.x...x.x.', 'x.x.x.xxx.x.x...'], delay: 0.15 },
      arpInst: 'chip', arpVol: 0.03, arpRate: 1
    },
    results: { // fanfarria corta + loop tranquilo
      bpm: 88, swing: 0.12, lowpass: 6000, verb: 0.4, vol: 0.9, seed: 79,
      intro: {
        steps: 32, inst: 'brass', vol: 0.07,
        events: [[0, [67], 2], [2, [67], 2], [4, [67], 2], [6, [72, 64], 6], [12, [70, 65], 2], [14, [72, 67], 2], [16, [76, 72, 67, 60], 14]],
        drums: [[0, 'k'], [6, 'k'], [6, 's'], [12, 's'], [14, 's'], [16, 'k'], [16, 'c']]
      },
      chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 48, 50, 53]], // Cmaj7 Am7 Fmaj7 G7sus
      key: 60, scale: [0, 2, 4, 7, 9],
      kick: 'x.......x.......', kickVol: 0.5, snare: '....x.......x...', snareKind: 'rim',
      hat: '..x...x...x...x.', hatVol: 0.04,
      bass: '1.......5.......', bassInst: 'sinebass', bassVol: 0.28,
      chord: 'x.......x.......', chordInst: 'rhodes', chordVol: 0.06, chordGate: 1, chordUp: 12,
      lead: { inst: 'vibes', vol: 0.08, oct: 76, rhythms: ['x.....x.........', '....x...x.......', 'x...x...x.......', '................'], delay: 0.35 },
      arpInst: 'vibes', arpVol: 0.03, arpRate: 2
    }
  };

  function patVal(pat, i) {
    if (!pat) return 0;
    var c = pat.charAt(i % pat.length);
    return c === 'x' ? 1 : c === 'o' ? 0.5 : 0;
  }

  // Precalcula duraciones de patrón (pasos hasta el siguiente golpe).
  function gaps(pat) {
    var n = pat.length, out = [];
    for (var i = 0; i < n; i++) {
      var g = 1;
      while (g < n && !/[x1358o]/.test(pat.charAt((i + g) % n))) g++;
      out.push(g);
    }
    return out;
  }

  function bassRoot(m) { while (m >= 48) m -= 12; while (m < 36) m += 12; return m; }

  function nearestScale(def, target) {
    var best = target, bd = 99;
    for (var o = -2; o <= 2; o++) {
      for (var i = 0; i < def.scale.length; i++) {
        var m = def.key + def.scale[i] + o * 12;
        var d = Math.abs(m - target);
        if (d < bd) { bd = d; best = m; }
      }
    }
    return best;
  }
  function scaleStep(def, m, steps) {
    var notes = [];
    for (var o = -2; o <= 3; o++) for (var i = 0; i < def.scale.length; i++) notes.push(def.key - 12 + def.scale[i] + o * 12);
    notes.sort(function (a, b) { return a - b; });
    var idx = notes.indexOf(nearestScale(def, m));
    if (idx < 0) idx = 0;
    return notes[clamp(idx + steps, 0, notes.length - 1)];
  }

  // Genera la melodía (2 vueltas de la progresión, AA') de forma determinista.
  function genMelody(def) {
    var rng = makeRng(def.seed || 7);
    var L = def.chords.length, bars = L * 2, mel = [];
    var prev = def.lead.oct;
    for (var b = 0; b < bars; b++) {
      if (b >= L && b < bars - 2) { mel.push(mel[b - L]); continue; }
      var chord = def.chords[b % L];
      var rh = def.lead.rhythms[(rng() * def.lead.rhythms.length) | 0];
      if (b === bars - 1) rh = 'x.......x.......';
      var bar = [];
      for (var s = 0; s < 16; s++) {
        if (rh.charAt(s) !== 'x') { bar.push(null); continue; }
        var note;
        if (s % 4 === 0 || rng() < 0.3) {
          // nota del acorde cercana a la anterior
          var best = null, bd = 99;
          for (var k = 0; k < chord.length; k++) {
            for (var o = -1; o <= 2; o++) {
              var m = chord[k] + o * 12;
              while (m < def.lead.oct - 7) m += 12;
              var d = Math.abs(m - prev) + rng() * 4;
              if (d < bd && m <= def.lead.oct + 12) { bd = d; best = m; }
            }
          }
          note = best == null ? prev : best;
        } else {
          var stp = [-2, -1, -1, 1, 1, 2][(rng() * 6) | 0];
          note = scaleStep(def, prev, stp);
        }
        note = clamp(note, def.lead.oct - 8, def.lead.oct + 12);
        prev = note;
        bar.push(note);
      }
      var gp = gaps(rh);
      mel.push({ notes: bar, gaps: gp });
    }
    return mel;
  }

  function makeTrack(name) {
    var def = TRACKS[name];
    var t0 = ctx.currentTime + 0.08;
    var tr = {
      name: name, def: def, step: 0, nextTime: t0, endAt: 0, fading: false,
      melody: genMelody(def),
      bassGaps: gaps(def.bass), chordGaps: gaps(def.chord),
      introSteps: def.intro ? def.intro.steps : 0,
      arpIdx: 0
    };
    tr.input = ctx.createGain();
    tr.fade = ctx.createGain();
    tr.filter = ctx.createBiquadFilter(); tr.filter.type = 'lowpass';
    tr.filter.frequency.value = def.lowpass || 16000; tr.filter.Q.value = 0.5;
    tr.input.connect(tr.filter); tr.filter.connect(tr.fade); tr.fade.connect(musicBus);
    tr.verbSend = ctx.createGain(); tr.verbSend.gain.value = def.verb || 0.2;
    tr.fade.connect(tr.verbSend); tr.verbSend.connect(musicVerb);
    // delay con realimentación para la melodía
    tr.delay = ctx.createDelay(1.5);
    var stepDur = 60 / def.bpm / 4;
    tr.delay.delayTime.value = Math.min(1.4, stepDur * 3);
    tr.fb = ctx.createGain(); tr.fb.gain.value = 0.32;
    tr.delayIn = ctx.createGain(); tr.delayIn.gain.value = def.lead.delay || 0.25;
    var dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2500;
    tr.delayIn.connect(tr.delay); tr.delay.connect(dlp); dlp.connect(tr.fb); tr.fb.connect(tr.delay);
    dlp.connect(tr.input);
    tr.fade.gain.setValueAtTime(0.0001, ctx.currentTime);
    tr.fade.gain.linearRampToValueAtTime(def.vol || 1, ctx.currentTime + 1.2);
    return tr;
  }

  function fadeOutTrack(tr, secs) {
    if (tr.fading) return;
    tr.fading = true;
    var t = ctx.currentTime;
    var g = tr.fade.gain;
    try { g.cancelScheduledValues(t); } catch (e) {}
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.0001, t + secs);
    tr.endAt = t + secs + 0.1;
  }

  function killTrack(tr) {
    try { tr.fade.disconnect(); } catch (e) {}
    try { tr.verbSend.disconnect(); } catch (e) {}
    try { tr.fb.gain.value = 0; tr.delay.disconnect(); } catch (e) {}
  }

  function stepDur(tr) {
    return 60 / (tr.def.bpm * (1 + 0.1 * smoothInt)) / 4;
  }

  function scheduleStep(tr, time) {
    var def = tr.def, dur = stepDur(tr);
    var s = tr.step++;
    var dry = tr.input;

    // Intro (fanfarria de resultados)
    if (s < tr.introSteps) {
      var it = def.intro;
      for (var i = 0; i < it.events.length; i++) {
        var ev = it.events[i];
        if (ev[0] !== s) continue;
        for (var j = 0; j < ev[1].length; j++) voice(dry, time, mtof(ev[1][j]), ev[2] * dur * 0.9, INST[it.inst], it.vol);
        voice(dry, time, mtof(ev[1][ev[1].length - 1] - 24), ev[2] * dur * 0.9, INST.sinebass, 0.18);
      }
      for (i = 0; i < it.drums.length; i++) {
        var dv = it.drums[i];
        if (dv[0] !== s) continue;
        if (dv[1] === 'k') kick(dry, time, 0.8);
        else if (dv[1] === 's') snare(dry, time, 0.6, 'normal');
        else hat(dry, time, 0.12, true);
      }
      return;
    }

    var ls = s - tr.introSteps;
    var bar = Math.floor(ls / 16), st = ls % 16;
    var L = def.chords.length;
    var chord = def.chords[bar % L];
    if (def.swing && (st % 2 === 1)) time += def.swing * dur;
    var I = smoothInt;

    // Batería
    var kv = patVal(def.kick, ls);
    if (kv) kick(dry, time, (def.kickVol || 0.85) * kv, def.kickTight);
    var sv = patVal(def.snare, ls);
    if (sv) snare(dry, time, 0.55 * sv, def.snareKind);
    var hv = patVal(def.hat, ls);
    var hvol = def.hatVol || 0.06;
    if (hv) {
      if (def.shaker) shaker(dry, time, hvol * (st % 4 === 2 ? 1.4 : 0.8));
      else hat(dry, time, hvol * hv * (0.8 + Math.random() * 0.4), def.hatOpen && st % 4 === 2);
    } else if (I > 0.55) {
      // capa: hats dobles
      hat(dry, time, hvol * 0.55 * clamp((I - 0.55) * 3, 0, 1), false);
    }
    if (I > 0.85 && def.bpm > 100 && st === 14 && bar % 2 === 1) snare(dry, time, 0.3, def.snareKind === 'rim' ? 'rim' : 'normal');
    if (def.crackle && Math.random() < 0.35) {
      noise(dry, time + Math.random() * dur, { type: 'highpass', f: 3000, v: rnd(0.01, 0.04), d: 0.004 });
    }

    // Bajo
    var bc = def.bass.charAt(ls % def.bass.length);
    if (bc !== '.') {
      var root = bassRoot(chord[0]);
      var note = root;
      if (bc === '3') note = root + (chord[1] - chord[0]);
      else if (bc === '5') note = root + (chord[2] - chord[0]);
      else if (bc === '8') note = root + 12;
      var bl = tr.bassGaps[ls % def.bass.length];
      voice(dry, time, mtof(note), Math.min(bl, 6) * dur * (def.bassGate || 0.85), INST[def.bassInst], def.bassVol || 0.25);
    }

    // Acordes
    var cv = patVal(def.chord, ls);
    if (cv) {
      var cl = Math.min(tr.chordGaps[ls % def.chord.length], 16) * dur * (def.chordGate || 0.8);
      var up = def.chordUp || 0;
      for (var c = 0; c < chord.length; c++) {
        var cm = chord[c] + up;
        if (cm < 48) cm += 12;
        voice(dry, time + c * 0.004, mtof(cm), cl, INST[def.chordInst], (def.chordVol || 0.05) * cv);
      }
    }

    // Melodía
    var mb = tr.melody[bar % tr.melody.length];
    var mn = mb.notes[st];
    if (mn != null) {
      var ml = Math.min(mb.gaps[st], 8) * dur * 0.85;
      voice([dry, tr.delayIn], time, mtof(mn), ml, INST[def.lead.inst], def.lead.vol);
    }

    // Capa: arpegio
    if (I > 0.4 && ls % (def.arpRate || 1) === 0) {
      var sorted = chord.slice().sort(function (a, b) { return a - b; });
      var an = sorted[tr.arpIdx % sorted.length] + 12 + (Math.floor(tr.arpIdx / sorted.length) % 2) * 12;
      while (an < 60) an += 12;
      tr.arpIdx++;
      voice([dry, tr.delayIn], time, mtof(an), dur * 0.8 * (def.arpRate || 1), INST[def.arpInst], (def.arpVol || 0.03) * clamp((I - 0.4) * 2.5, 0, 1));
    }
  }

  function tick() {
    timer = null;
    try {
      if (!ctx) return;
      // suaviza la intensidad
      smoothInt += (intensity - smoothInt) * 0.08;
      if (Math.abs(intensity - smoothInt) < 0.002) smoothInt = intensity;
      var t = ctx.currentTime;
      var look = (typeof document !== 'undefined' && document.hidden) ? 1.2 : 0.15;
      for (var i = tracks.length - 1; i >= 0; i--) {
        var tr = tracks[i];
        if (tr.fading && t > tr.endAt) { killTrack(tr); tracks.splice(i, 1); continue; }
        if (tr.nextTime < t - 0.25) tr.nextTime = t + 0.03; // nos quedamos atrás: re-sincronizar
        var guard = 0;
        while (tr.nextTime < t + look && guard++ < 64) {
          if (!tr.fading || tr.nextTime < tr.endAt) scheduleStep(tr, tr.nextTime);
          tr.nextTime += stepDur(tr);
        }
      }
    } catch (e) { /* nunca propagar */ }
    if (tracks.length) timer = setTimeout(tick, 25);
  }

  function ensureTimer() { if (!timer && tracks.length) timer = setTimeout(tick, 0); }

  function currentTrack() {
    for (var i = tracks.length - 1; i >= 0; i--) if (!tracks[i].fading) return tracks[i];
    return null;
  }

  // ================================================================= API
  function init() {
    try {
      if (!AC) return;
      if (!ctx) build();
      if (ctx.state === 'suspended' && ctx.resume) {
        var pr = ctx.resume();
        if (pr && pr.catch) pr.catch(function () {});
      }
      if (pendingTrack) { var p = pendingTrack; pendingTrack = null; startMusic(p); }
    } catch (e) { /* no-op */ }
  }

  function play(name, opts) {
    try {
      if (!ctx || !SFX.hasOwnProperty(name)) return;
      if (ctx.state === 'suspended') init();
      opts = opts || {};
      var t = ctx.currentTime + 0.005;
      if (!canPlay(name, t)) return;
      var vol = opts.volume == null ? 1 : clamp(+opts.volume || 0, 0, 2);
      var pitch = (opts.pitch || 1) * (1 + (Math.random() - 0.5) * (name === 'type' ? 0.16 : 0.06));
      var out = ctx.createGain(); out.gain.value = vol;
      var last = out;
      if (hasPanner && opts.pan) {
        var pn = ctx.createStereoPanner(); pn.pan.value = clamp(+opts.pan || 0, -1, 1);
        out.connect(pn); last = pn;
      }
      last.connect(sfxBus);
      var send = ctx.createGain(); send.gain.value = 1;
      out.connect(send); send.connect(sfxVerbSend);
      var d = SFX[name]([out, send], t, pitch) || 0.3;
      voices[name].push({ start: t, end: t + d });
      setTimeout(function () { try { out.disconnect(); send.disconnect(); } catch (e) {} }, (d + 2) * 1000);
    } catch (e) { /* no-op */ }
  }

  function startMusic(track) {
    try {
      if (!TRACKS.hasOwnProperty(track)) return;
      if (!ctx) { pendingTrack = track; return; }
      var cur = currentTrack();
      if (cur && cur.name === track) return;
      for (var i = 0; i < tracks.length; i++) fadeOutTrack(tracks[i], 1.2);
      tracks.push(makeTrack(track));
      ensureTimer();
    } catch (e) { /* no-op */ }
  }

  function stopMusic() {
    try {
      pendingTrack = null;
      if (!ctx) return;
      for (var i = 0; i < tracks.length; i++) fadeOutTrack(tracks[i], 1.0);
      ensureTimer();
    } catch (e) { /* no-op */ }
  }

  function setIntensity(v) {
    try { intensity = clamp(+v || 0, 0, 1); } catch (e) { /* no-op */ }
  }

  function setVolume(music, sfx) {
    try {
      if (music != null && isFinite(+music)) musicVol = clamp(+music, 0, 1);
      if (sfx != null && isFinite(+sfx)) sfxVol = clamp(+sfx, 0, 1);
      if (!ctx) return;
      var t = ctx.currentTime;
      musicBus.gain.setTargetAtTime(musicVol * 0.55, t, 0.05);
      sfxBus.gain.setTargetAtTime(sfxVol, t, 0.05);
    } catch (e) { /* no-op */ }
  }

  function mute(b) {
    try {
      muted = b === undefined ? !muted : !!b;
      if (!ctx) return;
      master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.04);
    } catch (e) { /* no-op */ }
  }

  OW.Audio = {
    init: init,
    play: play,
    startMusic: startMusic,
    stopMusic: stopMusic,
    setIntensity: setIntensity,
    setVolume: setVolume,
    mute: mute
  };

  // Desbloqueo automático en el primer gesto del usuario (política de autoplay).
  try {
    var unlock = function () {
      init();
      if (ctx && ctx.state === 'running') {
        ['pointerdown', 'keydown', 'touchstart', 'mousedown'].forEach(function (ev) {
          window.removeEventListener(ev, unlock, true);
        });
      }
    };
    ['pointerdown', 'keydown', 'touchstart', 'mousedown'].forEach(function (ev) {
      window.addEventListener(ev, unlock, true);
    });
  } catch (e) { /* no-op */ }
})();
