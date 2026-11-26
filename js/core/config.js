/* OVERWORKING — CORE: constantes, utilidades, guardado y llamadas seguras a ART/AUDIO. */
(function () {
  'use strict';
  var OW = (window.OW = window.OW || {});

  OW.C = {
    W: 1280, H: 720, TILE: 64, COLS: 18, ROWS: 9, OX: 64, OY: 128, DT: 1 / 60,
    LANES: ['front', 'back', 'data'],
    LANE_COLORS: { front: '#4da3ff', back: '#3ddc84', data: '#ffb02e' },
    LANE_NAMES: { front: 'Front', back: 'Back', data: 'Datos' },
    FONT: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    MONO: '"Consolas", "DejaVu Sans Mono", monospace'
  };

  var U = (OW.U = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    dist: function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); },
    approach: function (v, target, step) { return v < target ? Math.min(v + step, target) : Math.max(v - step, target); },
    easeOutBack: function (t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    easeOutCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    round5: function (v) { return Math.round(v / 5) * 5; },
    fmtTime: function (s) { s = Math.max(0, Math.ceil(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; },
    sameSet: function (a, b) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (b.indexOf(a[i]) < 0) return false;
      return true;
    },
    roundRect: function (ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    },
    text: function (ctx, str, x, y, opts) {
      opts = opts || {};
      ctx.font = (opts.weight || 'bold') + ' ' + (opts.size || 20) + 'px ' + (opts.font || OW.C.FONT);
      ctx.textAlign = opts.align || 'center';
      ctx.textBaseline = opts.baseline || 'alphabetic';
      if (opts.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = opts.strokeWidth || 5; ctx.strokeStyle = opts.stroke; ctx.strokeText(str, x, y); }
      ctx.fillStyle = opts.color || '#fff';
      ctx.fillText(str, x, y);
      ctx.textBaseline = 'alphabetic';
    }
  });

  /* Audio seguro: nunca lanza. */
  OW.sfx = function (name, opts) { try { OW.Audio.play(name, opts); } catch (e) { /* silencio */ } };
  OW.music = function (track) { try { OW.Audio.startMusic(track); } catch (e) { /* silencio */ } };
  OW.fx = function (type, x, y, opts) {
    // los textos flotantes no deben salirse por los bordes de la pantalla
    if (type === 'text') { var half = Math.min(260, String((opts && opts.text) || '').length * ((opts && opts.size) || 20) * 0.3); x = U.clamp(x, 12 + half, OW.C.W - 12 - half); }
    try { OW.FX.spawn(type, x, y, opts || {}); } catch (e) { /* silencio */ }
  };

  /* Guardado de progreso y opciones */
  var KEY = 'overworking_save_v1';
  OW.Save = {
    data: { stars: [0, 0, 0, 0, 0], best: [0, 0, 0, 0, 0], music: 0.7, sfx: 0.8 },
    load: function () {
      try {
        var raw = window.localStorage.getItem(KEY);
        if (raw) {
          var d = JSON.parse(raw);
          if (d && Array.isArray(d.stars)) {
            for (var i = 0; i < 5; i++) { this.data.stars[i] = d.stars[i] | 0; this.data.best[i] = (d.best && d.best[i]) | 0; }
            if (typeof d.music === 'number') this.data.music = U.clamp(d.music, 0, 1);
            if (typeof d.sfx === 'number') this.data.sfx = U.clamp(d.sfx, 0, 1);
          }
        }
      } catch (e) { /* localStorage no disponible */ }
      this.applyVolume();
    },
    save: function () { try { window.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* nada */ } },
    applyVolume: function () { try { OW.Audio.setVolume(this.data.music, this.data.sfx); } catch (e) { /* nada */ } },
    unlocked: function (i) { return i === 0 || this.data.stars[i - 1] >= 1; },
    record: function (i, stars, score) {
      var improved = stars > this.data.stars[i] || score > this.data.best[i];
      this.data.stars[i] = Math.max(this.data.stars[i], stars);
      this.data.best[i] = Math.max(this.data.best[i], score);
      this.save();
      return improved;
    },
    totalStars: function () { return this.data.stars.reduce(function (a, b) { return a + b; }, 0); }
  };
})();
