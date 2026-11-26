/* =====================================================================
 * OVERWORKING — js/art/art.js  (agente ART)
 * Núcleo gráfico: utilidades, paletas, fondos, suelos, barra de progreso
 * e iluminación. Cargar PRIMERO; luego characters.js, stations.js,
 * items.js, fx.js, ui.js. Todo dibujado por código (Canvas 2D).
 *
 * API del contrato (OW.Art): init, PLAYER_COLORS, drawBackground,
 *   drawFloor, drawStation, drawItem, drawCharacter, drawBug, drawManager,
 *   drawFire, drawProgressBar, drawOrderCard, drawIcon, drawLogo,
 *   drawMenuBackground, drawLighting, drawPanel, drawButton, drawRocket.
 * OW.FX: spawn, update, draw, clear.
 *
 * EXTRAS (opcionales, útiles para CORE):
 *   OW.Art.FONT / OW.Art.MONO            fuentes del sistema.
 *   OW.Art.LANES                         {front|back|data:{color,dark,light,name}}
 *   OW.Art.laneColor(lane)               color hex del carril (gris si no existe).
 *   OW.Art.THEMES / OW.Art.theme(name)   paletas por tema.
 *   OW.Art.getCarryPoint(p)              {x,y} donde dibujar el item que lleva
 *                                        un personaje (manos), p = mismo obj. que drawCharacter.
 *   OW.Art.itemAnchor(type, tile)        {x,y} offset recomendado dentro del tile
 *                                        para dibujar el item de una estación.
 *   OW.Art.themeLight(theme)             color de luz ambiental recomendado.
 *   OW.Art.drawSpeechBubble(ctx,x,y,text,t)  bocadillo de diálogo genérico.
 *   OW.Art.drawText(ctx,str,x,y,opts)    texto con contorno/sombra
 *                                        opts:{size,color,align,baseline,weight,outline,font,shadow}.
 *   OW.Art.drawStars(ctx,cx,cy,n,size,t) fila de 3 estrellas (n llenas) para resultados.
 *   OW.Art.shade(hex,f) / mix(a,b,t) / rgba(hex,a)  utilidades de color.
 *   OW.Art.rr(g,x,y,w,h,r)               path de rectángulo redondeado.
 *   OW.Art.drawLaneGlyph(ctx,lane,cx,cy,size,color)  símbolo de carril (</>, { }, cilindro BD).
 *   OW.Art.parseDir(dir)                 normaliza dir de cinta: {x,y} | 'up'/'down'/'left'/'right' | ángulo rad.
 *   OW.FX.count()                        nº de partículas activas (pool fijo de 1500).
 * Notas: drawStation acepta st.dir en cualquiera de esos formatos; drawItem acepta
 *   item.noShadow=true; drawBug acepta bug.scale; drawPanel opts: {title, accent, color,
 *   alpha, radius, glow, noShadow, titleHeight, titleSize}; FX.spawn opts: {count, color,
 *   colors, size, speed, life, dir|angle, spread, lane (glyphs), text, outline (text)}.
 *   Coste: estaciones = sprite cacheado 2x + capa animada ligera; cabezas de personaje cacheadas.
 * ===================================================================== */
window.OW = window.OW || {};
(function (OW) {
  'use strict';
  var A = OW.Art = OW.Art || {};

  A.FONT = '"Trebuchet MS", "Segoe UI", "Ubuntu", system-ui, sans-serif';
  A.MONO = '"Consolas", "DejaVu Sans Mono", "Menlo", "Noto Sans Mono", monospace';
  A.TILE = 64;
  A.W = 1280; A.H = 720;

  A.PLAYER_COLORS = ['#ff4f6d', '#21c7c1', '#a66cff', '#ffc233'];

  A.LANES = {
    front: { color: '#4da3ff', dark: '#1d5fb8', light: '#b5dbff', name: 'Front' },
    back:  { color: '#3ddc84', dark: '#138a48', light: '#b2f7cf', name: 'Back' },
    data:  { color: '#ffb02e', dark: '#b46a00', light: '#ffe2a6', name: 'Data' }
  };
  A.laneInfo = function (lane) {
    return A.LANES[lane] || { color: '#a7b0c4', dark: '#5d667c', light: '#e2e6ef', name: '?' };
  };
  A.laneColor = function (lane) { return A.laneInfo(lane).color; };

  /* ---------------------------------------------------------- utilidades */
  var rgbCache = {};
  function hexToRgb(h) {
    if (rgbCache[h]) return rgbCache[h];
    var s = String(h || '#888').trim(), r = 136, g = 136, b = 136;
    if (s[0] === '#') {
      s = s.slice(1);
      if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
      var n = parseInt(s.slice(0, 6), 16);
      if (!isNaN(n)) { r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255; }
    } else {
      var m = s.match(/(\d+)\D+(\d+)\D+(\d+)/);
      if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
    }
    return (rgbCache[h] = [r, g, b]);
  }
  A.hexToRgb = hexToRgb;
  function toHex(r, g, b) {
    return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
  }
  var shadeCache = {};
  A.shade = function (hex, f) {
    var k = hex + '|' + f;
    if (shadeCache[k]) return shadeCache[k];
    var c = hexToRgb(hex), t = f < 0 ? 0 : 255, p = Math.abs(f);
    return (shadeCache[k] = toHex(c[0] + (t - c[0]) * p, c[1] + (t - c[1]) * p, c[2] + (t - c[2]) * p));
  };
  A.mix = function (a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b);
    return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  };
  A.rgba = function (hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  };
  A.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  A.lerp = function (a, b, t) { return a + (b - a) * t; };
  A.easeOutBack = function (x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  A.easeOutCubic = function (x) { return 1 - Math.pow(1 - x, 3); };
  A.easeInOut = function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  A.hash = function (n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  A.rng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  A.num = function (v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; };

  A.canvas = function (w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  };
  A.rr = function (g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r);
    g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
    g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r);
    g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r);
    g.closePath();
  };
  A.ell = function (g, cx, cy, rx, ry) { g.beginPath(); g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); };
  A.circle = function (g, cx, cy, r) { g.beginPath(); g.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2); };

  /* sprites de blob radial reutilizables (sombras, glows) */
  var blobCache = {};
  A.blob = function (color, inner) {
    var k = color + '|' + (inner || 0);
    if (blobCache[k]) return blobCache[k];
    var c = A.canvas(64, 64), g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, A.rgba(color, 1));
    gr.addColorStop(inner || 0.0001, A.rgba(color, inner ? 1 : 0.95));
    gr.addColorStop(0.55, A.rgba(color, 0.45));
    gr.addColorStop(1, A.rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (blobCache[k] = c);
  };
  /* sombra proyectada suave */
  A.shadow = function (g, cx, cy, rx, ry, a) {
    var s = A.blob('#0a0614', 0.35);
    g.save(); g.globalAlpha *= (a == null ? 0.35 : a);
    g.drawImage(s, cx - rx * 1.25, cy - ry * 1.25, rx * 2.5, ry * 2.5);
    g.restore();
  };
  A.glow = function (g, cx, cy, r, color, a) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= (a == null ? 0.6 : a);
    g.drawImage(A.blob(color), cx - r, cy - r, r * 2, r * 2);
    g.restore();
  };

  /* Bloque 3/4: tapa (x,y,w,h) + cara frontal de profundidad d */
  A.box = function (g, x, y, w, h, d, top, front, o) {
    o = o || {};
    var r = o.r == null ? 6 : o.r, out = o.outline || A.shade(front, -0.62);
    // silueta completa
    A.rr(g, x, y, w, h + d, r);
    var fg = g.createLinearGradient(0, y + h - 2, 0, y + h + d);
    fg.addColorStop(0, A.shade(front, 0.08)); fg.addColorStop(1, A.shade(front, -0.22));
    g.fillStyle = fg; g.fill();
    g.lineWidth = o.lw || 2; g.strokeStyle = out; g.stroke();
    // tapa
    A.rr(g, x + 1, y + 1, w - 2, h - 1, Math.max(0, r - 1));
    var tg = g.createLinearGradient(0, y, 0, y + h);
    tg.addColorStop(0, A.shade(top, 0.12)); tg.addColorStop(1, A.shade(top, -0.06));
    g.fillStyle = tg; g.fill();
    // unión tapa/frente
    g.beginPath(); g.moveTo(x + 2, y + h + 0.5); g.lineTo(x + w - 2, y + h + 0.5);
    g.strokeStyle = A.rgba(out, 0.55); g.lineWidth = 1.5; g.stroke();
    // brillo de borde
    g.beginPath(); g.moveTo(x + r + 1, y + 2.5); g.lineTo(x + w - r - 1, y + 2.5);
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.5; g.stroke();
    if (!o.noFrontShine) {
      g.beginPath(); g.moveTo(x + 3, y + h + 3); g.lineTo(x + w - 3, y + h + 3);
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.stroke();
    }
  };

  /* texto con contorno */
  A.drawText = function (ctx, str, x, y, o) {
    o = o || {};
    var size = o.size || 16;
    ctx.save();
    ctx.font = (o.weight || 'bold') + ' ' + size + 'px ' + (o.font || A.FONT);
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.shadow !== false) {
      ctx.fillStyle = 'rgba(10,5,25,0.45)';
      ctx.fillText(str, x, y + Math.max(1, size * 0.09));
    }
    if (o.outline) {
      ctx.lineJoin = 'round'; ctx.lineWidth = o.outlineWidth || Math.max(2, size * 0.18);
      ctx.strokeStyle = o.outline; ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = o.color || '#fff';
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  /* ------------------------------------------------------------- temas */
  A.THEMES = {
    garage: {
      wall: '#9b4f3c', wallDark: '#6e3426', wallTop: '#c9875a', wallFace: '#7c3f2f', outer: '#3a1f17',
      floor: '#c08a55', floor2: '#ab7745',
      counterTop: '#e3ad72', counterFront: '#94592f', trim: '#5b3420',
      accent: '#ffb347', metal: '#9aa3ad', light: '#ffcf8a', pot: '#c8643c'
    },
    openspace: {
      wall: '#efe8dc', wallDark: '#cfc5b4', wallTop: '#fbf8f2', wallFace: '#d8cdbb', outer: '#2c3a4a',
      floor: '#5aa49b', floor2: '#4f978e',
      counterTop: '#f6f7fb', counterFront: '#aab7cf', trim: '#5c6b86',
      accent: '#ff6b6b', metal: '#c4ccd8', light: '#fff4dc', pot: '#f2f2f2'
    },
    consulting: {
      wall: '#8f9aab', wallDark: '#6b7587', wallTop: '#c3cad6', wallFace: '#5f697b', outer: '#1f2633',
      floor: '#7b8291', floor2: '#717887',
      counterTop: '#d6dae2', counterFront: '#6d7688', trim: '#2c3650',
      accent: '#2f6fd6', metal: '#b4bccb', light: '#eef3ff', pot: '#3a4152'
    },
    datacenter: {
      wall: '#1d2638', wallDark: '#121826', wallTop: '#3a4762', wallFace: '#1a2132', outer: '#070a12',
      floor: '#36425a', floor2: '#2f3a50',
      counterTop: '#66748e', counterFront: '#343e54', trim: '#141a28',
      accent: '#38e1ff', metal: '#8794ad', light: '#7fdcff', pot: '#2b3346'
    },
    deploy: {
      wall: '#55284a', wallDark: '#3a1834', wallTop: '#a0566a', wallFace: '#41203b', outer: '#1d0b1a',
      floor: '#b5745c', floor2: '#a76a53',
      counterTop: '#f1d6bd', counterFront: '#a96a52', trim: '#4a2232',
      accent: '#ff7b3a', metal: '#c9b0a8', light: '#ffb070', pot: '#e36d4a'
    }
  };
  A.theme = function (name) { return A.THEMES[name] || A.THEMES.openspace; };
  A.themeLight = function (name) { return A.theme(name).light; };

  /* =========================================================== FONDOS */
  var bgCache = {};

  function brickWall(g, x0, y0, w, h, base, mortar, seed) {
    g.fillStyle = mortar; g.fillRect(x0, y0, w, h);
    var R = A.rng(seed), bw = 34, bh = 15;
    for (var row = 0, y = y0; y < y0 + h; y += bh, row++) {
      for (var x = x0 - (row % 2 ? bw / 2 : 0); x < x0 + w; x += bw) {
        var v = (R() - 0.5) * 0.22;
        g.fillStyle = v > 0 ? A.shade(base, v) : A.shade(base, v);
        A.rr(g, x + 1.5, y + 1.5, bw - 3, bh - 3, 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 2, y + 2, bw - 4, 2);
      }
    }
  }

  function wallShading(g, x, y, w, h) {
    var gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.05)');
    gr.addColorStop(0.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }

  function frame(g, x, y, w, h, col, th) {
    g.fillStyle = col; A.rr(g, x - th, y - th, w + th * 2, h + th * 2, 3); g.fill();
    g.strokeStyle = A.shade(col, -0.5); g.lineWidth = 1.5; g.stroke();
  }

  function sideWalls(g, th) {
    // muros laterales e inferior vistos desde arriba (grosor)
    var top = th.wallTop, face = th.wallFace;
    [[0, 112, 64, 608], [1216, 112, 64, 608]].forEach(function (r) {
      var gr = g.createLinearGradient(r[0], 0, r[0] + r[2], 0);
      var left = r[0] === 0;
      gr.addColorStop(0, left ? A.shade(top, -0.25) : A.shade(top, 0.05));
      gr.addColorStop(1, left ? A.shade(top, 0.05) : A.shade(top, -0.25));
      g.fillStyle = gr; g.fillRect(r[0], r[1], r[2], r[3]);
      g.fillStyle = A.shade(top, 0.25);
      g.fillRect(left ? 56 : 1216, 112, 8, 608);
      g.fillStyle = A.rgba(A.shade(face, -0.5), 0.7);
      g.fillRect(left ? 63 : 1216, 112, 1, 608);
    });
    g.fillStyle = A.shade(top, -0.1); g.fillRect(0, 704, 1280, 16);
    g.fillStyle = A.shade(top, 0.2); g.fillRect(64, 704, 1152, 3);
  }

  function skyline(g, x, y, w, h, R, cols, litCol, litP) {
    var bx = x;
    while (bx < x + w) {
      var bw = 26 + R() * 48, bh = h * (0.35 + R() * 0.6);
      g.fillStyle = cols[(R() * cols.length) | 0];
      g.fillRect(bx, y + h - bh, bw, bh);
      if (R() < 0.3) { g.fillRect(bx + bw / 2 - 1, y + h - bh - 10, 2, 10); }
      for (var wy = y + h - bh + 6; wy < y + h - 4; wy += 8)
        for (var wx = bx + 4; wx < bx + bw - 5; wx += 7)
          if (R() < litP) { g.fillStyle = litCol; g.fillRect(wx, wy, 3, 4); }
      bx += bw + 2;
    }
  }

  function bgGarage(g, th) {
    brickWall(g, 0, 0, 1280, 120, th.wall, '#5e2c22', 7);
    wallShading(g, 0, 0, 1280, 120);
    // pegboard con herramientas
    frame(g, 110, 16, 250, 82, '#6b4428', 4);
    g.fillStyle = '#c9a272'; g.fillRect(110, 16, 250, 82);
    g.fillStyle = 'rgba(80,50,20,0.45)';
    for (var px = 118; px < 356; px += 10) for (var py = 22; py < 96; py += 10) { A.circle(g, px, py, 1.3); g.fill(); }
    // llave inglesa
    g.save(); g.translate(150, 56); g.rotate(-0.5);
    g.fillStyle = '#aeb7c2'; A.rr(g, -4, -26, 8, 50, 3); g.fill(); g.strokeStyle = '#4b5361'; g.lineWidth = 1.5; g.stroke();
    A.circle(g, 0, -28, 9); g.fill(); g.stroke(); g.fillStyle = '#c9a272'; g.fillRect(-3, -40, 6, 12);
    g.restore();
    // martillo
    g.save(); g.translate(205, 58); g.rotate(0.15);
    g.fillStyle = '#b8743c'; A.rr(g, -3, -20, 6, 46, 2); g.fill(); g.strokeStyle = '#5a3417'; g.stroke();
    g.fillStyle = '#6c7480'; A.rr(g, -14, -30, 28, 11, 2); g.fill(); g.strokeStyle = '#2f343c'; g.stroke();
    g.restore();
    // destornilladores
    ['#e04848', '#3f8ce0', '#f2c230'].forEach(function (c, i) {
      var x = 245 + i * 16;
      g.fillStyle = '#c8ccd2'; g.fillRect(x - 1.5, 52, 3, 34);
      g.fillStyle = c; A.rr(g, x - 4, 28, 8, 26, 3); g.fill(); g.strokeStyle = A.shade(c, -0.5); g.lineWidth = 1.2; g.stroke();
    });
    // sierra
    g.save(); g.translate(318, 58);
    g.fillStyle = '#d6dbe0'; g.beginPath(); g.moveTo(-14, -26); g.lineTo(10, -26); g.lineTo(18, 30); g.lineTo(-14, 30); g.closePath(); g.fill();
    g.strokeStyle = '#5a6068'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#d05a2a'; A.rr(g, -20, -36, 30, 14, 5); g.fill(); g.strokeStyle = '#6a2a10'; g.stroke();
    g.restore();
    // estantería
    g.fillStyle = '#7a4a2a'; g.fillRect(410, 74, 250, 8); g.fillStyle = '#9a6238'; g.fillRect(410, 72, 250, 3);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(412, 82, 246, 5);
    // botes de pintura
    [['#3f8ce0', 430], ['#e04848', 462]].forEach(function (p) {
      g.fillStyle = '#b9c0c8'; A.rr(g, p[1], 46, 26, 27, 3); g.fill(); g.strokeStyle = '#4b5361'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = p[0]; g.fillRect(p[1] + 1, 54, 24, 11);
      g.fillStyle = p[0]; g.fillRect(p[1] + 4, 43, 6, 4);
    });
    // caja de cartón
    g.fillStyle = '#c99b5f'; A.rr(g, 500, 34, 66, 39, 2); g.fill(); g.strokeStyle = '#6b4a22'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#e3c08a'; g.fillRect(528, 34, 10, 39);
    A.drawText(g, 'CABLES', 533, 58, { size: 10, color: '#5a3a14', shadow: false });
    // monitor CRT viejo
    g.fillStyle = '#d9d2bd'; A.rr(g, 580, 26, 64, 47, 6); g.fill(); g.strokeStyle = '#6d6650'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#1a3b2a'; A.rr(g, 588, 32, 48, 32, 5); g.fill();
    g.fillStyle = '#5dff9a'; g.font = 'bold 9px ' + A.MONO; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText('C:\\>_', 592, 37); g.fillText('BOOT OK', 592, 49);
    // puerta de garaje
    frame(g, 760, 8, 300, 112, '#59616e', 5);
    for (var s = 0; s < 8; s++) {
      var sy = 8 + s * 14;
      var gr = g.createLinearGradient(0, sy, 0, sy + 14);
      gr.addColorStop(0, '#c7d0dc'); gr.addColorStop(0.7, '#a6b0be'); gr.addColorStop(1, '#7f8a9a');
      g.fillStyle = gr; g.fillRect(760, sy, 300, 14);
      g.fillStyle = 'rgba(40,48,60,0.5)'; g.fillRect(760, sy + 13, 300, 1);
    }
    g.fillStyle = '#4b5361'; A.rr(g, 895, 96, 30, 7, 3); g.fill();
    // ventanitas puerta
    for (var wv = 0; wv < 4; wv++) {
      g.fillStyle = '#ffd89a'; A.rr(g, 785 + wv * 70, 26, 50, 16, 2); g.fill();
      g.strokeStyle = '#59616e'; g.lineWidth = 2; g.stroke();
    }
    // póster
    g.save(); g.translate(1130, 58); g.rotate(0.04);
    g.fillStyle = '#1e1b3a'; g.fillRect(-46, -40, 92, 74);
    g.fillStyle = '#ff5a8a'; g.fillRect(-46, -40, 92, 6);
    A.drawText(g, 'HOLA', 0, -16, { size: 18, color: '#ffe66d', shadow: false, font: A.MONO });
    A.drawText(g, 'MUNDO', 0, 4, { size: 18, color: '#5dfdcb', shadow: false, font: A.MONO });
    A.drawText(g, 'v0.0.1', 0, 24, { size: 9, color: '#9aa0c8', shadow: false, font: A.MONO });
    g.fillStyle = '#d8d8d8'; A.circle(g, -40, -36, 2.5); g.fill(); A.circle(g, 40, -36, 2.5); g.fill();
    g.restore();
    // zócalo
    g.fillStyle = '#5b3420'; g.fillRect(0, 108, 1280, 12);
    g.fillStyle = '#7a4a2c'; g.fillRect(0, 108, 1280, 3);
  }

  function bgOpenspace(g, th) {
    g.fillStyle = th.wall; g.fillRect(0, 0, 1280, 120);
    var wins = [[90, 10, 350, 92], [480, 10, 350, 92], [870, 10, 330, 92]];
    var R = A.rng(42);
    wins.forEach(function (w) {
      frame(g, w[0], w[1], w[2], w[3], '#3b4556', 4);
      g.save(); A.rr(g, w[0], w[1], w[2], w[3], 2); g.clip();
      var sky = g.createLinearGradient(0, w[1], 0, w[1] + w[3]);
      sky.addColorStop(0, '#4fb3ff'); sky.addColorStop(0.7, '#a7dcff'); sky.addColorStop(1, '#e3f4ff');
      g.fillStyle = sky; g.fillRect(w[0], w[1], w[2], w[3]);
      skyline(g, w[0] - 10, w[1] + 30, w[2] + 20, 62, R, ['#9bb6d4', '#8eaacb'], 'rgba(255,255,255,0.6)', 0.15);
      skyline(g, w[0] - 10, w[1] + 44, w[2] + 20, 48, R, ['#5d7ea6', '#6688b0', '#53739a'], '#ffe9a8', 0.25);
      g.restore();
      // parteluces
      g.fillStyle = '#3b4556';
      for (var m = 1; m < 3; m++) g.fillRect(w[0] + (w[2] * m) / 3 - 2, w[1], 4, w[3]);
      g.fillRect(w[0], w[1] + 40, w[2], 3);
      // reflejo
      g.save(); A.rr(g, w[0], w[1], w[2], w[3], 2); g.clip();
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.beginPath(); g.moveTo(w[0] + 30, w[1]); g.lineTo(w[0] + 80, w[1]); g.lineTo(w[0] + 20, w[1] + w[3]); g.lineTo(w[0] - 30, w[1] + w[3]); g.fill();
      g.restore();
    });
    // alféizar
    g.fillStyle = '#d9cfbf'; g.fillRect(80, 100, 1130, 8); g.fillStyle = '#fff'; g.fillRect(80, 100, 1130, 2);
    // pufs
    [[150, '#ff6b6b'], [330, '#ffd93d'], [610, '#6bcb77'], [1000, '#7b8cff'], [1150, '#ff9ed2']].forEach(function (p) {
      var x = p[0], c = p[1];
      A.shadow(g, x, 118, 30, 6, 0.4);
      var gr = g.createRadialGradient(x - 8, 98, 2, x, 106, 30);
      gr.addColorStop(0, A.shade(c, 0.35)); gr.addColorStop(1, A.shade(c, -0.25));
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(x - 28, 116); g.bezierCurveTo(x - 32, 92, x - 14, 84, x, 86);
      g.bezierCurveTo(x + 16, 84, x + 32, 94, x + 28, 116); g.closePath(); g.fill();
      g.strokeStyle = A.shade(c, -0.55); g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x - 4, 100, 12, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
    });
    g.fillStyle = '#c9bca6'; g.fillRect(0, 112, 1280, 8); g.fillStyle = '#fff'; g.fillRect(0, 112, 1280, 2);
  }

  function bgConsulting(g, th) {
    g.fillStyle = th.wall; g.fillRect(0, 0, 1280, 120);
    for (var x = 0; x < 1280; x += 40) { g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(x, 0, 2, 120); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 2, 0, 1, 120); }
    wallShading(g, 0, 0, 1280, 120);
    g.fillStyle = '#2c3650'; g.fillRect(0, 84, 1280, 6);
    // pizarra 1: gráfico de barras
    frame(g, 100, 12, 250, 82, '#b8bec8', 4);
    g.fillStyle = '#fbfcff'; g.fillRect(100, 12, 250, 82);
    g.strokeStyle = '#333'; g.lineWidth = 2; g.beginPath(); g.moveTo(120, 22); g.lineTo(120, 84); g.lineTo(330, 84); g.stroke();
    [['#2f6fd6', 30], ['#e0483e', 46], ['#2f6fd6', 38], ['#3fbf6f', 58], ['#f2b632', 26], ['#3fbf6f', 52]].forEach(function (b, i) {
      g.fillStyle = b[0]; g.fillRect(132 + i * 32, 84 - b[1], 20, b[1]);
    });
    A.drawText(g, 'Q4 \u00bf?', 300, 26, { size: 12, color: '#e0483e', shadow: false });
    // pizarra 2: línea que sube
    frame(g, 400, 12, 240, 82, '#b8bec8', 4);
    g.fillStyle = '#fbfcff'; g.fillRect(400, 12, 240, 82);
    g.strokeStyle = '#2f6fd6'; g.lineWidth = 3; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(415, 80); g.lineTo(450, 70); g.lineTo(480, 74); g.lineTo(515, 52); g.lineTo(545, 58); g.lineTo(590, 24); g.stroke();
    g.fillStyle = '#2f6fd6'; g.beginPath(); g.moveTo(598, 18); g.lineTo(582, 22); g.lineTo(594, 32); g.fill();
    A.drawText(g, 'SINERGIA \u2191', 470, 28, { size: 12, color: '#1d2a44', shadow: false });
    [['#ffe066', 600, 60], ['#ff9ec7', 616, 70], ['#9ee6ff', 412, 18]].forEach(function (s) {
      g.save(); g.translate(s[1], s[2]); g.rotate(0.12);
      g.fillStyle = s[0]; g.fillRect(-9, -9, 18, 18); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-9, 6, 18, 3); g.restore();
    });
    // póster
    frame(g, 840, 14, 110, 66, '#1d2a44', 3);
    var pg = g.createLinearGradient(0, 14, 0, 80); pg.addColorStop(0, '#ffb36b'); pg.addColorStop(1, '#5b6fd6');
    g.fillStyle = pg; g.fillRect(840, 14, 110, 66);
    g.fillStyle = '#2b2f55'; g.beginPath(); g.moveTo(840, 70); g.lineTo(880, 36); g.lineTo(905, 56); g.lineTo(925, 42); g.lineTo(950, 70); g.lineTo(950, 80); g.lineTo(840, 80); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(880, 36); g.lineTo(872, 43); g.lineTo(888, 43); g.fill();
    A.drawText(g, 'LIDERAZGO', 895, 73, { size: 9, color: '#fff', shadow: false });
    // ventana con persianas
    frame(g, 990, 10, 200, 84, '#3d4658', 4);
    var bl = g.createLinearGradient(0, 10, 0, 94); bl.addColorStop(0, '#cfe4ff'); bl.addColorStop(1, '#8fb3e0');
    g.fillStyle = bl; g.fillRect(990, 10, 200, 84);
    for (var s = 0; s < 12; s++) {
      g.fillStyle = s % 2 ? '#e7eaef' : '#dde1e8'; g.fillRect(990, 12 + s * 7, 200, 4.5);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(990, 16 + s * 7, 200, 0.8);
    }
    g.fillStyle = '#8890a0'; g.fillRect(1086, 10, 2, 84);
    // ficus
    g.fillStyle = '#e9ecf2'; A.rr(g, 1210, 82, 34, 30, 4); g.fill(); g.strokeStyle = '#606878'; g.lineWidth = 1.5; g.stroke();
    var R = A.rng(5);
    for (var i = 0; i < 26; i++) {
      var a = R() * Math.PI * 2, d = R() * 22;
      g.fillStyle = A.mix('#2e8b57', '#6fcf6f', R());
      A.ell(g, 1227 + Math.cos(a) * d, 52 + Math.sin(a) * d * 0.9, 7, 4.5); g.fill();
    }
    g.fillStyle = '#3a4152'; g.fillRect(0, 108, 1280, 12); g.fillStyle = '#56607a'; g.fillRect(0, 108, 1280, 2);
  }

  function bgDatacenter(g, th, info) {
    g.fillStyle = th.wall; g.fillRect(0, 0, 1280, 120);
    for (var x = 0; x < 1280; x += 80) {
      g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(x, 0, 1, 120);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 1, 0, 1, 120);
      g.fillStyle = '#58667f'; A.circle(g, x + 6, 6, 1.4); g.fill(); A.circle(g, x + 74, 6, 1.4); g.fill();
    }
    // tira de luz
    var tl = g.createLinearGradient(0, 0, 0, 14); tl.addColorStop(0, '#9ff0ff'); tl.addColorStop(1, 'rgba(56,225,255,0)');
    g.fillStyle = tl; g.fillRect(0, 0, 1280, 14);
    // racks
    info.leds = [];
    var R = A.rng(99);
    for (var rx = 80; rx < 1180; rx += 92) {
      if (rx > 540 && rx < 700) continue;
      g.fillStyle = '#0c111c'; A.rr(g, rx, 14, 80, 104, 4); g.fill();
      g.strokeStyle = '#46526b'; g.lineWidth = 2; g.stroke();
      for (var u = 0; u < 9; u++) {
        var uy = 20 + u * 10.5;
        var ug = g.createLinearGradient(0, uy, 0, uy + 9);
        ug.addColorStop(0, '#2b3448'); ug.addColorStop(1, '#1b2232');
        g.fillStyle = ug; g.fillRect(rx + 5, uy, 70, 9);
        g.fillStyle = 'rgba(0,0,0,0.5)'; for (var vx = rx + 30; vx < rx + 70; vx += 3) g.fillRect(vx, uy + 2, 1.5, 5);
        for (var l = 0; l < 3; l++) info.leds.push([rx + 9 + l * 5, uy + 3.5, R() < 0.7 ? (R() < 0.5 ? '#3dff8a' : '#38e1ff') : '#ffb02e', R() * 10, 0.5 + R() * 3]);
      }
      g.fillStyle = 'rgba(120,200,255,0.07)'; g.beginPath(); g.moveTo(rx + 10, 14); g.lineTo(rx + 34, 14); g.lineTo(rx + 12, 118); g.lineTo(rx, 118); g.fill();
    }
    // cartel
    frame(g, 560, 30, 130, 52, '#0e1422', 3);
    g.fillStyle = '#123049'; g.fillRect(560, 30, 130, 52);
    A.drawText(g, '\u2744 PASILLO', 625, 46, { size: 13, color: '#bff4ff', shadow: false });
    A.drawText(g, 'FR\u00cdO', 625, 66, { size: 15, color: '#38e1ff', shadow: false });
    // bandeja de cables
    g.fillStyle = '#2a3348'; g.fillRect(0, 2, 1280, 6);
    ['#ff4f6d', '#38e1ff', '#ffd23f', '#3dff8a'].forEach(function (c, i) {
      g.strokeStyle = c; g.lineWidth = 2; g.beginPath();
      for (var cx = 0; cx <= 1280; cx += 160) {
        if (cx === 0) g.moveTo(0, 8); else g.quadraticCurveTo(cx - 80, 14 + i * 3, cx, 8);
      }
      g.stroke();
    });
    g.fillStyle = '#0c111c'; g.fillRect(0, 112, 1280, 8); g.fillStyle = '#38e1ff'; g.globalAlpha = 0.5; g.fillRect(0, 112, 1280, 1.5); g.globalAlpha = 1;
  }

  function bgDeploy(g, th) {
    g.fillStyle = th.wall; g.fillRect(0, 0, 1280, 120);
    for (var x = 0; x < 1280; x += 48) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, 0, 3, 120); }
    // ventana gigante con atardecer (cielo dibujado aquí, sol en animado)
    frame(g, 330, 8, 620, 100, '#2a1225', 5);
    g.fillStyle = '#2a1225'; g.fillRect(330, 8, 620, 100);
    var wl = g.createLinearGradient(0, 108, 0, 300);
    wl.addColorStop(0, 'rgba(255,140,60,0.25)'); wl.addColorStop(1, 'rgba(255,140,60,0)');
    // cartel "NUNCA DESPLEGAR EN VIERNES"
    g.save(); g.translate(180, 58); g.rotate(-0.04);
    g.fillStyle = '#fff6e0'; A.rr(g, -95, -38, 190, 72, 4); g.fill(); g.strokeStyle = '#2a1225'; g.lineWidth = 2; g.stroke();
    A.drawText(g, 'NUNCA', 0, -20, { size: 16, color: '#222', shadow: false });
    g.strokeStyle = '#e0302e'; g.lineWidth = 4; g.beginPath(); g.moveTo(-34, -14); g.lineTo(34, -26); g.stroke();
    A.drawText(g, 'DESPLEGAR', 0, 0, { size: 16, color: '#222', shadow: false });
    A.drawText(g, 'EN VIERNES', 0, 20, { size: 16, color: '#e0302e', shadow: false });
    g.fillStyle = 'rgba(230,220,160,0.8)'; g.save(); g.rotate(-0.6); g.fillRect(-60, -64, 34, 10); g.restore();
    g.restore();
    // reloj digital marco
    frame(g, 1010, 26, 170, 64, '#1a0a16', 4);
    g.fillStyle = '#160812'; g.fillRect(1010, 26, 170, 64);
    g.fillStyle = 'rgba(255,40,40,0.08)'; g.font = 'bold 44px ' + A.MONO; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('88:88', 1095, 59);
    A.drawText(g, 'VIERNES', 1095, 33, { size: 9, color: '#ff8a5a', shadow: false });
    g.fillStyle = '#2a1225'; g.fillRect(0, 108, 1280, 12); g.fillStyle = '#7a3a52'; g.fillRect(0, 108, 1280, 2);
  }

  function buildBackground(theme) {
    var th = A.theme(theme), c = A.canvas(1280, 720), g = c.getContext('2d'), info = { canvas: c };
    g.fillStyle = th.outer; g.fillRect(0, 0, 1280, 720);
    ({ garage: bgGarage, openspace: bgOpenspace, consulting: bgConsulting, datacenter: bgDatacenter, deploy: bgDeploy }[theme] || bgOpenspace)(g, th, info);
    sideWalls(g, th);
    // sombra del muro trasero sobre el suelo (por si el suelo se dibuja translúcido)
    return info;
  }

  function getBg(theme) {
    if (!A.THEMES[theme]) theme = 'openspace';
    return bgCache[theme] || (bgCache[theme] = buildBackground(theme));
  }

  /* nubes reutilizables */
  var cloudSprite = null;
  function getCloud() {
    if (cloudSprite) return cloudSprite;
    var c = A.canvas(120, 50), g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.92)';
    [[30, 32, 18], [55, 24, 22], [82, 30, 17], [100, 36, 11], [16, 38, 10]].forEach(function (b) { A.circle(g, b[0], b[1], b[2]); g.fill(); });
    g.fillRect(16, 34, 90, 12);
    cloudSprite = c; return c;
  }

  A.drawBackground = function (ctx, theme, t) {
    t = A.num(t, 0);
    var info = getBg(theme), th = A.theme(theme);
    ctx.drawImage(info.canvas, 0, 0);
    if (theme === 'garage') {
      // bombilla colgante
      var sw = Math.sin(t * 1.3) * 0.08, bx = 690, flick = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.1);
      ctx.save(); ctx.translate(bx, 0); ctx.rotate(sw);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 44); ctx.stroke();
      ctx.fillStyle = '#333'; ctx.fillRect(-5, 42, 10, 8);
      A.glow(ctx, 0, 60, 70 * flick, '#ffb050', 0.55 * flick);
      ctx.fillStyle = A.mix('#ffd27a', '#fff6d0', flick); A.circle(ctx, 0, 58, 9); ctx.fill();
      ctx.fillStyle = '#fff'; A.circle(ctx, -3, 55, 3); ctx.fill();
      ctx.restore();
      // rendija de luz bajo la puerta
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,200,120,' + (0.25 + 0.05 * Math.sin(t)) + ')'; ctx.fillRect(762, 114, 296, 4);
      ctx.restore();
    } else if (theme === 'openspace') {
      var cl = getCloud();
      [[90, 10, 350, 92], [480, 10, 350, 92], [870, 10, 330, 92]].forEach(function (w, i) {
        ctx.save(); ctx.beginPath(); ctx.rect(w[0], w[1], w[2], 38); ctx.clip();
        for (var k = 0; k < 3; k++) {
          var span = 1280 + 240, x = ((t * (8 + k * 3) + k * 520 + i * 130) % span) - 160;
          ctx.globalAlpha = 0.75 - k * 0.15; ctx.drawImage(cl, x, w[1] + 2 + k * 9, 90 - k * 16, 38 - k * 7);
        }
        ctx.restore();
      });
      // neón
      var on = (Math.sin(t * 2) > -0.9 || Math.sin(t * 37) > 0) ? 1 : 0.35;
      ctx.save(); ctx.translate(655, 68);
      ctx.fillStyle = 'rgba(40,20,40,0.85)'; A.rr(ctx, -95, -14, 190, 28, 14); ctx.fill();
      if (on > 0.5) A.glow(ctx, 0, 0, 110, '#ff4fa3', 0.35);
      A.drawText(ctx, 'MU\u00c9VETE R\u00c1PIDO', 0, 1, { size: 16, color: on > 0.5 ? '#ffd0ec' : '#9a5a7a', shadow: false, outline: on > 0.5 ? '#ff4fa3' : null, outlineWidth: 2 });
      ctx.restore();
    } else if (theme === 'consulting') {
      // reloj de pared
      var cx = 740, cy = 50;
      ctx.save();
      A.shadow(ctx, cx + 3, cy + 5, 34, 34, 0.35);
      ctx.fillStyle = '#2c3650'; A.circle(ctx, cx, cy, 34); ctx.fill();
      ctx.fillStyle = '#fbfcff'; A.circle(ctx, cx, cy, 29); ctx.fill();
      ctx.strokeStyle = '#2c3650'; ctx.lineWidth = 2;
      for (var h = 0; h < 12; h++) {
        var a = h * Math.PI / 6; ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24); ctx.lineTo(cx + Math.cos(a) * 27, cy + Math.sin(a) * 27); ctx.stroke();
      }
      var sec = Math.floor(t) + Math.min(1, (t % 1) * 8) * 1; // tic-tac
      var ah = (t / 60) * Math.PI * 2 / 12 - Math.PI / 2 + 0.4, am = (t / 60) * Math.PI * 2 - Math.PI / 2 - 1.2, as = sec / 60 * Math.PI * 2 - Math.PI / 2;
      ctx.lineCap = 'round';
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ah) * 14, cy + Math.sin(ah) * 14); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(am) * 21, cy + Math.sin(am) * 21); ctx.stroke();
      ctx.strokeStyle = '#e0483e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - Math.cos(as) * 5, cy - Math.sin(as) * 5); ctx.lineTo(cx + Math.cos(as) * 24, cy + Math.sin(as) * 24); ctx.stroke();
      ctx.fillStyle = '#e0483e'; A.circle(ctx, cx, cy, 2.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(cx, cy, 27, Math.PI * 1.1, Math.PI * 1.6); ctx.arc(cx, cy, 20, Math.PI * 1.6, Math.PI * 1.1, true); ctx.fill();
      ctx.restore();
    } else if (theme === 'datacenter') {
      var leds = info.leds || [];
      for (var i = 0; i < leds.length; i++) {
        var L = leds[i], on2 = Math.sin(t * L[4] + L[3]) > -0.2;
        ctx.fillStyle = on2 ? L[2] : '#23304a';
        ctx.fillRect(L[0], L[1], 3, 2.5);
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var sweep = (t * 120) % 1600 - 160;
      var sg = ctx.createLinearGradient(sweep - 80, 0, sweep + 80, 0);
      sg.addColorStop(0, 'rgba(56,225,255,0)'); sg.addColorStop(0.5, 'rgba(56,225,255,0.10)'); sg.addColorStop(1, 'rgba(56,225,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(sweep - 80, 0, 160, 120);
      ctx.restore();
    } else if (theme === 'deploy') {
      ctx.save(); A.rr(ctx, 330, 8, 620, 100, 2); ctx.clip();
      if (!info.sky) {
        var skc = A.canvas(620, 100), skg = skc.getContext('2d');
        var sky = skg.createLinearGradient(0, 0, 0, 100);
        sky.addColorStop(0, '#5b2a7a'); sky.addColorStop(0.45, '#ff4f6d'); sky.addColorStop(0.8, '#ff9a3c'); sky.addColorStop(1, '#ffd36b');
        skg.fillStyle = sky; skg.fillRect(0, 0, 620, 100);
        info.sky = skc;
      }
      ctx.drawImage(info.sky, 330, 8);
      var sunY = 92 + Math.sin(t * 0.2) * 2;
      A.glow(ctx, 640, sunY, 120, '#ffb347', 0.6);
      ctx.fillStyle = '#ffe27a'; A.circle(ctx, 640, sunY, 34); ctx.fill();
      ctx.fillStyle = 'rgba(255,79,109,0.55)';
      for (var bnd = 0; bnd < 4; bnd++) ctx.fillRect(600, sunY - 2 + bnd * 7 + Math.sin(t * 2 + bnd) * 1.5, 80, 2.5);
      if (!info.city) {
        var cc = A.canvas(640, 60), cg = cc.getContext('2d');
        skyline(cg, 0, 0, 640, 60, A.rng(3), ['#3a1838', '#2f1430', '#45203f'], '#ffcf6b', 0.18);
        info.city = cc;
      }
      ctx.drawImage(info.city, 320, 50);
      // pájaros
      ctx.strokeStyle = '#2a1225'; ctx.lineWidth = 1.5;
      for (var b = 0; b < 3; b++) {
        var bx2 = 330 + ((t * 25 + b * 90) % 680), by = 30 + b * 9 + Math.sin(t * 2 + b) * 4, f = Math.sin(t * 10 + b) * 3;
        ctx.beginPath(); ctx.moveTo(bx2 - 6, by - f); ctx.quadraticCurveTo(bx2 - 3, by - 3, bx2, by); ctx.quadraticCurveTo(bx2 + 3, by - 3, bx2 + 6, by - f); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#2a1225'; ctx.fillRect(536, 8, 5, 100); ctx.fillRect(740, 8, 5, 100);
      // reloj 17:59 con dos puntos parpadeando
      A.glow(ctx, 1095, 60, 70, '#ff2a2a', 0.35);
      ctx.save(); ctx.font = 'bold 44px ' + A.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff3b3b';
      ctx.fillText((t % 1) < 0.5 ? '17:59' : '17 59', 1095, 61);
      ctx.restore();
      // banderines DEPLOY DAY
      var letters = 'DEPLOY\u00b7DAY';
      ctx.save();
      ctx.strokeStyle = '#2a1225'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(340, 6); ctx.quadraticCurveTo(640, 34, 940, 6); ctx.stroke();
      for (var k2 = 0; k2 < letters.length; k2++) {
        var u = (k2 + 0.5) / letters.length, fx = 340 + 600 * u, fy = 6 + 4 * 28 * u * (1 - u) * 0.98;
        var wv = Math.sin(t * 4 + k2 * 0.8) * 0.12;
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(wv);
        ctx.fillStyle = k2 % 2 ? '#ffd23f' : '#ff7b3a';
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(42,18,37,0.6)'; ctx.stroke();
        A.drawText(ctx, letters[k2], 0, 10, { size: 12, color: '#2a1225', shadow: false });
        ctx.restore();
      }
      ctx.restore();
      // baliza giratoria
      var ang = t * 5;
      ctx.save(); ctx.translate(288, 12);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,60,40,0.18)';
      var sx = Math.cos(ang);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sx * 160 - 30, 110); ctx.lineTo(sx * 160 + 30, 110); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ff3b2e'; A.rr(ctx, 280, 4, 16, 12, 5); ctx.fill();
      A.glow(ctx, 288, 10, 20, '#ff3b2e', 0.4 + 0.4 * Math.abs(sx));
    }
  };

  /* ============================================================ SUELOS */
  var floorCache = {};
  function buildFloor(theme, cols, rows, tile) {
    var th = A.theme(theme), W = cols * tile, H = rows * tile, c = A.canvas(W, H), g = c.getContext('2d');
    var R = A.rng(cols * 31 + rows * 7 + theme.length);
    var s = tile / 64;
    if (theme === 'garage') {
      var ph = 16 * s;
      for (var y = 0, row = 0; y < H; y += ph, row++) {
        var x = -R() * 120 * s;
        while (x < W) {
          var len = (90 + R() * 120) * s;
          var base = A.mix(th.floor2, th.floor, R());
          var gr = g.createLinearGradient(0, y, 0, y + ph);
          gr.addColorStop(0, A.shade(base, 0.08)); gr.addColorStop(1, A.shade(base, -0.08));
          g.fillStyle = gr; g.fillRect(x, y, len, ph);
          g.strokeStyle = A.rgba('#5a3416', 0.18); g.lineWidth = 1;
          for (var k = 0; k < 3; k++) {
            var gy = y + 3 + R() * (ph - 6); g.beginPath(); g.moveTo(x + 4, gy);
            g.bezierCurveTo(x + len * 0.3, gy + (R() - 0.5) * 4, x + len * 0.6, gy + (R() - 0.5) * 4, x + len - 4, gy); g.stroke();
          }
          g.fillStyle = 'rgba(70,40,15,0.55)'; g.fillRect(x, y, 1.5, ph);
          g.fillStyle = 'rgba(60,35,15,0.5)'; A.circle(g, x + 5, y + ph / 2, 1.2); g.fill(); A.circle(g, x + len - 5, y + ph / 2, 1.2); g.fill();
          x += len;
        }
        g.fillStyle = 'rgba(60,32,12,0.45)'; g.fillRect(0, y + ph - 1, W, 1);
      }
      for (var o = 0; o < 4; o++) {
        g.fillStyle = 'rgba(40,25,15,0.12)'; A.ell(g, R() * W, R() * H, 20 + R() * 30, 10 + R() * 14); g.fill();
      }
    } else if (theme === 'openspace' || theme === 'consulting') {
      for (var ty = 0; ty < rows; ty++) for (var tx = 0; tx < cols; tx++) {
        var alt = (tx + ty) % 2;
        g.fillStyle = alt ? th.floor : th.floor2; g.fillRect(tx * tile, ty * tile, tile, tile);
        g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1;
        for (var l = 4; l < tile; l += 5) {
          g.beginPath();
          if (alt) { g.moveTo(tx * tile + l, ty * tile + 1); g.lineTo(tx * tile + l, ty * tile + tile - 1); }
          else { g.moveTo(tx * tile + 1, ty * tile + l); g.lineTo(tx * tile + tile - 1, ty * tile + l); }
          g.stroke();
        }
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(tx * tile, ty * tile + tile - 1, tile, 1); g.fillRect(tx * tile + tile - 1, ty * tile, 1, tile);
      }
      for (var n = 0; n < W * H / 30; n++) {
        g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
        g.fillRect(R() * W, R() * H, 1.5, 1.5);
      }
      if (theme === 'openspace') {
        // alfombra central con patrón
        var ax = W * 0.3, ay = H * 0.32, aw = W * 0.4, ah = H * 0.36;
        g.fillStyle = 'rgba(255,214,102,0.10)'; A.rr(g, ax, ay, aw, ah, 20); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 3; A.rr(g, ax + 8, ay + 8, aw - 16, ah - 16, 14); g.stroke();
      }
    } else if (theme === 'datacenter') {
      for (var dy = 0; dy < rows; dy++) for (var dx = 0; dx < cols; dx++) {
        var X = dx * tile, Y = dy * tile, perf = (dx * 3 + dy * 5) % 4 === 0;
        var dg = g.createLinearGradient(X, Y, X + tile, Y + tile);
        dg.addColorStop(0, A.shade(th.floor, 0.06)); dg.addColorStop(1, A.shade(th.floor, -0.1));
        g.fillStyle = dg; g.fillRect(X, Y, tile, tile);
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(X + 1, Y + 1, tile - 2, 1.5); g.fillRect(X + 1, Y + 1, 1.5, tile - 2);
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(X, Y + tile - 2, tile, 2); g.fillRect(X + tile - 2, Y, 2, tile);
        if (perf) {
          g.fillStyle = 'rgba(8,12,22,0.75)';
          for (var hy = 9 * s; hy < tile - 6 * s; hy += 7 * s) for (var hx = 9 * s; hx < tile - 6 * s; hx += 7 * s) { A.circle(g, X + hx, Y + hy, 1.6 * s); g.fill(); }
          g.fillStyle = 'rgba(56,225,255,0.05)'; g.fillRect(X + 4, Y + 4, tile - 8, tile - 8);
        } else {
          g.fillStyle = 'rgba(0,0,0,0.12)'; A.circle(g, X + 6, Y + 6, 1.5); g.fill(); A.circle(g, X + tile - 7, Y + 6, 1.5); g.fill();
          A.circle(g, X + 6, Y + tile - 7, 1.5); g.fill(); A.circle(g, X + tile - 7, Y + tile - 7, 1.5); g.fill();
        }
      }
      // cables colando por una baldosa
      g.strokeStyle = 'rgba(255,79,109,0.35)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(W * 0.1, H); g.bezierCurveTo(W * 0.15, H * 0.8, W * 0.05, H * 0.7, W * 0.12, H * 0.55); g.stroke();
    } else { // deploy
      var pw = 32 * s;
      for (var py = 0; py < H; py += pw / 2) for (var px = 0; px < W; px += pw) {
        var off = ((py / (pw / 2)) % 2) * pw / 2;
        var col = A.mix(th.floor2, th.floor, R());
        g.fillStyle = col; g.fillRect(px - off, py, pw, pw / 2);
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(px - off, py, pw, 1);
        g.fillStyle = 'rgba(60,20,20,0.25)'; g.fillRect(px - off, py, 1, pw / 2);
      }
      // haces del atardecer
      g.save(); g.globalCompositeOperation = 'lighter';
      for (var b2 = 0; b2 < 3; b2++) {
        var bx = W * (0.25 + b2 * 0.22);
        var bg2 = g.createLinearGradient(0, 0, 0, H);
        bg2.addColorStop(0, 'rgba(255,150,70,0.20)'); bg2.addColorStop(1, 'rgba(255,150,70,0)');
        g.fillStyle = bg2; g.beginPath(); g.moveTo(bx, 0); g.lineTo(bx + 90 * s, 0); g.lineTo(bx + 220 * s, H); g.lineTo(bx + 60 * s, H); g.fill();
      }
      g.restore();
    }
    // oclusión ambiental en bordes
    var e = 22 * s;
    var tg = g.createLinearGradient(0, 0, 0, e * 1.4); tg.addColorStop(0, 'rgba(0,0,0,0.45)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = tg; g.fillRect(0, 0, W, e * 1.4);
    var lg = g.createLinearGradient(0, 0, e, 0); lg.addColorStop(0, 'rgba(0,0,0,0.35)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg; g.fillRect(0, 0, e, H);
    var rg = g.createLinearGradient(W, 0, W - e, 0); rg.addColorStop(0, 'rgba(0,0,0,0.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(W - e, 0, e, H);
    var bgd = g.createLinearGradient(0, H, 0, H - e); bgd.addColorStop(0, 'rgba(0,0,0,0.3)'); bgd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = bgd; g.fillRect(0, H - e, W, e);
    var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return c;
  }

  A.drawFloor = function (ctx, theme, cols, rows, ox, oy, tile, t) {
    cols = A.num(cols, 18) | 0; rows = A.num(rows, 9) | 0; tile = A.num(tile, 64);
    ox = A.num(ox, 64); oy = A.num(oy, 128); t = A.num(t, 0);
    if (!A.THEMES[theme]) theme = 'openspace';
    var k = theme + '|' + cols + '|' + rows + '|' + tile;
    var c = floorCache[k] || (floorCache[k] = buildFloor(theme, cols, rows, tile));
    ctx.drawImage(c, ox, oy);
    var W = cols * tile, H = rows * tile;
    if (theme === 'datacenter') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var p = 0.05 + 0.03 * Math.sin(t * 1.7);
      var g2 = ctx.createLinearGradient(ox, oy, ox, oy + H);
      g2.addColorStop(0, 'rgba(56,160,255,' + p + ')'); g2.addColorStop(1, 'rgba(56,160,255,0)');
      ctx.fillStyle = g2; ctx.fillRect(ox, oy, W, H);
      ctx.restore();
    } else if (theme === 'deploy') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,110,50,' + (0.04 + 0.03 * Math.sin(t * 0.9)) + ')';
      ctx.fillRect(ox, oy, W, H);
      ctx.restore();
    }
  };

  /* ================================================== BARRA DE PROGRESO */
  A.drawProgressBar = function (ctx, cx, cy, w, p, color) {
    w = A.num(w, 44); p = A.clamp(A.num(p, 0), 0, 1); color = color || '#3ddc84';
    var h = Math.max(8, Math.round(w * 0.2)), x = cx - w / 2, y = cy - h / 2;
    ctx.save();
    A.shadow(ctx, cx, cy + h * 0.8, w * 0.5, h * 0.45, 0.35);
    A.rr(ctx, x - 2, y - 2, w + 4, h + 4, h / 2 + 2); ctx.fillStyle = '#1b1430'; ctx.fill();
    A.rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = '#3a3052'; ctx.fill();
    if (p > 0) {
      var fw = Math.max(h, w * p);
      A.rr(ctx, x, y, fw, h, h / 2);
      var gr = ctx.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, A.shade(color, 0.35)); gr.addColorStop(0.5, color); gr.addColorStop(1, A.shade(color, -0.25));
      ctx.fillStyle = gr; ctx.fill();
      A.rr(ctx, x + 2, y + 1.5, fw - 4, h * 0.32, h * 0.16); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
    }
    // marcas
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (var i = 1; i < 4; i++) ctx.fillRect(x + w * i / 4 - 0.5, y + 1, 1, h - 2);
    ctx.restore();
  };

  /* ========================================================= ILUMINACIÓN */
  var lightCanvas = null, lightG = null, LSCALE = 0.25;
  var whiteHole = null;
  function getHole() {
    if (whiteHole) return whiteHole;
    var c = A.canvas(128, 128), g = c.getContext('2d');
    var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.7, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (whiteHole = c);
  }
  A.drawLighting = function (ctx, lights, darkness) {
    darkness = A.clamp(A.num(darkness, 0), 0, 1);
    if (darkness <= 0.001) return;
    lights = lights || [];
    if (!lightCanvas) { lightCanvas = A.canvas(A.W * LSCALE, A.H * LSCALE); lightG = lightCanvas.getContext('2d'); }
    var g = lightG, hole = getHole();
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
    g.fillStyle = 'rgba(4,6,20,' + darkness + ')';
    g.fillRect(0, 0, lightCanvas.width, lightCanvas.height);
    g.globalCompositeOperation = 'destination-out';
    for (var i = 0; i < lights.length; i++) {
      var L = lights[i]; if (!L) continue;
      var r = A.num(L.r, 80) * LSCALE, x = A.num(L.x, 0) * LSCALE, y = A.num(L.y, 0) * LSCALE;
      g.globalAlpha = A.clamp(A.num(L.intensity, 1), 0, 1);
      g.drawImage(hole, x - r, y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.drawImage(lightCanvas, 0, 0, A.W, A.H);
    ctx.globalCompositeOperation = 'lighter';
    for (var j = 0; j < lights.length; j++) {
      var M = lights[j]; if (!M || !M.color) continue;
      var rr = A.num(M.r, 80);
      ctx.globalAlpha = 0.32 * darkness * A.clamp(A.num(M.intensity, 1), 0, 1);
      ctx.drawImage(A.blob(M.color), A.num(M.x, 0) - rr * 0.8, A.num(M.y, 0) - rr * 0.8, rr * 1.6, rr * 1.6);
    }
    ctx.restore();
  };

  /* estrellas de resultado */
  A.drawStars = function (ctx, cx, cy, n, size, t) {
    size = A.num(size, 40); n = A.num(n, 0); t = A.num(t, 0);
    for (var i = 0; i < 3; i++) {
      var x = cx + (i - 1) * size * 1.25, y = cy + (i === 1 ? -size * 0.25 : 0);
      var s = size * (i === 1 ? 1.2 : 1) * (i < n ? 1 + 0.05 * Math.sin(t * 4 + i) : 1);
      if (A.drawIcon) A.drawIcon(ctx, i < n ? 'star' : 'star_empty', x, y, s);
    }
  };

  /* init: prerenderiza cachés */
  A.init = function () {
    try {
      Object.keys(A.THEMES).forEach(function (k) { getBg(k); });
      getHole(); getCloud();
      if (A._initStations) A._initStations();
      if (A._initItems) A._initItems();
      if (A._initUI) A._initUI();
      if (OW.FX && OW.FX._init) OW.FX._init();
    } catch (e) { if (window.console) console.warn('OW.Art.init', e); }
    A.ready = true;
  };
})(window.OW);
