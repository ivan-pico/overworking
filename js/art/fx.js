/* OVERWORKING — js/art/fx.js (agente ART)
 * OW.FX: sistema de partículas con pool fijo (sin GC por frame).
 * OW.Art.drawFire: llamas en capas con glow aditivo (sin estado).
 * spawn(type, x, y, opts) — opts comunes: count, color, colors[], size, speed, life,
 *   vx, vy, dir:{x,y}|angle, spread (rad), text, gravity. */
window.OW = window.OW || {};
(function (OW) {
  'use strict';
  var A = OW.Art = OW.Art || {};
  var FX = OW.FX = OW.FX || {};
  var PI = Math.PI, TAU = PI * 2;
  var MAX = 1500;
  var pool = [], active = [], inited = false;
  var GLYPHS = ['{', '}', ';', '</>', '()', '=>', '[]', '01', '#', 'fn', '&&', '++', '!=', '$', '//', '<>', '::'];
  var CONFETTI = ['#ff4f6d', '#ffd23f', '#3ddc84', '#4da3ff', '#a66cff', '#ff9a3c', '#21c7c1'];

  function P() { this.on = false; }
  function init() {
    if (inited) return; inited = true;
    for (var i = 0; i < MAX; i++) pool.push(new P());
  }
  FX._init = init;

  function get() {
    if (!inited) init();
    var p = pool.pop();
    if (!p) { p = active.shift(); if (!p) return null; }
    p.on = true; active.push(p);
    return p;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function setP(p, type, x, y, vx, vy, life, size, color) {
    p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life;
    p.size = size; p.color = color; p.rot = Math.random() * TAU; p.vr = 0; p.g = 0; p.drag = 0;
    p.text = null; p.seed = Math.random() * 100; p.grow = 0;
    return p;
  }

  function baseAngle(o) {
    if (o.dir != null) {
      if (typeof o.dir === 'number') return o.dir;
      if (typeof o.dir === 'object') return Math.atan2(A.num(o.dir.y, 0), A.num(o.dir.x, 1));
    }
    if (o.angle != null) return o.angle;
    return null;
  }

  FX.spawn = function (type, x, y, opts) {
    var o = opts || {}; x = A.num(x, 0); y = A.num(y, 0);
    var n, i, p, a, s, base = baseAngle(o), spread = A.num(o.spread, PI * 2);
    var sp = A.num(o.speed, 1), lf = A.num(o.life, 1), sz = A.num(o.size, 1);
    switch (type) {
      case 'sparks':
        n = A.num(o.count, 14);
        for (i = 0; i < n; i++) {
          p = get(); if (!p) return;
          a = base == null ? Math.random() * TAU : base + (Math.random() - 0.5) * spread;
          s = rnd(90, 260) * sp;
          setP(p, 'sparks', x, y, Math.cos(a) * s, Math.sin(a) * s - 40, rnd(0.3, 0.7) * lf, rnd(1.2, 2.6) * sz, o.color || (Math.random() < 0.5 ? '#ffd23f' : '#ff8a1f'));
          p.g = 380; p.drag = 2.5;
        }
        break;
      case 'smoke':
        n = A.num(o.count, 6);
        for (i = 0; i < n; i++) {
          p = get(); if (!p) return;
          setP(p, 'smoke', x + rnd(-8, 8), y + rnd(-4, 4), rnd(-10, 10), rnd(-45, -25) * sp, rnd(1.2, 2.2) * lf, rnd(8, 14) * sz, o.color || '#4a4450');
          p.grow = 16 * sz; p.drag = 0.6; p.vr = rnd(-1, 1);
        }
        break;
      case 'confetti':
        n = A.num(o.count, 50);
        for (i = 0; i < n; i++) {
          p = get(); if (!p) return;
          a = base == null ? -PI / 2 + (Math.random() - 0.5) * 1.8 : base + (Math.random() - 0.5) * spread;
          s = rnd(160, 420) * sp;
          var cols = o.colors || CONFETTI;
          setP(p, 'confetti', x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(1.6, 2.8) * lf, rnd(3, 6) * sz, o.color || cols[(Math.random() * cols.length) | 0]);
          p.g = 420; p.drag = 2.2; p.vr = rnd(-12, 12);
        }
        break;
      case 'glyphs':
        n = A.num(o.count, 3);
        for (i = 0; i < n; i++) {
          p = get(); if (!p) return;
          setP(p, 'glyphs', x + rnd(-14, 14), y + rnd(-6, 6), rnd(-18, 18), rnd(-60, -35) * sp, rnd(0.8, 1.3) * lf, rnd(10, 15) * sz,
            o.color || (A.LANES[o.lane] ? A.LANES[o.lane].color : ['#8be9fd', '#50fa7b', '#ff79c6', '#f1fa8c', '#bd93f9'][(Math.random() * 5) | 0]));
          p.text = o.text || GLYPHS[(Math.random() * GLYPHS.length) | 0]; p.drag = 1.2; p.vr = rnd(-1.5, 1.5);
        }
        break;
      case 'steam':
        n = A.num(o.count, 3);
        for (i = 0; i < n; i++) {
          p = get(); if (!p) return;
          setP(p, 'steam', x + rnd(-4, 4), y, rnd(-6, 6), rnd(-40, -25) * sp, rnd(0.9, 1.5) * lf, rnd(4, 7) * sz, o.color || '#ffffff');
          p.grow = 12 * sz; p.drag = 0.8;
        }
        break;
      case 'coins':
        n = A.num(o.count, 10);
        for (i = 0; i < n; i++) {
          p = get(); if (!p) return;
          a = base == null ? -PI / 2 + (Math.random() - 0.5) * 2.0 : base + (Math.random() - 0.5) * spread;
          s = rnd(150, 330) * sp;
          setP(p, 'coins', x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.9, 1.4) * lf, rnd(5, 7) * sz, '#ffd23f');
          p.g = 600; p.drag = 1.2; p.vr = rnd(8, 16);
        }
        break;
      case 'foam':
        n = A.num(o.count, 10);
        for (i = 0; i < n; i++) {
          p = get(); if (!p) return;
          a = base == null ? Math.random() * TAU : base + (Math.random() - 0.5) * A.num(o.spread, 0.6);
          s = rnd(120, 260) * sp;
          setP(p, 'foam', x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.5, 0.9) * lf, rnd(3, 6) * sz, o.color || '#f4fbff');
          p.grow = 10 * sz; p.drag = 4;
        }
        break;
      case 'zzz':
        n = A.num(o.count, 1);
        for (i = 0; i < n; i++) {
          p = get(); if (!p) return;
          setP(p, 'zzz', x + rnd(-3, 3), y, rnd(10, 20), rnd(-30, -20) * sp, rnd(1.4, 2) * lf, rnd(9, 12) * sz, o.color || '#cfe0ff');
          p.text = o.text || 'z'; p.grow = 10;
        }
        break;
      case 'dust':
        n = A.num(o.count, 5);
        for (i = 0; i < n; i++) {
          p = get(); if (!p) return;
          a = base == null ? Math.random() * TAU : base + (Math.random() - 0.5) * A.num(o.spread, 1.2);
          s = rnd(20, 60) * sp;
          setP(p, 'dust', x + rnd(-4, 4), y + rnd(-2, 2), Math.cos(a) * s, Math.sin(a) * s * 0.5 - 8, rnd(0.35, 0.6) * lf, rnd(3, 5) * sz, o.color || '#d8cbb8');
          p.grow = 6 * sz; p.drag = 3;
        }
        break;
      case 'text':
        p = get(); if (!p) return;
        setP(p, 'text', x, y, A.num(o.vx, 0), A.num(o.vy, -38), A.num(o.life, 1.3), A.num(o.size, 20), o.color || '#ffffff');
        p.text = String(o.text == null ? '' : o.text); p.outline = o.outline || '#1d1530';
        break;
      default:
        p = get(); if (!p) return;
        setP(p, 'sparks', x, y, rnd(-80, 80), rnd(-120, -40), 0.5, 2, o.color || '#fff'); p.g = 300;
    }
  };

  FX.update = function (dt) {
    dt = A.num(dt, 0.016); if (dt > 0.1) dt = 0.1;
    for (var i = active.length - 1; i >= 0; i--) {
      var p = active[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.on = false; active[i] = active[active.length - 1]; active.pop(); pool.push(p);
        continue;
      }
      if (p.drag) { var d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.type === 'steam' || p.type === 'zzz') p.x += Math.sin(p.life * 5 + p.seed) * 12 * dt;
      if (p.type === 'confetti') { p.vx += Math.sin(p.life * 8 + p.seed) * 60 * dt; if (p.vy > 70) p.vy = 70; }
    }
  };

  FX.count = function () { return active.length; };

  FX.draw = function (ctx) {
    if (!active.length) return;
    var smokeB = A.blob('#3a3438'), steamB = A.blob('#ffffff'), foamB = A.blob('#f4fbff'), dustB = A.blob('#d8cbb8');
    ctx.save();
    var m0 = ctx.getTransform ? ctx.getTransform() : null;
    // pasada normal
    for (var i = 0; i < active.length; i++) {
      var p = active[i], k = p.life / p.max, age = 1 - k, r, s;
      switch (p.type) {
        case 'smoke':
          r = p.size + p.grow * age;
          ctx.globalAlpha = Math.min(1, age * 6) * k * 0.6;
          ctx.drawImage(p.color === '#4a4450' ? smokeB : A.blob(p.color), p.x - r, p.y - r, r * 2, r * 2);
          break;
        case 'steam':
          r = p.size + p.grow * age;
          ctx.globalAlpha = Math.min(1, age * 5) * k * 0.45;
          ctx.drawImage(steamB, p.x - r, p.y - r, r * 2, r * 2);
          break;
        case 'foam':
          r = p.size + p.grow * age;
          ctx.globalAlpha = Math.min(1, k * 2.5) * 0.95;
          ctx.drawImage(foamB, p.x - r, p.y - r, r * 2, r * 2);
          ctx.globalAlpha *= 0.8; ctx.fillStyle = '#ffffff';
          A.circle(ctx, p.x - r * 0.2, p.y - r * 0.2, r * 0.35); ctx.fill();
          break;
        case 'dust':
          r = p.size + p.grow * age;
          ctx.globalAlpha = k * 0.55;
          ctx.drawImage(dustB, p.x - r, p.y - r, r * 2, r * 2);
          break;
        case 'confetti':
          ctx.globalAlpha = Math.min(1, k * 3);
          if (!m0) { ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size * 0.3, p.size, p.size * 0.6); break; }
          var cr = Math.cos(p.rot), sr = Math.sin(p.rot), fl = Math.abs(Math.cos(p.rot * 1.3)) + 0.15;
          ctx.setTransform(m0.a * cr + m0.c * sr, m0.b * cr + m0.d * sr, (m0.a * -sr + m0.c * cr) * fl, (m0.b * -sr + m0.d * cr) * fl,
            m0.a * p.x + m0.c * p.y + m0.e, m0.b * p.x + m0.d * p.y + m0.f);
          ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
          ctx.setTransform(m0);
          break;
        case 'coins':
          ctx.globalAlpha = Math.min(1, k * 3);
          s = Math.abs(Math.cos(p.rot)); r = p.size;
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(Math.max(0.15, s), 1);
          A.circle(ctx, 0, 0, r); ctx.fillStyle = '#b8860b'; ctx.fill();
          A.circle(ctx, 0, -0.5, r * 0.85); ctx.fillStyle = s > 0.5 ? '#ffd23f' : '#f2b600'; ctx.fill();
          ctx.fillStyle = '#b8860b'; ctx.font = 'bold ' + (r * 1.2) + 'px ' + A.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (s > 0.4) ctx.fillText('$', 0, 0);
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; A.circle(ctx, -r * 0.35, -r * 0.4, r * 0.22); ctx.fill();
          ctx.restore();
          break;
        case 'glyphs':
          ctx.globalAlpha = Math.min(1, age * 6) * Math.min(1, k * 2);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * 0.2);
          ctx.font = 'bold ' + p.size + 'px ' + A.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(15,10,35,0.8)'; ctx.strokeText(p.text, 0, 0);
          ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
          ctx.restore();
          break;
        case 'zzz':
          ctx.globalAlpha = Math.sin(age * PI);
          A.drawText(ctx, p.text, p.x, p.y, { size: p.size + p.grow * age, color: p.color, outline: '#2a2250', outlineWidth: 3, shadow: false });
          break;
        case 'text':
          var e = age < 0.18 ? A.easeOutBack(age / 0.18) : 1, sc = 0.4 + 0.6 * e;
          ctx.globalAlpha = k < 0.3 ? k / 0.3 : 1;
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(sc, sc);
          A.drawText(ctx, p.text, 0, 0, { size: p.size, color: p.color, outline: p.outline, outlineWidth: Math.max(3, p.size * 0.22) });
          ctx.restore();
          break;
      }
    }
    // pasada aditiva (chispas)
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (var j = 0; j < active.length; j++) {
      var q = active[j];
      if (q.type !== 'sparks') continue;
      var kk = q.life / q.max;
      ctx.globalAlpha = kk;
      ctx.strokeStyle = q.color; ctx.lineWidth = q.size;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.035, q.y - q.vy * 0.035); ctx.stroke();
      ctx.globalAlpha = kk * 0.35;
      ctx.drawImage(A.blob(q.color), q.x - 6, q.y - 6, 12, 12);
    }
    ctx.restore();
  };

  FX.clear = function () {
    for (var i = 0; i < active.length; i++) { active[i].on = false; pool.push(active[i]); }
    active.length = 0;
  };

  /* =============================================================== FUEGO */
  function flame(ctx, x, by, w, h, lean, col) {
    ctx.beginPath();
    ctx.moveTo(x - w, by);
    ctx.bezierCurveTo(x - w * 1.1, by - h * 0.45, x - w * 0.2 + lean * 0.4, by - h * 0.6, x + lean, by - h);
    ctx.bezierCurveTo(x + w * 0.35 + lean * 0.4, by - h * 0.55, x + w * 1.15, by - h * 0.4, x + w, by);
    ctx.quadraticCurveTo(x, by + w * 0.5, x - w, by);
    ctx.fillStyle = col; ctx.fill();
  }

  A.drawFire = function (ctx, x, y, tile, intensity, t) {
    x = A.num(x, 0); y = A.num(y, 0); tile = A.num(tile, 64); t = A.num(t, 0);
    var I = A.clamp(A.num(intensity, 1), 0, 1); if (I <= 0) return;
    var s = tile / 64;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    var by = 52, hh = (26 + 34 * I);
    // glow
    A.glow(ctx, 32, 30, 56 + 30 * I, '#ff6a1f', 0.45 * I + 0.15 * Math.sin(t * 13) * I);
    // humo detrás
    var smoke = A.blob('#2a2228');
    for (var k = 0; k < 4; k++) {
      var ph = (t * 0.5 + k / 4) % 1, r = 10 + ph * 18;
      ctx.globalAlpha = (1 - ph) * 0.45 * I;
      ctx.drawImage(smoke, 32 + Math.sin(ph * 5 + k) * 10 - r, by - hh - 4 - ph * 40 - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    // capas de llamas
    var layers = [['#d0201a', 1, 1.0], ['#ff5a1f', 0.85, 0.82], ['#ffa62e', 0.7, 0.62], ['#fff1a8', 0.45, 0.38]];
    var n = 3 + Math.round(I * 2);
    for (var L = 0; L < layers.length; L++) {
      if (L >= 2) ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < n; i++) {
        var u = (i + 0.5) / n, fx = 10 + u * 44;
        var fl = Math.sin(t * (9 + i * 1.7) + i * 2.3 + L) * 0.5 + Math.sin(t * (17 + i) + i) * 0.25;
        var hgt = hh * layers[L][2] * (0.45 + 0.55 * Math.pow(Math.sin(u * PI), 1.5)) * (1 + fl * 0.22);
        var w = (11 - n * 0.6) * layers[L][1] + 3;
        flame(ctx, fx, by - L * 2, w, hgt, Math.sin(t * 5 + i * 1.3) * 5, layers[L][0]);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // brasas
    ctx.globalCompositeOperation = 'lighter';
    for (var e = 0; e < 8; e++) {
      var q = (t * (0.7 + A.hash(e) * 0.6) + A.hash(e * 3.1)) % 1;
      var ex = 12 + A.hash(e * 7.7) * 40 + Math.sin(q * 9 + e) * 6, ey = by - q * (hh + 30);
      ctx.globalAlpha = (1 - q) * I;
      ctx.fillStyle = q < 0.5 ? '#ffe08a' : '#ff7a2a';
      A.circle(ctx, ex, ey, 1.6 - q * 0.8); ctx.fill();
    }
    ctx.restore();
  };
})(window.OW);
