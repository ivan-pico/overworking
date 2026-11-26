/* OVERWORKING — CORE: arranque, bucle principal (dt fijo), máquina de estados y hook de depuración. */
(function () {
  'use strict';
  var OW = window.OW, C = OW.C;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  var App = (OW.App = {
    screen: null, name: '', players: 1, game: null, t: 0, renderT: 0,
    frozen: false, // true mientras está abierto el panel de ajustes: la simulación se detiene
    go: function (name, params) {
      var s = OW.Screens[name];
      if (!s) throw new Error('Pantalla desconocida: ' + name);
      this.name = name; this.screen = s;
      if (s.enter) s.enter(params || {});
    },
    startLevel: function (li, players, skipIntro) {
      li = Math.max(0, Math.min(OW.LEVELS.length - 1, li | 0));
      this.players = players === 2 ? 2 : 1;
      try { OW.FX.clear(); } catch (e) { /* nada */ }
      this.game = new OW.Game(li, this.players);
      OW.music(this.game.theme);
      try { OW.Audio.setIntensity(0); } catch (e) { /* nada */ }
      this.go(skipIntro ? 'play' : 'intro');
      return this.game;
    },
    muted: false, toast: null,
    update: function (dt) {
      this.t += dt;
      if (OW.Input.wasPressed('KeyM')) {
        this.muted = !this.muted;
        try { OW.Audio.mute(this.muted); } catch (e) { /* nada */ }
        this.toast = { text: this.muted ? 'Sonido: OFF (M)' : 'Sonido: ON (M)', t: 1.6 };
      }
      if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
      if (this.screen && this.screen.update) this.screen.update(dt);
      try { OW.FX.update(dt); } catch (e) { /* nada */ }
    }
  });

  /* Letterbox: el lienzo lógico es 1280×720 y se escala por CSS manteniendo aspecto. */
  function resize() {
    var w = window.innerWidth, h = window.innerHeight, s = Math.min(w / C.W, h / C.H);
    canvas.style.width = Math.floor(C.W * s) + 'px';
    canvas.style.height = Math.floor(C.H * s) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  OW.Input.attach(canvas);
  OW.Input.onAnyKey = function () { try { OW.Audio.init(); } catch (e) { /* nada */ } };
  window.addEventListener('blur', function () { if (App.name === 'play' && !App.frozen) App.go('pause'); });

  // ajustes de equilibrio modificados desde el panel (F9), guardados en localStorage
  if (OW.Tuning) OW.Tuning.load();
  if (OW.syncLevels) OW.syncLevels();
  if (OW.DevPanel) OW.DevPanel.refreshBadge();
  OW.Save.load();
  try { OW.Art.init(); } catch (e) { console.error('OW.Art.init falló:', e); }

  var errShown = {};
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    try {
      if (App.screen && App.screen.draw) App.screen.draw(ctx, App.renderT);
      if (App.toast) {
        ctx.save(); ctx.globalAlpha = Math.min(1, App.toast.t * 3);
        OW.Art.drawPanel(ctx, 540, 640, 200, 40, { alpha: 0.9, radius: 12 });
        OW.U.text(ctx, App.toast.text, 640, 667, { size: 16, color: '#fff' });
        ctx.restore();
      }
    } catch (e) {
      var k = String(e && e.message);
      if (!errShown[k]) { errShown[k] = 1; console.error('Error de render en ' + App.name + ':', e); }
    }
  }

  function step(dt) {
    OW.Input.poll();
    App.update(dt);
    OW.Input.endStep();
  }

  var acc = 0, last = null;
  function frame(ts) {
    if (last == null) last = ts;
    var dt = Math.min(0.1, Math.max(0, (ts - last) / 1000));
    last = ts;
    acc = App.frozen ? 0 : acc + dt;
    var n = 0;
    while (acc >= C.DT && n < 6) { step(C.DT); acc -= C.DT; n++; }
    if (n >= 6) acc = 0;
    App.renderT += dt;
    render();
    requestAnimationFrame(frame);
  }

  /* Hook de depuración para QA automático. */
  OW.debug = {
    state: function () {
      return { screen: App.name, players: App.players, t: +App.t.toFixed(2), save: JSON.parse(JSON.stringify(OW.Save.data)),
        game: App.game && (App.name === 'play' || App.name === 'intro' || App.name === 'pause' || App.name === 'timeup' || App.name === 'results') ? App.game.snapshot() : null };
    },
    /* i: número de nivel 1..5; players: 1 o 2. Arranca directamente en juego (sin cuenta atrás). */
    startLevel: function (i, players) { App.startLevel((i | 0) - 1, players || 1, true); return this.state(); },
    simulateKey: function (code, down) { OW.Input.setKey(code, down !== false); },
    /* Avanza la simulación s segundos de forma síncrona. */
    skipTime: function (s) {
      var n = Math.round((s || 0) / C.DT);
      for (var i = 0; i < n; i++) step(C.DT);
      render();
      return this.state();
    },
    go: function (name, params) { App.go(name, params); return App.name; },
    game: function () { return App.game; },
    teleport: function (pi, col, row, dx, dy) {
      var p = App.game && App.game.players[pi];
      if (!p) return false;
      p.x = C.OX + col * C.TILE + C.TILE / 2; p.y = C.OY + row * C.TILE + C.TILE / 2 + 8; p.vx = p.vy = 0;
      if (dx != null) p.dir = { x: dx, y: dy };
      p.target = App.game.findTarget(p);
      return p.target ? p.target.type : null;
    },
    unlockAll: function () { for (var i = 0; i < 5; i++) OW.Save.data.stars[i] = Math.max(1, OW.Save.data.stars[i]); OW.Save.save(); }
  };

  /* Arranque: ?level=N salta directamente al nivel N (para tests). ?players=2, ?skipintro=1 */
  var q = {};
  location.search.replace(/^\?/, '').split('&').forEach(function (kv) { if (kv) { var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } });
  var lvl = parseInt(q.level, 10);
  if (lvl >= 1 && lvl <= OW.LEVELS.length) {
    App.startLevel(lvl - 1, q.players === '2' ? 2 : 1, q.skipintro === '1');
  } else {
    App.go(['menu', 'options', 'controls', 'credits', 'levels'].indexOf(q.screen) >= 0 ? q.screen : 'title');
  }
  render();
  requestAnimationFrame(frame);
})();
