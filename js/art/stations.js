/* OVERWORKING — js/art/stations.js (agente ART)
 * drawStation + drawRocket + glifos de carril.
 * Cada estación = sprite estático prerenderizado (por tipo/tema/variante, a 2x)
 * + capa animada dibujada en vivo (pantallas, LEDs, ventilador, vapor...). */
window.OW = window.OW || {};
(function (OW) {
  'use strict';
  var A = OW.Art = OW.Art || {};
  var PI = Math.PI, TAU = PI * 2;
  var RES = 2, PADX = 10, PADT = 60, SW = 84, SH = 152;
  var cache = {};

  /* ----------------------------------------------------- glifos de carril */
  A.drawLaneGlyph = function (g, lane, cx, cy, size, color, lw) {
    var s = size / 20;
    g.save(); g.translate(cx, cy); g.scale(s, s);
    g.strokeStyle = color || '#fff'; g.fillStyle = color || '#fff';
    g.lineWidth = lw || 3.2; g.lineCap = 'round'; g.lineJoin = 'round';
    if (lane === 'front') {
      g.beginPath(); g.moveTo(-5, -6); g.lineTo(-10, 0); g.lineTo(-5, 6); g.stroke();
      g.beginPath(); g.moveTo(5, -6); g.lineTo(10, 0); g.lineTo(5, 6); g.stroke();
      g.beginPath(); g.moveTo(2, -8); g.lineTo(-2, 8); g.stroke();
    } else if (lane === 'back') {
      [-1, 1].forEach(function (d) {
        g.beginPath();
        g.moveTo(d * 3, -8); g.quadraticCurveTo(d * 6, -8, d * 6, -5); g.lineTo(d * 6, -2);
        g.quadraticCurveTo(d * 6, 0, d * 9, 0); g.quadraticCurveTo(d * 6, 0, d * 6, 2);
        g.lineTo(d * 6, 5); g.quadraticCurveTo(d * 6, 8, d * 3, 8);
        g.stroke();
      });
    } else if (lane === 'data') {
      g.lineWidth = (lw || 3.2) * 0.75;
      g.beginPath(); g.ellipse(0, -6, 7.5, 3, 0, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(-7.5, -6); g.lineTo(-7.5, 6); g.ellipse(0, 6, 7.5, 3, 0, PI, 0, true); g.lineTo(7.5, -6); g.stroke();
      g.beginPath(); g.ellipse(0, 0, 7.5, 3, 0, 0, PI); g.stroke();
    } else {
      g.font = 'bold 16px ' + A.MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 1);
    }
    g.restore();
  };

  /* ------------------------------------------------------- helpers base */
  function dropShadow(g, x, y, w, h, r) {
    g.save(); g.fillStyle = 'rgba(10,5,20,0.28)';
    A.rr(g, x + 4, y + 6, w, h, r); g.fill();
    g.fillStyle = 'rgba(10,5,20,0.12)'; A.rr(g, x + 6, y + 9, w + 2, h, r + 2); g.fill();
    g.restore();
  }

  function counterBase(g, th, top, front) {
    top = top || th.counterTop; front = front || th.counterFront;
    dropShadow(g, 1, 0, 62, 74, 7);
    A.box(g, 1, 0, 62, 58, 16, top, front, { r: 7 });
    var name = th._name;
    g.save(); A.rr(g, 2, 1, 60, 56, 6); g.clip();
    if (name === 'garage') {
      g.strokeStyle = 'rgba(120,70,30,0.22)'; g.lineWidth = 1;
      for (var i = 0; i < 6; i++) { var yy = 6 + i * 9; g.beginPath(); g.moveTo(2, yy); g.bezierCurveTo(20, yy + 2, 40, yy - 2, 62, yy + 1); g.stroke(); }
      g.fillStyle = 'rgba(90,50,20,0.18)'; for (var j = 1; j < 4; j++) g.fillRect(j * 16, 1, 1, 56);
    } else if (name === 'datacenter') {
      g.strokeStyle = 'rgba(255,255,255,0.06)';
      for (var k = 3; k < 58; k += 3) { g.beginPath(); g.moveTo(2, k); g.lineTo(62, k); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.35)';
      [[6, 5], [58, 5], [6, 53], [58, 53]].forEach(function (p) { A.circle(g, p[0], p[1], 1.6); g.fill(); });
    } else {
      g.fillStyle = 'rgba(0,0,0,0.035)';
      var R = A.rng(name.length * 13);
      for (var n = 0; n < 50; n++) g.fillRect(2 + R() * 60, 2 + R() * 54, 1.5, 1.5);
    }
    g.restore();
    // remate frontal por tema
    if (name === 'openspace') { g.fillStyle = th.accent; g.fillRect(3, 60, 58, 3); }
    else if (name === 'deploy') { g.fillStyle = th.accent; g.fillRect(3, 60, 58, 2.5); }
    else if (name === 'consulting') { g.fillStyle = '#2c3650'; g.fillRect(3, 60, 58, 3); }
    else if (name === 'datacenter') { g.fillStyle = '#38e1ff'; g.globalAlpha = 0.7; g.fillRect(4, 70, 56, 1.5); g.globalAlpha = 1; }
    else if (name === 'garage') { g.fillStyle = 'rgba(40,20,10,0.25)'; for (var q = 1; q < 5; q++) g.fillRect(q * 12.8, 59, 1, 14); }
  }

  function labelPlate(g, text, cx, cy, bg, fg, w) {
    w = w || (text.length * 5.6 + 10);
    A.rr(g, cx - w / 2, cy - 5.5, w, 11, 3); g.fillStyle = bg; g.fill();
    g.strokeStyle = A.shade(bg, -0.5); g.lineWidth = 1; g.stroke();
    g.font = 'bold 8px ' + A.FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = fg; g.fillText(text, cx, cy + 0.5);
  }

  /* --------------------------------------------------- cuerpos estáticos */
  var BODIES = {};

  BODIES.counter = function (g, th, v) {
    counterBase(g, th);
    if (v === 1) {
      g.save(); g.translate(10, 10); g.rotate(-0.15);
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(-6, -5, 13, 13);
      g.fillStyle = '#ffe066'; g.fillRect(-7, -7, 13, 13); g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(-5, -3, 8, 1); g.fillRect(-5, 0, 6, 1);
      g.restore();
    } else if (v === 2) {
      g.strokeStyle = 'rgba(110,60,20,0.25)'; g.lineWidth = 2; A.circle(g, 52, 46, 6); g.stroke();
      g.save(); g.translate(12, 48); g.rotate(0.5);
      g.fillStyle = '#3a6fd8'; A.rr(g, -1.5, -8, 3, 14, 1); g.fill(); g.fillStyle = '#ddd'; g.fillRect(-1.5, 6, 3, 2);
      g.restore();
    }
  };

  function specBody(lane) {
    return function (g, th) {
      var L = A.laneInfo(lane);
      counterBase(g, th);
      // bandeja de salida
      A.rr(g, 12, 44, 40, 11, 3); g.fillStyle = '#e8ebf2'; g.fill(); g.strokeStyle = '#6b7286'; g.lineWidth = 1.2; g.stroke();
      // impresora
      A.shadow(g, 33, 44, 26, 6, 0.4);
      A.box(g, 7, 1, 50, 22, 22, L.color, L.dark, { r: 6, outline: A.shade(L.dark, -0.55) });
      // brillo lateral
      g.fillStyle = 'rgba(255,255,255,0.22)'; A.rr(g, 10, 3, 6, 18, 3); g.fill();
      // ranura de papel
      A.rr(g, 14, 7, 36, 6, 3); g.fillStyle = A.shade(L.dark, -0.6); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(16, 13.5, 32, 1);
      // panel frontal: insignia con icono
      A.circle(g, 32, 34, 10.5); g.fillStyle = A.shade(L.dark, -0.45); g.fill();
      A.circle(g, 32, 33.5, 9.5);
      var bg = g.createRadialGradient(29, 30, 1, 32, 34, 10); bg.addColorStop(0, A.shade(L.color, 0.35)); bg.addColorStop(1, L.color);
      g.fillStyle = bg; g.fill();
      A.drawLaneGlyph(g, lane, 32, 33.5, 13, '#ffffff', 3);
      // botones
      g.fillStyle = A.shade(L.dark, -0.4); A.rr(g, 44, 29, 9, 4, 2); g.fill(); A.rr(g, 44, 36, 9, 4, 2); g.fill();
    };
  }
  BODIES.spec_front = specBody('front');
  BODIES.spec_back = specBody('back');
  BODIES.spec_data = specBody('data');

  function monitorPath(g, x0, y0, x1, y1, bend) {
    g.beginPath();
    g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, y0 + bend, x1, y0);
    g.lineTo(x1, y1); g.quadraticCurveTo((x0 + x1) / 2, y1 + bend, x0, y1);
    g.closePath();
  }

  BODIES.desk = function (g, th) {
    counterBase(g, th);
    // alfombrilla
    A.rr(g, 8, 30, 50, 22, 5); g.fillStyle = 'rgba(25,20,45,0.75)'; g.fill();
    // teclado
    A.shadow(g, 30, 47, 22, 4, 0.4);
    A.box(g, 9, 33, 42, 11, 4, '#2a2d3d', '#16182a', { r: 3 });
    // ratón
    A.ell(g, 55, 41, 3.5, 5); g.fillStyle = '#e8ebf2'; g.fill(); g.strokeStyle = '#4a4f63'; g.lineWidth = 1; g.stroke();
    // taza
    A.rr(g, 3, 24, 7, 8, 2); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#4a4f63'; g.stroke();
    A.ell(g, 6.5, 24.5, 3.5, 1.2); g.fillStyle = '#5a3016'; g.fill();
    // soporte monitor
    g.fillStyle = '#2d3142'; A.rr(g, 29, 14, 6, 14, 2); g.fill();
    A.ell(g, 32, 28, 11, 3.5); g.fillStyle = '#3a3f55'; g.fill(); g.strokeStyle = '#141626'; g.lineWidth = 1.2; g.stroke();
    // monitor curvo
    A.shadow(g, 34, 22, 26, 5, 0.3);
    monitorPath(g, 4, -24, 60, 16, 5); g.fillStyle = '#1b1e2c'; g.fill(); g.strokeStyle = '#0a0b14'; g.lineWidth = 2; g.stroke();
    monitorPath(g, 7, -21, 57, 12, 5); g.fillStyle = '#0c1222'; g.fill();
    // led de encendido
    g.fillStyle = '#3dff8a'; A.circle(g, 32, 15.5, 0.9); g.fill();
    // brillo bisel
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(6, -22.5); g.quadraticCurveTo(32, -17.5, 58, -22.5); g.stroke();
  };

  BODIES.compiler = function (g, th) {
    var body = th._name === 'datacenter' ? '#2e3850' : '#3a4157', bodyTop = A.shade(body, 0.25);
    dropShadow(g, 3, -6, 60, 80, 7);
    // bandeja
    A.box(g, 3, 30, 58, 28, 16, th.metal, A.shade(th.metal, -0.35), { r: 6 });
    A.rr(g, 8, 34, 48, 20, 4); g.fillStyle = A.shade(th.metal, -0.28); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.stroke();
    for (var i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(10, 37 + i * 4.5, 44, 1.5); }
    // torre
    A.shadow(g, 34, 30, 28, 5, 0.5);
    A.box(g, 8, -36, 48, 12, 54, bodyTop, body, { r: 6 });
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(11, -22, 4, 46);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(50, -22, 4, 46);
    // tapa: rejilla superior
    g.fillStyle = 'rgba(0,0,0,0.35)'; for (var k = 0; k < 6; k++) g.fillRect(14 + k * 6.4, -33, 3.5, 7);
    // panel de luces
    A.rr(g, 14, -21, 36, 7, 3); g.fillStyle = '#101422'; g.fill();
    // carcasa del ventilador
    A.circle(g, 32, 2, 15); g.fillStyle = '#151a28'; g.fill(); g.strokeStyle = A.shade(body, 0.35); g.lineWidth = 2; g.stroke();
    A.circle(g, 32, 2, 12.5); g.fillStyle = '#0b0e18'; g.fill();
    // etiqueta
    labelPlate(g, 'BUILD', 32, 22, th.accent, '#1a1020', 30);
    // tornillos
    g.fillStyle = A.shade(body, 0.4);
    [[13, -19], [51, -19], [13, 21], [51, 21]].forEach(function (p) { A.circle(g, p[0], p[1], 1.2); g.fill(); });
  };

  BODIES.testbench = function (g, th) {
    counterBase(g, th);
    // alfombrilla de corte con rejilla
    A.rr(g, 6, 20, 40, 34, 4); g.fillStyle = '#2f8f6f'; g.fill(); g.strokeStyle = '#1b5a44'; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.8;
    for (var x = 10; x < 46; x += 6) { g.beginPath(); g.moveTo(x, 21); g.lineTo(x, 53); g.stroke(); }
    for (var y = 24; y < 54; y += 6) { g.beginPath(); g.moveTo(7, y); g.lineTo(45, y); g.stroke(); }
    // gradilla con tubos
    A.rr(g, 48, 4, 12, 8, 2); g.fillStyle = '#c9ced8'; g.fill(); g.strokeStyle = '#596075'; g.stroke();
    ['#ff4f6d', '#3ddc84', '#4da3ff'].forEach(function (c, i) {
      var tx = 50 + i * 3.6;
      A.rr(g, tx, -10, 3, 18, 1.5); g.fillStyle = 'rgba(230,240,255,0.85)'; g.fill(); g.strokeStyle = '#596075'; g.lineWidth = 0.8; g.stroke();
      A.rr(g, tx + 0.4, -1 - i * 2, 2.2, 8 + i * 2, 1); g.fillStyle = c; g.fill();
    });
    // pantalla de tests
    A.shadow(g, 26, 16, 20, 4, 0.4);
    g.fillStyle = '#2d3142'; g.fillRect(24, 8, 6, 10);
    A.rr(g, 6, -22, 40, 31, 4); g.fillStyle = '#222638'; g.fill(); g.strokeStyle = '#0a0b14'; g.lineWidth = 2; g.stroke();
    A.rr(g, 8.5, -19.5, 35, 26, 2); g.fillStyle = '#0f1a1c'; g.fill();
    // lupa
    g.save(); g.translate(52, 34); g.rotate(0.7);
    A.rr(g, -2, 6, 4, 14, 2); g.fillStyle = '#7a3e1c'; g.fill(); g.strokeStyle = '#3a1a08'; g.lineWidth = 1; g.stroke();
    A.circle(g, 0, 0, 7); g.fillStyle = 'rgba(180,230,255,0.45)'; g.fill(); g.strokeStyle = '#2b2f3e'; g.lineWidth = 2.2; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 4.5, PI * 1.1, PI * 1.5); g.stroke();
    g.restore();
    labelPlate(g, 'TEST', 32, 66, '#2f8f6f', '#eafff5', 28);
  };

  BODIES.pr_stack = function (g, th) {
    counterBase(g, th);
    // bandeja de rejilla
    A.shadow(g, 32, 50, 26, 5, 0.35);
    A.box(g, 7, 6, 50, 38, 9, '#cdb8ff', '#6a4bc4', { r: 5, outline: '#2a1560' });
    A.rr(g, 11, 9, 42, 32, 3); g.fillStyle = '#b39cf0'; g.fill();
    g.strokeStyle = 'rgba(70,40,150,0.35)'; g.lineWidth = 1;
    for (var x = 14; x < 53; x += 5) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 40); g.stroke(); }
    g.font = 'bold 15px ' + A.FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(80,45,170,0.35)'; g.fillText('PR', 32, 26);
    // icono de merge en el frente
    A.rr(g, 17, 59, 30, 12, 4); g.fillStyle = '#7b52e0'; g.fill(); g.strokeStyle = '#2a1560'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 8px ' + A.FONT; g.fillText('PR', 36, 65.5);
    g.strokeStyle = '#fff'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(22, 61.5); g.lineTo(22, 68.5); g.moveTo(22, 63); g.quadraticCurveTo(26, 63, 27, 66.5); g.stroke();
    g.fillStyle = '#fff'; A.circle(g, 22, 61.5, 1.3); g.fill(); A.circle(g, 22, 68.5, 1.3); g.fill(); A.circle(g, 27, 67, 1.3); g.fill();
  };

  function hazardStripes(g, x, y, w, h, a) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = '#ffcc1f'; g.fillRect(x, y, w, h);
    g.fillStyle = '#1d1a24';
    for (var i = -h; i < w + h; i += 8) { g.beginPath(); g.moveTo(x + i, y); g.lineTo(x + i + 4, y); g.lineTo(x + i + 4 - h, y + h); g.lineTo(x + i - h, y + h); g.fill(); }
    g.restore();
  }

  BODIES.deploy = function (g, th) {
    dropShadow(g, 1, 2, 62, 72, 8);
    A.box(g, 1, 2, 62, 56, 16, '#3a3f52', '#232736', { r: 8, outline: '#0d0f18' });
    // borde de peligro
    g.save(); A.rr(g, 3, 4, 58, 52, 7); g.clip();
    hazardStripes(g, 3, 4, 58, 6); hazardStripes(g, 3, 50, 58, 6);
    hazardStripes(g, 3, 4, 6, 52); hazardStripes(g, 55, 4, 6, 52);
    g.restore();
    // pad circular
    A.circle(g, 32, 30, 19); g.fillStyle = '#1b1e2a'; g.fill(); g.strokeStyle = '#596075'; g.lineWidth = 2; g.stroke();
    A.circle(g, 32, 30, 14); g.strokeStyle = 'rgba(120,255,190,0.25)'; g.lineWidth = 1.2; g.stroke();
    A.circle(g, 32, 30, 8); g.stroke();
    // letrero PROD
    A.rr(g, 14, 59.5, 36, 12, 3); g.fillStyle = '#0e1a14'; g.fill(); g.strokeStyle = '#0a0b10'; g.lineWidth = 1; g.stroke();
    // (los mástiles con banderines se dibujan en LIVE.deploy, salvo si hay otro deploy justo encima: st.joinTop)
  };

  BODIES.review = function (g, th) {
    counterBase(g, th);
    // fajo de papeles corregidos
    g.save(); g.translate(13, 12); g.rotate(-0.12);
    for (var i = 0; i < 3; i++) { g.fillStyle = i === 2 ? '#ffffff' : '#e7e9ef'; g.fillRect(-8 + i, -9 - i * 1.5, 18, 22); g.strokeStyle = '#8a90a2'; g.lineWidth = 0.6; g.strokeRect(-8 + i, -9 - i * 1.5, 18, 22); }
    g.fillStyle = '#9aa0b2'; for (var l = 0; l < 5; l++) g.fillRect(-4, -8 + l * 3.6, 12 - (l % 2) * 4, 1.1);
    g.strokeStyle = '#e0302e'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-5, -4); g.lineTo(7, -1); g.moveTo(5, 4); g.arc(5, 4, 2.5, 0, TAU); g.stroke();
    g.restore();
    // boli rojo
    g.save(); g.translate(18, 30); g.rotate(-0.9);
    A.rr(g, -1.6, -9, 3.2, 16, 1.4); g.fillStyle = '#e0302e'; g.fill(); g.fillStyle = '#ddd'; g.fillRect(-1.6, 7, 3.2, 2);
    g.restore();
    labelPlate(g, 'CODE REVIEW', 32, 66, '#ffd23f', '#3a2a00', 52);
  };

  BODIES.trash = function (g, th) {
    A.shadow(g, 36, 62, 24, 8, 0.5);
    // cuerpo
    g.beginPath(); g.moveTo(11, 14); g.lineTo(53, 14); g.lineTo(48, 62); g.quadraticCurveTo(32, 68, 16, 62); g.closePath();
    var bg = g.createLinearGradient(11, 0, 53, 0);
    bg.addColorStop(0, '#7c8597'); bg.addColorStop(0.3, '#c9d0dc'); bg.addColorStop(0.55, '#9aa3b4'); bg.addColorStop(1, '#5d6576');
    g.fillStyle = bg; g.fill(); g.strokeStyle = '#272c3a'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = 'rgba(30,35,50,0.35)'; g.lineWidth = 1.2;
    for (var i = 0; i < 6; i++) { var x0 = 16 + i * 6.4, x1 = 19 + i * 5.2; g.beginPath(); g.moveTo(x0, 20); g.lineTo(x1, 58); g.stroke(); }
    // etiqueta /dev/null
    A.rr(g, 17, 38, 30, 10, 2); g.fillStyle = '#1b1e2c'; g.fill();
    g.font = 'bold 7px ' + A.MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#7dffb0';
    g.fillText('/dev/null', 32, 43.5);
    // borde superior
    A.ell(g, 32, 14, 23, 8); g.fillStyle = '#b6bfcd'; g.fill(); g.strokeStyle = '#272c3a'; g.lineWidth = 2; g.stroke();
    A.ell(g, 32, 14.5, 19, 6); g.fillStyle = '#20232f'; g.fill();
    // papeles
    [[24, 12, '#ffffff'], [36, 11, '#f2f4f8'], [30, 8, '#fff6c8'], [41, 14, '#ffffff']].forEach(function (p, k) {
      A.circle(g, p[0], p[1], 5.2); g.fillStyle = p[2]; g.fill(); g.strokeStyle = '#8a90a2'; g.lineWidth = 0.8; g.stroke();
      g.beginPath(); g.moveTo(p[0] - 3, p[1] - 1); g.lineTo(p[0] + 1, p[1] + 1); g.lineTo(p[0] + 3, p[1] - 2); g.stroke();
    });
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(32, 14, 22, 7, 0, PI * 1.05, PI * 1.45); g.stroke();
  };

  BODIES.coffee = function (g, th) {
    counterBase(g, th);
    // saco de café
    g.save(); g.translate(55, 30);
    g.beginPath(); g.moveTo(-6, -10); g.lineTo(6, -10); g.lineTo(8, 12); g.lineTo(-8, 12); g.closePath();
    g.fillStyle = '#8a5a34'; g.fill(); g.strokeStyle = '#3e2410'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#f2e2c4'; g.fillRect(-5, -1, 10, 7);
    g.fillStyle = '#5a3016'; A.ell(g, 0, 2.5, 2.5, 1.6); g.fill();
    g.restore();
    // máquina espresso
    A.shadow(g, 30, 40, 26, 6, 0.45);
    A.box(g, 5, -26, 42, 12, 50, '#e4e8ef', '#c0242e', { r: 6, outline: '#4a0c12' });
    // reflejo cromado lateral
    g.fillStyle = 'rgba(255,255,255,0.25)'; A.rr(g, 8, -12, 4, 44, 2); g.fill();
    // tazas calentándose arriba
    [[16, -22], [27, -22]].forEach(function (p) {
      A.rr(g, p[0] - 4, p[1] - 3, 8, 6, 2); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#7a8090'; g.lineWidth = 0.8; g.stroke();
    });
    // manómetro
    A.circle(g, 37, -4, 6.5); g.fillStyle = '#e4e8ef'; g.fill(); g.strokeStyle = '#4a0c12'; g.lineWidth = 1.5; g.stroke();
    A.circle(g, 37, -4, 5); g.fillStyle = '#fffdf5'; g.fill();
    g.strokeStyle = '#e0302e'; g.lineWidth = 1; g.beginPath(); g.arc(37, -4, 4, PI * 0.1, PI * 0.45); g.stroke();
    // grupo
    A.rr(g, 13, 2, 20, 8, 3); g.fillStyle = '#2a2d3a'; g.fill();
    A.rr(g, 16, 9, 14, 5, 2); g.fillStyle = '#9aa3b4'; g.fill(); g.strokeStyle = '#2a2d3a'; g.lineWidth = 1; g.stroke();
    // mango portafiltro
    g.save(); g.translate(16, 11); g.rotate(0.25);
    A.rr(g, -15, -2.5, 15, 5, 2.5); g.fillStyle = '#1b1e2a'; g.fill();
    g.restore();
    // bandeja de goteo
    A.rr(g, 10, 30, 26, 5, 2); g.fillStyle = '#9aa3b4'; g.fill(); g.strokeStyle = '#2a2d3a'; g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.3)'; for (var i = 0; i < 6; i++) g.fillRect(12 + i * 4, 31.5, 2, 2);
    // taza
    A.rr(g, 17, 20, 12, 10, 3); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#4a4f63'; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.arc(29.5, 25, 3, -PI / 2, PI / 2); g.stroke();
    A.ell(g, 23, 20.5, 5.5, 1.6); g.fillStyle = '#4a2410'; g.fill();
    // lanceta de vapor
    g.strokeStyle = '#c9ced8'; g.lineWidth = 2.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(42, 4); g.lineTo(42, 18); g.quadraticCurveTo(42, 22, 39, 23); g.stroke();
    g.lineCap = 'butt';
    labelPlate(g, 'CAF\u00c9', 26, 66, '#4a2410', '#ffe2b8', 26);
  };

  BODIES.conveyor_h = function (g, th) { conveyorBody(g, th, true); };
  BODIES.conveyor_v = function (g, th) { conveyorBody(g, th, false); };
  function conveyorBody(g, th, horiz) {
    dropShadow(g, 1, 4, 62, 66, 6);
    A.box(g, 0, 4, 64, 54, 12, '#6b7486', '#3e4555', { r: 4, outline: '#151924' });
    A.rr(g, 5, 9, 54, 44, 3); g.fillStyle = '#1f2330'; g.fill();
    g.fillStyle = '#ffcc1f';
    if (horiz) { hazardStripes(g, 0, 5, 64, 4); hazardStripes(g, 0, 53, 64, 4); }
    else { hazardStripes(g, 1, 5, 4, 52); hazardStripes(g, 59, 5, 4, 52); }
    // rodillos visibles al frente
    for (var i = 0; i < 5; i++) { A.circle(g, 8 + i * 12, 64, 2.5); g.fillStyle = '#9aa3b4'; g.fill(); g.strokeStyle = '#151924'; g.lineWidth = 1; g.stroke(); }
  }

  BODIES.wall = function (g, th) {
    // tapa de -12 a 52 (continua con el muro de la fila siguiente), cara 52..74
    var name = th._name, top = th.wallTop, face = th.wallFace, FY = 52;
    g.fillStyle = 'rgba(10,5,20,0.3)'; g.fillRect(2, 72, 64, 8);
    var fg = g.createLinearGradient(0, FY, 0, 74);
    fg.addColorStop(0, A.shade(face, 0.1)); fg.addColorStop(1, A.shade(face, -0.25));
    g.fillStyle = fg; g.fillRect(0, FY, 64, 22);
    if (name === 'garage') {
      g.save(); g.beginPath(); g.rect(0, FY + 1, 64, 21); g.clip();
      for (var r = 0; r < 2; r++) for (var c = -1; c < 3; c++) {
        var bx = c * 32 + (r % 2 ? 16 : 0), by = FY + 1 + r * 10.5;
        g.fillStyle = A.shade(th.wall, (A.hash(r * 9 + c) - 0.5) * 0.25); A.rr(g, bx + 1, by + 1, 30, 8.5, 1.5); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(bx + 2, by + 1.5, 28, 1.5);
      }
      g.restore();
    } else if (name === 'openspace') {
      g.fillStyle = '#c9bca6'; g.fillRect(0, 67, 64, 7); g.fillStyle = '#ffffff'; g.fillRect(0, 67, 64, 1.5);
    } else if (name === 'consulting') {
      g.fillStyle = '#2c3650'; g.fillRect(0, 60, 64, 4);
    } else if (name === 'datacenter') {
      g.fillStyle = '#38e1ff'; g.globalAlpha = 0.85; g.fillRect(0, 59, 64, 2); g.globalAlpha = 1;
      g.fillStyle = '#58667f'; A.circle(g, 6, 67, 1.3); g.fill(); A.circle(g, 58, 67, 1.3); g.fill();
    } else if (name === 'deploy') {
      g.fillStyle = th.accent; g.fillRect(0, 60, 64, 3);
    }
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 73, 64, 1.5);
    // tapa continua
    var tg = g.createLinearGradient(0, -12, 0, FY);
    tg.addColorStop(0, A.shade(top, 0.06)); tg.addColorStop(1, A.shade(top, -0.06));
    g.fillStyle = tg; g.fillRect(0, -12, 64, 64);
    var R = A.rng(name.length * 7 + 3);
    for (var n = 0; n < 40; n++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; g.fillRect(R() * 64, -12 + R() * 64, 2, 2); }
    if (name === 'datacenter') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(31, -12, 2, 64); g.fillRect(0, 19, 64, 2); }
    // labio frontal con brillo
    g.fillStyle = A.shade(top, 0.22); g.fillRect(0, FY - 3, 64, 3);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, FY, 64, 1.2);
  };

  function potShape(g, th, cx, by, w, h) {
    A.shadow(g, cx + 2, by, w * 0.7, 5, 0.45);
    g.beginPath(); g.moveTo(cx - w / 2, by - h); g.lineTo(cx + w / 2, by - h); g.lineTo(cx + w * 0.38, by); g.lineTo(cx - w * 0.38, by); g.closePath();
    var pg = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    pg.addColorStop(0, A.shade(th.pot, -0.15)); pg.addColorStop(0.35, A.shade(th.pot, 0.2)); pg.addColorStop(1, A.shade(th.pot, -0.35));
    g.fillStyle = pg; g.fill(); g.strokeStyle = A.shade(th.pot, -0.6); g.lineWidth = 1.6; g.stroke();
    A.rr(g, cx - w / 2 - 2, by - h - 3, w + 4, 6, 2.5); g.fillStyle = A.shade(th.pot, 0.08); g.fill(); g.stroke();
    A.ell(g, cx, by - h - 1, w / 2 - 1, 2); g.fillStyle = '#3a2414'; g.fill();
  }
  BODIES.plant = function (g, th) { potShape(g, th, 32, 60, 30, 20); };

  BODIES.server_rack = function (g, th) {
    dropShadow(g, 4, -40, 58, 114, 6);
    A.box(g, 4, -46, 56, 12, 108, '#3a4258', '#151a28', { r: 5, outline: '#05070c' });
    A.rr(g, 8, -31, 48, 98, 3); g.fillStyle = '#0a0d16'; g.fill();
    for (var u = 0; u < 11; u++) {
      var uy = -29 + u * 8.6;
      var ug = g.createLinearGradient(0, uy, 0, uy + 7);
      ug.addColorStop(0, '#2b3448'); ug.addColorStop(1, '#1a2030');
      g.fillStyle = ug; g.fillRect(10, uy, 44, 7.2);
      g.fillStyle = 'rgba(0,0,0,0.55)'; for (var vx = 28; vx < 52; vx += 2.6) g.fillRect(vx, uy + 1.5, 1.3, 4.2);
    }
    // puerta de cristal
    g.fillStyle = 'rgba(140,200,255,0.06)'; g.fillRect(8, -31, 48, 98);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.moveTo(14, -31); g.lineTo(30, -31); g.lineTo(14, 67); g.lineTo(8, 67); g.lineTo(8, -20); g.fill();
    g.fillStyle = '#8794ad'; A.rr(g, 52, 4, 2.5, 18, 1.2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.4)'; for (var k = 0; k < 5; k++) g.fillRect(12 + k * 8.5, -43, 5, 6);
  };

  /* ------------------------------------------------------ sprites */
  function themeObj(theme) {
    var th = A.theme(theme);
    if (!th._name) { for (var k in A.THEMES) if (A.THEMES[k] === th) th._name = k; }
    return th;
  }
  function getSprite(key, theme, v) {
    var k = key + '|' + theme + '|' + v;
    if (cache[k]) return cache[k];
    var c = A.canvas(SW * RES, SH * RES), g = c.getContext('2d');
    g.scale(RES, RES); g.translate(PADX, PADT);
    var fn = BODIES[key] || BODIES.counter;
    try { fn(g, themeObj(theme), v); } catch (e) { if (window.console) console.warn('station body', key, e); }
    return (cache[k] = c);
  }

  /* ------------------------------------------------ dirección cinta */
  function parseDir(d) {
    if (d == null) return { x: 1, y: 0 };
    if (typeof d === 'number') return { x: Math.round(Math.cos(d)), y: Math.round(Math.sin(d)) };
    if (typeof d === 'string') {
      var s = d.toLowerCase()[0];
      return { r: { x: 1, y: 0 }, e: { x: 1, y: 0 }, l: { x: -1, y: 0 }, w: { x: -1, y: 0 }, u: { x: 0, y: -1 }, n: { x: 0, y: -1 }, d: { x: 0, y: 1 }, s: { x: 0, y: 1 } }[s] || { x: 1, y: 0 };
    }
    if (Array.isArray(d)) return { x: Math.sign(d[0] || 0), y: Math.sign(d[1] || 0) };
    var dx = A.num(d.x, 0), dy = A.num(d.y, 0);
    if (Math.abs(dx) >= Math.abs(dy)) return { x: dx < 0 ? -1 : 1, y: 0 };
    return { x: 0, y: dy < 0 ? -1 : 1 };
  }
  A.parseDir = parseDir;

  /* --------------------------------------------------- capas animadas */
  var SYN = ['#ff79c6', '#8be9fd', '#50fa7b', '#f1fa8c', '#bd93f9', '#ffb86c', '#f8f8f2', '#6272a4'];
  function codeLines(ctx, x, y, w, h, t, speed, seed, lh, alpha) {
    lh = lh || 4;
    var off = t * speed, first = Math.floor(off / lh), frac = off - first * lh;
    var n = Math.ceil(h / lh) + 1;
    for (var i = 0; i < n; i++) {
      var li = first + i, R = A.hash(li * 7.13 + seed), indent = ((A.hash(li * 3.1 + seed) * 4) | 0) * 3;
      var ly = y + i * lh - frac, lx = x + 2 + indent;
      if (R < 0.12) continue;
      var tokens = 1 + ((A.hash(li * 1.7 + seed) * 4) | 0);
      for (var k = 0; k < tokens && lx < x + w - 3; k++) {
        var tw = 2 + A.hash(li * 11 + k * 5 + seed) * 9;
        if (lx + tw > x + w - 2) tw = x + w - 2 - lx;
        ctx.fillStyle = SYN[(A.hash(li * 5 + k * 13 + seed) * SYN.length) | 0];
        ctx.globalAlpha = alpha || 0.9;
        ctx.fillRect(lx, ly, tw, lh * 0.55);
        lx += tw + 1.5;
      }
    }
    ctx.globalAlpha = 1;
    return y + (n - 2) * lh - frac;
  }

  var HUE_LO = [], HUE_HI = [];
  for (var hh = 0; hh < 36; hh++) { HUE_LO.push('hsl(' + hh * 10 + ',95%,62%)'); HUE_HI.push('hsl(' + hh * 10 + ',95%,82%)'); }
  var LIVE = {};

  LIVE.desk = function (ctx, st, th, t) {
    var working = st.state === 'working', fire = st.state === 'fire';
    ctx.save();
    monitorPath(ctx, 7, -21, 57, 12, 5); ctx.clip();
    if (!fire) {
      var bg = ctx.createLinearGradient(0, -21, 0, 12); bg.addColorStop(0, '#13203a'); bg.addColorStop(1, '#0a1020');
      ctx.fillStyle = bg; ctx.fillRect(7, -22, 50, 40);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(7, -21, 9, 36);
      var lastY = codeLines(ctx, 17, -19, 39, 30, t, working ? 42 : 3, 11, 4);
      if ((t * 2 % 1) < 0.55) { ctx.fillStyle = '#f8f8f2'; ctx.fillRect(19 + (working ? (t * 40 % 26) : 10), lastY + 1, 2, 3.4); }
      // números de línea
      ctx.fillStyle = 'rgba(98,114,164,0.8)';
      for (var i = 0; i < 9; i++) ctx.fillRect(9.5, -19 + i * 4 - ((t * (working ? 42 : 3)) % 4), 4, 2);
      // pestañas
      ctx.fillStyle = '#1e2b4a'; ctx.fillRect(7, -22, 50, 4.5);
      ctx.fillStyle = th.accent; ctx.fillRect(17, -22, 12, 4.5);
    } else {
      ctx.fillStyle = '#1a0606'; ctx.fillRect(7, -22, 50, 40);
      ctx.fillStyle = '#ff3b3b'; ctx.font = 'bold 7px ' + A.MONO; ctx.textAlign = 'center';
      ctx.fillText('ERROR', 32, -2);
    }
    ctx.restore();
    // reflejo de la pantalla
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(40, -21); ctx.lineTo(50, -21); ctx.lineTo(38, 11); ctx.lineTo(30, 11); ctx.fill();
    if (working) A.glow(ctx, 32, 0, 40, '#5aa0ff', 0.22 + 0.06 * Math.sin(t * 12));
    // teclado RGB
    for (var r = 0; r < 3; r++) for (var c = 0; c < 10; c++) {
      var hue = (c * 22 + r * 30 + t * (working ? 260 : 60)) % 360;
      var press = working && A.hash(Math.floor(t * 14) * 3.3 + c + r * 10) > 0.8;
      ctx.fillStyle = (press ? HUE_HI : HUE_LO)[(hue / 10) | 0];
      ctx.fillRect(10.8 + c * 4, 34.6 + r * 3.3 + (press ? 0.6 : 0), 3.1, 2.4);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25;
    ctx.fillStyle = HUE_LO[((t * 6) % 36) | 0]; A.rr(ctx, 9, 43, 42, 3, 1.5); ctx.fill();
    ctx.restore();
  };

  LIVE.compiler = function (ctx, st, th, t) {
    var s = st.state, spd = s === 'working' ? 14 : s === 'warning' ? 26 : s === 'fire' ? 0.4 : s === 'done' ? 3 : 1.2;
    var shake = s === 'warning' ? Math.sin(t * 60) * 0.6 : 0;
    ctx.save(); ctx.translate(32 + shake, 2);
    // aspas
    ctx.save(); ctx.rotate(t * spd);
    for (var i = 0; i < 5; i++) {
      ctx.rotate(TAU / 5);
      ctx.beginPath(); ctx.moveTo(0, -1.5); ctx.quadraticCurveTo(6, -6, 11, -2); ctx.quadraticCurveTo(7, 1.5, 0, 1.5); ctx.closePath();
      ctx.fillStyle = s === 'fire' ? '#3a2a24' : '#7d889e'; ctx.fill();
    }
    ctx.restore();
    if (spd > 8) { ctx.fillStyle = 'rgba(160,180,210,0.18)'; A.circle(ctx, 0, 0, 11.5); ctx.fill(); }
    ctx.fillStyle = '#c9ced8'; A.circle(ctx, 0, 0, 3.2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    for (var k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(-12, k * 4.5); ctx.lineTo(12, k * 4.5); ctx.stroke(); }
    if (s === 'warning') A.glow(ctx, 0, 0, 22, '#ff8a1f', 0.35 + 0.25 * Math.sin(t * 20));
    ctx.restore();
    // luces de estado
    var blink = (t * 6 % 1) < 0.5;
    var cols = [
      { c: '#3dff8a', on: s === 'idle' ? 0.55 : (s === 'working' ? (A.hash(Math.floor(t * 12)) > 0.3 ? 1 : 0.3) : s === 'done' ? 1 : 0.15) },
      { c: '#ffb02e', on: s === 'warning' ? (blink ? 1 : 0.15) : 0.15 },
      { c: '#ff3b3b', on: s === 'fire' ? (0.7 + 0.3 * Math.sin(t * 15)) : (s === 'warning' && !blink ? 0.6 : 0.12) }
    ];
    for (var j = 0; j < 3; j++) {
      var lx = 20 + j * 12, L = cols[j];
      ctx.fillStyle = L.on > 0.4 ? L.c : A.shade(L.c, -0.7);
      A.rr(ctx, lx - 4, -19.5, 8, 4, 2); ctx.fill();
      if (L.on > 0.4) A.glow(ctx, lx, -17.5, 10, L.c, 0.5 * L.on);
    }
    // bandeja encendida
    if (s === 'working') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t * 8);
      ctx.fillStyle = '#4da3ff'; A.rr(ctx, 8, 34, 48, 20, 4); ctx.fill(); ctx.restore();
      // barras de progreso tipo "compilando"
      ctx.fillStyle = '#4da3ff';
      for (var b = 0; b < 3; b++) ctx.fillRect(14 + ((t * 30 + b * 12) % 36), 52, 4, 1.5);
    }
    if (s === 'done') A.glow(ctx, 32, 44, 26, '#3ddc84', 0.25 + 0.1 * Math.sin(t * 6));
  };

  LIVE.testbench = function (ctx, st, th, t) {
    var s = st.state, p = st.progress;
    ctx.save(); A.rr(ctx, 8.5, -19.5, 35, 26, 2); ctx.clip();
    ctx.fillStyle = '#0f1a1c'; ctx.fillRect(8, -20, 36, 27);
    ctx.fillStyle = '#1f3a36'; ctx.fillRect(8.5, -19.5, 35, 4);
    ctx.fillStyle = '#7dffb0'; ctx.font = 'bold 3.5px ' + A.MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('npm test', 10, -19);
    var rows = 4, done = s === 'working' && p != null ? Math.floor(p * rows * 1.0001) : (s === 'done' ? rows : -1);
    for (var i = 0; i < rows; i++) {
      var ry = -13.5 + i * 5, ok;
      if (done >= 0) ok = i < done ? 1 : (i === done ? 2 : 3);
      else ok = (A.hash(i * 3 + Math.floor(t * 0.5)) > 0.25) ? 1 : 0;
      var c = ok === 1 ? '#3ddc84' : ok === 0 ? '#ff4f6d' : ok === 2 ? '#ffd23f' : '#3a4a4c';
      A.rr(ctx, 10.5, ry, 4, 4, 1); ctx.fillStyle = c; ctx.fill();
      ctx.strokeStyle = '#0f1a1c'; ctx.lineWidth = 0.9; ctx.beginPath();
      if (ok === 1) { ctx.moveTo(11.3, ry + 2); ctx.lineTo(12.3, ry + 3); ctx.lineTo(14, ry + 1); }
      else if (ok === 0) { ctx.moveTo(11.4, ry + 0.9); ctx.lineTo(13.6, ry + 3.1); ctx.moveTo(13.6, ry + 0.9); ctx.lineTo(11.4, ry + 3.1); }
      ctx.stroke();
      ctx.fillStyle = ok === 3 ? '#2a3a3c' : '#5c7a78'; ctx.fillRect(16.5, ry + 1.2, 12 + A.hash(i * 7) * 12, 1.6);
      if (ok === 2) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(16.5, ry + 1.2, ((t * 30) % 22), 1.6); }
    }
    ctx.restore();
    if (s === 'working') A.glow(ctx, 26, -6, 26, '#3ddc84', 0.2);
    if (s === 'done') A.glow(ctx, 26, -6, 26, '#3ddc84', 0.35 + 0.15 * Math.sin(t * 6));
  };

  LIVE.spec = function (ctx, st, th, t, lane) {
    var L = A.laneInfo(lane), s = st.state;
    var cycle = s === 'working' ? (t * 1.6) % 1 : (t * 0.25) % 1;
    var h = 6 + Math.min(1, cycle * 1.6) * 14;
    // papel saliendo
    ctx.save();
    ctx.beginPath(); ctx.rect(0, -40, 64, 50); ctx.clip();
    var sway = Math.sin(t * 3) * 0.8;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(18 + sway + 1.5, 10 - h + 1, 28, h);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(18 + sway, 10 - h, 28, h);
    ctx.strokeStyle = '#8a90a2'; ctx.lineWidth = 0.8; ctx.strokeRect(18 + sway, 10 - h, 28, h);
    ctx.fillStyle = L.color; ctx.fillRect(18 + sway, 10 - h, 28, 3);
    ctx.fillStyle = '#b4b9c6';
    for (var y = 10 - h + 5; y < 9; y += 3) ctx.fillRect(20 + sway, y, 16 + A.hash(y) * 8, 1);
    ctx.restore();
    // ranura delante del papel
    A.rr(ctx, 14, 9, 36, 4, 2); ctx.fillStyle = A.shade(L.dark, -0.6); ctx.fill();
    // led
    var on = s === 'working' ? ((t * 8) % 1 < 0.5) : true;
    ctx.fillStyle = on ? '#7dffb0' : '#1f4a33'; A.circle(ctx, 48.5, 18, 1.6); ctx.fill();
    if (on) A.glow(ctx, 48.5, 18, 6, '#7dffb0', 0.6);
    // pulso suave de la insignia
    A.glow(ctx, 32, 33.5, 16, L.color, 0.18 + 0.08 * Math.sin(t * 3));
  };

  LIVE.deploy = function (ctx, st, th, t) {
    var s = st.state, active = s === 'working' || s === 'done';
    // anillos
    var pulse = (t * (active ? 1.4 : 0.6)) % 1;
    ctx.strokeStyle = A.rgba('#3dffa0', (1 - pulse) * 0.6); ctx.lineWidth = 1.5;
    A.circle(ctx, 32, 30, 4 + pulse * 15); ctx.stroke();
    // flechas brillantes
    for (var i = 0; i < 3; i++) {
      var ph = ((t * 2.2) - i * 0.33) % 1; var a = 0.25 + 0.75 * Math.max(0, Math.sin(ph * PI));
      var ay = 40 - i * 8;
      ctx.beginPath(); ctx.moveTo(24, ay + 4); ctx.lineTo(32, ay - 3); ctx.lineTo(40, ay + 4);
      ctx.strokeStyle = A.rgba('#5dffb0', a); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    }
    ctx.lineCap = 'butt';
    A.glow(ctx, 32, 30, 26, '#3dffa0', 0.18 + 0.08 * Math.sin(t * 3) + (active ? 0.2 : 0));
    // PROD neón
    var flick = (Math.sin(t * 31) > -0.95) ? 1 : 0.4;
    ctx.save();
    ctx.font = 'bold 9px ' + A.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#3dff8a'; ctx.shadowBlur = 6 * flick; ctx.fillStyle = flick > 0.5 ? '#b8ffd6' : '#3a6a50';
    ctx.fillText('PROD', 32, 66);
    ctx.restore();
    if (st.joinTop) return;
    // mástiles
    ctx.fillStyle = '#c9ced8'; ctx.fillRect(4.5, -30, 2.2, 36); ctx.fillRect(57.3, -30, 2.2, 36);
    ctx.fillStyle = '#ffcc1f'; A.circle(ctx, 5.6, -31, 2); ctx.fill(); A.circle(ctx, 58.4, -31, 2); ctx.fill();
    // banderines
    [[6.7, 0], [59.5, 1]].forEach(function (p) {
      var x = p[0], dirn = p[1] ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(x, -29);
      for (var k = 0; k <= 4; k++) {
        var fx = x + dirn * k * 3.5, fy = -29 + k * 1.6 + Math.sin(t * 6 - k * 0.9 + p[1]) * (k * 0.5);
        ctx.lineTo(fx, fy);
      }
      for (var k2 = 4; k2 >= 0; k2--) {
        var fx2 = x + dirn * k2 * 3.5 * 0.7, fy2 = -19 + Math.sin(t * 6 - k2 * 0.9 + p[1]) * (k2 * 0.5) - k2 * 1.1;
        ctx.lineTo(fx2, fy2 + (k2 === 0 ? 0 : 0));
      }
      ctx.closePath();
      ctx.fillStyle = p[1] ? '#ff4f6d' : '#3ddc84'; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();
    });
  };

  var duckSprite = null;
  function getDuck() {
    if (duckSprite) return duckSprite;
    var c = A.canvas(32 * RES, 32 * RES), g = c.getContext('2d');
    g.scale(RES, RES); g.translate(16, 18);
    A.ell(g, 1, 6, 12, 7); var bg = g.createRadialGradient(-3, 2, 1, 0, 5, 13);
    bg.addColorStop(0, '#fff27a'); bg.addColorStop(1, '#f4b400'); g.fillStyle = bg; g.fill();
    g.strokeStyle = '#7a5200'; g.lineWidth = 1.4; g.stroke();
    // cola
    g.beginPath(); g.moveTo(11, 3); g.quadraticCurveTo(15, -1, 13, 6); g.closePath(); g.fillStyle = '#f4c400'; g.fill(); g.stroke();
    // ala
    g.beginPath(); g.ellipse(3, 6, 6, 3.5, -0.3, 0, TAU); g.fillStyle = '#f2b000'; g.fill();
    // cabeza
    A.circle(g, -5, -4, 7); var hg = g.createRadialGradient(-7, -7, 1, -5, -4, 8);
    hg.addColorStop(0, '#fff6a0'); hg.addColorStop(1, '#f4c000'); g.fillStyle = hg; g.fill(); g.strokeStyle = '#7a5200'; g.stroke();
    // ojo
    g.fillStyle = '#1b1430'; A.circle(g, -6.5, -5.5, 1.8); g.fill(); g.fillStyle = '#fff'; A.circle(g, -7, -6.2, 0.7); g.fill();
    g.fillStyle = 'rgba(255,120,120,0.45)'; A.circle(g, -3.5, -2, 1.6); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; A.ell(g, -3, -8, 2.5, 1.2); g.fill();
    return (duckSprite = c);
  }

  LIVE.review = function (ctx, st, th, t) {
    var s = st.state, working = s === 'working';
    var bob = Math.sin(t * (working ? 9 : 2)) * (working ? 1.6 : 0.8), tilt = Math.sin(t * (working ? 7 : 1.5)) * (working ? 0.15 : 0.05);
    A.shadow(ctx, 48, 28, 12, 3.5, 0.4);
    ctx.save(); ctx.translate(47, 18 + bob); ctx.rotate(tilt);
    ctx.drawImage(getDuck(), -16, -18, 32, 32);
    // pico
    var open = working && (t * 3 % 1) < 0.3 ? 1.6 : 0;
    ctx.fillStyle = '#ff8a1f'; ctx.strokeStyle = '#7a3a00'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-11, -4 - open * 0.5); ctx.quadraticCurveTo(-17, -4.5 - open, -18, -2.5 - open); ctx.lineTo(-11, -2.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, -2.5); ctx.lineTo(-17, -2 + open); ctx.quadraticCurveTo(-14, 0 + open, -11, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (working && (t * 3 % 1) < 0.5) {
      ctx.save(); ctx.translate(40, -8);
      A.rr(ctx, -14, -7, 28, 12, 6); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#3a2a00'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, 5); ctx.lineTo(6, 9); ctx.lineTo(7, 5); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.font = 'bold 7px ' + A.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3a2a00';
      ctx.fillText('\u00a1Cuac!', 0, -0.5);
      ctx.restore();
    }
  };

  LIVE.coffee = function (ctx, st, th, t) {
    var working = st.state === 'working';
    // gota
    var dp = (t * (working ? 3 : 0.8)) % 1;
    if (working || dp < 0.6) { ctx.fillStyle = '#4a2410'; A.ell(ctx, 23, 14 + dp * 7, 0.9, 1.4); ctx.fill(); }
    if (working) { ctx.fillStyle = '#5a3016'; ctx.fillRect(22.4, 14, 1.2, 6); }
    // aguja del manómetro
    var a = -PI * 0.75 + (working ? 1.4 : 0.9) * PI * 0.5 + Math.sin(t * (working ? 12 : 2)) * 0.12;
    ctx.strokeStyle = '#1b1430'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(37, -4); ctx.lineTo(37 + Math.cos(a) * 4, -4 + Math.sin(a) * 4); ctx.stroke();
    // led
    ctx.fillStyle = working ? '#ffb02e' : '#7dffb0'; A.circle(ctx, 41, 6, 1.4); ctx.fill();
    A.glow(ctx, 41, 6, 5, working ? '#ffb02e' : '#7dffb0', 0.6);
    // vapor de la taza y de la lanceta
    var steam = A.blob('#ffffff');
    var n = working ? 6 : 4;
    for (var i = 0; i < n; i++) {
      var ph = (t * (working ? 0.9 : 0.45) + i / n) % 1;
      var x = 23 + Math.sin(ph * 7 + i * 2) * 3 * ph, y = 18 - ph * 30, r = 3 + ph * 7;
      ctx.globalAlpha = (1 - ph) * (working ? 0.55 : 0.35) * Math.min(1, ph * 5);
      ctx.drawImage(steam, x - r, y - r, r * 2, r * 2);
      if (working) {
        var x2 = 38 + Math.sin(ph * 9 + i) * 2 - ph * 4, y2 = 22 - ph * 16;
        ctx.drawImage(steam, x2 - r * 0.8, y2 - r * 0.8, r * 1.6, r * 1.6);
      }
    }
    ctx.globalAlpha = 1;
  };

  LIVE.conveyor = function (ctx, st, th, t) {
    var d = parseDir(st.dir), horiz = d.x !== 0, speed = 22;
    ctx.save();
    A.rr(ctx, 5, 9, 54, 44, 3); ctx.clip();
    // listones de la cinta
    var off = (t * speed) % 8;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (var i = -1; i < 10; i++) {
      var p = i * 8 + (d.x + d.y > 0 ? off : -off);
      if (horiz) ctx.fillRect(5 + p, 9, 1.5, 44); else ctx.fillRect(5, 9 + p, 54, 1.5);
    }
    // chevrons
    var off2 = (t * speed) % 18;
    ctx.translate(32, 31);
    ctx.rotate(Math.atan2(d.y, d.x));
    for (var k = -3; k <= 3; k++) {
      var cx = k * 18 + off2, a = 0.45 + 0.45 * (1 - Math.abs(cx) / 40);
      ctx.beginPath(); ctx.moveTo(cx - 5, -9); ctx.lineTo(cx + 3, 0); ctx.lineTo(cx - 5, 9);
      ctx.strokeStyle = A.rgba('#ffcc1f', Math.max(0.15, a)); ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    }
    ctx.restore();
    // rodillos girando (rayita)
    for (var r = 0; r < 5; r++) {
      var ang = t * 8 * (d.x + d.y >= 0 ? 1 : -1) + r;
      ctx.strokeStyle = '#2a2f3c'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(8 + r * 12, 64); ctx.lineTo(8 + r * 12 + Math.cos(ang) * 2.4, 64 + Math.sin(ang) * 2.4); ctx.stroke();
    }
  };

  /* plantas: hojas prerenderizadas por variante, se mecen */
  var leafCache = {};
  function getLeaves(v, theme) {
    var k = v + '|' + theme;
    if (leafCache[k]) return leafCache[k];
    var c = A.canvas(80 * RES, 90 * RES), g = c.getContext('2d');
    g.scale(RES, RES); g.translate(40, 80); // base de las hojas
    var dark = '#1f7a4a', mid = '#2fa35f', light = '#6fdc7f';
    if (theme === 'datacenter') { dark = '#1d6a5a'; mid = '#27907a'; light = '#5fd6b8'; }
    if (theme === 'deploy') { dark = '#2a6a3a'; mid = '#3f9a4a'; light = '#9ad66f'; }
    function leaf(ang, len, wid, col) {
      g.save(); g.rotate(ang);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(wid, -len * 0.45, 0, -len); g.quadraticCurveTo(-wid, -len * 0.45, 0, 0);
      var lg = g.createLinearGradient(-wid, 0, wid, 0); lg.addColorStop(0, A.shade(col, -0.15)); lg.addColorStop(0.5, A.shade(col, 0.15)); lg.addColorStop(1, A.shade(col, -0.25));
      g.fillStyle = lg; g.fill(); g.strokeStyle = A.shade(dark, -0.45); g.lineWidth = 1.2; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -2); g.quadraticCurveTo(wid * 0.15, -len * 0.5, 0, -len * 0.92); g.stroke();
      g.restore();
    }
    if (v === 0) { // monstera
      var leaves = [[-1.1, 40, 13, dark], [1.0, 42, 13, dark], [-0.5, 54, 15, mid], [0.45, 52, 15, mid], [0.05, 60, 16, light], [-1.5, 30, 10, mid], [1.45, 30, 10, mid]];
      leaves.forEach(function (l) { leaf(l[0], l[1], l[2], l[3]); });
      // agujeros monstera
      g.fillStyle = 'rgba(0,0,0,0)';
    } else if (v === 1) { // sansevieria
      [[-0.32, 56, 6], [-0.12, 68, 6.5], [0.1, 62, 6], [0.3, 50, 5.5], [-0.5, 42, 5], [0.48, 40, 5]].forEach(function (l, i) {
        g.save(); g.rotate(l[0]);
        g.beginPath(); g.moveTo(-l[2], 0); g.quadraticCurveTo(-l[2] * 1.1, -l[1] * 0.6, 0, -l[1]); g.quadraticCurveTo(l[2] * 1.1, -l[1] * 0.6, l[2], 0); g.closePath();
        var sg = g.createLinearGradient(-l[2], 0, l[2], 0); sg.addColorStop(0, '#2b6b3a'); sg.addColorStop(0.5, '#4f9a4a'); sg.addColorStop(1, '#245a30');
        g.fillStyle = sg; g.fill(); g.strokeStyle = '#d8e27a'; g.lineWidth = 1.4; g.stroke();
        g.strokeStyle = 'rgba(20,50,25,0.5)'; g.lineWidth = 1;
        for (var b = 8; b < l[1] - 6; b += 7) { g.beginPath(); g.moveTo(-l[2] * 0.6, -b); g.quadraticCurveTo(0, -b - 3, l[2] * 0.6, -b); g.stroke(); }
        g.restore();
      });
    } else { // arbusto redondo con flores
      var R = A.rng(77);
      for (var i = 0; i < 34; i++) {
        var a = R() * TAU, d = Math.sqrt(R()) * 22;
        var x = Math.cos(a) * d, y = -26 + Math.sin(a) * d * 0.85;
        g.fillStyle = A.mix(dark, light, (1 - (y + 48) / 44) * 0.6 + R() * 0.4);
        A.ell(g, x, y, 7, 5.5); g.fill(); g.strokeStyle = A.rgba(A.shade(dark, -0.5), 0.5); g.lineWidth = 0.8; g.stroke();
      }
      ['#ff6b9a', '#ffd23f', '#ffffff', '#ff6b9a', '#ffd23f'].forEach(function (fc, j) {
        var fa = j * 1.3 + 0.4, fd = 10 + (j % 3) * 5;
        g.fillStyle = fc; A.circle(g, Math.cos(fa) * fd, -28 + Math.sin(fa) * fd * 0.8, 2.6); g.fill();
        g.fillStyle = '#ffb02e'; A.circle(g, Math.cos(fa) * fd, -28 + Math.sin(fa) * fd * 0.8, 1); g.fill();
      });
    }
    return (leafCache[k] = c);
  }
  LIVE.plant = function (ctx, st, th, t, v) {
    var sway = Math.sin(t * 1.3 + v * 2) * 0.045 + Math.sin(t * 2.9 + v) * 0.015;
    ctx.save(); ctx.translate(32, 40); ctx.rotate(sway);
    ctx.drawImage(getLeaves(v, th._name), -40, -80, 80, 90);
    ctx.restore();
    // borde de maceta por delante del tallo
    A.rr(ctx, 15, 37, 34, 6, 2.5); ctx.fillStyle = A.shade(th.pot, 0.08); ctx.fill(); ctx.strokeStyle = A.shade(th.pot, -0.6); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(18, 38.5, 12, 1.2);
  };

  LIVE.server_rack = function (ctx, st, th, t, v) {
    for (var u = 0; u < 11; u++) {
      var uy = -29 + u * 8.6 + 2;
      for (var l = 0; l < 4; l++) {
        var seed = u * 4 + l + v * 50, rate = 2 + A.hash(seed) * 8;
        var on = A.hash(Math.floor(t * rate) * 1.37 + seed) > 0.35;
        var col = l === 3 ? (A.hash(seed * 3) > 0.85 ? '#ffb02e' : '#38e1ff') : '#3dff8a';
        ctx.fillStyle = on ? col : '#1a2a2a';
        ctx.fillRect(12 + l * 3.6, uy, 2.2, 2.4);
      }
    }
    A.glow(ctx, 20, 18, 30, '#38e1ff', 0.08);
  };

  LIVE.trash = function (ctx, st, th, t) {
    // mosca dando vueltas
    var a = t * 3.2, fx = 32 + Math.cos(a) * 14 + Math.sin(t * 7) * 2, fy = -4 + Math.sin(a * 1.3) * 5;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    var w = Math.abs(Math.sin(t * 60)) * 2.2;
    A.ell(ctx, fx - 1.2, fy - 1.5, 1.4, w + 0.3); ctx.fill(); A.ell(ctx, fx + 1.2, fy - 1.5, 1.4, w + 0.3); ctx.fill();
    ctx.fillStyle = '#1b1430'; A.circle(ctx, fx, fy, 1.4); ctx.fill();
  };

  /* --------------------------------------------- overlays de estado */
  function topRect(type) {
    if (type === 'trash') return [9, 4, 46, 62, 20];
    if (type === 'compiler') return [3, -36, 58, 110, 7];
    if (type === 'wall') return [0, -12, 64, 86, 2];
    if (type === 'plant') return [14, -24, 36, 86, 10];
    if (type === 'server_rack') return [4, -46, 56, 120, 6];
    if (type === 'coffee') return [1, -26, 62, 100, 8];
    if (type === 'desk') return [1, -26, 62, 100, 8];
    return [1, 0, 62, 74, 8];
  }

  function highlight(ctx, type, t) {
    var r = topRect(type), p = 0.55 + 0.45 * Math.sin(t * 6);
    ctx.save();
    A.rr(ctx, r[0] - 2, r[1] - 2, r[2] + 4, r[3] + 4, r[4] + 2);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 + 0.4 * p) + ')'; ctx.lineWidth = 3; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,230,140,' + (0.25 * p) + ')'; ctx.lineWidth = 7; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,220,' + (0.07 + 0.05 * p) + ')'; ctx.fill();
    ctx.restore();
  }

  function stateOverlay(ctx, st, type, t) {
    var s = st.state, r = topRect(type);
    if (s === 'fire') {
      ctx.save(); A.rr(ctx, r[0], r[1], r[2], r[3], r[4]);
      ctx.fillStyle = 'rgba(30,12,6,0.45)'; ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,80,20,' + (0.12 + 0.08 * Math.sin(t * 17)) + ')'; ctx.fill();
      ctx.restore();
    } else if (s === 'warning') {
      var b = (t * 4 % 1) < 0.5;
      ctx.save(); A.rr(ctx, r[0], r[1], r[2], r[3], r[4]);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,150,20,' + (b ? 0.16 : 0.04) + ')'; ctx.fill();
      ctx.restore();
      // triángulo de aviso
      var by = r[1] - 14 + Math.sin(t * 10) * 2;
      ctx.save(); ctx.translate(54, by);
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(9, 7); ctx.lineTo(-9, 7); ctx.closePath();
      ctx.fillStyle = b ? '#ffcc1f' : '#ff9a1f'; ctx.fill(); ctx.strokeStyle = '#2a1a00'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.fillStyle = '#2a1a00'; ctx.font = 'bold 11px ' + A.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 2);
      ctx.restore();
    } else if (s === 'blocked') {
      ctx.save(); A.rr(ctx, r[0] + 1, r[1] + 1, r[2] - 2, r[3] - 2, r[4]);
      ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 20;
      ctx.strokeStyle = 'rgba(255,60,90,' + (0.6 + 0.3 * Math.sin(t * 8)) + ')'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,40,80,0.10)'; ctx.fill();
      ctx.restore();
    } else if (s === 'done') {
      var pop = 1 + 0.08 * Math.sin(t * 8);
      ctx.save(); ctx.translate(55, r[1] + 4); ctx.scale(pop, pop);
      A.circle(ctx, 0, 0, 7); ctx.fillStyle = '#3ddc84'; ctx.fill(); ctx.strokeStyle = '#0d4a28'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-3.2, 0.2); ctx.lineTo(-0.8, 2.6); ctx.lineTo(3.4, -2.6); ctx.stroke();
      ctx.restore();
    }
  }

  function barPos(type) {
    if (type === 'compiler') return -46;
    if (type === 'coffee' || type === 'desk') return -36;
    if (type === 'testbench') return -30;
    if (type === 'server_rack') return -56;
    return -8;
  }

  A.itemAnchor = function (type, tile) {
    var s = A.num(tile, 64) / 64, p;
    switch (type) {
      case 'compiler': p = [32, 44]; break;
      case 'desk': p = [32, 38]; break;
      case 'testbench': p = [26, 36]; break;
      case 'review': p = [24, 32]; break;
      case 'pr_stack': p = [32, 24]; break;
      case 'trash': p = [32, 10]; break;
      case 'coffee': p = [30, 40]; break;
      case 'deploy': p = [32, 28]; break;
      case 'conveyor': p = [32, 30]; break;
      default: p = [32, 28];
    }
    return { x: p[0] * s, y: p[1] * s };
  };

  /* ------------------------------------------------------ drawStation */
  A.drawStation = function (ctx, st, x, y, tile, t) {
    st = st || {}; tile = A.num(tile, 64); t = A.num(t, 0); x = A.num(x, 0); y = A.num(y, 0);
    var type = st.type || 'counter', theme = A.THEMES[st.theme] ? st.theme : 'openspace';
    var th = themeObj(theme), s = tile / 64;
    var key = type, v = 0;
    if (type === 'conveyor') key = parseDir(st.dir).x !== 0 ? 'conveyor_h' : 'conveyor_v';
    else if (!BODIES[type]) key = 'counter';
    if (type === 'counter' || type === 'plant' || type === 'server_rack') {
      var hsh = A.hash(Math.floor(x / tile) * 17.3 + Math.floor(y / tile) * 5.7);
      v = type === 'counter' ? (hsh < 0.6 ? 0 : hsh < 0.8 ? 1 : 2) : (hsh * 3) | 0;
      if (type === 'server_rack') v = (hsh * 7) | 0;
    }
    var sv = (type === 'counter') ? v : 0;
    ctx.save();
    ctx.translate(x, y); if (s !== 1) ctx.scale(s, s);
    ctx.drawImage(getSprite(key, theme, sv), -PADX, -PADT, SW, SH);
    try {
      switch (type) {
        case 'spec_front': LIVE.spec(ctx, st, th, t, 'front'); break;
        case 'spec_back': LIVE.spec(ctx, st, th, t, 'back'); break;
        case 'spec_data': LIVE.spec(ctx, st, th, t, 'data'); break;
        default: if (LIVE[type]) LIVE[type](ctx, st, th, t, v);
      }
    } catch (e) { /* robustez */ }
    stateOverlay(ctx, st, type, t);
    if (st.highlight) highlight(ctx, type, t);
    if (st.label) {
      ctx.font = 'bold 9px ' + A.FONT;
      var w = ctx.measureText(String(st.label)).width + 10;
      A.rr(ctx, 32 - w / 2, 76, w, 13, 6); ctx.fillStyle = 'rgba(20,14,40,0.8)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(st.label), 32, 83);
    }
    if (st.progress != null && isFinite(st.progress)) {
      var col = st.state === 'warning' ? '#ffb02e' : st.state === 'fire' ? '#ff4f4f' : type === 'compiler' ? '#4da3ff' : type === 'coffee' ? '#c98a4a' : type === 'review' ? '#ffd23f' : '#3ddc84';
      A.drawProgressBar(ctx, 32, barPos(type), 46, st.progress, col);
    }
    ctx.restore();
  };

  /* ------------------------------------------------------ cohete */
  var rocketSprite = null;
  function getRocket() {
    if (rocketSprite) return rocketSprite;
    var c = A.canvas(48 * RES, 80 * RES), g = c.getContext('2d');
    g.scale(RES, RES); g.translate(24, 40);
    // aletas
    [-1, 1].forEach(function (d) {
      g.beginPath(); g.moveTo(d * 9, 8); g.quadraticCurveTo(d * 20, 14, d * 19, 30); g.lineTo(d * 8, 22); g.closePath();
      g.fillStyle = '#ff4f6d'; g.fill(); g.strokeStyle = '#5a0a1e'; g.lineWidth = 1.8; g.stroke();
    });
    // cuerpo
    g.beginPath(); g.moveTo(0, -36); g.bezierCurveTo(14, -24, 13, 10, 10, 24); g.lineTo(-10, 24); g.bezierCurveTo(-13, 10, -14, -24, 0, -36); g.closePath();
    var bg = g.createLinearGradient(-12, 0, 12, 0);
    bg.addColorStop(0, '#c9cfdc'); bg.addColorStop(0.35, '#ffffff'); bg.addColorStop(1, '#8a92a6');
    g.fillStyle = bg; g.fill(); g.strokeStyle = '#2a2440'; g.lineWidth = 2; g.stroke();
    // punta
    g.save(); g.clip();
    g.fillStyle = '#ff4f6d'; g.fillRect(-15, -40, 30, 16);
    g.fillStyle = '#4da3ff'; g.fillRect(-15, 12, 30, 4);
    g.restore();
    g.beginPath(); g.moveTo(-11, -24); g.quadraticCurveTo(0, -22, 11, -24); g.strokeStyle = '#5a0a1e'; g.lineWidth = 1.5; g.stroke();
    // ventana
    A.circle(g, 0, -8, 6.5); g.fillStyle = '#2a2440'; g.fill();
    A.circle(g, 0, -8, 5); var wg = g.createRadialGradient(-2, -10, 0.5, 0, -8, 5);
    wg.addColorStop(0, '#bfe8ff'); wg.addColorStop(1, '#2f7fd6'); g.fillStyle = wg; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; A.circle(g, -1.8, -10, 1.5); g.fill();
    g.font = 'bold 6px ' + A.MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2a2440';
    g.fillText('v1.0', 0, 5);
    // tobera
    A.rr(g, -7, 23, 14, 5, 2); g.fillStyle = '#4a4f63'; g.fill(); g.strokeStyle = '#1b1430'; g.lineWidth = 1.2; g.stroke();
    // aleta central
    g.fillStyle = '#d6304e'; A.rr(g, -1.5, 10, 3, 16, 1.5); g.fill();
    return (rocketSprite = c);
  }

  A.drawRocket = function (ctx, x, y, t, progress) {
    x = A.num(x, 0); y = A.num(y, 0); t = A.num(t, 0); var p = A.clamp(A.num(progress, 0), 0, 1);
    var rise = Math.pow(p, 2.2) * 620, shake = p < 0.25 ? Math.sin(t * 70) * (1.5 - p * 4) : 0;
    var ry = y - 40 - rise, rx = x + shake;
    var smoke = A.blob('#e8e2f0'), fireBlob = A.blob('#ff8a1f');
    ctx.save();
    // humo de suelo
    if (p < 0.7) {
      for (var i = 0; i < 9; i++) {
        var sp = (t * 0.7 + i / 9) % 1, side = i % 2 ? 1 : -1;
        var sx = x + side * (6 + sp * 50 * (0.6 + A.hash(i) * 0.6)), sy = y - 4 - sp * 10, r = 10 + sp * 18;
        ctx.globalAlpha = (1 - sp) * 0.65 * (1 - p / 0.7) * Math.min(1, p * 8 + 0.2);
        ctx.drawImage(smoke, sx - r, sy - r, r * 2, r * 2);
      }
    }
    // estela
    var trail = Math.min(rise + 20, 320), np = 8 + Math.floor(trail / 14);
    for (var j = 0; j < np; j++) {
      var q = j / np, ty = ry + 32 + q * trail, tr = 6 + q * 18;
      ctx.globalAlpha = (1 - q) * 0.55 * Math.min(1, p * 10);
      ctx.drawImage(smoke, rx - tr + Math.sin(t * 6 + j) * 3 * q, ty - tr, tr * 2, tr * 2);
    }
    ctx.globalAlpha = 1;
    // llama
    if (p > 0.02) {
      var fl = 18 + 12 * Math.min(1, p * 3) + Math.sin(t * 45) * 4;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(fireBlob, rx - 22, ry + 26, 44, 44);
      ctx.restore();
      [['#ff5a1f', 9, 1], ['#ffb02e', 6, 0.78], ['#fff6c0', 3.2, 0.5]].forEach(function (f) {
        ctx.beginPath(); ctx.moveTo(rx - f[1], ry + 28);
        ctx.quadraticCurveTo(rx - f[1] * 0.6, ry + 28 + fl * f[2] * 0.6, rx, ry + 28 + fl * f[2]);
        ctx.quadraticCurveTo(rx + f[1] * 0.6, ry + 28 + fl * f[2] * 0.6, rx + f[1], ry + 28);
        ctx.closePath(); ctx.fillStyle = f[0]; ctx.fill();
      });
    }
    ctx.drawImage(getRocket(), rx - 24, ry - 40, 48, 80);
    ctx.restore();
  };

  A._initStations = function () {
    var types = Object.keys(BODIES);
    Object.keys(A.THEMES).forEach(function (th) {
      types.forEach(function (ty) { getSprite(ty, th, 0); });
      getSprite('counter', th, 1); getSprite('counter', th, 2);
      for (var v = 0; v < 3; v++) getLeaves(v, th);
    });
    getDuck(); getRocket();
  };
})(window.OW);
