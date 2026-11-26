/* OVERWORKING — CORE: pantallas (título, menú, opciones, controles, créditos, selector git, intro, pausa, fin, resultados). */
(function () {
  'use strict';
  var OW = window.OW, C = OW.C, U = OW.U;
  var S = (OW.Screens = {});

  /* ---------- Lista de botones reutilizable (teclado + mando + ratón) ---------- */
  function ButtonList(items, x, y, w, h, gap) {
    this.items = items; this.focus = 0;
    this.rects = items.map(function (it, i) { return { x: x, y: y + i * (h + gap), w: w, h: h }; });
  }
  ButtonList.prototype.update = function (m) {
    var I = OW.Input, n = this.items.length;
    if (m.up) { this.focus = (this.focus + n - 1) % n; OW.sfx('ui_move'); }
    if (m.down) { this.focus = (this.focus + 1) % n; OW.sfx('ui_move'); }
    var hit = -1;
    for (var i = 0; i < this.rects.length; i++) {
      var r = this.rects[i];
      if (I.mouse.x >= r.x && I.mouse.x <= r.x + r.w && I.mouse.y >= r.y && I.mouse.y <= r.y + r.h) hit = i;
    }
    if (I.mouse.moved && hit >= 0 && hit !== this.focus) { this.focus = hit; OW.sfx('ui_move'); }
    if (m.confirm || (I.mouse.clicked && hit >= 0)) {
      if (hit >= 0 && I.mouse.clicked) this.focus = hit;
      var it = this.items[this.focus];
      if (it.disabled) { OW.sfx('wrong'); return; }
      OW.sfx('ui_select');
      it.action();
    }
  };
  ButtonList.prototype.draw = function (ctx, t) {
    for (var i = 0; i < this.items.length; i++) {
      var r = this.rects[i], it = this.items[i];
      ctx.save();
      if (it.disabled) ctx.globalAlpha = 0.45;
      OW.Art.drawButton(ctx, r.x, r.y, r.w, r.h, typeof it.label === 'function' ? it.label() : it.label, i === this.focus, t);
      ctx.restore();
    }
  };
  OW.ButtonList = ButtonList;

  function footer(ctx, txt) {
    U.text(ctx, txt, 640, 700, { size: 15, color: 'rgba(255,255,255,0.75)' });
  }

  /* ---------- Título ---------- */
  S.title = {
    enter: function () { this.t = 0; },
    update: function (dt) {
      this.t += dt;
      if (OW.Input.anyPressed() && this.t > 0.3) {
        try { OW.Audio.init(); } catch (e) { /* nada */ }
        OW.Save.applyVolume();
        OW.sfx('ui_select');
        OW.App.go('menu');
      }
    },
    draw: function (ctx, t) {
      OW.Art.drawMenuBackground(ctx, t);
      OW.Art.drawLogo(ctx, 640, 270, 1.1, t);
      U.text(ctx, 'Un co-op frenético de programadores al borde del burnout', 640, 380, { size: 22, color: '#fff', stroke: 'rgba(0,0,0,0.5)', strokeWidth: 5 });
      if (Math.sin(t * 4) > -0.3) U.text(ctx, 'Pulsa cualquier tecla', 640, 520, { size: 30, color: '#ffd23f', stroke: '#2b1b4a', strokeWidth: 7 });
      U.text(ctx, 'v1.0 · hecho con café y deadlines', 640, 682, { size: 15, color: 'rgba(255,255,255,0.75)' });
      U.text(ctx, 'Gohan Project  ·  gohan.cat  ·  Ivan Picó', 640, 706, { size: 14, color: 'rgba(255,210,63,0.85)' });
    }
  };

  /* ---------- Menú principal ---------- */
  S.menu = {
    enter: function () {
      OW.music('menu');
      var go = function (n) { return function () { OW.App.players = n; OW.App.go('levels'); }; };
      this.list = new ButtonList([
        { label: '1 JUGADOR', action: go(1) },
        { label: '2 JUGADORES', action: go(2) },
        { label: 'OPCIONES', action: function () { OW.App.go('options'); } },
        { label: 'CONTROLES', action: function () { OW.App.go('controls'); } },
        { label: 'CRÉDITOS', action: function () { OW.App.go('credits'); } }
      ], 490, 300, 300, 58, 16);
    },
    update: function () {
      var m = OW.Input.menu();
      if (m.back) { OW.sfx('ui_back'); OW.App.go('title'); return; }
      this.list.update(m);
    },
    draw: function (ctx, t) {
      OW.Art.drawMenuBackground(ctx, t);
      OW.Art.drawLogo(ctx, 640, 150, 0.85, t);
      this.list.draw(ctx, t);
      var tot = OW.Save.totalStars();
      OW.Art.drawIcon(ctx, 'star', 1150, 690, 22);
      U.text(ctx, tot + '/15', 1200, 697, { size: 18, color: '#ffd23f', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 4 });
      footer(ctx, 'Flechas/WASD + Enter · Ratón · Mando');
    }
  };

  /* ---------- Opciones ---------- */
  function volLabel(name, key) {
    return function () {
      var v = Math.round(OW.Save.data[key] * 10), bar = '';
      for (var i = 0; i < 10; i++) bar += i < v ? '■' : '□';
      return name + '  ' + bar;
    };
  }
  function changeDifficulty(d) {
    var n = OW.DIFFICULTIES.length, s = OW.Save.data;
    s.difficulty = ((s.difficulty == null ? 1 : s.difficulty) + d + n) % n;
    OW.Save.save(); OW.sfx('ui_move');
  }
  S.options = {
    enter: function () {
      this.list = new ButtonList([
        { label: volLabel('MÚSICA', 'music'), key: 'music', action: function () {} },
        { label: volLabel('EFECTOS', 'sfx'), key: 'sfx', action: function () {} },
        { label: function () { return '◀  ' + OW.difficulty().name.toUpperCase() + '  ▶'; }, diff: true, action: function () {} },
        { label: 'BORRAR PROGRESO', action: function () { S.options.confirmReset(); } },
        { label: 'VOLVER', action: function () { OW.App.go('menu'); } }
      ], 400, 200, 480, 58, 16);
      this.resetArmed = 0;
    },
    confirmReset: function () {
      if (this.resetArmed > 0) {
        OW.Save.data.stars = [0, 0, 0, 0, 0]; OW.Save.data.best = [0, 0, 0, 0, 0]; OW.Save.save();
        this.resetArmed = 0; this.msg = 'Progreso borrado (git reset --hard)'; this.msgT = 2.5;
      } else { this.resetArmed = 3; this.msg = 'Pulsa otra vez para confirmar'; this.msgT = 3; }
    },
    update: function (dt) {
      var m = OW.Input.menu();
      this.resetArmed = Math.max(0, this.resetArmed - dt); this.msgT = Math.max(0, (this.msgT || 0) - dt);
      if (m.back) { OW.sfx('ui_back'); OW.App.go('menu'); return; }
      var it = this.list.items[this.list.focus];
      if (it.diff && (m.left || m.right || m.confirm)) {
        changeDifficulty(m.left ? -1 : 1);
        m.confirm = false;
      }
      var I = OW.Input, dr = this.list.rects[2];
      if (I.mouse.clicked && I.mouse.x >= dr.x && I.mouse.x <= dr.x + dr.w && I.mouse.y >= dr.y && I.mouse.y <= dr.y + dr.h) {
        this.list.focus = 2; changeDifficulty(I.mouse.x < dr.x + dr.w / 2 ? -1 : 1); return;
      }
      if (it.key && (m.left || m.right || m.confirm)) {
        var d = m.left ? -0.1 : 0.1, v = OW.Save.data[it.key] + d;
        if (m.confirm && v > 1.001) v = 0;
        OW.Save.data[it.key] = Math.round(U.clamp(v, 0, 1) * 10) / 10;
        OW.Save.applyVolume(); OW.Save.save(); OW.sfx('ui_move');
        m.confirm = false;
      }
      this.list.update(m);
    },
    draw: function (ctx, t) {
      OW.Art.drawMenuBackground(ctx, t);
      OW.Art.drawPanel(ctx, 340, 120, 600, 520, { title: 'OPCIONES', alpha: 0.92 });
      this.list.draw(ctx, t);
      // detalle de la dificultad
      var D = OW.difficulty(), di = OW.DIFFICULTIES.indexOf(D);
      U.text(ctx, 'DIFICULTAD', 628, 584, { size: 14, align: 'right', color: '#cfc6ef' });
      for (var p = 0; p < OW.DIFFICULTIES.length; p++) {
        ctx.fillStyle = p <= di ? D.color : 'rgba(255,255,255,0.25)';
        U.roundRect(ctx, 642 + p * 20, 572, 15, 15, 4); ctx.fill();
      }
      U.text(ctx, D.desc, 640, 612, { size: 15, color: D.color, weight: 'normal' });
      if (this.msgT > 0) U.text(ctx, this.msg, 640, 632, { size: 16, color: '#ff7b7b' });
      footer(ctx, '← → ajustar volumen y dificultad · Esc volver');
    }
  };

  /* ---------- Controles ---------- */
  S.controls = {
    enter: function () {},
    update: function () {
      var m = OW.Input.menu();
      if (m.back || m.confirm || OW.Input.mouse.clicked) { OW.sfx('ui_back'); OW.App.go('menu'); }
    },
    draw: function (ctx, t) {
      OW.Art.drawMenuBackground(ctx, t);
      OW.Art.drawPanel(ctx, 90, 50, 1100, 620, { title: 'CONTROLES', alpha: 0.92 });
      var rows = [
        ['', 'JUGADOR 1', 'JUGADOR 2', 'MANDO'],
        ['Mover', 'W A S D', 'Flechas', 'Stick / cruceta'],
        ['Coger / dejar', 'E', '.  (punto)', 'A'],
        ['Acción (mantener)', 'F', ',  (coma)', 'X'],
        ['Dash', 'Shift izq.', '-  (guion)', 'B'],
        ['Cambiar dev (solo)', 'Tab', 'Tab', 'Y'],
        ['Pausa', 'Esc / P', 'Esc / P', 'Start'],
        ['Silenciar', 'M', 'M', '—']
      ];
      for (var r = 0; r < rows.length; r++) {
        for (var c = 0; c < 4; c++) {
          var x = [200, 480, 720, 960][c], y = 136 + r * 42;
          U.text(ctx, rows[r][c], x, y, { size: r === 0 ? 18 : 20, color: r === 0 ? '#ffd23f' : c === 0 ? '#ffffff' : '#cfc6ef', align: c === 0 ? 'left' : 'center', weight: c === 0 || r === 0 ? 'bold' : 'normal' });
        }
      }
      var tips = [
        'Pipeline: SPEC → ESCRITORIO (mantén acción) → SERVIDOR (compila solo) → TESTS (mantén) → PR → DEPLOY',
        'Recoge el build a tiempo o el servidor arderá: usa el extintor HOTFIX manteniendo acción.',
        'Los bugs bloquean estaciones: aplástalos con acción. El dash esquiva al manager.',
        'Sin café vas a cámara lenta. Los PR desplegados vuelven a REVISIÓN: límpialos para reutilizarlos.'
      ];
      for (var i = 0; i < tips.length; i++) U.text(ctx, tips[i], 640, 500 + i * 32, { size: 16, color: '#ffffff', weight: 'normal' });
      U.text(ctx, 'F9: panel de ajustes (modo desarrollador)', 640, 642, { size: 13, color: 'rgba(207,198,239,0.6)', weight: 'normal' });
      footer(ctx, 'Pulsa cualquier botón para volver');
    }
  };

  /* ---------- Créditos ---------- */
  S.credits = {
    enter: function () { this.t = 0; },
    update: function (dt) {
      this.t += dt;
      var m = OW.Input.menu();
      if (m.back || m.confirm || OW.Input.mouse.clicked) { OW.sfx('ui_back'); OW.App.go('menu'); }
    },
    draw: function (ctx, t) {
      OW.Art.drawMenuBackground(ctx, t);
      OW.Art.drawPanel(ctx, 290, 80, 700, 560, { title: 'CRÉDITOS', alpha: 0.92 });
      var lines = [
        ['$ git shortlog -sn', true],
        ['  42  Agente CORE — jugabilidad, niveles, menús', false],
        ['  27  Agente ART — gráficos procedurales', false],
        ['  19  Agente AUDIO — chiptune sintetizado', false],
        ['', false],
        ['Inspirado en las cocinas más caóticas', false],
        ['y en todos los deploys de viernes.', false],
        ['', false],
        ['Ningún becario fue dañado durante el desarrollo.', false],
        ['(Bueno, uno. Pero tenía café.)', false]
      ];
      for (var i = 0; i < lines.length; i++) U.text(ctx, lines[i][0], 340, 180 + i * 38, { size: 20, align: 'left', color: lines[i][1] ? '#7cff9b' : '#e6e0ff', font: C.MONO, weight: 'normal' });
      footer(ctx, 'Pulsa cualquier botón para volver');
    }
  };

  /* ---------- Selector de niveles: grafo de ramas git ---------- */
  var NODES = [
    { x: 170, y: 290, color: '#ffd23f' },
    { x: 400, y: 190, color: '#4da3ff' },
    { x: 630, y: 392, color: '#ff7aa2' },
    { x: 860, y: 190, color: '#3ddc84' },
    { x: 1090, y: 290, color: '#ffd23f' }
  ];
  var MAIN_Y = 290;
  function drawBranch(ctx, x0, x1, y, color, locked) {
    // sale de main en x0-70, vuelve a main en x1+70
    ctx.strokeStyle = locked ? 'rgba(160,160,180,0.45)' : color; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0 - 110, MAIN_Y);
    ctx.bezierCurveTo(x0 - 60, MAIN_Y, x0 - 70, y, x0 - 20, y);
    ctx.lineTo(x1 + 20, y);
    ctx.bezierCurveTo(x1 + 70, y, x1 + 60, MAIN_Y, x1 + 110, MAIN_Y);
    ctx.stroke();
  }
  function lockIcon(ctx, x, y) {
    ctx.strokeStyle = '#d0d0e0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - 4, 6, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#d0d0e0'; U.roundRect(ctx, x - 9, y - 4, 18, 13, 3); ctx.fill();
  }
  S.levels = {
    enter: function (params) {
      OW.music('menu');
      this.sel = params && params.sel != null ? params.sel : this.firstUnplayed();
      this.t = 0;
    },
    firstUnplayed: function () {
      var s = 0;
      for (var i = 0; i < OW.LEVELS.length; i++) if (OW.Save.unlocked(i)) s = i;
      for (var j = 0; j <= s; j++) if (OW.Save.data.stars[j] === 0) return j;
      return s;
    },
    update: function (dt) {
      this.t += dt;
      var m = OW.Input.menu(), I = OW.Input, n = OW.LEVELS.length;
      if (m.back) { OW.sfx('ui_back'); OW.App.go('menu'); return; }
      if (m.left || m.up) { this.sel = (this.sel + n - 1) % n; OW.sfx('ui_move'); }
      if (m.right || m.down) { this.sel = (this.sel + 1) % n; OW.sfx('ui_move'); }
      var hit = -1;
      for (var i = 0; i < NODES.length; i++) if (U.dist(I.mouse.x, I.mouse.y, NODES[i].x, NODES[i].y) < 40) hit = i;
      if (I.mouse.moved && hit >= 0 && hit !== this.sel) { this.sel = hit; OW.sfx('ui_move'); }
      if (m.confirm || (I.mouse.clicked && hit >= 0)) {
        if (!OW.Save.unlocked(this.sel)) { OW.sfx('wrong'); this.denyT = 0.5; return; }
        OW.sfx('ui_select');
        OW.App.startLevel(this.sel, OW.App.players);
      }
      if (I.wasPressed('Tab')) { OW.App.players = OW.App.players === 1 ? 2 : 1; OW.sfx('ui_move'); }
      this.denyT = Math.max(0, (this.denyT || 0) - dt);
    },
    draw: function (ctx, t) {
      OW.Art.drawMenuBackground(ctx, t);
      OW.Art.drawPanel(ctx, 30, 16, 1220, 488, { color: '#16102e', alpha: 0.82, noShadow: true });
      U.text(ctx, '$ git log --graph --all', 60, 56, { size: 22, align: 'left', color: '#7cff9b', font: C.MONO, weight: 'normal' });
      U.text(ctx, 'Modo: ' + (OW.App.players === 1 ? '1 JUGADOR' : '2 JUGADORES') + '  (Tab cambia)', 1220, 56, { size: 16, align: 'right', color: '#ffd23f' });

      // main
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(70, MAIN_Y); ctx.lineTo(1210, MAIN_Y); ctx.stroke();
      U.text(ctx, 'main', 70, MAIN_Y + 30, { size: 14, align: 'left', color: '#ffd23f', font: C.MONO });
      for (var b = 1; b <= 3; b++) drawBranch(ctx, NODES[b].x, NODES[b].x, NODES[b].y, NODES[b].color, !OW.Save.unlocked(b));
      // commits decorativos en main
      [280, 520, 745, 975, 1180].forEach(function (x) {
        ctx.fillStyle = '#2b1b4a'; ctx.beginPath(); ctx.arc(x, MAIN_Y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
      });

      for (var i = 0; i < OW.LEVELS.length; i++) {
        var lv = OW.LEVELS[i], nd = NODES[i], unlocked = OW.Save.unlocked(i), sel = i === this.sel;
        var stars = OW.Save.data.stars[i];
        var pulse = sel ? 1 + Math.sin(t * 5) * 0.08 : 1;
        if (sel) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(nd.x, nd.y, 34 * pulse, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = unlocked ? nd.color : '#555a6e';
        ctx.beginPath(); ctx.arc(nd.x, nd.y, 24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1a1033'; ctx.lineWidth = 4; ctx.stroke();
        if (unlocked) U.text(ctx, String(lv.id), nd.x, nd.y + 8, { size: 22, color: '#1a1033' });
        else lockIcon(ctx, nd.x, nd.y);
        var up = nd.y <= MAIN_Y && i !== 0 && i !== 4 ? -1 : 1;
        var ly = up < 0 ? nd.y - 106 : nd.y + 38;
        if (i === 0 || i === 4) ly = nd.y - 124;
        // etiqueta de rama
        ctx.font = 'bold 13px ' + C.MONO;
        var bw = ctx.measureText(lv.branch).width + 16;
        ctx.fillStyle = unlocked ? nd.color : '#555a6e'; U.roundRect(ctx, nd.x - bw / 2, ly, bw, 22, 6); ctx.fill();
        U.text(ctx, lv.branch, nd.x, ly + 16, { size: 13, color: '#1a1033', font: C.MONO });
        U.text(ctx, lv.hash + '  ' + lv.name, nd.x, ly + 42, { size: 15, color: unlocked ? '#fff' : '#8a8aa0' });
        for (var s = 0; s < 3; s++) OW.Art.drawIcon(ctx, s < stars ? 'star' : 'star_empty', nd.x - 24 + s * 24, ly + 62, 18);
        if (sel) U.text(ctx, 'HEAD →', nd.x - 40, nd.y + 6, { size: 14, align: 'right', color: '#fff', font: C.MONO, stroke: '#16102e', strokeWidth: 5 });
      }
      if (OW.LEVELS.length) U.text(ctx, 'tag: v1.0', NODES[4].x + 50, MAIN_Y + 30, { size: 13, align: 'left', color: '#ff7aa2', font: C.MONO });

      // panel de detalle
      var L = OW.LEVELS[this.sel], unl = OW.Save.unlocked(this.sel);
      var shakeX = this.denyT > 0 ? Math.sin(t * 60) * 6 : 0;
      OW.Art.drawPanel(ctx, 150 + shakeX, 516, 980, 166, { alpha: 0.92 });
      U.text(ctx, '$ git checkout ' + L.branch, 180 + shakeX, 549, { size: 16, align: 'left', color: '#7cff9b', font: C.MONO, weight: 'normal' });
      U.text(ctx, 'Nivel ' + L.id + ' · ' + L.name, 180 + shakeX, 584, { size: 28, align: 'left', color: '#ffffff' });
      U.text(ctx, '"' + L.commit + '"  —  ' + L.desc, 180 + shakeX, 614, { size: 16, align: 'left', color: '#cfc6ef', weight: 'normal' });
      var hz = L.hazards.length ? L.hazards.map(function (h) { return OW.HAZARD_NAMES[h]; }).join(' · ') : 'ninguno';
      U.text(ctx, 'Peligros: ' + hz + '   ·   Recetas: ' + L.recipes.length + '   ·   PRs: ' + L.prs, 180 + shakeX, 643, { size: 15, align: 'left', color: '#cfc6ef', weight: 'normal' });
      if (unl) {
        U.text(ctx, 'Récord: ' + OW.Save.data.best[this.sel] + '€', 1100 + shakeX, 584, { size: 20, align: 'right', color: '#ffffff' });
        var thr = OW.starThresholds(L, OW.App.players);
        for (var k = 0; k < 3; k++) {
          OW.Art.drawIcon(ctx, 'star', 940 + k * 62 + shakeX, 615, 16);
          U.text(ctx, thr[k] + '€', 970 + k * 62 + shakeX, 621, { size: 13, align: 'center', color: '#cfc6ef' });
        }
        U.text(ctx, 'ENTER: jugar', 1100 + shakeX, 664, { size: 16, align: 'right', color: '#ff7b7b' });
        U.text(ctx, 'Dificultad: ' + OW.difficulty().name, 180 + shakeX, 668, { size: 14, align: 'left', color: OW.difficulty().color, weight: 'normal' });
      } else {
        U.text(ctx, 'Bloqueado: consigue al menos 1 estrella en el nivel anterior', 1100 + shakeX, 664, { size: 15, align: 'right', color: '#ff7b7b' });
      }
      footer(ctx, '← → elegir commit · Enter jugar · Tab 1P/2P · Esc volver');
    }
  };

  /* ---------- Intro con cuenta atrás ---------- */
  S.intro = {
    enter: function () { this.t = 0; this.last = -1; },
    update: function (dt) {
      this.t += dt;
      var g = OW.App.game;
      var ph = this.phase();
      if (ph !== this.last) {
        this.last = ph;
        if (ph >= 1 && ph <= 3) OW.sfx('countdown');
        if (ph === 4) OW.sfx('go');
      }
      if (this.t > 1.4 + 0.75 * 3 + 0.25) OW.App.go('play');
      if (OW.Input.pausePressed()) { OW.App.go('play'); }
      void g;
    },
    phase: function () {
      if (this.t < 1.4) return 0;
      return Math.min(4, 1 + Math.floor((this.t - 1.4) / 0.75));
    },
    draw: function (ctx, t) {
      var g = OW.App.game;
      g.drawWorld(ctx, t);
      OW.HUD.draw(ctx, g, t, 1 / 60);
      ctx.fillStyle = 'rgba(10,6,24,0.55)'; ctx.fillRect(0, 0, C.W, C.H);
      var ph = this.phase();
      if (ph === 0) {
        var k = U.easeOutBack(U.clamp(this.t / 0.4, 0, 1));
        ctx.save(); ctx.translate(640, 330); ctx.scale(k, k);
        OW.Art.drawPanel(ctx, -330, -120, 660, 280, { alpha: 0.9, title: 'sprint ' + g.level.id + ' / ' + OW.LEVELS.length, titleSize: 15, titleHeight: 30 });
        U.text(ctx, '$ git checkout ' + g.level.branch, 0, -60, { size: 22, color: '#7cff9b', font: C.MONO, weight: 'normal' });
        U.text(ctx, 'Nivel ' + g.level.id, 0, -20, { size: 30, color: '#fff', stroke: '#2b1b4a', strokeWidth: 6 });
        U.text(ctx, g.level.name, 0, 40, { size: 56, color: '#ffd23f', stroke: '#2b1b4a', strokeWidth: 9 });
        U.text(ctx, g.level.desc, 0, 90, { size: 22, color: '#fff', stroke: '#2b1b4a', strokeWidth: 5 });
        U.text(ctx, g.solo ? 'Modo 1 jugador · Tab cambia de dev' : 'Modo cooperativo · 2 jugadores', 0, 130, { size: 18, color: '#9fe8ff', stroke: '#2b1b4a', strokeWidth: 4 });
        ctx.restore();
      } else {
        var lt = ((this.t - 1.4) % 0.75) / 0.75;
        var txt = ph === 4 ? '¡DEPLOY!' : String(4 - ph);
        var sc = (ph === 4 ? 1.2 : 1) * (1.6 - U.easeOutCubic(Math.min(1, lt * 2)) * 0.6);
        ctx.save(); ctx.translate(640, 400); ctx.scale(sc, sc); ctx.globalAlpha = 1 - Math.max(0, lt - 0.7) / 0.3;
        U.text(ctx, txt, 0, 0, { size: 140, color: ph === 4 ? '#7cff9b' : '#ffd23f', stroke: '#2b1b4a', strokeWidth: 14 });
        ctx.restore();
      }
    }
  };

  /* ---------- Juego ---------- */
  S.play = {
    enter: function () { this.endT = 0; },
    update: function (dt) {
      var g = OW.App.game;
      if (OW.Input.pausePressed()) { OW.sfx('ui_back'); OW.App.go('pause'); return; }
      g.update(dt);
      if (g.over) OW.App.go('timeup');
    },
    draw: function (ctx, t) {
      var g = OW.App.game;
      g.drawWorld(ctx, t);
      OW.HUD.draw(ctx, g, t, 1 / 60);
    }
  };

  /* ---------- Pausa ---------- */
  S.pause = {
    enter: function () {
      try { OW.Audio.setIntensity(0); } catch (e) { /* nada */ }
      this.list = new ButtonList([
        { label: 'CONTINUAR', action: function () { OW.App.go('play'); } },
        { label: 'REINICIAR', action: function () { OW.App.startLevel(OW.App.game.li, OW.App.players); } },
        { label: 'SELECTOR', action: function () { OW.App.go('levels', { sel: OW.App.game.li }); } },
        { label: 'MENÚ PRINCIPAL', action: function () { OW.App.go('menu'); } }
      ], 500, 240, 280, 58, 16);
    },
    update: function () {
      var m = OW.Input.menu();
      if (OW.Input.pausePressed()) { OW.sfx('ui_select'); OW.App.go('play'); return; }
      this.list.update(m);
    },
    draw: function (ctx, t) {
      var g = OW.App.game;
      g.drawWorld(ctx, t);
      OW.HUD.draw(ctx, g, t, 0);
      ctx.fillStyle = 'rgba(10,6,24,0.65)'; ctx.fillRect(0, 0, C.W, C.H);
      OW.Art.drawPanel(ctx, 440, 140, 400, 430, { title: 'PAUSA · git stash', alpha: 0.92 });
      this.list.draw(ctx, t);
    }
  };

  /* ---------- Fin de tiempo ---------- */
  S.timeup = {
    enter: function () { this.t = 0; OW.sfx('timeup'); try { OW.Audio.setIntensity(0); OW.Audio.stopMusic(); } catch (e) { /* nada */ } },
    update: function (dt) { this.t += dt; if (this.t > 2.2) OW.App.go('results'); },
    draw: function (ctx, t) {
      var g = OW.App.game;
      g.drawWorld(ctx, t);
      OW.HUD.draw(ctx, g, t, 0);
      ctx.fillStyle = 'rgba(10,6,24,' + Math.min(0.6, this.t) + ')'; ctx.fillRect(0, 0, C.W, C.H);
      var k = U.easeOutBack(U.clamp(this.t / 0.5, 0, 1));
      ctx.save(); ctx.translate(640, 380); ctx.scale(k, k);
      U.text(ctx, '¡SPRINT TERMINADO!', 0, 0, { size: 72, color: '#ffd23f', stroke: '#2b1b4a', strokeWidth: 12 });
      U.text(ctx, 'Manos fuera del teclado', 0, 50, { size: 24, color: '#fff', stroke: '#2b1b4a', strokeWidth: 6 });
      ctx.restore();
    }
  };

  /* ---------- Resultados ---------- */
  function commitMessage(g, stars) {
    var s = g.stats, c = [];
    if (stars === 3) c.push('feat: sprint perfecto, el PO llora de felicidad', 'perf: todo entregado antes del daily', 'feat: desbloqueado logro "10x developer"');
    if (stars === 2) c.push('feat: casi todo listo (lo demás, próximo sprint)', 'refactor: ahora funciona y no sé por qué');
    if (stars === 1) c.push('fix: arreglado lo que rompí ayer', 'chore: cumplir el producto mínimo viable', 'fix: funciona en mi máquina');
    if (stars === 0) c.push('revert: revert "deploy del viernes"', 'wip: no tocar, no compila', 'fix: arreglado lo que rompí ayer (y rompí otra cosa)');
    if (s.fires >= 2) c.push('chore: apagar el servidor (literalmente)');
    if (s.burnt > 0) c.push('fix: SEGFAULT en producción, otra vez');
    if (s.bugs >= 3) c.push('fix: aplastados ' + s.bugs + ' bugs, quedan 99');
    if (s.meetings >= 2) c.push('docs: acta de ' + s.meetings + ' reuniones de "5 minutitos"');
    if (s.expired >= 3) c.push('chore: mover ' + s.expired + ' tickets a "Won\'t fix"');
    if (s.wrong >= 2) c.push('fix: desplegar lo que el cliente pidió, no lo que entendimos');
    if (s.coffees >= 4) c.push('chore: rellenar la cafetera (' + s.coffees + ' veces)');
    if (s.delivered === 0) c.push('wip: commit de prueba, ignorar');
    if (s.tips >= 150) c.push('feat: el cliente deja propina, nadie se lo cree');
    return U.pick(c);
  }
  function fakeHash() { var h = ''; for (var i = 0; i < 7; i++) h += '0123456789abcdef'.charAt(Math.floor(Math.random() * 16)); return h; }
  OW.commitMessage = commitMessage;

  S.results = {
    enter: function () {
      var g = OW.App.game;
      try { OW.FX.clear(); } catch (e) { /* nada */ }
      this.t = 0; this.shown = 0;
      this.stars = g.starsEarned();
      this.prevStars = OW.Save.data.stars[g.li];
      this.newBest = g.score > OW.Save.data.best[g.li];
      OW.Save.record(g.li, this.stars, g.score);
      this.msg = commitMessage(g, this.stars);
      this.hash = fakeHash();
      OW.music('results');
      var next = g.li + 1, hasNext = next < OW.LEVELS.length && OW.Save.unlocked(next);
      var items = [];
      if (hasNext) items.push({ label: 'SIGUIENTE NIVEL', action: function () { OW.App.startLevel(next, OW.App.players); } });
      items.push({ label: 'REINTENTAR', action: function () { OW.App.startLevel(g.li, OW.App.players); } });
      items.push({ label: 'SELECTOR', action: function () { OW.App.go('levels', { sel: hasNext ? next : g.li }); } });
      var w = 290, total = items.length * w + (items.length - 1) * 20, x0 = 640 - total / 2;
      this.list = new ButtonList(items, 0, 0, w, 56, 0);
      this.list.rects = items.map(function (it, i) { return { x: x0 + i * (w + 20), y: 622, w: w, h: 56 }; });
      this.unlockedMsg = this.prevStars === 0 && this.stars > 0 && next < OW.LEVELS.length;
    },
    update: function (dt) {
      this.t += dt;
      while (this.shown < this.stars && this.t > 0.8 + this.shown * 0.5) {
        this.shown++;
        OW.sfx('star', { index: this.shown });
        OW.fx('confetti', 470 + this.shown * 85, 210, { count: 25 });
      }
      if (this.t < 0.6) return;
      var m = OW.Input.menu();
      var tmp = m.left; m.left = false; m.up = m.up || tmp; tmp = m.right; m.right = false; m.down = m.down || tmp;
      this.list.update(m);
    },
    draw: function (ctx, t) {
      var g = OW.App.game, s = g.stats;
      OW.Art.drawMenuBackground(ctx, t);
      OW.Art.drawPanel(ctx, 240, 40, 800, 550, { alpha: 0.92 });
      U.text(ctx, 'Nivel ' + g.level.id + ' · ' + g.level.name, 640, 92, { size: 30, color: '#ffffff' });
      for (var i = 0; i < 3; i++) {
        var on = i < this.shown, k = 1;
        if (on) { var st = this.t - (0.8 + i * 0.5); k = st < 0.35 ? U.easeOutBack(U.clamp(st / 0.35, 0, 1)) * 1.0 : 1; }
        ctx.save(); ctx.translate(555 + i * 85, 175 - (i === 1 ? 14 : 0)); ctx.scale(k, k);
        OW.Art.drawIcon(ctx, on ? 'star' : 'star_empty', 0, 0, 72);
        ctx.restore();
      }
      var lines = [
        ['Entregas', s.delivered],
        ['Fallos', (s.expired + s.wrong) + '  (' + s.expired + ' caducados, ' + s.wrong + ' rechazados)'],
        ['Propinas', s.tips + '€'],
        ['Bugs aplastados', s.bugs],
        ['Incendios', s.fires]
      ];
      for (var j = 0; j < lines.length; j++) {
        U.text(ctx, lines[j][0], 330, 268 + j * 32, { size: 20, align: 'left', color: '#cfc6ef', weight: 'normal' });
        U.text(ctx, String(lines[j][1]), 950, 268 + j * 32, { size: 20, align: 'right', color: '#ffffff' });
      }
      ctx.fillStyle = 'rgba(43,27,74,0.15)'; ctx.fillRect(330, 420, 620, 2);
      U.text(ctx, 'Puntuación', 330, 458, { size: 26, align: 'left', color: '#ffffff' });
      OW.Art.drawIcon(ctx, 'coin', 800, 449, 30);
      U.text(ctx, g.score + '€', 950, 460, { size: 32, align: 'right', color: '#ffffff' });
      if (this.newBest && this.t > 1.5) U.text(ctx, '¡NUEVO RÉCORD!', 640, 458, { size: 18, color: '#ff7b7b' });
      // mensaje de commit
      ctx.fillStyle = '#1a1033'; U.roundRect(ctx, 300, 488, 680, 82, 10); ctx.fill();
      U.text(ctx, '$ git commit -m "' + this.msg + '"', 320, 518, { size: 16, align: 'left', color: '#7cff9b', font: C.MONO, weight: 'normal' });
      U.text(ctx, '[' + g.level.branch + ' ' + this.hash + '] ' + s.delivered + ' features changed, ' + (s.expired + s.wrong) + ' deletions(-)', 320, 548, { size: 14, align: 'left', color: '#9fa8da', font: C.MONO, weight: 'normal' });
      if (this.unlockedMsg && this.t > 2) U.text(ctx, '¡Nueva rama desbloqueada!', 640, 608, { size: 16, color: '#ffd23f', stroke: '#2b1b4a', strokeWidth: 4 });
      if (this.t > 0.6) this.list.draw(ctx, t);
      OW.FX.draw(ctx);
    }
  };
})();
