/* OVERWORKING — js/art/characters.js (agente ART)
 * drawCharacter (devs chibi), drawBug, drawManager, getCarryPoint, drawSpeechBubble. */
window.OW = window.OW || {};
(function (OW) {
  'use strict';
  var A = OW.Art = OW.Art || {};
  var PI = Math.PI, TAU = PI * 2;

  var HAIR = ['#3b2417', '#c4502a', '#1d1622', '#3f6fe0'];
  var SKIN = ['#f6cfae', '#e3a87a', '#8d5a3b', '#ffdcc2'];
  var PANTS = '#2f3a5c', SHOE = '#f4f5fa';
  var OUT = '#1d1530';

  function facingOf(dir) {
    var dx = dir ? A.num(dir.x, 0) : 0, dy = dir ? A.num(dir.y, 1) : 1;
    if (Math.abs(dx) > Math.abs(dy) * 1.1) return { f: 'side', flip: dx < 0 ? -1 : 1, dx: dx, dy: dy };
    if (dy < 0) return { f: 'up', flip: 1, dx: dx, dy: dy };
    return { f: 'down', flip: 1, dx: dx, dy: dy };
  }

  function limb(ctx, x0, y0, x1, y1, w, col) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT; ctx.lineWidth = w + 2.6;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  function hand(ctx, x, y, skin) {
    A.circle(ctx, x, y, 3.4); ctx.fillStyle = skin; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke();
  }

  function star5(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot + i * PI / 5 - PI / 2, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  /* ------------------------------------------------------------ pelo */
  function hairBack(ctx, style, f, col, hy) {
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    if (style === 1) { // melena larga
      if (f === 'side') {
        ctx.beginPath(); ctx.moveTo(-4, hy - 12); ctx.quadraticCurveTo(-20, hy - 6, -15, hy + 16); ctx.quadraticCurveTo(-6, hy + 20, 2, hy + 12); ctx.closePath();
      } else {
        ctx.beginPath(); ctx.moveTo(-15, hy - 6); ctx.quadraticCurveTo(-21, hy + 12, -14, hy + 19); ctx.lineTo(14, hy + 19);
        ctx.quadraticCurveTo(21, hy + 12, 15, hy - 6); ctx.closePath();
      }
      ctx.fill(); ctx.stroke();
    } else if (style === 2) { // afro
      var pts = f === 'side' ? [[-12, -8], [-15, 2], [-6, -15], [4, -16], [-14, 10], [10, -13]] : [[-14, -6], [14, -6], [-9, -14], [9, -14], [0, -17], [-17, 4], [17, 4]];
      pts.forEach(function (p) { A.circle(ctx, p[0], hy + p[1], 8.5); ctx.fill(); ctx.stroke(); });
      pts.forEach(function (p) { A.circle(ctx, p[0], hy + p[1], 7.2); ctx.fill(); });
    } else if (style === 3) { // moño
      var bx = f === 'side' ? -4 : 0, by = f === 'up' ? hy - 15 : hy - 16;
      A.circle(ctx, bx, by, 6.5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = A.shade(col, 0.35); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx, by, 3.5, PI * 1.1, PI * 1.8); ctx.stroke();
      ctx.fillStyle = '#ffd23f'; A.rr(ctx, bx - 4, by + 3.5, 8, 3, 1.5); ctx.fill();
    }
  }

  function hairFront(ctx, style, f, col, hy, R) {
    // pelo sobre la cabeza (clip a la cabeza) + extras
    ctx.save();
    A.circle(ctx, 0, hy, R); ctx.clip();
    ctx.fillStyle = col;
    ctx.beginPath();
    if (f === 'up') {
      ctx.rect(-R - 1, hy - R - 1, R * 2 + 2, R * 2 + 2);
    } else if (f === 'side') {
      ctx.moveTo(-R - 1, hy + R); ctx.lineTo(-R - 1, hy - R - 1); ctx.lineTo(R + 1, hy - R - 1); ctx.lineTo(R + 1, hy - 6);
      if (style === 0) { ctx.lineTo(10, hy - 4); ctx.lineTo(8, hy - 7); ctx.lineTo(4, hy - 4); }
      else if (style === 1) { ctx.quadraticCurveTo(8, hy - 1, 1, hy - 3); }
      else { ctx.quadraticCurveTo(6, hy - 5, 2, hy - 5); }
      ctx.lineTo(1, hy + 2); ctx.lineTo(-3, hy + 6); ctx.lineTo(-4, hy + R);
    } else {
      ctx.moveTo(-R - 1, hy + 2); ctx.lineTo(-R - 1, hy - R - 1); ctx.lineTo(R + 1, hy - R - 1); ctx.lineTo(R + 1, hy + 2);
      if (style === 0) { // flequillo en picos
        ctx.lineTo(12, hy - 2); ctx.lineTo(9, hy - 6); ctx.lineTo(6, hy - 3); ctx.lineTo(3, hy - 7); ctx.lineTo(0, hy - 3); ctx.lineTo(-4, hy - 7);
        ctx.lineTo(-7, hy - 3); ctx.lineTo(-10, hy - 6); ctx.lineTo(-13, hy - 1);
      } else if (style === 1) { // flequillo de lado
        ctx.lineTo(14, hy + 4); ctx.quadraticCurveTo(9, hy - 3, 2, hy - 5); ctx.quadraticCurveTo(-8, hy - 6, -14, hy + 4);
      } else if (style === 2) {
        ctx.lineTo(13, hy - 5); ctx.quadraticCurveTo(0, hy - 10, -13, hy - 5);
      } else {
        ctx.lineTo(13, hy - 2); ctx.quadraticCurveTo(6, hy - 9, 0, hy - 8); ctx.quadraticCurveTo(-7, hy - 9, -13, hy - 2);
      }
    }
    ctx.closePath(); ctx.fill();
    // brillo
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    A.ell(ctx, f === 'side' ? -2 : -5, hy - R + 4, 6, 2.5); ctx.fill();
    ctx.restore();
    // picos por encima del contorno
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    if (style === 0) {
      ctx.beginPath();
      var sp = f === 'side' ? [[-13, -7], [-17, -13], [-10, -12], [-9, -19], [-4, -13], [0, -20], [3, -13], [8, -17], [9, -10]] : [[-12, -8], [-15, -14], [-8, -12], [-6, -19], [-2, -13], [2, -20], [4, -13], [9, -18], [9, -11], [14, -12], [12, -7]];
      ctx.moveTo(sp[0][0], hy + sp[0][1]);
      for (var i = 1; i < sp.length; i++) ctx.lineTo(sp[i][0], hy + sp[i][1]);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (style === 2 && f !== 'up') {
      var fr = f === 'side' ? [[-8, -12], [-1, -14], [6, -11]] : [[-10, -10], [-4, -13], [3, -13], [9, -10]];
      fr.forEach(function (p) { A.circle(ctx, p[0], hy + p[1], 5.5); ctx.fill(); ctx.stroke(); });
      fr.forEach(function (p) { A.circle(ctx, p[0], hy + p[1], 4.4); ctx.fill(); });
    } else if (style === 1 && f === 'up') {
      ctx.beginPath(); ctx.moveTo(-14, hy); ctx.quadraticCurveTo(-17, hy + 14, -12, hy + 19); ctx.lineTo(12, hy + 19); ctx.quadraticCurveTo(17, hy + 14, 14, hy); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = A.shade(col, -0.3); ctx.lineWidth = 1;
      for (var k = -6; k <= 6; k += 4) { ctx.beginPath(); ctx.moveTo(k, hy + 4); ctx.lineTo(k * 1.1, hy + 17); ctx.stroke(); }
    }
  }

  function headphones(ctx, f, hy, R, accent) {
    ctx.lineCap = 'round';
    var band = '#2b2e3d';
    if (f === 'side') {
      ctx.strokeStyle = OUT; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.ellipse(-4.5, hy - 1, 5, R + 2, 0, PI * 1.05, PI * 1.95); ctx.stroke();
      ctx.strokeStyle = band; ctx.lineWidth = 3.4; ctx.stroke();
      A.rr(ctx, -9, hy - 6, 9, 13, 4); ctx.fillStyle = band; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
      A.rr(ctx, -7, hy - 4, 5, 9, 2.5); ctx.fillStyle = accent; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-6, hy - 3, 1.5, 4);
      return;
    }
    ctx.strokeStyle = OUT; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.arc(0, hy - 1, R + 2, PI * 1.08, PI * 1.92); ctx.stroke();
    ctx.strokeStyle = band; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, hy - 1, R + 2.5, PI * 1.25, PI * 1.5); ctx.stroke();
    [-1, 1].forEach(function (s) {
      A.rr(ctx, s * (R + 1) - 4, hy - 6, 8, 13, 4); ctx.fillStyle = band; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
      A.rr(ctx, s * (R + 1) - 2.2 + (f === 'up' ? 0 : s * 0.6), hy - 4, 4.4, 9, 2); ctx.fillStyle = accent; ctx.fill();
    });
  }

  function eyesFront(ctx, blink, energy, hy, look, t, mood, hairStyle, skin) {
    var ex = 5.6, ey = hy + 1.5;
    ctx.lineCap = 'round';
    if (mood === 'stunned') {
      [-1, 1].forEach(function (s) {
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath();
        for (var a = 0; a < 10; a += 0.5) { var r = a * 0.33, aa = a + t * 8 * s; ctx.lineTo(s * ex + Math.cos(aa) * r, ey + Math.sin(aa) * r); }
        ctx.stroke();
      });
      return;
    }
    if (mood === 'happy') {
      ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(s * ex, ey + 1, 3, PI * 1.15, PI * 1.85); ctx.stroke(); });
      return;
    }
    if (blink || energy < 0.1) {
      ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.moveTo(s * ex - 3, ey + 0.5); ctx.quadraticCurveTo(s * ex, ey + 2, s * ex + 3, ey + 0.5); ctx.stroke(); });
    } else {
      [-1, 1].forEach(function (s) {
        A.ell(ctx, s * ex, ey, 3.5, 4.4); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.3; ctx.stroke();
        var px = s * ex + look.x * 1.2, py = ey + 0.6 + look.y * 1;
        A.circle(ctx, px, py, 2.4); ctx.fillStyle = '#2a1b3d'; ctx.fill();
        A.circle(ctx, px - 0.8, py - 1.1, 0.9); ctx.fillStyle = '#fff'; ctx.fill();
        if (energy < 0.3) { // párpados caídos
          ctx.save(); A.ell(ctx, s * ex, ey, 3.6, 4.5); ctx.clip();
          ctx.fillStyle = skin; ctx.fillRect(s * ex - 4, ey - 5, 8, 4.6);
          ctx.restore();
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(s * ex - 3.4, ey - 0.3); ctx.lineTo(s * ex + 3.4, ey - 0.3); ctx.stroke();
        }
      });
    }
    if (energy < 0.3) { // ojeras
      ctx.strokeStyle = 'rgba(110,60,140,0.6)'; ctx.lineWidth = 1.4;
      [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(s * ex, ey + 2.5, 3.2, PI * 0.2, PI * 0.8); ctx.stroke(); });
    }
    // cejas
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
    var bt = mood === 'focus' ? 1.4 : mood === 'angry' ? 2.2 : 0;
    if (hairStyle !== 2 || true) {
      [-1, 1].forEach(function (s) {
        ctx.beginPath(); ctx.moveTo(s * (ex + 3), ey - 6 - (energy < 0.3 ? -0.8 : 0)); ctx.lineTo(s * (ex - 2.2), ey - 6 + bt * 0.8 - 0.3); ctx.stroke();
      });
    }
  }

  function mouthFront(ctx, hy, mood, energy, t) {
    var my = hy + 8.5;
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    if (mood === 'stunned') {
      ctx.beginPath(); ctx.moveTo(-4, my); for (var i = 0; i <= 8; i++) ctx.lineTo(-4 + i, my + Math.sin(i * 1.6 + t * 10) * 1.1); ctx.stroke();
    } else if (mood === 'angry') {
      A.rr(ctx, -3.5, my - 1.5, 7, 3.5, 1.5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    } else if (energy < 0.1) {
      A.ell(ctx, 0, my + 0.5, 1.8, 2.2); ctx.fillStyle = '#5a1f2a'; ctx.fill();
    } else if (energy < 0.3 || mood === 'focus') {
      ctx.beginPath(); ctx.moveTo(-2.5, my + 0.5); ctx.lineTo(2.5, my); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, my - 1.5, 3.2, PI * 0.2, PI * 0.8); ctx.stroke();
    }
  }

  /* ------------------------------------------------------ props en manos */
  function drawMug(ctx, x, y, s, text) {
    s = s || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(5, 0, 3, -PI / 2, PI / 2); ctx.stroke();
    A.rr(ctx, -5, -5, 10, 10, 2.5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    A.ell(ctx, 0, -4.6, 4.2, 1.2); ctx.fillStyle = '#4a2410'; ctx.fill();
    if (text) { ctx.fillStyle = '#d62839'; ctx.font = 'bold 2.6px ' + A.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 0.5); }
    ctx.restore();
  }
  function steamPuffs(ctx, x, y, t, n, sz) {
    var b = A.blob('#ffffff');
    for (var i = 0; i < n; i++) {
      var ph = (t * 0.8 + i / n) % 1, r = (2 + ph * 4) * (sz || 1);
      ctx.globalAlpha = (1 - ph) * 0.5;
      ctx.drawImage(b, x + Math.sin(ph * 6 + i) * 2 - r, y - ph * 14 - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawExtinguisherSmall(ctx, x, y, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    A.rr(ctx, -4, -6, 12, 9, 4); ctx.fillStyle = '#e8222e'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(-1, -4, 5, 3);
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(8, -3.5, 6, 3);
    ctx.restore();
  }

  function newspaper(ctx, x, y, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    A.rr(ctx, -3.5, -20, 7, 22, 3); ctx.fillStyle = '#efece2'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#9a9688'; for (var i = 0; i < 5; i++) ctx.fillRect(-2, -17 + i * 3.6, 4, 1);
    ctx.fillStyle = '#d62839'; ctx.fillRect(-3, -19, 6, 2);
    ctx.restore();
  }

  /* cabeza completa (pelo, cara, auriculares) en coords locales; cacheable */
  function renderHead(ctx, o) {
    var hs = o.hs, fs = o.fs, hairC = o.hairC, hy = o.hy, R = o.R, skin = o.skin, look = o.look, t = o.t,
      mood = o.mood, energy = o.energy, blink = o.blink, col = o.col;
    hairBack(ctx, hs, fs, hairC, hy);
    A.circle(ctx, 0, hy, R);
    var hg = ctx.createRadialGradient(-4, hy - 5, 2, 0, hy, R + 2);
    hg.addColorStop(0, A.shade(skin, 0.18)); hg.addColorStop(1, A.shade(skin, -0.12));
    ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
    if (fs === 'down') {
      // mejillas
      ctx.fillStyle = 'rgba(255,110,130,0.35)'; A.ell(ctx, -9.5, hy + 6, 2.8, 1.8); ctx.fill(); A.ell(ctx, 9.5, hy + 6, 2.8, 1.8); ctx.fill();
      eyesFront(ctx, blink, energy, hy, look, t, mood, hs, skin);
      mouthFront(ctx, hy, mood, energy, t);
    } else if (fs === 'side') {
      // ojo y nariz de perfil
      var blink2 = blink || energy < 0.1 || mood === 'happy';
      if (mood === 'stunned') {
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.beginPath();
        for (var a2 = 0; a2 < 10; a2 += 0.5) { var r2 = a2 * 0.33; ctx.lineTo(7 + Math.cos(a2 + t * 8) * r2, hy + 1 + Math.sin(a2 + t * 8) * r2); }
        ctx.stroke();
      } else if (blink2) {
        ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4.5, hy + 1.5); ctx.quadraticCurveTo(7, hy + 3, 9.5, hy + 1.5); ctx.stroke();
      } else {
        A.ell(ctx, 7, hy + 1, 3, 4.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
        A.circle(ctx, 8.2, hy + 1.6, 2.2); ctx.fillStyle = '#2a1b3d'; ctx.fill();
        A.circle(ctx, 7.6, hy + 0.5, 0.8); ctx.fillStyle = '#fff'; ctx.fill();
        if (energy < 0.3) {
          ctx.save(); A.ell(ctx, 7, hy + 1, 3.1, 4.3); ctx.clip(); ctx.fillStyle = skin; ctx.fillRect(3, hy - 4, 8, 4.4); ctx.restore();
          ctx.strokeStyle = 'rgba(110,60,140,0.6)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(7, hy + 3.5, 3, PI * 0.2, PI * 0.8); ctx.stroke();
        }
      }
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4, hy - 5); ctx.lineTo(10, hy - 5.5 + (mood === 'angry' ? 1.5 : 0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(R - 0.5, hy + 1); ctx.quadraticCurveTo(R + 3, hy + 4, R - 0.8, hy + 5.5); ctx.fillStyle = skin; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,110,130,0.35)'; A.ell(ctx, 6, hy + 7, 2.6, 1.7); ctx.fill();
      ctx.beginPath();
      if (mood === 'angry') { ctx.moveTo(7, hy + 9); ctx.lineTo(11.5, hy + 8.5); }
      else if (energy < 0.3 || mood === 'focus') { ctx.moveTo(8, hy + 9); ctx.lineTo(11.5, hy + 9); }
      else { ctx.arc(9.5, hy + 7, 2.5, PI * 0.25, PI * 0.8); }
      ctx.stroke();
    }
    hairFront(ctx, hs, fs, hairC, hy, R);
    A.circle(ctx, 0, hy, R); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
    if (hs === 3 && fs !== 'up') { // gafas redondas
      ctx.strokeStyle = '#2b2e3d'; ctx.lineWidth = 1.4;
      if (fs === 'down') {
        A.circle(ctx, -5.6, hy + 1.5, 4.6); ctx.stroke(); A.circle(ctx, 5.6, hy + 1.5, 4.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-1, hy + 1); ctx.lineTo(1, hy + 1); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; A.circle(ctx, -6.5, hy, 2); ctx.fill(); A.circle(ctx, 4.7, hy, 2); ctx.fill();
      } else {
        A.circle(ctx, 7.5, hy + 1, 4.4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(3, hy); ctx.lineTo(-3, hy - 1); ctx.stroke();
      }
    }
    headphones(ctx, fs, hy, R, col);
  }
  var headCache = {}, headCount = 0, HRES = 2;
  function headSprite(o, key) {
    var c = headCache[key];
    if (c) return c;
    if (headCount > 600) { headCache = {}; headCount = 0; }
    c = A.canvas(60 * HRES, 60 * HRES); var g = c.getContext('2d');
    g.scale(HRES, HRES); g.translate(30, 32 - o.hy);
    renderHead(g, o);
    headCount++;
    return (headCache[key] = c);
  }

  /* --------------------------------------------------- personaje */
  A.getCarryPoint = function (p) {
    p = p || {};
    var fc = facingOf(p.dir), x = A.num(p.x, 0), y = A.num(p.y, 0);
    var bob = p.moving ? Math.abs(Math.sin(A.num(p.walkPhase, 0))) * 2.5 : 0;
    if (fc.f === 'side') return { x: x + fc.flip * 13, y: y - 27 - bob };
    if (fc.f === 'up') return { x: x, y: y - 34 - bob };
    return { x: x, y: y - 22 - bob };
  };

  A.drawCharacter = function (ctx, p, t) {
    p = p || {}; t = A.num(t, 0);
    var x = A.num(p.x, 0), y = A.num(p.y, 0);
    var ci = (A.num(p.colorIndex, 0) | 0) % A.PLAYER_COLORS.length; if (ci < 0) ci = 0;
    var col = A.PLAYER_COLORS[ci], dark = A.shade(col, -0.35), sleeve = A.shade(col, -0.08);
    var hs = (A.num(p.hair, ci) | 0) % 4; if (hs < 0) hs = 0;
    var hairC = HAIR[hs], skin = SKIN[hs];
    var fc = facingOf(p.dir), f = fc.f;
    var action = p.action || 'none', energy = A.clamp(A.num(p.energy, 1), 0, 1);
    var moving = !!p.moving, ph = A.num(p.walkPhase, t * 10);
    var stunned = action === 'stunned';
    var bob = moving ? Math.abs(Math.sin(ph)) * 2.5 : Math.sin(t * 2.2 + ci) * 0.6;
    var lean = moving ? Math.sin(ph) * 0.05 : 0;
    if (energy < 0.1 && !moving) lean = Math.sin(t * 0.9) * 0.06;
    if (stunned) lean = Math.sin(t * 9) * 0.12;
    var look = { x: f === 'side' ? fc.flip : A.clamp(fc.dx, -1, 1), y: A.clamp(fc.dy, -1, 1) };
    var mood = stunned ? 'stunned' : action === 'drinking' ? 'happy' : action === 'squashing' ? 'angry' : (action === 'typing' || action === 'testing' || action === 'reviewing' || action === 'spraying') ? 'focus' : 'none';
    if (action === 'typing' || action === 'reviewing') look.y = 1;

    ctx.save(); ctx.translate(x, y);

    // anillo de selección
    if (p.selected) {
      var pr = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.save();
      A.ell(ctx, 0, 0, 21 + pr * 3, 8.5 + pr * 1.2);
      ctx.strokeStyle = A.rgba(col, 0.9); ctx.lineWidth = 3; ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = A.rgba(col, 0.35 * pr); ctx.lineWidth = 7; ctx.stroke();
      ctx.restore();
    }
    // sombra
    A.shadow(ctx, 0, 0, 15 - bob * 0.8, 5.5, 0.42);

    // estelas de dash
    if (p.dashing) {
      var ddx = -(fc.dx || 0), ddy = -(fc.dy || 1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var s = 0; s < 4; s++) {
        ctx.strokeStyle = A.rgba(col, 0.35 - s * 0.07); ctx.lineWidth = 3 - s * 0.5; ctx.lineCap = 'round';
        var ox = (s - 1.5) * 6 * (Math.abs(ddy) > 0.5 ? 1 : 0), oy = (s - 1.5) * 6 * (Math.abs(ddx) > 0.5 ? 1 : 0) - 24;
        ctx.beginPath(); ctx.moveTo(ox + ddx * 10, oy + ddy * 10); ctx.lineTo(ox + ddx * (30 + s * 6), oy + ddy * (30 + s * 6)); ctx.stroke();
      }
      ctx.restore();
    }

    ctx.translate(0, -bob);
    ctx.rotate(lean);
    if (p.dashing) ctx.scale(1.06, 0.95);

    var hy = -45, R = 14.5;

    /* piernas */
    var lift0 = 0, lift1 = 0, sw0 = 0, sw1 = 0;
    if (moving) {
      if (f === 'side') { sw0 = Math.sin(ph) * 4.5; sw1 = -sw0; lift0 = Math.max(0, Math.cos(ph)) * 1.5; lift1 = Math.max(0, -Math.cos(ph)) * 1.5; }
      else { lift0 = Math.max(0, Math.sin(ph)) * 3.2; lift1 = Math.max(0, -Math.sin(ph)) * 3.2; }
    }
    var legX = f === 'side' ? [-1.5, 2.5] : [-5, 5];
    for (var l = 0; l < 2; l++) {
      var lx = legX[l] + (l ? sw1 : sw0) * fc.flip, lift = l ? lift1 : lift0;
      limb(ctx, legX[l], -13 + bob * 0.3, lx, -3 - lift + bob, 6.2, PANTS);
      A.ell(ctx, lx + (f === 'side' ? fc.flip * 1.8 : 0), -1.5 - lift + bob, f === 'side' ? 5 : 4.2, 3); ctx.fillStyle = SHOE; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.fillStyle = col; ctx.fillRect(lx - 3, -0.6 - lift + bob, 6, 1.2);
    }

    /* posición de manos según acción */
    var swing = moving ? Math.sin(ph) * 4 : 0;
    var hands = [[-13, -16 + swing * 0.4], [13, -16 - swing * 0.4]];
    var props = [];
    if (p.carrying && action === 'none') hands = f === 'up' ? [[-10, -30], [10, -30]] : f === 'side' ? [[fc.flip * 9, -26], [fc.flip * 15, -26]] : [[-9, -23], [9, -23]];
    if (action === 'typing') hands = [[-7 + Math.sin(t * 31) * 1.2, -21 + Math.sin(t * 43) * 2], [7 + Math.sin(t * 37) * 1.2, -21 + Math.sin(t * 41 + 1) * 2]];
    if (action === 'testing') { var tw = Math.sin(t * 4) * 3; hands = [[-8, -22], [10 + tw, -27]]; props.push(['lupa', 10 + tw, -27]); }
    if (action === 'reviewing') { hands = [[-8, -22], [5 + Math.cos(t * 12) * 3.5, -23 + Math.sin(t * 12) * 2]]; props.push(['pen', hands[1][0], hands[1][1]]); }
    if (action === 'drinking') { var sip = 0.5 + 0.5 * Math.sin(t * 2.5); hands = [[-12, -16], [6 - sip * 2, -26 - sip * 9]]; props.push(['mug', 6 - sip * 2, -28 - sip * 9]); }
    if (action === 'spraying') { var sp = Math.sin(t * 25) * 0.8; hands = f === 'side' ? [[fc.flip * 8, -22 + sp], [fc.flip * 14, -24 + sp]] : [[-5, -21 + sp], [6, -23 + sp]]; props.push(['ext', 0, -22]); }
    if (action === 'squashing') {
      var cyc = (t * 3.2) % 1, e = cyc < 0.6 ? cyc / 0.6 : 1 - (cyc - 0.6) / 0.4;
      var ang = -2.6 + A.easeInOut(e) * 2.9, sgn = f === 'side' ? fc.flip : 1, armLen = 13;
      var hpos = [sgn * 11 + Math.sin(ang) * armLen * sgn, -27 - Math.cos(ang) * armLen];
      hands = [[-12, -17], hpos];
      props.push(['paper', hpos[0], hpos[1], ang * sgn, e]);
    }
    if (stunned) hands = [[-15 + Math.sin(t * 12) * 2, -24 + Math.cos(t * 10) * 3], [15 + Math.sin(t * 11) * 2, -24 + Math.sin(t * 13) * 3]];
    if (energy < 0.1 && action === 'none' && !p.carrying) hands = [[-12, -12], [12, -12]];

    var shoulders = f === 'side' ? [[fc.flip * -2, -27], [fc.flip * 3, -27]] : [[-10, -27], [10, -27]];

    function drawArm(i) {
      limb(ctx, shoulders[i][0], shoulders[i][1], hands[i][0], hands[i][1], 5.6, sleeve);
      hand(ctx, hands[i][0], hands[i][1], skin);
    }
    function drawProps(front) {
      props.forEach(function (pp) {
        if (pp[0] === 'lupa') {
          ctx.save(); ctx.translate(pp[1] + 4, pp[2] - 5);
          ctx.strokeStyle = '#7a3e1c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(-6, 8); ctx.stroke();
          A.circle(ctx, 0, 0, 5.5); ctx.fillStyle = 'rgba(180,230,255,0.5)'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 3.4, PI * 1.1, PI * 1.5); ctx.stroke();
          ctx.restore();
        } else if (pp[0] === 'pen') {
          ctx.save(); ctx.translate(pp[1], pp[2]); ctx.rotate(0.6);
          A.rr(ctx, -1.5, -9, 3, 10, 1.2); ctx.fillStyle = '#e0302e'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
          ctx.restore();
        } else if (pp[0] === 'mug') {
          drawMug(ctx, pp[1], pp[2], 0.9, 'DEV');
          steamPuffs(ctx, pp[1], pp[2] - 5, t, 3, 0.8);
        } else if (pp[0] === 'ext') {
          var ex = f === 'side' ? fc.flip * 12 : 0, ey = -22;
          var ang2 = Math.atan2(fc.dy || 0.0001, fc.dx || 0);
          if (f !== 'up') drawExtinguisherSmall(ctx, ex, ey, f === 'side' ? (fc.flip < 0 ? PI : 0) : ang2);
          // espuma
          var foam = A.blob('#f4fbff');
          for (var k = 0; k < 9; k++) {
            var q = ((t * 3) + k / 9) % 1, d = 12 + q * 34, spread = (A.hash(k * 3.3 + Math.floor(t * 3)) - 0.5) * q * 16;
            var fx = ex + (fc.dx || 0) * d - (fc.dy || 0) * spread, fy = ey + (fc.dy || 0) * d + (fc.dx || 0) * spread;
            var fr = 3 + q * 6;
            ctx.globalAlpha = 0.9 * (1 - q * 0.6);
            ctx.drawImage(foam, fx - fr, fy - fr, fr * 2, fr * 2);
          }
          ctx.globalAlpha = 1;
        } else if (pp[0] === 'paper') {
          newspaper(ctx, pp[1], pp[2], pp[3]);
          if (pp[4] > 0.92) {
            ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.lineCap = 'round';
            var ix = (f === 'side' ? fc.flip : 1) * 20, iy = -8;
            for (var b = 0; b < 6; b++) { var a = b * PI / 3; ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * 4, iy + Math.sin(a) * 3); ctx.lineTo(ix + Math.cos(a) * 9, iy + Math.sin(a) * 6); ctx.stroke(); }
          }
        }
      });
    }

    /* capucha trasera / brazo lejano */
    if (f === 'up') { drawArm(0); drawArm(1); drawProps(); }
    else if (f === 'side') {
      // brazo lejano (detrás)
      var farI = 0;
      limb(ctx, shoulders[farI][0], shoulders[farI][1], hands[farI][0], hands[farI][1], 5.4, A.shade(sleeve, -0.18));
      hand(ctx, hands[farI][0], hands[farI][1], A.shade(skin, -0.12));
    }

    /* torso (sudadera) */
    ctx.beginPath();
    ctx.moveTo(-10, -31); ctx.quadraticCurveTo(-13, -31, -13, -26); ctx.lineTo(-13.5, -14); ctx.quadraticCurveTo(-13.5, -10, -9, -10);
    ctx.lineTo(9, -10); ctx.quadraticCurveTo(13.5, -10, 13.5, -14); ctx.lineTo(13, -26); ctx.quadraticCurveTo(13, -31, 10, -31); ctx.closePath();
    var tg = ctx.createLinearGradient(-13, -31, 13, -10);
    tg.addColorStop(0, A.shade(col, 0.22)); tg.addColorStop(0.6, col); tg.addColorStop(1, dark);
    ctx.fillStyle = tg; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
    // puño/goma inferior
    ctx.fillStyle = dark; A.rr(ctx, -13, -13.5, 26, 3.5, 1.5); ctx.fill();
    if (f === 'down') {
      A.rr(ctx, -7, -20, 14, 6.5, 3); ctx.fillStyle = A.shade(col, -0.18); ctx.fill(); ctx.strokeStyle = A.rgba(OUT, 0.5); ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-3, -30); ctx.lineTo(-3.6, -24 + Math.sin(ph) * 0.8); ctx.moveTo(3, -30); ctx.lineTo(3.6, -24 - Math.sin(ph) * 0.8); ctx.stroke();
      // cuello capucha
      A.ell(ctx, 0, -30.5, 10.5, 3.6); ctx.fillStyle = dark; ctx.fill();
    } else if (f === 'up') {
      // capucha colgando en la espalda
      ctx.beginPath(); ctx.moveTo(-10, -32); ctx.quadraticCurveTo(0, -35, 10, -32); ctx.quadraticCurveTo(9, -20, 0, -19); ctx.quadraticCurveTo(-9, -20, -10, -32);
      ctx.fillStyle = dark; ctx.fill(); ctx.strokeStyle = A.rgba(OUT, 0.6); ctx.lineWidth = 1.2; ctx.stroke();
      if (A.drawLaneGlyph) A.drawLaneGlyph(ctx, 'front', 0, -15.5, 8, 'rgba(255,255,255,0.7)', 3);
    } else {
      ctx.beginPath(); ctx.moveTo(-fc.flip * 11, -31); ctx.quadraticCurveTo(-fc.flip * 15, -24, -fc.flip * 10, -19); ctx.lineTo(-fc.flip * 6, -30);
      ctx.fillStyle = dark; ctx.fill();
    }

    /* cabeza */
    ctx.save();
    if (f === 'side' && fc.flip < 0) ctx.scale(-1, 1);
    var fs = f === 'side' ? 'side' : f;
    var blinkNow = ((t + ci * 1.37) % 3.9) < 0.13;
    var ho = { hs: hs, fs: fs, hairC: hairC, hy: hy, R: R, skin: skin, look: look, t: t, mood: mood, energy: energy, blink: blinkNow, col: col };
    if (mood === 'stunned') renderHead(ctx, ho);
    else {
      ho.look = { x: Math.round(look.x), y: Math.round(look.y) };
      ho.energy = energy < 0.1 ? 0.05 : energy < 0.3 ? 0.2 : 1;
      var hk = ci + '|' + hs + '|' + fs + '|' + mood + '|' + ho.energy + '|' + (blinkNow ? 1 : 0) + '|' + ho.look.x + '|' + ho.look.y;
      ctx.drawImage(headSprite(ho, hk), -30, hy - 32, 60, 60);
    }
    ctx.restore();

    /* brazos delanteros y props */
    if (f === 'down') { drawArm(0); drawArm(1); drawProps(); }
    else if (f === 'side') {
      limb(ctx, shoulders[1][0], shoulders[1][1], hands[1][0], hands[1][1], 5.6, sleeve);
      hand(ctx, hands[1][0], hands[1][1], skin);
      drawProps();
    }

    ctx.restore();

    /* efectos sobre la cabeza (sin rotación) */
    ctx.save(); ctx.translate(x, y - bob);
    if (stunned) {
      for (var si = 0; si < 5; si++) {
        var sa = t * 5 + si * TAU / 5, sxp = Math.cos(sa) * 17, syp = hy - 17 + Math.sin(sa) * 5;
        var front = Math.sin(sa) > 0;
        ctx.globalAlpha = front ? 1 : 0.55;
        star5(ctx, sxp, syp, front ? 4.5 : 3.5, t * 4 + si);
        ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 1.1; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (energy < 0.1) {
      for (var z = 0; z < 3; z++) {
        var zp = (t * 0.5 + z / 3) % 1;
        ctx.globalAlpha = Math.sin(zp * PI);
        A.drawText(ctx, 'z', 12 + zp * 12 + Math.sin(zp * 8) * 2, hy - 14 - zp * 22, { size: 8 + zp * 8, color: '#cfe0ff', outline: '#2a2250', outlineWidth: 2.5, shadow: false });
      }
      ctx.globalAlpha = 1;
    } else if (energy < 0.3) {
      // gota de sudor
      var dp = (t * 0.8) % 1;
      ctx.globalAlpha = 1 - dp;
      ctx.fillStyle = '#9ad7ff'; ctx.strokeStyle = '#2a5a8a'; ctx.lineWidth = 1;
      ctx.beginPath(); var dx2 = 13, dy2 = hy - 8 + dp * 8;
      ctx.moveTo(dx2, dy2 - 4); ctx.quadraticCurveTo(dx2 + 3, dy2, dx2, dy2 + 2); ctx.quadraticCurveTo(dx2 - 3, dy2, dx2, dy2 - 4); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (p.selected) {
      var ay = hy - 30 + Math.sin(t * 5) * 2.5;
      ctx.beginPath(); ctx.moveTo(-6, ay - 5); ctx.lineTo(6, ay - 5); ctx.lineTo(0, ay + 3); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();
    }
    if (p.name) {
      ctx.font = 'bold 9px ' + A.FONT;
      var nm = String(p.name), nw = ctx.measureText(nm).width + 8, ny = hy - (p.selected ? 44 : 26) - (hs === 3 || hs === 0 ? 4 : 0);
      ctx.globalAlpha = 0.85;
      A.rr(ctx, -nw / 2, ny - 6, nw, 12, 6); ctx.fillStyle = 'rgba(20,14,40,0.75)'; ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(nm, 0, ny + 0.5);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  /* ---------------------------------------------------------- bugs */
  A.drawBug = function (ctx, bug, t) {
    bug = bug || {}; t = A.num(t, 0);
    var x = A.num(bug.x, 0), y = A.num(bug.y, 0), ang = A.num(bug.angle, 0), ph = A.num(bug.phase, t * 18);
    var sq = A.clamp(A.num(bug.squashed, 0), 0, 1), sc = A.num(bug.scale, 1);
    ctx.save(); ctx.translate(x, y); ctx.scale(sc * 1.3, sc * 1.3);
    if (sq > 0) {
      // salpicadura verde
      var e = A.easeOutBack(Math.min(1, sq * 1.6)) * 1.15;
      ctx.save(); ctx.scale(e, e * 0.8);
      ctx.fillStyle = '#5fe04a'; ctx.strokeStyle = '#1f6a14'; ctx.lineWidth = 1.5;
      var R = A.rng(((x * 7 + y * 13) | 0) + 1);
      ctx.beginPath(); A.circle(ctx, 0, 0, 13); ctx.fill(); ctx.stroke();
      for (var i = 0; i < 9; i++) {
        var a = i / 9 * TAU + R() * 0.5, d = 13 + R() * 9, r = 2.5 + R() * 4;
        A.circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r); ctx.fill(); ctx.stroke();
        A.circle(ctx, Math.cos(a) * d * 0.6, Math.sin(a) * d * 0.6, r); ctx.fill();
      }
      A.circle(ctx, 0, 0, 13); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; A.ell(ctx, -4, -4, 5, 2.5); ctx.fill();
      ctx.restore();
    } else {
      A.shadow(ctx, 2, 6, 13, 6, 0.45);
    }
    ctx.rotate(ang);
    var flat = sq > 0 ? Math.min(1, sq * 2.5) : 0;
    if (flat > 0) ctx.scale(1 - flat * 0.12, 1 - flat * 0.05);
    // patas
    ctx.strokeStyle = '#1a0f22'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var k = 0; k < 3; k++) {
      var bx = -5 + k * 5;
      [-1, 1].forEach(function (s) {
        var sw = sq > 0 ? 0 : Math.sin(ph + k * 2.1 + (s > 0 ? PI : 0)) * 3, spl = flat * 1.2;
        var lk = 1 - flat * 0.35;
        ctx.beginPath(); ctx.moveTo(bx, s * 4); ctx.lineTo(bx + sw + (k - 1) * (2 + spl), s * (10 + spl) * lk); ctx.lineTo(bx + sw * 1.4 + (k - 1) * (4.5 + spl * 2), s * (13.5 + spl) * lk); ctx.stroke();
      });
    }
    // antenas
    var wig = Math.sin(t * 9) * 1.5;
    ctx.lineWidth = 1.3;
    [-1, 1].forEach(function (s) {
      ctx.beginPath(); ctx.moveTo(10, s * 2.5); ctx.quadraticCurveTo(15, s * (5 + wig), 18, s * (8 - wig)); ctx.stroke();
      ctx.fillStyle = '#ff3b6b'; A.circle(ctx, 18, s * (8 - wig), 1.6); ctx.fill();
    });
    // abdomen / caparazón
    A.ell(ctx, -2, 0, 11, 8.5);
    var sg = ctx.createRadialGradient(-5, -4, 1, -2, 0, 12);
    sg.addColorStop(0, '#9b6bff'); sg.addColorStop(0.5, '#5a2a9a'); sg.addColorStop(1, '#2a0f4a');
    ctx.fillStyle = sg; ctx.fill(); ctx.strokeStyle = '#12061f'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(18,6,31,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-12.5, 0); ctx.stroke();
    // manchas "binarias"
    ctx.fillStyle = 'rgba(120,255,200,0.75)';
    A.circle(ctx, -6, -4, 1.7); ctx.fill(); A.circle(ctx, 0, 4.2, 1.7); ctx.fill();
    ctx.fillRect(-1, -5.6, 1.4, 3.4); ctx.fillRect(-7, 2.8, 1.4, 3.4);
    // brillo especular
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; A.ell(ctx, -4, -4.5, 4, 1.6); ctx.fill();
    if (flat > 0) { // caparazón aplastado: grietas y tono apagado
      ctx.fillStyle = 'rgba(40,90,30,' + (0.45 * flat) + ')'; A.ell(ctx, -2, 0, 11, 8.5); ctx.fill();
      ctx.strokeStyle = 'rgba(10,4,20,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-4, -2); ctx.lineTo(-7, 2); ctx.moveTo(2, -6); ctx.lineTo(0, -1); ctx.lineTo(4, 3); ctx.lineTo(1, 6); ctx.stroke();
    }
    // cabeza
    A.circle(ctx, 9, 0, 4.8); ctx.fillStyle = '#1f0f30'; ctx.fill(); ctx.strokeStyle = '#0a0412'; ctx.lineWidth = 1.4; ctx.stroke();
    // ojos rojos brillantes
    if (sq > 0) {
      ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 1.2;
      [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.moveTo(10, s * 2 - 1); ctx.lineTo(12, s * 2 + 1); ctx.moveTo(12, s * 2 - 1); ctx.lineTo(10, s * 2 + 1); ctx.stroke(); });
    } else {
      var gl = 0.7 + 0.3 * Math.sin(t * 6);
      [-1, 1].forEach(function (s) { ctx.fillStyle = '#ff2a2a'; A.circle(ctx, 11, s * 2.2, 1.6); ctx.fill(); });
      A.glow(ctx, 11.5, 0, 9, '#ff2020', 0.55 * gl);
      ctx.fillStyle = '#ffd0d0'; A.circle(ctx, 11.4, -2.4, 0.6); ctx.fill(); A.circle(ctx, 11.4, 1.9, 0.6); ctx.fill();
    }
    ctx.restore();
  };

  /* ------------------------------------------------ bocadillo */
  A.drawSpeechBubble = function (ctx, x, y, text, t, o) {
    o = o || {}; t = A.num(t, 0);
    var str = String(text == null ? '' : text);
    var size = o.size || 12;
    ctx.save();
    ctx.font = 'bold ' + size + 'px ' + A.FONT;
    var maxW = o.maxWidth || 170, words = str.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    });
    if (cur) lines.push(cur);
    var lw = 0; lines.forEach(function (l) { lw = Math.max(lw, ctx.measureText(l).width); });
    var w = lw + 18, h = lines.length * (size + 3) + 12;
    var wob = 1 + Math.sin(t * 7) * 0.025;
    ctx.translate(x, y); ctx.scale(wob, wob);
    var bx = -w / 2, by = -h - 10;
    ctx.fillStyle = 'rgba(10,5,25,0.3)'; A.rr(ctx, bx + 2, by + 3, w, h, 9); ctx.fill();
    ctx.beginPath();
    A.rr(ctx, bx, by, w, h, 9);
    ctx.fillStyle = o.bg || '#ffffff'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, by + h - 1); ctx.lineTo(2, 0); ctx.lineTo(6, by + h - 1); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillRect(-5, by + h - 3, 10, 3);
    ctx.fillStyle = o.color || '#1d1530'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach(function (l, i) { ctx.fillText(l, 0, by + 6 + (size + 3) * (i + 0.5)); });
    ctx.restore();
  };

  /* ------------------------------------------------ manager */
  A.drawManager = function (ctx, npc, t) {
    npc = npc || {}; t = A.num(t, 0);
    var x = A.num(npc.x, 0), y = A.num(npc.y, 0), fc = facingOf(npc.dir), f = fc.f;
    var moving = !!npc.moving, ph = A.num(npc.walkPhase, t * 8);
    var bob = moving ? Math.abs(Math.sin(ph)) * 2 : Math.sin(t * 1.8) * 0.5;
    var skin = '#f2c6a0', shirt = '#dcebff', tie = '#d62839', pants = '#4a5068', hair = '#4a4a55';
    ctx.save(); ctx.translate(x, y);
    A.shadow(ctx, 0, 0, 15, 5.5, 0.42);
    ctx.translate(0, -bob);
    ctx.rotate(moving ? Math.sin(ph) * 0.04 : 0);
    var flip = f === 'side' ? fc.flip : 1;
    // piernas
    for (var l = 0; l < 2; l++) {
      var lx = l ? 4.5 : -4.5, sw = moving ? Math.sin(ph + l * PI) * (f === 'side' ? 5 : 0) : 0, lift = moving && f !== 'side' ? Math.max(0, Math.sin(ph + l * PI)) * 3 : 0;
      limb(ctx, lx * (f === 'side' ? 0.4 : 1), -18, lx * (f === 'side' ? 0.4 : 1) + sw * flip, -3 - lift, 6.5, pants);
      A.ell(ctx, lx * (f === 'side' ? 0.4 : 1) + sw * flip + (f === 'side' ? flip * 2 : 0), -1.5 - lift, 5, 3); ctx.fillStyle = '#2a1a14'; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(lx * (f === 'side' ? 0.4 : 1) + sw * flip - 2, -3.5 - lift, 3, 1);
    }
    // brazo izq
    var swing = moving ? Math.sin(ph) * 4 : 0;
    var lh = [-14, -22 + swing], rh = [12, -30];
    if (f === 'up') { limb(ctx, -11, -40, lh[0], lh[1], 6, shirt); hand(ctx, lh[0], lh[1], skin); limb(ctx, 11, -40, 14, -22 - swing, 6, shirt); hand(ctx, 14, -22 - swing, skin); }
    // torso
    ctx.beginPath();
    ctx.moveTo(-11, -46); ctx.quadraticCurveTo(-14, -45, -14, -40); ctx.lineTo(-13, -19); ctx.lineTo(13, -19); ctx.lineTo(14, -40); ctx.quadraticCurveTo(14, -45, 11, -46); ctx.closePath();
    var sg = ctx.createLinearGradient(-14, -46, 14, -18); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#a9c6ec');
    ctx.fillStyle = sg; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
    // cinturón
    ctx.fillStyle = '#2a1a14'; ctx.fillRect(-13, -21.5, 26, 3.5); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-2, -21.5, 4, 3.5);
    if (f !== 'up') {
      // cuello y corbata
      var tx = f === 'side' ? flip * 6 : 0;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(tx - 6, -46); ctx.lineTo(tx, -41); ctx.lineTo(tx + 6, -46); ctx.lineTo(tx + 3, -47); ctx.lineTo(tx - 3, -47); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
      var tsw = moving ? Math.sin(ph * 0.5) * 1.5 : Math.sin(t * 2) * 0.6;
      ctx.beginPath(); ctx.moveTo(tx - 2, -42); ctx.lineTo(tx + 2, -42); ctx.lineTo(tx + 3.2 + tsw, -27); ctx.lineTo(tx + tsw, -23.5); ctx.lineTo(tx - 3.2 + tsw, -27); ctx.closePath();
      ctx.fillStyle = tie; ctx.fill(); ctx.strokeStyle = '#5a0010'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,100,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx - 1.6 + tsw * 0.3, -37); ctx.lineTo(tx + 2 + tsw * 0.5, -34); ctx.moveTo(tx - 2.2 + tsw * 0.6, -31); ctx.lineTo(tx + 2.4 + tsw * 0.8, -28); ctx.stroke();
      A.rr(ctx, tx - 2.4, -44, 4.8, 3.2, 1); ctx.fillStyle = A.shade(tie, -0.15); ctx.fill();
      // bolígrafos en el bolsillo
      ctx.fillStyle = '#3a6fd8'; ctx.fillRect(-9, -40, 1.6, 5); ctx.fillStyle = '#e0302e'; ctx.fillRect(-7, -40, 1.6, 5);
      ctx.strokeStyle = 'rgba(30,40,70,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(-10.5, -38, 6, 5);
      // brazo izquierdo
      limb(ctx, -11, -41, lh[0], lh[1], 6, shirt); hand(ctx, lh[0], lh[1], skin);
    }
    // cabeza (adulto: proporción menor)
    var hy = -58, R = 12.5;
    ctx.save(); if (f === 'side' && flip < 0) ctx.scale(-1, 1);
    A.circle(ctx, 0, hy, R);
    var hg = ctx.createRadialGradient(-4, hy - 4, 2, 0, hy, R + 2); hg.addColorStop(0, '#ffe0c4'); hg.addColorStop(1, '#e0a880');
    ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
    // orejas
    if (f === 'down') { [-1, 1].forEach(function (s) { A.ell(ctx, s * R, hy + 1, 2.5, 3.5); ctx.fillStyle = skin; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke(); }); }
    // pelo engominado con raya y canas
    ctx.save(); A.circle(ctx, 0, hy, R); ctx.clip();
    ctx.fillStyle = hair;
    if (f === 'up') ctx.fillRect(-R, hy - R, R * 2, R * 2 - 4);
    else if (f === 'side') { ctx.beginPath(); ctx.moveTo(-R, hy + R); ctx.lineTo(-R, hy - R); ctx.lineTo(R, hy - R); ctx.lineTo(R, hy - 7); ctx.quadraticCurveTo(2, hy - 8, -3, hy - 2); ctx.lineTo(-5, hy + R); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(-R, hy - 1); ctx.lineTo(-R, hy - R); ctx.lineTo(R, hy - R); ctx.lineTo(R, hy - 2); ctx.quadraticCurveTo(8, hy - 9, -3, hy - 8); ctx.quadraticCurveTo(-9, hy - 7, -R, hy - 1); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; A.ell(ctx, -3, hy - 10, 6, 1.8); ctx.fill();
    ctx.fillStyle = '#b8b8c4'; if (f === 'down') { ctx.fillRect(-R, hy - 4, 3, 5); ctx.fillRect(R - 3, hy - 4, 3, 5); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, hy, R, 0, TAU); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
    if (f === 'down') {
      // gafas de pasta, sonrisa enorme
      ctx.strokeStyle = '#1d1530'; ctx.lineWidth = 1.6;
      A.rr(ctx, -9.5, hy - 1.5, 7.5, 5.5, 1.5); ctx.stroke(); A.rr(ctx, 2, hy - 1.5, 7.5, 5.5, 1.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, hy); ctx.lineTo(2, hy); ctx.stroke();
      var blink = (t % 4.3) < 0.12;
      ctx.fillStyle = '#1d1530';
      if (blink) { ctx.fillRect(-7.5, hy + 1, 4, 1.2); ctx.fillRect(4, hy + 1, 4, 1.2); }
      else { A.circle(ctx, -5.7, hy + 1.3, 1.5); ctx.fill(); A.circle(ctx, 5.7, hy + 1.3, 1.5); ctx.fill(); }
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8, hy - 4); ctx.lineTo(-3, hy - 5); ctx.moveTo(3, hy - 5); ctx.lineTo(8, hy - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5.5, hy + 6); ctx.quadraticCurveTo(0, hy + 11.5, 5.5, hy + 6); ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4.5, hy + 7.3); ctx.lineTo(4.5, hy + 7.3); ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = 'rgba(255,110,110,0.35)'; A.ell(ctx, -8, hy + 6, 2.4, 1.5); ctx.fill(); A.ell(ctx, 8, hy + 6, 2.4, 1.5); ctx.fill();
    } else if (f === 'side') {
      ctx.fillStyle = '#1d1530'; A.circle(ctx, 6.5, hy + 1, 1.5); ctx.fill();
      ctx.strokeStyle = '#1d1530'; ctx.lineWidth = 1.5; A.rr(ctx, 3, hy - 2, 7, 5.5, 1.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(R - 0.5, hy + 1); ctx.quadraticCurveTo(R + 3, hy + 4, R - 0.8, hy + 5.5); ctx.fillStyle = skin; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(7.5, hy + 6, 3, PI * 0.1, PI * 0.8); ctx.stroke();
    }
    ctx.restore();
    // brazo derecho con taza
    if (f !== 'up') {
      var mx = f === 'side' ? flip * 15 : 13, my = -33 + (npc.talking ? Math.sin(t * 6) * 2 : 0);
      limb(ctx, f === 'side' ? flip * 4 : 11, -41, mx - 1, my + 2, 6, shirt);
      ctx.save(); ctx.translate(mx + 3, my); ctx.scale(1.5, 1.5);
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(5, 0, 2.6, -PI / 2, PI / 2); ctx.stroke();
      A.rr(ctx, -5, -5.5, 10, 11, 2.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      A.ell(ctx, 0, -5, 4.2, 1.2); ctx.fillStyle = '#4a2410'; ctx.fill();
      ctx.fillStyle = '#d62839'; ctx.fillRect(-5, -2.4, 10, 0.8);
      ctx.font = 'bold 2px ' + A.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SINERGIAS', 0, 0.4);
      ctx.fillRect(-5, 2, 10, 0.8);
      ctx.restore();
      hand(ctx, mx - 1, my + 2, skin);
      steamPuffs(ctx, mx + 3, my - 10, t, 3, 0.9);
    }
    ctx.restore();
    if (npc.talking) A.drawSpeechBubble(ctx, x + 6, y - bob - 76, npc.text || '\u00bfTienes 5 minutitos?', t);
  };
})(window.OW);
