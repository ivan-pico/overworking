/* OVERWORKING — js/art/items.js (agente ART)
 * drawItem: sprites prerenderizados (por kind/lane/contents) a 3x + brillos/humo animados. */
window.OW = window.OW || {};
(function (OW) {
  'use strict';
  var A = OW.Art = OW.Art || {};
  var PI = Math.PI, TAU = PI * 2;
  var RES = 3, S = 48, cache = {};
  var LANE_ORDER = ['front', 'back', 'data'];

  function glyph(g, lane, cx, cy, size, color, lw) { if (A.drawLaneGlyph) A.drawLaneGlyph(g, lane, cx, cy, size, color, lw); }

  function cube(g, cx, cy, s, top, left, right, out) {
    // cubo isométrico: (cx,cy) centro de la cara superior
    var h = s * 0.5;
    g.lineJoin = 'round';
    // izquierda
    g.beginPath(); g.moveTo(cx - s, cy); g.lineTo(cx, cy + h); g.lineTo(cx, cy + h + s * 1.05); g.lineTo(cx - s, cy + s * 1.05); g.closePath();
    g.fillStyle = left; g.fill();
    // derecha
    g.beginPath(); g.moveTo(cx + s, cy); g.lineTo(cx, cy + h); g.lineTo(cx, cy + h + s * 1.05); g.lineTo(cx + s, cy + s * 1.05); g.closePath();
    g.fillStyle = right; g.fill();
    // tapa
    g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx + s, cy); g.lineTo(cx, cy + h); g.lineTo(cx - s, cy); g.closePath();
    g.fillStyle = top; g.fill();
    // contorno
    g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx + s, cy); g.lineTo(cx + s, cy + s * 1.05); g.lineTo(cx, cy + h + s * 1.05);
    g.lineTo(cx - s, cy + s * 1.05); g.lineTo(cx - s, cy); g.closePath();
    g.strokeStyle = out; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(cx - s, cy); g.lineTo(cx, cy + h); g.lineTo(cx + s, cy); g.moveTo(cx, cy + h); g.lineTo(cx, cy + h + s * 1.05);
    g.strokeStyle = A.rgba(out, 0.5); g.lineWidth = 1.2; g.stroke();
    // brillo de arista
    g.beginPath(); g.moveTo(cx - s + 2, cy - 0.5); g.lineTo(cx - 1, cy - h + 1.5);
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.4; g.stroke();
  }

  function onLeftFace(g, cx, cy, s, fn) {
    // transforma a coordenadas de la cara izquierda (u: 0..s, v: 0..s)
    g.save(); g.transform(1, 0.5, 0, 1, cx - s, cy); fn(); g.restore();
  }
  function onRightFace(g, cx, cy, s, fn) {
    g.save(); g.transform(1, -0.5, 0, 1, cx, cy + s * 0.5); fn(); g.restore();
  }

  var DRAW = {};

  DRAW.spec = function (g, it) {
    var L = A.laneInfo(it.lane);
    g.save(); g.translate(24, 24); g.rotate(-0.08);
    g.fillStyle = 'rgba(0,0,0,0.2)'; A.rr(g, -12, -15, 27, 33, 2); g.fill();
    g.beginPath(); g.moveTo(-14, -17); g.lineTo(7, -17); g.lineTo(14, -10); g.lineTo(14, 17); g.lineTo(-14, 17); g.closePath();
    g.fillStyle = '#fdfdf8'; g.fill(); g.strokeStyle = '#3a3550'; g.lineWidth = 1.8; g.lineJoin = 'round'; g.stroke();
    // cabecera
    g.save(); g.clip();
    g.fillStyle = L.color; g.fillRect(-15, -18, 30, 10);
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-15, -18, 30, 3);
    g.restore();
    glyph(g, it.lane, -7, -12.5, 8, '#fff', 3);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(-1, -14, 8, 1.6); g.fillRect(-1, -11, 5, 1.6);
    // esquina doblada
    g.beginPath(); g.moveTo(7, -17); g.lineTo(7, -10); g.lineTo(14, -10); g.closePath();
    g.fillStyle = A.shade(L.color, -0.25); g.fill(); g.strokeStyle = '#3a3550'; g.lineWidth = 1.2; g.stroke();
    // líneas de texto + checkbox
    for (var i = 0; i < 5; i++) {
      var y = -4 + i * 4.2;
      g.strokeStyle = '#9aa0b8'; g.lineWidth = 0.9; g.strokeRect(-10.5, y - 1.3, 2.6, 2.6);
      g.fillStyle = i === 2 ? A.shade(L.color, -0.1) : '#b9bdcc'; g.fillRect(-6, y - 0.8, 10 + ((i * 7) % 5) * 1.6, 1.7);
    }
    g.restore();
  };

  DRAW.code = function (g, it) {
    var L = A.laneInfo(it.lane);
    g.save(); g.translate(24, 24);
    g.fillStyle = 'rgba(0,0,0,0.25)'; A.rr(g, -16, -11, 35, 27, 5); g.fill();
    A.rr(g, -18, -14, 36, 28, 5); g.fillStyle = '#1d2236'; g.fill();
    g.strokeStyle = '#0b0d18'; g.lineWidth = 2; g.stroke();
    // barra de título
    g.save(); A.rr(g, -18, -14, 36, 28, 5); g.clip();
    var tg = g.createLinearGradient(0, -14, 0, -7); tg.addColorStop(0, A.shade(L.color, 0.2)); tg.addColorStop(1, L.color);
    g.fillStyle = tg; g.fillRect(-18, -14, 36, 7);
    g.restore();
    ['#ff5f57', '#febc2e', '#28c840'].forEach(function (c, i) { g.fillStyle = c; A.circle(g, -14 + i * 4, -10.5, 1.4); g.fill(); });
    // código
    var syn = ['#ff79c6', '#8be9fd', '#50fa7b', '#f1fa8c', '#bd93f9', '#ffb86c'];
    var lines = [[0, 6, 1, 9], [2, 4, 3, 7, 5, 4], [2, 10, 0, 5], [4, 7, 2, 6], [0, 3]];
    lines.forEach(function (ln, r) {
      var x = -15 + (r === 1 || r === 2 ? 3 : r === 3 ? 6 : 0), y = -4 + r * 3.6;
      for (var k = 0; k < ln.length; k += 2) {
        g.fillStyle = syn[(ln[k] + r) % syn.length]; g.fillRect(x, y, ln[k + 1] * 0.9, 2);
        x += ln[k + 1] * 0.9 + 1.4;
      }
    });
    // insignia carril
    A.circle(g, 13, 10, 7.5); g.fillStyle = L.color; g.fill(); g.strokeStyle = A.shade(L.dark, -0.4); g.lineWidth = 1.8; g.stroke();
    glyph(g, it.lane, 13, 10, 8, '#fff', 3.2);
    g.fillStyle = 'rgba(255,255,255,0.12)'; A.rr(g, -16, -6, 20, 2, 1); g.fill();
    g.restore();
  };

  function buildCube(g, it, burnt) {
    var L = A.laneInfo(it.lane), cx = 24, cy = 17, s = 14;
    if (burnt) {
      cube(g, cx, cy, s, '#4a3a36', '#2a2220', '#1a1414', '#0a0606');
      // grietas de brasa
      g.strokeStyle = '#ff7a1f'; g.lineWidth = 1.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - 9, cy + 5); g.lineTo(cx - 6, cy + 11); g.lineTo(cx - 8, cy + 16); g.moveTo(cx + 4, cy + 10); g.lineTo(cx + 8, cy + 15); g.lineTo(cx + 6, cy + 21);
      g.moveTo(cx - 4, cy - 3); g.lineTo(cx + 2, cy - 1); g.lineTo(cx + 5, cy + 2); g.stroke();
      // cinta SEGFAULT
      g.save(); g.translate(24, 30); g.rotate(-0.22);
      A.rr(g, -19, -4.5, 38, 9, 1.5); g.fillStyle = '#ffcc1f'; g.fill(); g.strokeStyle = '#1a1414'; g.lineWidth = 1.2; g.stroke();
      g.font = 'bold 6.6px ' + A.MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#c8102e';
      g.fillText('SEGFAULT', 0, 0.4);
      g.restore();
      return;
    }
    cube(g, cx, cy, s, A.shade(L.color, 0.35), L.color, L.dark, A.shade(L.dark, -0.6));
    // cinta de embalar sobre la tapa
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.moveTo(cx - 2.5, cy - 6.6); g.lineTo(cx + 2.5, cy - 4.2); g.lineTo(cx - 4.5, cy - 0.7 + 4.2); g.lineTo(cx - 9.5, cy + 1.8); g.closePath();
    g.fill();
    // cinta bajando por la cara izquierda
    onLeftFace(g, cx, cy, s, function () { g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(s * 0.32, 0, 5, s * 1.05); });
    // glifo en cara derecha
    onRightFace(g, cx, cy, s, function () { glyph(g, it.lane, s * 0.5, s * 0.55, 9, 'rgba(255,255,255,0.95)', 3.2); });
  }

  DRAW.build = function (g, it) { buildCube(g, it, false); };
  DRAW.tested = function (g, it) {
    buildCube(g, it, false);
    // insignia check
    A.circle(g, 36, 12, 8.5); g.fillStyle = '#0d4a28'; g.fill();
    A.circle(g, 36, 11.5, 7.5);
    var cg = g.createRadialGradient(34, 9, 1, 36, 12, 8); cg.addColorStop(0, '#8dffbf'); cg.addColorStop(1, '#21b866');
    g.fillStyle = cg; g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(32.6, 11.8); g.lineTo(35.2, 14.4); g.lineTo(39.6, 8.8); g.stroke();
  };
  DRAW.burnt = function (g, it) { buildCube(g, it, true); };

  function folder(g, it, dirty) {
    var base = dirty ? '#8d7aa8' : '#8a5cf0', dark = dirty ? '#4e4060' : '#4a2aa8', light = dirty ? '#b6a8c8' : '#b393ff';
    var cont = (Array.isArray(it.contents) ? it.contents : []).slice().sort(function (a, b) { return LANE_ORDER.indexOf(a) - LANE_ORDER.indexOf(b); });
    g.save(); g.translate(24, 26);
    g.fillStyle = 'rgba(0,0,0,0.22)'; A.rr(g, -17, -11, 37, 27, 4); g.fill();
    // panel trasero con pestaña
    g.beginPath(); g.moveTo(-19, -12); g.lineTo(-19, -16); g.quadraticCurveTo(-19, -18, -17, -18); g.lineTo(-6, -18); g.lineTo(-3, -14); g.lineTo(17, -14);
    g.quadraticCurveTo(19, -14, 19, -12); g.lineTo(19, 14); g.lineTo(-19, 14); g.closePath();
    g.fillStyle = dark; g.fill(); g.strokeStyle = A.shade(dark, -0.55); g.lineWidth = 1.8; g.lineJoin = 'round'; g.stroke();
    // papeles asomando
    var n = cont.length;
    for (var i = 0; i < n; i++) {
      var L = A.laneInfo(cont[i]);
      var px = -14 + i * 9.5, py = -19 + (i % 2) * 1.5;
      g.save(); g.translate(px + 7, py + 8); g.rotate((i - 1) * 0.12);
      A.rr(g, -7, -8, 14, 16, 1.5); g.fillStyle = L.light; g.fill(); g.strokeStyle = L.dark; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = L.color; g.fillRect(-7, -8, 14, 4);
      g.restore();
    }
    if (!n) { g.fillStyle = '#f4f2fb'; A.rr(g, -14, -16, 26, 10, 1.5); g.fill(); g.strokeStyle = '#9a90b8'; g.lineWidth = 1; g.stroke(); }
    // panel frontal
    g.beginPath(); g.moveTo(-19, -8); g.lineTo(19, -8); g.lineTo(18, 14); g.lineTo(-18, 14); g.closePath();
    var fg = g.createLinearGradient(0, -8, 0, 14); fg.addColorStop(0, light); fg.addColorStop(1, base);
    g.fillStyle = fg; g.fill(); g.strokeStyle = A.shade(dark, -0.55); g.lineWidth = 1.8; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-17, -6.5, 34, 1.5);
    // etiqueta PR + icono merge
    g.font = 'bold 9px ' + A.FONT; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(30,10,70,0.35)'; g.fillText('PR', -15, -1.2 + 0.8);
    g.fillStyle = '#ffffff'; g.fillText('PR', -15, -1.2);
    g.strokeStyle = '#fff'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(5, -5); g.lineTo(5, 2.5); g.moveTo(5, -3); g.quadraticCurveTo(10, -3, 11, 1.5); g.stroke();
    g.fillStyle = '#fff'; A.circle(g, 5, -5, 1.6); g.fill(); A.circle(g, 5, 2.5, 1.6); g.fill(); A.circle(g, 11, 2, 1.6); g.fill();
    // chips de carriles
    for (var c = 0; c < 3; c++) {
      var lane = LANE_ORDER[c], has = cont.indexOf(lane) >= 0, cx = -11 + c * 11, cy = 8.5;
      A.rr(g, cx - 5, cy - 3.6, 10, 7.2, 2.5);
      if (has) { g.fillStyle = A.laneColor(lane); g.fill(); g.strokeStyle = A.shade(A.laneInfo(lane).dark, -0.4); g.lineWidth = 1; g.stroke(); glyph(g, lane, cx, cy, 5.5, '#fff', 3.4); }
      else { g.fillStyle = 'rgba(40,20,80,0.25)'; g.fill(); }
    }
    if (dirty) {
      // mancha de café
      g.strokeStyle = 'rgba(90,50,20,0.45)'; g.lineWidth = 1.6; A.circle(g, 10, 7, 5); g.stroke();
      // post-its
      [[-13, -3, '#ffe066', -0.25], [12, -6, '#ff8fab', 0.3]].forEach(function (p) {
        g.save(); g.translate(p[0], p[1]); g.rotate(p[3]);
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(-4.5, -3.5, 10, 10);
        g.fillStyle = p[2]; g.fillRect(-5, -5, 10, 10);
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-5, -5, 10, 2.5);
        g.fillStyle = '#c8102e'; g.font = 'bold 7px ' + A.FONT; g.textAlign = 'center'; g.fillText('!!', 0, 1.5);
        g.restore();
      });
      // bocadillo de comentario
      g.save(); g.translate(17, -16);
      A.rr(g, -7, -5.5, 14, 10, 3.5); g.fillStyle = '#ff3b4f'; g.fill(); g.strokeStyle = '#5a0010'; g.lineWidth = 1.4; g.stroke();
      g.beginPath(); g.moveTo(-3, 4.5); g.lineTo(-5, 8); g.lineTo(0, 4.5); g.fillStyle = '#ff3b4f'; g.fill();
      g.fillStyle = '#fff'; A.circle(g, -3.5, -0.5, 1.1); g.fill(); A.circle(g, 0, -0.5, 1.1); g.fill(); A.circle(g, 3.5, -0.5, 1.1); g.fill();
      g.restore();
    }
    g.restore();
  }
  DRAW.pr = function (g, it) { folder(g, it, false); };
  DRAW.pr_dirty = function (g, it) { folder(g, it, true); };

  DRAW.extinguisher = function (g) {
    g.save(); g.translate(24, 25);
    // manguera
    g.strokeStyle = '#1b1a22'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(4, -15); g.bezierCurveTo(16, -14, 18, 2, 13, 12); g.stroke();
    g.fillStyle = '#2a2a33'; A.rr(g, 10.5, 10, 6, 7, 1.5); g.fill();
    // cuerpo
    A.rr(g, -9, -13, 18, 33, 8);
    var bg = g.createLinearGradient(-9, 0, 9, 0);
    bg.addColorStop(0, '#a5101e'); bg.addColorStop(0.35, '#ff4a4a'); bg.addColorStop(0.55, '#e8222e'); bg.addColorStop(1, '#7a0a14');
    g.fillStyle = bg; g.fill(); g.strokeStyle = '#3a0008'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.55)'; A.rr(g, -6, -9, 2.5, 22, 1.2); g.fill();
    // etiqueta HOTFIX
    A.rr(g, -9, -1, 18, 9, 1); g.fillStyle = '#fff8e8'; g.fill();
    g.strokeStyle = '#3a0008'; g.lineWidth = 0.8; g.stroke();
    g.font = 'bold 5.4px ' + A.FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#c8102e';
    g.fillText('HOTFIX', 0, 3.6);
    // cabeza y maneta
    A.rr(g, -4.5, -18, 9, 6, 2); g.fillStyle = '#2a2a33'; g.fill();
    g.fillStyle = '#c9ced8'; A.rr(g, -9, -21, 15, 3.5, 1.5); g.fill(); g.strokeStyle = '#1b1a22'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#ffcc1f'; A.circle(g, 2, -15, 1.6); g.fill();
    g.restore();
  };

  function spriteFor(it) {
    var kind = DRAW[it.kind] ? it.kind : 'spec';
    var cont = Array.isArray(it.contents) ? it.contents.slice().sort().join(',') : '';
    var k = kind + '|' + (it.lane || '') + '|' + cont;
    if (cache[k]) return cache[k];
    var c = A.canvas(S * RES, S * RES), g = c.getContext('2d');
    g.scale(RES, RES);
    try { DRAW[kind](g, it); } catch (e) { if (window.console) console.warn('item', kind, e); }
    return (cache[k] = c);
  }

  A.drawItem = function (ctx, item, cx, cy, scale, t) {
    if (!item) return;
    if (typeof item === 'string') item = { kind: item };
    cx = A.num(cx, 0); cy = A.num(cy, 0); scale = A.num(scale, 1); t = A.num(t, 0);
    var sz = 46 * scale, kind = item.kind;
    if (!item.noShadow) A.shadow(ctx, cx, cy + sz * 0.38, sz * 0.36, sz * 0.1, 0.35);
    var bob = 0;
    if (kind === 'tested') bob = Math.sin(t * 3) * 0.8 * scale;
    ctx.drawImage(spriteFor(item), cx - sz / 2, cy - sz / 2 + bob, sz, sz);
    if (kind === 'build' || kind === 'tested') {
      // destello que barre la tapa
      var ph = (t * 0.5 + (cx * 0.01)) % 1;
      if (ph < 0.3) {
        var a = Math.sin(ph / 0.3 * PI);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * a;
        ctx.drawImage(A.blob('#ffffff'), cx - sz * 0.32 + ph / 0.3 * sz * 0.4 - sz * 0.1, cy - sz * 0.36 + bob, sz * 0.22, sz * 0.22);
        ctx.restore();
      }
    }
    if (kind === 'tested') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 3; i++) {
        var a2 = t * 1.6 + i * TAU / 3, r = sz * 0.44;
        var sx = cx + Math.cos(a2) * r, sy = cy - sz * 0.05 + Math.sin(a2) * r * 0.45, ss = (1.3 + Math.sin(t * 6 + i * 2)) * scale * 1.15;
        ctx.fillStyle = 'rgba(180,255,210,0.9)';
        ctx.beginPath(); ctx.moveTo(sx, sy - ss * 2); ctx.lineTo(sx + ss * 0.5, sy - ss * 0.5); ctx.lineTo(sx + ss * 2, sy); ctx.lineTo(sx + ss * 0.5, sy + ss * 0.5);
        ctx.lineTo(sx, sy + ss * 2); ctx.lineTo(sx - ss * 0.5, sy + ss * 0.5); ctx.lineTo(sx - ss * 2, sy); ctx.lineTo(sx - ss * 0.5, sy - ss * 0.5); ctx.fill();
      }
      ctx.restore();
    }
    if (kind === 'burnt') {
      var smoke = A.blob('#3a3438');
      for (var j = 0; j < 4; j++) {
        var p = (t * 0.6 + j / 4) % 1, r2 = (4 + p * 9) * scale;
        ctx.globalAlpha = (1 - p) * 0.55;
        ctx.drawImage(smoke, cx + Math.sin(p * 6 + j) * 4 * scale - r2, cy - sz * 0.3 - p * sz * 0.8 - r2, r2 * 2, r2 * 2);
      }
      ctx.globalAlpha = 1;
      A.glow(ctx, cx, cy, sz * 0.4, '#ff6a1f', 0.12 + 0.08 * Math.sin(t * 9));
    }
  };

  A._initItems = function () {
    ['spec', 'code', 'build', 'tested', 'burnt'].forEach(function (k) {
      LANE_ORDER.forEach(function (l) { spriteFor({ kind: k, lane: l }); });
    });
    spriteFor({ kind: 'pr', contents: [] }); spriteFor({ kind: 'pr_dirty', contents: [] }); spriteFor({ kind: 'extinguisher' });
  };
})(window.OW);
