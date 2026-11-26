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

  /* ---------- Ajustes de equilibrio (js/core/tuning.js) ----------
   * OW.TUNING contiene los valores; aquí se guardan los de fábrica y se aplican/guardan los cambios
   * hechos desde el panel de desarrollador (F9) en localStorage. Los objetos y arrays de OW.TUNING se
   * modifican SIEMPRE en el sitio, para que los alias (OW.DIFFICULTIES, OW.RECIPE_VALUE...) sigan valiendo. */
  var TUNING_KEY = 'overworking_tuning_v1';
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  // hoja = número, texto, booleano o array de valores simples (un array de objetos, como las dificultades, no lo es)
  function isLeaf(v) {
    if (Array.isArray(v)) return !(v.length && v[0] !== null && typeof v[0] === 'object');
    return v === null || typeof v !== 'object';
  }
  OW.TUNING = OW.TUNING || {};
  var Tuning = (OW.Tuning = {
    KEY: TUNING_KEY,
    defaults: clone(OW.TUNING),
    /* validate(pathString, value) → true si es aceptable (lo registra el panel con sus min/max). */
    validate: null,
    get: function (path, root) {
      var o = root || OW.TUNING, ps = typeof path === 'string' ? path.split('.') : path;
      for (var i = 0; i < ps.length; i++) { if (o == null) return undefined; o = o[ps[i]]; }
      return o;
    },
    def: function (path) { return this.get(path, this.defaults); },
    /* Comprueba que el valor tiene el mismo tipo que el de fábrica. */
    sameShape: function (d, v) {
      if (Array.isArray(d)) {
        if (!Array.isArray(v) || !v.length || v.length > 32) return false;
        var t = typeof d[0];
        for (var i = 0; i < v.length; i++) if (typeof v[i] !== t || (t === 'number' && !isFinite(v[i]))) return false;
        return true;
      }
      if (typeof d === 'number') return typeof v === 'number' && isFinite(v);
      if (typeof d === 'string') return typeof v === 'string' && v.length <= 200;
      return typeof d === typeof v;
    },
    /* Fija un valor hoja. Devuelve true si se aplicó. */
    set: function (path, value) {
      var ps = typeof path === 'string' ? path.split('.') : path.slice(), key = ps.pop();
      var parent = this.get(ps), d = this.def(ps.concat([key]));
      if (parent == null || d === undefined || !isLeaf(d) || !this.sameShape(d, value)) return false;
      // los arrays de tamaño fijo (rangos, estrellas, puntos por ingredientes) no pueden cambiar de longitud
      if (Array.isArray(d) && key !== 'recipes' && key !== 'weights' && value.length !== d.length) return false;
      if (this.validate && !this.validate(ps.concat([key]).join('.'), value)) return false;
      if (Array.isArray(parent[key])) { parent[key].length = 0; Array.prototype.push.apply(parent[key], value); }
      else parent[key] = value;
      return true;
    },
    reset: function (path) { var d = this.def(path); if (d !== undefined) this.set(path, clone(d)); },
    /* Lista de hojas que difieren de fábrica: { 'player.maxSpeed': 350, ... } */
    diff: function () {
      var out = {};
      (function walk(d, c, pre) {
        for (var k in d) {
          if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
          var p = pre ? pre + '.' + k : k;
          if (isLeaf(d[k])) { if (c && JSON.stringify(c[k]) !== JSON.stringify(d[k])) out[p] = clone(c[k]); }
          else walk(d[k], c && c[k], p);
        }
      })(this.defaults, OW.TUNING, '');
      return out;
    },
    count: function () { return Object.keys(this.diff()).length; },
    /* Aplica un mapa de overrides; devuelve cuántos se aceptaron. */
    apply: function (map) {
      var n = 0;
      for (var p in map) if (Object.prototype.hasOwnProperty.call(map, p) && this.set(p, map[p])) n++;
      this.sanitize();
      return n;
    },
    /* recipes y weights de cada nivel van emparejados: si no cuadran, se vuelve a fábrica. */
    sanitize: function () {
      var L = OW.TUNING.levels || {};
      for (var id in L) {
        var l = L[id], ok = l.recipes && l.weights && l.recipes.length === l.weights.length && l.recipes.length > 0;
        if (ok && OW.RECIPES) for (var i = 0; i < l.recipes.length; i++) if (!OW.RECIPES[l.recipes[i]]) ok = false;
        if (!ok) { this.reset('levels.' + id + '.recipes'); this.reset('levels.' + id + '.weights'); }
      }
    },
    resetAll: function () {
      var d = this.diff();
      for (var p in d) this.reset(p);
      this.save();
    },
    load: function () {
      try {
        var raw = window.localStorage.getItem(TUNING_KEY);
        if (raw) { var o = JSON.parse(raw); if (o && typeof o === 'object') this.apply(o.overrides || o); }
      } catch (e) { /* localStorage no disponible o JSON roto: se ignora */ }
      this.save(); // limpia overrides que ya coinciden con tuning.js
    },
    save: function () {
      try {
        var d = this.diff();
        if (Object.keys(d).length) window.localStorage.setItem(TUNING_KEY, JSON.stringify({ version: 1, overrides: d }));
        else window.localStorage.removeItem(TUNING_KEY);
      } catch (e) { /* nada */ }
    }
  });
  void Tuning;

  /* Niveles de dificultad (valores en js/core/tuning.js). Por defecto "Junior Optimista" (índice 1). */
  OW.DIFFICULTIES = OW.TUNING.difficulties;
  OW.difficulty = function () {
    var i = OW.Save && OW.Save.data.difficulty;
    return OW.DIFFICULTIES[i] || OW.DIFFICULTIES[1];
  };
  /* Copia del nivel con los modificadores de dificultad aplicados. */
  OW.applyDifficulty = function (lv) {
    var d = OW.difficulty(), c = {};
    for (var k in lv) if (Object.prototype.hasOwnProperty.call(lv, k)) c[k] = lv[k];
    c.timeMul = (lv.timeMul || 1) * d.order;
    c.orderGap = [lv.orderGap[0] * d.gap, lv.orderGap[1] * d.gap];
    c.heat = (lv.heat || 1) * d.heat;
    c.bugChance = Math.min(OW.TUNING.bugs.maxChance, (lv.bugChance || 0) * d.bugs);
    if (d.maxOrders) {
      c.maxOrders = Math.min(lv.maxOrders, d.maxOrders);
      c.startOrders = Math.min(lv.startOrders || 1, c.maxOrders);
    }
    return c;
  };

  /* Guardado de progreso y opciones */
  var KEY = 'overworking_save_v1';
  OW.Save = {
    data: { stars: [0, 0, 0, 0, 0], best: [0, 0, 0, 0, 0], music: 0.7, sfx: 0.8, difficulty: 1 },
    load: function () {
      try {
        var raw = window.localStorage.getItem(KEY);
        if (raw) {
          var d = JSON.parse(raw);
          if (d && Array.isArray(d.stars)) {
            for (var i = 0; i < 5; i++) { this.data.stars[i] = d.stars[i] | 0; this.data.best[i] = (d.best && d.best[i]) | 0; }
            if (typeof d.music === 'number') this.data.music = U.clamp(d.music, 0, 1);
            if (typeof d.sfx === 'number') this.data.sfx = U.clamp(d.sfx, 0, 1);
            if (typeof d.difficulty === 'number') this.data.difficulty = U.clamp(d.difficulty | 0, 0, OW.DIFFICULTIES.length - 1);
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
