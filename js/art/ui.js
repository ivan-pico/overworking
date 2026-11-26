/* OVERWORKING — js/art/ui.js (agente ART)
 * drawOrderCard, drawIcon, drawLogo, drawMenuBackground, drawPanel, drawButton. */
window.OW = window.OW || {};
(function (OW) {
  'use strict';
  var A = OW.Art = OW.Art || {};
  var PI = Math.PI, TAU = PI * 2;
  var OUT = '#1d1530';
  var LOGO_FONT = '"Arial Black", "Trebuchet MS", "Segoe UI", "Ubuntu", system-ui, sans-serif';

  function star5(g, x, y, r, inner, rot) {
    g.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = (rot || 0) + i * PI / 5 - PI / 2, rr = i % 2 ? r * (inner || 0.48) : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  }

  /* ============================================================ ICONOS */
  var ICONS = {};
  function laneIcon(lane) {
    return function (g) {
      var L = A.laneInfo(lane);
      A.rr(g, -14, -13, 28, 28, 8); g.fillStyle = A.shade(L.dark, -0.4); g.fill();
      A.rr(g, -14, -14, 28, 27, 8);
      var gr = g.createLinearGradient(0, -14, 0, 13); gr.addColorStop(0, A.shade(L.color, 0.3)); gr.addColorStop(1, L.color);
      g.fillStyle = gr; g.fill(); g.strokeStyle = A.shade(L.dark, -0.5); g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.3)'; A.rr(g, -11, -12, 22, 6, 3); g.fill();
      A.drawLaneGlyph(g, lane, 0, 0, 19, '#fff', 3.2);
    };
  }
  ICONS.front = laneIcon('front'); ICONS.back = laneIcon('back'); ICONS.data = laneIcon('data');
  ICONS.coffee = function (g) {
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; g.lineCap = 'round';
    [-4, 2].forEach(function (x) { g.beginPath(); g.moveTo(x, -6); g.bezierCurveTo(x - 3, -9, x + 3, -11, x, -15); g.stroke(); });
    g.strokeStyle = OUT; g.lineWidth = 3.5; g.beginPath(); g.arc(9, 4, 4.5, -PI / 2, PI / 2); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 1.8; g.stroke();
    A.rr(g, -10, -4, 19, 17, 4); var gr = g.createLinearGradient(-10, 0, 9, 0); gr.addColorStop(0, '#ff7b6b'); gr.addColorStop(1, '#d6304e');
    g.fillStyle = gr; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
    A.ell(g, -0.5, -3.5, 9, 2.4); g.fillStyle = '#5a2a10'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.4)'; A.rr(g, -7.5, 0, 3, 9, 1.5); g.fill();
  };
  ICONS.star = function (g) {
    star5(g, 0, 1.5, 15); g.fillStyle = '#b86a00'; g.fill();
    star5(g, 0, 0, 15); var gr = g.createLinearGradient(0, -15, 0, 13); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(0.5, '#ffd23f'); gr.addColorStop(1, '#ff9a1f');
    g.fillStyle = gr; g.fill(); g.strokeStyle = '#6a3a00'; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.6)'; A.ell(g, -4, -5, 3.5, 2); g.fill();
  };
  ICONS.star_empty = function (g) {
    star5(g, 0, 0, 15); g.fillStyle = 'rgba(20,14,40,0.55)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();
    star5(g, 0, 0, 10); g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1.2; g.stroke();
  };
  ICONS.clock = function (g) {
    A.circle(g, 0, 1, 14); g.fillStyle = '#a3132a'; g.fill();
    A.circle(g, 0, 0, 14); g.fillStyle = '#ff4f6d'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
    A.circle(g, 0, 0, 10.5); g.fillStyle = '#fffdf6'; g.fill();
    g.strokeStyle = OUT; g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -7); g.moveTo(0, 0); g.lineTo(5, 2); g.stroke();
    g.fillStyle = OUT; A.circle(g, 0, 0, 1.6); g.fill();
    g.fillStyle = '#ffd23f'; A.rr(g, -4, -19, 8, 4, 1.5); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.5; g.stroke();
  };
  ICONS.coin = function (g) {
    A.circle(g, 0, 1.5, 14); g.fillStyle = '#9a6a00'; g.fill();
    A.circle(g, 0, 0, 14); var gr = g.createRadialGradient(-4, -5, 1, 0, 0, 15); gr.addColorStop(0, '#fff0a0'); gr.addColorStop(1, '#f2a900');
    g.fillStyle = gr; g.fill(); g.strokeStyle = '#6a4200'; g.lineWidth = 2; g.stroke();
    A.circle(g, 0, 0, 10); g.strokeStyle = 'rgba(140,90,0,0.5)'; g.lineWidth = 1.4; g.stroke();
    g.font = 'bold 15px ' + A.FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#9a6a00'; g.fillText('$', 0, 1.5); g.fillStyle = '#fff6c8'; g.fillText('$', -0.5, 0.5);
  };
  ICONS.bug = function (g) {
    g.save(); g.rotate(-PI / 2); A.drawBug(g, { x: 0, y: 0, angle: 0, phase: 1 }, 0.3); g.restore();
  };
  ICONS.fire = function (g) {
    var lay = [['#d0201a', 1], ['#ff7a1f', 0.75], ['#ffe27a', 0.45]];
    lay.forEach(function (l, i) {
      var s = l[1];
      g.beginPath(); g.moveTo(0, 14);
      g.bezierCurveTo(-13 * s, 12, -13 * s, -2 * s, -4 * s, -8 * s);
      g.bezierCurveTo(-4 * s, -2, 1, -4, 0, -15 * s - (i ? 0 : 2));
      g.bezierCurveTo(9 * s, -8 * s, 14 * s, 2, 11 * s, 9);
      g.quadraticCurveTo(7 * s, 14, 0, 14);
      g.fillStyle = l[0]; g.fill();
      if (!i) { g.strokeStyle = '#5a0a00'; g.lineWidth = 2; g.stroke(); }
    });
  };
  ICONS.rocket = function (g) {
    g.save(); g.rotate(0.6);
    g.beginPath(); g.moveTo(-5, 8); g.lineTo(-11, 15); g.lineTo(-4, 13); g.closePath(); g.fillStyle = '#ff4f6d'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.moveTo(5, 8); g.lineTo(11, 15); g.lineTo(4, 13); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, -17); g.bezierCurveTo(9, -9, 8, 6, 6, 13); g.lineTo(-6, 13); g.bezierCurveTo(-8, 6, -9, -9, 0, -17); g.closePath();
    var gr = g.createLinearGradient(-8, 0, 8, 0); gr.addColorStop(0, '#d8dde8'); gr.addColorStop(0.4, '#fff'); gr.addColorStop(1, '#8a92a6');
    g.fillStyle = gr; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
    A.circle(g, 0, -3, 3.6); g.fillStyle = '#4da3ff'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.moveTo(-4, 14); g.quadraticCurveTo(0, 24, 4, 14); g.fillStyle = '#ffb02e'; g.fill();
    g.restore();
  };
  ICONS.key = function (g) {
    g.save(); g.rotate(-0.6);
    g.strokeStyle = OUT; g.lineWidth = 6.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-2, 0); g.lineTo(15, 0); g.moveTo(10, 0); g.lineTo(10, 6); g.moveTo(14, 0); g.lineTo(14, 5); g.stroke();
    g.strokeStyle = '#ffc233'; g.lineWidth = 3.5; g.stroke();
    A.circle(g, -7, 0, 8); g.fillStyle = '#ffc233'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
    A.circle(g, -7, 0, 3); g.fillStyle = OUT; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; A.ell(g, -9, -4, 3, 1.5); g.fill();
    g.restore();
  };
  ICONS.unknown = function (g) {
    A.circle(g, 0, 0, 13); g.fillStyle = '#5d667c'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
    g.font = 'bold 16px ' + A.FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('?', 0, 1);
  };

  var iconCache = {};
  A.drawIcon = function (ctx, name, cx, cy, size) {
    size = A.num(size, 24); cx = A.num(cx, 0); cy = A.num(cy, 0);
    if (!ICONS[name]) name = 'unknown';
    var px = Math.max(8, Math.min(256, Math.round(size * 2 / 8) * 8));
    var k = name + '|' + px, c = iconCache[k];
    if (!c) {
      c = A.canvas(px, px); var g = c.getContext('2d');
      g.translate(px / 2, px / 2); g.scale(px / 40, px / 40);
      try { ICONS[name](g); } catch (e) { }
      iconCache[k] = c;
    }
    var d = size * 1.25;
    ctx.drawImage(c, cx - d / 2, cy - d / 2, d, d);
  };

  /* ============================================================ PANELES */
  var noisePat = null;
  function noise(ctx) {
    if (noisePat) return noisePat;
    var c = A.canvas(96, 96), g = c.getContext('2d'), R = A.rng(9);
    for (var i = 0; i < 900; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'; g.fillRect(R() * 96, R() * 96, 1.2, 1.2); }
    noisePat = ctx.createPattern(c, 'repeat');
    return noisePat;
  }

  A.drawPanel = function (ctx, x, y, w, h, opts) {
    var o = opts || {}; x = A.num(x, 0); y = A.num(y, 0); w = A.num(w, 100); h = A.num(h, 60);
    var r = A.num(o.radius, 16), tint = o.color || '#2a2152', a = A.num(o.alpha, 0.78);
    ctx.save();
    if (!o.noShadow) {
      ctx.fillStyle = 'rgba(5,2,15,0.35)'; A.rr(ctx, x + 4, y + 8, w, h, r); ctx.fill();
      ctx.fillStyle = 'rgba(5,2,15,0.18)'; A.rr(ctx, x + 2, y + 14, w + 4, h, r + 4); ctx.fill();
    }
    A.rr(ctx, x, y, w, h, r);
    var gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, A.rgba(A.shade(tint, 0.18), a)); gr.addColorStop(1, A.rgba(A.shade(tint, -0.25), a));
    ctx.fillStyle = gr; ctx.fill();
    ctx.fillStyle = noise(ctx); ctx.fill();
    ctx.save(); A.rr(ctx, x, y, w, h, r); ctx.clip();
    // reflejo diagonal de vidrio
    var sh = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
    sh.addColorStop(0, 'rgba(255,255,255,0.16)'); sh.addColorStop(0.35, 'rgba(255,255,255,0.03)'); sh.addColorStop(0.36, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(x, y, w, h);
    if (o.title) {
      var th = A.num(o.titleHeight, 40);
      var tg = ctx.createLinearGradient(x, y, x + w, y);
      var ac = o.accent || '#ff4f6d';
      tg.addColorStop(0, A.rgba(ac, 0.9)); tg.addColorStop(1, A.rgba(A.shade(ac, -0.3), 0.75));
      ctx.fillStyle = tg; ctx.fillRect(x, y, w, th);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + th, w, 2);
      ['#ff5f57', '#febc2e', '#28c840'].forEach(function (c, i) { ctx.fillStyle = c; A.circle(ctx, x + 18 + i * 14, y + th / 2, 4.5); ctx.fill(); });
      A.drawText(ctx, o.title, x + w / 2, y + th / 2 + 1, { size: A.num(o.titleSize, 20), color: '#fff' });
    }
    ctx.restore();
    // bordes
    A.rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.5; ctx.stroke();
    A.rr(ctx, x - 1, y - 1, w + 2, h + 2, r + 1);
    ctx.strokeStyle = 'rgba(8,4,20,0.65)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (o.glow) {
      ctx.globalCompositeOperation = 'lighter';
      A.rr(ctx, x - 2, y - 2, w + 4, h + 4, r + 2);
      ctx.strokeStyle = A.rgba(o.glow === true ? '#7a5cff' : o.glow, 0.35); ctx.lineWidth = 5; ctx.stroke();
    }
    ctx.restore();
  };

  A.drawButton = function (ctx, x, y, w, h, label, focused, t) {
    x = A.num(x, 0); y = A.num(y, 0); w = A.num(w, 200); h = A.num(h, 48); t = A.num(t, 0);
    var r = h / 2, cx = x + w / 2, cy = y + h / 2;
    var pulse = focused ? 1 + 0.035 * Math.sin(t * 6) : 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
    // sombra / base 3D
    ctx.fillStyle = 'rgba(5,2,15,0.45)'; A.rr(ctx, x + 2, y + 6, w, h, r); ctx.fill();
    A.rr(ctx, x, y + 4, w, h, r); ctx.fillStyle = focused ? '#8a1a3a' : '#1a1438'; ctx.fill();
    A.rr(ctx, x, y, w, h, r);
    var gr = ctx.createLinearGradient(0, y, 0, y + h);
    if (focused) { gr.addColorStop(0, '#ffb36b'); gr.addColorStop(0.5, '#ff6b5a'); gr.addColorStop(1, '#e0306a'); }
    else { gr.addColorStop(0, 'rgba(90,76,160,0.85)'); gr.addColorStop(1, 'rgba(46,36,98,0.85)'); }
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = focused ? '#fff2d8' : 'rgba(255,255,255,0.28)'; ctx.lineWidth = focused ? 2.5 : 1.5; ctx.stroke();
    // brillo superior
    ctx.save(); A.rr(ctx, x, y, w, h, r); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,' + (focused ? 0.28 : 0.12) + ')'; A.rr(ctx, x + 6, y + 3, w - 12, h * 0.38, h * 0.19); ctx.fill();
    if (focused) {
      var sx = x - 60 + ((t * 0.7) % 1.6) * (w + 120) / 1.6;
      ctx.globalCompositeOperation = 'lighter';
      var sg = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.45)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(sx - 20, y); ctx.lineTo(sx + 40, y); ctx.lineTo(sx + 20, y + h); ctx.lineTo(sx - 40, y + h); ctx.fill();
    }
    ctx.restore();
    if (focused) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      A.rr(ctx, x - 3, y - 3, w + 6, h + 6, r + 3); ctx.strokeStyle = 'rgba(255,140,100,' + (0.35 + 0.2 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 6; ctx.stroke();
      ctx.restore();
      // flechitas
      var ax = 14 + Math.sin(t * 8) * 4;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x + ax, cy - 6); ctx.lineTo(x + ax + 8, cy); ctx.lineTo(x + ax, cy + 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w - ax, cy - 6); ctx.lineTo(x + w - ax - 8, cy); ctx.lineTo(x + w - ax, cy + 6); ctx.fill();
    }
    var fs = Math.min(h * 0.44, 24);
    ctx.font = 'bold ' + fs + 'px ' + A.FONT;
    var lbl = String(label == null ? '' : label);
    while (ctx.measureText(lbl).width > w - 50 && fs > 9) { fs -= 1; ctx.font = 'bold ' + fs + 'px ' + A.FONT; }
    A.drawText(ctx, lbl, cx, cy + 1, { size: fs, color: focused ? '#ffffff' : '#e6e0ff', outline: focused ? '#8a1a3a' : null, outlineWidth: 3 });
    ctx.restore();
  };

  /* ====================================================== TARJETAS PEDIDO */
  function ticketId(name) {
    var h = 0, s = String(name || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return 'OW-' + (100 + h);
  }
  A.drawOrderCard = function (ctx, order, x, y, w, h, t) {
    order = order || {}; x = A.num(x, 0); y = A.num(y, 0); w = A.num(w, 180); h = A.num(h, 100); t = A.num(t, 0);
    var lanes = Array.isArray(order.lanes) ? order.lanes : [];
    var total = Math.max(0.001, A.num(order.timeTotal, 60)), left = A.clamp(A.num(order.timeLeft, total), 0, total);
    var ratio = left / total, flash = A.clamp(A.num(order.flash, 0), 0, 1), ent = A.clamp(A.num(order.entering, 1), 0, 1);
    var urgent = ratio < 0.25;
    ctx.save();
    // animación de entrada
    var e = A.easeOutBack(ent);
    var dy = (1 - e) * -(h + 40);
    var shake = urgent ? Math.sin(t * 40) * (1 - ratio / 0.25) * 1.6 : 0;
    ctx.globalAlpha *= Math.min(1, ent * 2);
    ctx.translate(x + w / 2 + shake, y + h / 2 + dy);
    ctx.rotate((1 - ent) * -0.25 + (urgent ? Math.sin(t * 22) * 0.01 : 0));
    ctx.translate(-w / 2, -h / 2);
    // pinza/chincheta
    // sombra
    ctx.fillStyle = 'rgba(5,2,15,0.4)'; A.rr(ctx, 3, 6, w, h, 9); ctx.fill();
    // cuerpo
    A.rr(ctx, 0, 0, w, h, 9);
    var bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#ebe8f2');
    ctx.fillStyle = bg; ctx.fill();
    ctx.save(); A.rr(ctx, 0, 0, w, h, 9); ctx.clip();
    // franja de carriles arriba
    var n = Math.max(1, lanes.length);
    for (var i = 0; i < n; i++) { ctx.fillStyle = lanes.length ? A.laneColor(lanes[i]) : '#a7b0c4'; ctx.fillRect(i * w / n, 0, w / n + 1, 6); }
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(0, 0, w, 1.5);
    ctx.restore();
    ctx.strokeStyle = urgent ? A.rgba('#ff3b4f', 0.6 + 0.4 * Math.sin(t * 12)) : '#2a2250'; ctx.lineWidth = urgent ? 3 : 2;
    A.rr(ctx, 0, 0, w, h, 9); ctx.stroke();
    var pad = Math.max(7, w * 0.05);
    // id + prioridad
    var small = Math.max(8, Math.min(11, h * 0.11));
    ctx.font = 'bold ' + small + 'px ' + A.MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7a7594'; ctx.fillText((order.id != null ? 'OW-' + (100 + ((order.id * 37) % 900)) : ticketId(order.name)), pad, 6 + small);
    // icono prioridad
    var px = w - pad - 6, py = 6 + small;
    ctx.save(); ctx.translate(px, py);
    ctx.strokeStyle = urgent ? '#ff3b4f' : ratio < 0.5 ? '#ff9a1f' : '#3ddc84'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var lv = urgent ? 3 : ratio < 0.5 ? 2 : 1;
    for (var c = 0; c < lv; c++) { ctx.beginPath(); ctx.moveTo(-5, 2 - c * 4 + 3); ctx.lineTo(0, -3 - c * 4 + 3); ctx.lineTo(5, 2 - c * 4 + 3); ctx.stroke(); }
    ctx.restore();
    // nombre
    var fs = Math.max(10, Math.min(18, h * 0.19));
    ctx.font = 'bold ' + fs + 'px ' + A.FONT;
    var name = String(order.name || 'Feature');
    while (ctx.measureText(name).width > w - pad * 2 && fs > 8) { fs -= 1; ctx.font = 'bold ' + fs + 'px ' + A.FONT; }
    ctx.fillStyle = '#1d1530'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(name, pad, 6 + small * 2 + fs * 0.7 + 2);
    // chips de carril
    var chipY = 6 + small * 2 + fs * 1.4 + 6, chipH = Math.max(14, Math.min(24, h * 0.24));
    var avail = w - pad * 2, gap = 4;
    var cw = Math.min(avail / Math.max(1, lanes.length) - gap, chipH * 3.4);
    var showLabel = cw > chipH * 2.3;
    for (var j = 0; j < lanes.length; j++) {
      var L = A.laneInfo(lanes[j]), cx0 = pad + j * (cw + gap);
      A.rr(ctx, cx0, chipY + 1.5, cw, chipH, chipH / 2); ctx.fillStyle = A.shade(L.dark, -0.3); ctx.fill();
      A.rr(ctx, cx0, chipY, cw, chipH, chipH / 2); ctx.fillStyle = L.color; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; A.rr(ctx, cx0 + 3, chipY + 1.5, cw - 6, chipH * 0.3, chipH * 0.15); ctx.fill();
      var gx = showLabel ? cx0 + chipH * 0.62 : cx0 + cw / 2;
      A.drawLaneGlyph(ctx, lanes[j], gx, chipY + chipH / 2, chipH * 0.62, '#fff', 3.4);
      if (showLabel) {
        ctx.font = 'bold ' + Math.round(chipH * 0.52) + 'px ' + A.FONT; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(L.name, cx0 + chipH * 1.15, chipY + chipH / 2 + 0.5);
      }
    }
    // barra de tiempo
    var bh = Math.max(7, h * 0.09), by = h - pad - bh, bx = pad + bh * 1.6, bw = w - pad - bx;
    A.drawIcon(ctx, 'clock', pad + bh * 0.6, by + bh / 2, bh * 1.6);
    A.rr(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = '#d9d5e4'; ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,60,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    var col = ratio > 0.5 ? A.mix('#ffd23f', '#3ddc84', (ratio - 0.5) * 2) : A.mix('#ff3b4f', '#ffd23f', ratio * 2);
    if (ratio > 0) {
      A.rr(ctx, bx, by, Math.max(bh, bw * ratio), bh, bh / 2);
      var tg = ctx.createLinearGradient(0, by, 0, by + bh); tg.addColorStop(0, A.shade(col, 0.3)); tg.addColorStop(1, A.shade(col, -0.15));
      ctx.fillStyle = tg; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; A.rr(ctx, bx + 2, by + 1, Math.max(0, bw * ratio - 4), bh * 0.3, bh * 0.15); ctx.fill();
    }
    // flash
    if (flash > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      A.rr(ctx, 0, 0, w, h, 9); ctx.fillStyle = A.rgba(left <= 0 ? '#ff3b4f' : '#ffe27a', 0.18 * flash); ctx.fill();
      A.rr(ctx, -6, -6, w + 12, h + 12, 14); ctx.strokeStyle = A.rgba(left <= 0 ? '#ff3b4f' : '#ffd23f', 0.5 * flash); ctx.lineWidth = 8; ctx.stroke();
      A.rr(ctx, -3, -3, w + 6, h + 6, 11); ctx.strokeStyle = A.rgba(left <= 0 ? '#ff3b4f' : '#fff2a0', flash); ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
    }
    // chincheta
    A.circle(ctx, w / 2, 1, 4.5); ctx.fillStyle = '#ff4f6d'; ctx.fill(); ctx.strokeStyle = '#5a0010'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; A.circle(ctx, w / 2 - 1.3, -0.3, 1.4); ctx.fill();
    ctx.restore();
  };

  /* ================================================================ LOGO */
  var logoCache = {};
  var PAL_OVER = ['#fff3a8', '#ffb02e', '#ff4f4f'];
  var PAL_WORK = ['#e0fbff', '#4dc3ff', '#7a5cff'];
  function letterSprite(ch, size, pal) {
    var font = '900 ' + size + 'px ' + LOGO_FONT;
    var mc = A.canvas(4, 4).getContext('2d'); mc.font = font;
    var lw = Math.ceil(mc.measureText(ch).width), pad = Math.ceil(size * 0.25), depth = Math.ceil(size * 0.12);
    var W = lw + pad * 2, H = Math.ceil(size * 1.25) + pad * 2 + depth;
    var c = A.canvas(W, H), g = c.getContext('2d');
    g.font = font; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    var bx = pad, by = pad + size * 0.95;
    // capa de letra con degradado y brillo
    var L = A.canvas(W, H), lg = L.getContext('2d');
    lg.font = font; lg.textBaseline = 'alphabetic';
    var gr = lg.createLinearGradient(0, by - size * 0.75, 0, by);
    gr.addColorStop(0, pal[0]); gr.addColorStop(0.5, pal[1]); gr.addColorStop(1, pal[2]);
    lg.fillStyle = gr; lg.fillText(ch, bx, by);
    lg.globalCompositeOperation = 'source-atop';
    lg.fillStyle = 'rgba(255,255,255,0.45)';
    lg.beginPath(); lg.ellipse(bx + lw * 0.45, by - size * 0.62, lw * 0.75, size * 0.2, -0.1, 0, TAU); lg.fill();
    lg.fillStyle = 'rgba(0,0,0,0.12)'; lg.fillRect(0, by - size * 0.18, W, size * 0.2);
    // extrusión
    g.lineJoin = 'round';
    for (var d = depth; d >= 1; d--) {
      g.fillStyle = d === depth ? '#12061f' : A.mix('#2a0f3d', '#5a2a7a', 1 - d / depth);
      g.strokeStyle = g.fillStyle; g.lineWidth = size * 0.16;
      g.strokeText(ch, bx, by + d); g.fillText(ch, bx, by + d);
    }
    g.strokeStyle = '#1d0b2e'; g.lineWidth = size * 0.16; g.strokeText(ch, bx, by);
    g.drawImage(L, 0, 0);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1, size * 0.025);
    g.save(); g.beginPath(); g.rect(0, 0, W, by - size * 0.45); g.clip(); g.strokeText(ch, bx, by); g.restore();
    return { c: c, w: lw, pad: pad, by: by, H: H };
  }
  function getLogo(scale) {
    var q = Math.max(0.2, Math.round(scale * 20) / 20), k = String(q);
    if (logoCache[k]) return logoCache[k];
    var size = Math.round(80 * q), word = 'OVERWORKING', letters = [];
    for (var i = 0; i < word.length; i++) letters.push(letterSprite(word[i], size, i < 4 ? PAL_OVER : PAL_WORK));
    var spacing = -size * 0.02, total = 0;
    letters.forEach(function (l) { total += l.w + spacing; });
    return (logoCache[k] = { letters: letters, total: total - spacing, size: size, spacing: spacing, q: q });
  }

  A.drawLogo = function (ctx, cx, cy, scale, t) {
    cx = A.num(cx, 640); cy = A.num(cy, 200); scale = A.num(scale, 1); t = A.num(t, 0);
    var L = getLogo(scale), sz = L.size, k = scale / L.q;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    var x = -L.total / 2, tilt = -0.04;
    ctx.rotate(tilt);
    // halo
    A.glow(ctx, 0, -sz * 0.3, sz * 3.2, '#ff7b3a', 0.18 + 0.05 * Math.sin(t * 2));
    A.glow(ctx, sz * 1.2, -sz * 0.3, sz * 2.4, '#4d7bff', 0.16);
    // placa tipo tecla detrás
    ctx.save();
    var pw = L.total + sz * 0.9, ph = sz * 1.2;
    ctx.fillStyle = 'rgba(10,4,25,0.55)'; A.rr(ctx, -pw / 2 + 6, -sz * 1.0 + 12, pw, ph, sz * 0.25); ctx.fill();
    ctx.restore();
    for (var i = 0; i < L.letters.length; i++) {
      var l = L.letters[i];
      var hop = Math.pow(Math.max(0, Math.sin(t * 2.2 - i * 0.45)), 12) * sz * 0.16;
      var wave = Math.sin(t * 2.5 + i * 0.55) * sz * 0.03;
      var rot = Math.sin(t * 1.7 + i * 0.9) * 0.035;
      ctx.save();
      ctx.translate(x + l.w / 2, -hop + wave);
      ctx.rotate(rot);
      var sq = 1 + hop / sz * 0.6;
      ctx.scale(1 / Math.sqrt(sq), sq);
      ctx.drawImage(l.c, -l.w / 2 - l.pad, -l.by, l.c.width, l.c.height);
      ctx.restore();
      x += l.w + L.spacing;
    }
    // cursor parpadeante
    if ((t * 1.6) % 1 < 0.6) {
      var cxp = L.total / 2 + sz * 0.12;
      ctx.fillStyle = '#1d0b2e'; ctx.fillRect(cxp, -sz * 0.05 + 4, sz * 0.36, sz * 0.13);
      ctx.fillStyle = '#7dffb0'; ctx.fillRect(cxp - 2, -sz * 0.05, sz * 0.36, sz * 0.12);
      A.glow(ctx, cxp + sz * 0.16, -sz * 0.0, sz * 0.4, '#7dffb0', 0.5);
    }
    // taza humeante sobre la "O"
    var o0 = L.letters[0], mx = -L.total / 2 + o0.w * 0.5 - sz * 0.05, my = -sz * 0.98;
    ctx.save(); ctx.translate(mx, my + Math.sin(t * 2.5) * sz * 0.02); ctx.rotate(-0.18 + Math.sin(t * 1.5) * 0.05);
    var m = sz / 80 * 1.35;
    ctx.scale(m, m);
    var steam = A.blob('#ffffff');
    for (var s = 0; s < 5; s++) {
      var ph = (t * 0.6 + s / 5) % 1, r = 5 + ph * 10;
      ctx.globalAlpha = (1 - ph) * 0.6 * Math.min(1, ph * 5);
      ctx.drawImage(steam, Math.sin(ph * 6 + s) * 6 - r, -22 - ph * 40 - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1d0b2e'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(15, 2, 8, -PI / 2, PI / 2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.stroke();
    A.rr(ctx, -16, -16, 32, 34, 8); var mg = ctx.createLinearGradient(-16, 0, 16, 0); mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, '#c9c2e0');
    ctx.fillStyle = mg; ctx.fill(); ctx.strokeStyle = '#1d0b2e'; ctx.lineWidth = 3.5; ctx.stroke();
    A.ell(ctx, 0, -15, 14, 4); ctx.fillStyle = '#5a2a10'; ctx.fill(); ctx.strokeStyle = '#1d0b2e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ff4f6d'; ctx.font = 'bold 13px ' + A.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('</>', 0, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; A.rr(ctx, -12, -9, 4, 20, 2); ctx.fill();
    ctx.restore();
    // subtítulo
    var sub = '// co-op de oficina a contrarreloj';
    ctx.font = 'bold ' + Math.round(sz * 0.2) + 'px ' + A.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var sw2 = ctx.measureText(sub).width + sz * 0.5;
    ctx.fillStyle = 'rgba(15,8,35,0.75)'; A.rr(ctx, -sw2 / 2, sz * 0.32, sw2, sz * 0.36, sz * 0.18); ctx.fill();
    ctx.strokeStyle = 'rgba(125,255,176,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#7dffb0'; ctx.fillText(sub, 0, sz * 0.5 + 1);
    ctx.restore();
  };

  /* ===================================================== FONDO DE MENÚ */
  var menu = null;
  function buildMenu() {
    var R = A.rng(2024), cols = [], strips = [];
    var CH = '01{}[]();<>/=+*&|!?$#fnifletvarconst=>.:'.split('');
    for (var s = 0; s < 6; s++) {
      var c = A.canvas(18, 760), g = c.getContext('2d');
      g.font = 'bold 14px ' + A.MONO; g.textAlign = 'center'; g.textBaseline = 'top';
      for (var y = 0; y < 760; y += 19) {
        var a = 0.25 + R() * 0.75;
        g.fillStyle = 'rgba(125,255,200,' + (a * 0.7) + ')';
        if (R() < 0.15) g.fillStyle = 'rgba(160,140,255,' + a + ')';
        g.fillText(CH[(R() * CH.length) | 0], 9, y);
      }
      strips.push(c);
    }
    for (var i = 0; i < 46; i++) cols.push({ x: i * 28 + R() * 10, sp: 25 + R() * 60, off: R() * 760, s: (R() * 6) | 0, a: 0.12 + R() * 0.22 });
    // ventanas flotantes
    var floats = [];
    var SYN = ['#ff79c6', '#8be9fd', '#50fa7b', '#f1fa8c', '#bd93f9', '#ffb86c'];
    for (var f = 0; f < 11; f++) {
      var kind = f % 4, w, h, cc, gg;
      if (kind === 0 || kind === 1) {
        w = 140 + R() * 120; h = 90 + R() * 70; cc = A.canvas(w + 12, h + 12); gg = cc.getContext('2d');
        gg.translate(4, 4);
        gg.fillStyle = 'rgba(0,0,0,0.35)'; A.rr(gg, 4, 6, w, h, 10); gg.fill();
        A.rr(gg, 0, 0, w, h, 10); gg.fillStyle = '#1b1f38'; gg.fill(); gg.strokeStyle = 'rgba(255,255,255,0.25)'; gg.lineWidth = 1.5; gg.stroke();
        gg.save(); A.rr(gg, 0, 0, w, h, 10); gg.clip();
        var lc = ['#4da3ff', '#3ddc84', '#ffb02e', '#a66cff'][(R() * 4) | 0];
        gg.fillStyle = lc; gg.fillRect(0, 0, w, 16);
        gg.restore();
        ['#ff5f57', '#febc2e', '#28c840'].forEach(function (c2, k) { gg.fillStyle = c2; A.circle(gg, 10 + k * 10, 8, 3); gg.fill(); });
        for (var ln = 0; ln < (h - 26) / 9; ln++) {
          var lx = 10 + ((R() * 4) | 0) * 8, ly = 24 + ln * 9;
          gg.fillStyle = 'rgba(98,114,164,0.7)'; gg.fillRect(4, ly, 3, 4);
          while (lx < w - 20 && R() < 0.8) { var tw = 8 + R() * 30; gg.fillStyle = SYN[(R() * SYN.length) | 0]; gg.fillRect(lx, ly, Math.min(tw, w - 12 - lx), 4); lx += tw + 5; }
        }
      } else if (kind === 2) {
        w = 70; h = 70; cc = A.canvas(w + 12, h + 12); gg = cc.getContext('2d'); gg.translate(4, 4);
        var pc = ['#ffe066', '#ff9ec7', '#9ee6ff', '#b8ff9e'][(R() * 4) | 0];
        gg.fillStyle = 'rgba(0,0,0,0.3)'; gg.fillRect(4, 6, w, h);
        gg.fillStyle = pc; gg.fillRect(0, 0, w, h); gg.fillStyle = 'rgba(0,0,0,0.1)'; gg.fillRect(0, 0, w, 12);
        gg.font = 'bold 12px ' + A.FONT; gg.fillStyle = '#3a2a50'; gg.textAlign = 'center';
        var notes = [['FIX', 'bug #42'], ['DEPLOY', 'viernes?'], ['TODO:', 'dormir'], ['NO TOCAR', 'legacy'], ['\u00a1CAF\u00c9!', 'x3']];
        var nt = notes[f % notes.length];
        gg.fillText(nt[0], w / 2, 34); gg.fillText(nt[1], w / 2, 52);
      } else {
        w = 60; h = 60; cc = A.canvas(w + 12, h + 12); gg = cc.getContext('2d'); gg.translate(w / 2 + 6, h / 2 + 6);
        var ic = ['coffee', 'bug', 'rocket', 'front', 'back', 'data', 'star'][(R() * 7) | 0];
        A.drawIcon(gg, ic, 0, 0, 40);
      }
      floats.push({ c: cc, x: R() * 1280, y: R() * 900, sp: 10 + R() * 22, rot: (R() - 0.5) * 0.4, rs: 0.2 + R() * 0.5, a: 0.35 + R() * 0.45, z: 0.6 + R() * 0.6, ph: R() * 10 });
    }
    floats.sort(function (a, b) { return a.z - b.z; });
    // base y viñeta
    var base = A.canvas(1280, 720), bg = base.getContext('2d');
    var gr = bg.createLinearGradient(0, 0, 0, 720);
    gr.addColorStop(0, '#120a2e'); gr.addColorStop(0.55, '#24104a'); gr.addColorStop(1, '#3a1450');
    bg.fillStyle = gr; bg.fillRect(0, 0, 1280, 720);
    // rejilla de suelo en perspectiva
    bg.strokeStyle = 'rgba(255,90,160,0.18)'; bg.lineWidth = 1.5;
    for (var gx = -12; gx <= 12; gx++) { bg.beginPath(); bg.moveTo(640 + gx * 20, 470); bg.lineTo(640 + gx * 170, 720); bg.stroke(); }
    var vig = A.canvas(1280, 720), vg = vig.getContext('2d');
    var rg = vg.createRadialGradient(640, 330, 200, 640, 360, 820);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(5,0,15,0.7)');
    vg.fillStyle = rg; vg.fillRect(0, 0, 1280, 720);
    return { cols: cols, strips: strips, floats: floats, base: base, vig: vig };
  }

  A.drawMenuBackground = function (ctx, t) {
    t = A.num(t, 0);
    if (!menu) menu = buildMenu();
    var M = menu;
    ctx.save();
    ctx.drawImage(M.base, 0, 0);
    // líneas horizontales de la rejilla que avanzan
    ctx.strokeStyle = 'rgba(255,90,160,0.2)'; ctx.lineWidth = 1.5;
    for (var i = 0; i < 9; i++) {
      var q = ((i + (t * 0.4) % 1) / 9), yy = 470 + Math.pow(q, 2.2) * 250;
      ctx.globalAlpha = q; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(1280, yy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // glows de ambiente
    A.glow(ctx, 640 + Math.sin(t * 0.3) * 300, 200 + Math.cos(t * 0.4) * 60, 420, '#ff4f6d', 0.12);
    A.glow(ctx, 640 - Math.sin(t * 0.25) * 340, 380, 460, '#4d7bff', 0.12);
    // lluvia de código
    for (var c = 0; c < M.cols.length; c++) {
      var col = M.cols[c], strip = M.strips[col.s], y = (col.off + t * col.sp) % 760;
      ctx.globalAlpha = col.a;
      ctx.drawImage(strip, col.x, y - 760); ctx.drawImage(strip, col.x, y);
    }
    ctx.globalAlpha = 1;
    // ventanas flotantes
    for (var f = 0; f < M.floats.length; f++) {
      var F = M.floats[f], span = 720 + 260;
      var fy = ((F.y - t * F.sp * F.z) % span + span) % span - 180;
      var fx = F.x + Math.sin(t * 0.5 + F.ph) * 20;
      ctx.save(); ctx.globalAlpha = F.a; ctx.translate(fx, fy); ctx.rotate(F.rot + Math.sin(t * F.rs + F.ph) * 0.06); ctx.scale(F.z, F.z);
      ctx.drawImage(F.c, -F.c.width / 2, -F.c.height / 2);
      ctx.restore();
    }
    ctx.drawImage(M.vig, 0, 0);
    ctx.restore();
  };

  A._initUI = function () {
    if (!menu) menu = buildMenu();
    getLogo(1);
    Object.keys(ICONS).forEach(function (k) { A.drawIcon(A.canvas(2, 2).getContext('2d'), k, 0, 0, 24); });
  };
})(window.OW);
