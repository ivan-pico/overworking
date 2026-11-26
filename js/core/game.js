/* OVERWORKING — CORE: lógica de partida (estaciones, pipeline, pedidos, hazards, dibujado del mundo). */
(function () {
  'use strict';
  var OW = window.OW, C = OW.C, U = OW.U;
  var T = C.TILE;

  var DECOR = { wall: 1, plant: 1, server_rack: 1 };
  var SURFACE = { counter: 1, desk: 1, testbench: 1, conveyor: 1 };
  var COMPILE_TIME = 4, WARN_AFTER = 5, BURN_AFTER = 3;
  var DESK_TIME = 2.5, TEST_TIME = 1.5, REVIEW_TIME = 2, COFFEE_TIME = 1;
  var RETURN_DELAY = 6, EXPIRE_PENALTY = 30, MAX_BUGS = 3;
  var CONVEYOR_TIME = 1.1;

  function item(kind, lane) { return { kind: kind, lane: lane || null, contents: [], prog: 0 }; }
  OW.makeItem = item;

  var TUTORIAL = [
    { ev: 'spec', text: 'Coge una SPEC de una impresora: mírala y pulsa E  (P2: tecla .)' },
    { ev: 'code', text: 'Déjala en un ESCRITORIO (E) y MANTÉN F para programarla  (P2: tecla ,)' },
    { ev: 'build', text: 'Lleva el CÓDIGO al SERVIDOR de build. Compila solo... ¡recógelo antes de que arda!' },
    { ev: 'tested', text: 'Pon el BUILD en el BANCO DE TESTS y MANTÉN F' },
    { ev: 'deliver', text: 'Coge un PR (carpeta morada), mete el módulo testeado y llévalo a DEPLOY' },
    { ev: null, dur: 8, text: '¡Desplegado! Los PR vuelven a REVISIÓN: mantén F allí para reutilizarlos' }
  ];

  function Game(levelIndex, numPlayers) {
    this.li = levelIndex;
    this.level = OW.LEVELS[levelIndex];
    this.theme = this.level.theme;
    this.numPlayers = numPlayers;
    this.solo = numPlayers === 1;
    this.t = 0;
    this.timeLeft = this.level.duration;
    this.score = 0; this.scoreBump = 0;
    this.stats = { delivered: 0, expired: 0, wrong: 0, tips: 0, fires: 0, bugs: 0, meetings: 0, burnt: 0, coffees: 0 };
    this.grid = []; this.stations = [];
    this.players = []; this.bugs = []; this.manager = null;
    this.orders = []; this.orderSeq = 0; this.returns = []; this.rockets = [];
    this.shake = 0; this.active = 0; this.over = false;
    this.orderTimer = 2.5;
    this.intensity = 0;
    this.darkness = this.level.darkness || 0;
    this.blackout = { next: 32, t: 0, on: false };
    this.tutorial = this.level.tutorial ? { step: 0, t: 0 } : null;
    this.warnBeepT = 0;
    this.build();
    for (var i = 0; i < (this.level.startOrders || 1); i++) this.spawnOrder(i === 0 && this.level.tutorial ? 'landing' : null, true);
    this.orderTimer = U.rand(this.level.orderGap[0], this.level.orderGap[1]) * 0.6;
  }

  Game.prototype.build = function () {
    var lv = this.level, spawns = [], mgr = null, firstPr = null;
    for (var r = 0; r < C.ROWS; r++) {
      this.grid.push([]);
      for (var c = 0; c < C.COLS; c++) {
        var ch = lv.map[r].charAt(c), type = OW.LEGEND[ch], st = null;
        if (ch === '1' || ch === '2') spawns[+ch - 1] = { c: c, r: r };
        if (ch === 'M') mgr = { c: c, r: r };
        if (type) {
          st = {
            type: type, col: c, row: r, x: C.OX + c * T, y: C.OY + r * T, dir: null, item: null,
            fire: 0, spreadT: 0, bug: null, cookT: 0, overT: 0, count: 0, dirty: 0, clean: 0, washT: 0,
            convT: 0.5, workT: 0, sfxT: 0, fxT: 0, drinkT: 0
          };
          if (ch === '>') st.dir = { x: 1, y: 0 };
          if (ch === '<') st.dir = { x: -1, y: 0 };
          if (ch === '^') st.dir = { x: 0, y: -1 };
          if (ch === 'v') st.dir = { x: 0, y: 1 };
          if (ch === 'E') st.item = item('extinguisher');
          if (type === 'pr_stack' && !firstPr) firstPr = st;
          this.stations.push(st);
        }
        this.grid[r].push(st);
      }
    }
    if (firstPr) firstPr.count = lv.prs;
    this.prStack = firstPr;
    this.review = this.stations.filter(function (s) { return s.type === 'review'; })[0] || null;
    for (var i = 0; i < 2; i++) {
      var sp = spawns[i] || this.anyFloor();
      this.players.push(new OW.Player(i, C.OX + sp.c * T + T / 2, C.OY + sp.r * T + T / 2 + 8));
    }
    if (lv.manager) {
      var m = mgr || this.anyFloor();
      this.manager = new OW.Manager(this, m.c, m.r);
    }
    this.updateSelection();
  };
  Game.prototype.anyFloor = function () {
    for (var r = 1; r < C.ROWS; r++) for (var c = 1; c < C.COLS; c++) if (!this.grid[r][c]) return { c: c, r: r };
    return { c: 1, r: 1 };
  };
  Game.prototype.isSolid = function (c, r) {
    if (c < 0 || r < 0 || c >= C.COLS || r >= C.ROWS) return true;
    return !!this.grid[r][c];
  };
  Game.prototype.stationAt = function (c, r) {
    if (c < 0 || r < 0 || c >= C.COLS || r >= C.ROWS) return null;
    return this.grid[r][c];
  };
  Game.prototype.updateSelection = function () {
    for (var i = 0; i < this.players.length; i++) this.players[i].selected = this.solo && i === this.active;
  };
  Game.prototype.emit = function (ev) {
    var tu = this.tutorial;
    if (!tu) return;
    for (var i = tu.step; i < TUTORIAL.length; i++) {
      if (TUTORIAL[i].ev === ev) { tu.step = i + 1; tu.t = 0; break; }
    }
  };
  Game.prototype.tutorialText = function () {
    var tu = this.tutorial;
    if (!tu || tu.step >= TUTORIAL.length) return null;
    return TUTORIAL[tu.step].text;
  };

  /* ---------------- Pedidos ---------------- */
  Game.prototype.spawnOrder = function (forceKey, silent) {
    var lv = this.level, key = forceKey;
    if (!key) {
      var total = 0, w = lv.weights || lv.recipes.map(function () { return 1; });
      for (var i = 0; i < lv.recipes.length; i++) total += w[i];
      var roll = Math.random() * total;
      for (var j = 0; j < lv.recipes.length; j++) { roll -= w[j]; if (roll <= 0) { key = lv.recipes[j]; break; } }
      key = key || lv.recipes[0];
    }
    var rec = OW.RECIPES[key], n = rec.lanes.length;
    var time = OW.RECIPE_TIME[n] * (lv.timeMul || 1);
    this.orders.push({
      id: ++this.orderSeq, key: key, name: rec.name, lanes: rec.lanes.slice(), timeTotal: time, timeLeft: time,
      value: OW.RECIPE_VALUE[n], flash: 1, entering: 0, removing: 0, done: false, drawX: null
    });
    if (!silent) OW.sfx('order_new');
  };
  Game.prototype.liveOrders = function () { return this.orders.filter(function (o) { return !o.done; }); };

  Game.prototype.updateOrders = function (dt) {
    var live = this.liveOrders();
    this.orderTimer -= dt;
    if (live.length === 0) this.orderTimer = Math.min(this.orderTimer, 1.2);
    else if (live.length === 1 && !this.tutorialText()) this.orderTimer = Math.min(this.orderTimer, 5);
    if (this.orderTimer <= 0 && live.length < this.level.maxOrders) {
      this.spawnOrder();
      this.orderTimer = U.rand(this.level.orderGap[0], this.level.orderGap[1]);
    }
    for (var i = this.orders.length - 1; i >= 0; i--) {
      var o = this.orders[i];
      o.entering = Math.min(1, o.entering + dt * 2.5);
      o.flash = Math.max(0, o.flash - dt * 1.5);
      if (o.done) {
        o.removing -= dt;
        if (o.removing <= 0) this.orders.splice(i, 1);
        continue;
      }
      o.timeLeft -= dt;
      if (o.timeLeft < 10) o.flash = Math.max(o.flash, 0.35 + 0.35 * Math.sin(this.t * 10));
      if (o.timeLeft <= 0) {
        o.timeLeft = 0; o.done = true; o.removing = 0.5; o.flash = 1; o.failed = true;
        this.stats.expired++;
        this.addScore(-EXPIRE_PENALTY);
        OW.sfx('order_fail');
        OW.fx('text', 640, 150, { text: '¡Caducado! ' + o.name + ' -' + EXPIRE_PENALTY + '€', color: '#ff6b6b', size: 26 });
        this.shake = Math.max(this.shake, 6);
      }
    }
  };
  Game.prototype.addScore = function (v) {
    this.score = Math.max(0, this.score + v);
    this.scoreBump = 1;
  };

  Game.prototype.deployPR = function (pr, st) {
    var cx = st.x + T / 2, cy = st.y + T / 2;
    var match = null;
    for (var i = 0; i < this.orders.length; i++) {
      var o = this.orders[i];
      if (o.done || !U.sameSet(o.lanes, pr.contents)) continue;
      if (!match || o.timeLeft < match.timeLeft) match = o;
    }
    if (match) {
      var frac = match.timeLeft / match.timeTotal;
      var tip = U.round5(match.value * 0.6 * frac);
      match.done = true; match.removing = 0.5; match.flash = 1; match.delivered = true;
      this.addScore(match.value + tip);
      this.stats.delivered++; this.stats.tips += tip;
      OW.sfx('deliver');
      this.shake = Math.max(this.shake, 4);
      OW.fx('confetti', cx, cy - 20, { count: 40 });
      OW.fx('coins', cx, cy - 20, { count: 10 });
      OW.fx('text', cx, cy - 50, { text: '+' + match.value + '€', color: '#ffd23f', size: 28 });
      if (tip > 0) OW.fx('text', cx, cy - 80, { text: 'Propina +' + tip + '€', color: '#7cff9b', size: 20, life: 1.6 });
      this.rockets.push({ x: cx, y: cy - 10, t: 0 });
      st.workT = 1.6;
      this.emit('deliver');
    } else {
      this.stats.wrong++;
      OW.sfx('wrong');
      OW.fx('text', cx, cy - 50, { text: '¡Rechazado! Nadie pidió eso', color: '#ff6b6b', size: 22 });
      OW.fx('smoke', cx, cy - 10, { count: 8 });
      this.shake = Math.max(this.shake, 5);
    }
    this.returns.push({ t: RETURN_DELAY });
  };

  /* ---------------- Interacción ---------------- */
  Game.prototype.findTarget = function (p) {
    var fx = p.x + p.dir.x * (p.r + 22), fy = p.y - 6 + p.dir.y * (p.r + 22);
    var st = this.stationAt(Math.floor((fx - C.OX) / T), Math.floor((fy - C.OY) / T));
    if (st && !DECOR[st.type]) return st;
    var best = null, bestD = 1e9;
    for (var i = 0; i < this.stations.length; i++) {
      var s = this.stations[i];
      if (DECOR[s.type]) continue;
      var sx = s.x + T / 2, sy = s.y + T / 2, dx = sx - p.x, dy = sy - p.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > T * 1.25 || d < 1) continue;
      var dot = (dx * p.dir.x + dy * p.dir.y) / d;
      if (dot < 0.35) continue;
      var score = d * (1.6 - dot);
      if (score < bestD) { bestD = score; best = s; }
    }
    return best;
  };

  Game.prototype.pickDrop = function (p) {
    var st = p.target;
    if (!st) return;
    // el HOTFIX siempre se puede coger, aunque su encimera esté ardiendo (si no, el fuego sería imparable)
    if (st.fire > 0 && !p.held && st.item && st.item.kind === 'extinguisher') { this.take(p, st); return; }
    if (st.fire > 0) { OW.sfx('wrong'); OW.fx('text', st.x + T / 2, st.y - 10, { text: '¡Fuego!', color: '#ff8a50', size: 18 }); return; }
    if (st.bug) { OW.sfx('wrong'); OW.fx('text', st.x + T / 2, st.y - 10, { text: '¡Hay un bug!', color: '#d58bff', size: 18 }); return; }
    if (!p.held) this.take(p, st); else this.put(p, st);
  };

  Game.prototype.take = function (p, st) {
    var got = null;
    switch (st.type) {
      case 'spec_front': case 'spec_back': case 'spec_data':
        got = item('spec', st.type.slice(5)); this.emit('spec'); break;
      case 'pr_stack':
        if (st.count > 0) { st.count--; got = item('pr'); } break;
      case 'review':
        if (st.clean > 0) { st.clean--; got = item('pr'); } break;
      case 'compiler':
        if (st.item) {
          got = st.item; st.item = null; st.cookT = 0; st.overT = 0;
          if (got.kind === 'build') this.emit('build');
        }
        break;
      case 'deploy': case 'trash': case 'coffee': break;
      default:
        if (st.item) { got = st.item; st.item = null; }
    }
    if (got) { p.held = got; OW.sfx('pickup'); }
  };

  function canAdd(pr, tested) {
    return pr && pr.kind === 'pr' && tested && tested.kind === 'tested' && pr.contents.indexOf(tested.lane) < 0;
  }

  Game.prototype.put = function (p, st) {
    var h = p.held, ok = false;
    switch (st.type) {
      case 'spec_front': case 'spec_back': case 'spec_data':
        if (h.kind === 'spec' && h.lane === st.type.slice(5)) { p.held = null; ok = true; }
        break;
      case 'trash':
        if (h.kind === 'extinguisher') { OW.sfx('wrong'); OW.fx('text', st.x + T / 2, st.y - 10, { text: '¡El HOTFIX no se tira!', color: '#ffd23f', size: 18 }); return; }
        if (h.kind === 'pr') { if (h.contents.length) { h.contents = []; OW.sfx('trash'); OW.fx('smoke', st.x + T / 2, st.y + 20, { count: 5 }); } return; }
        p.held = null; OW.sfx('trash'); OW.fx('smoke', st.x + T / 2, st.y + 20, { count: 5 }); return;
      case 'pr_stack':
        if (h.kind === 'pr' && h.contents.length === 0) { st.count++; p.held = null; ok = true; }
        else if (h.kind === 'tested' && st.count > 0) { st.count--; var pr = item('pr'); pr.contents.push(h.lane); p.held = pr; ok = true; }
        break;
      case 'review':
        if (h.kind === 'pr' && h.contents.length === 0) { st.clean++; p.held = null; ok = true; }
        break;
      case 'deploy':
        if (h.kind === 'pr' && h.contents.length > 0) { p.held = null; this.deployPR(h, st); return; }
        if (h.kind === 'tested') { OW.fx('text', st.x + T / 2, st.y - 10, { text: 'Mételo antes en un PR', color: '#fff', size: 18 }); }
        else if (h.kind === 'pr') { OW.fx('text', st.x + T / 2, st.y - 10, { text: 'El PR está vacío', color: '#fff', size: 18 }); }
        OW.sfx('wrong'); return;
      case 'compiler':
        if (!st.item && h.kind === 'code') {
          st.item = h; p.held = null; st.cookT = 0; st.overT = 0; OW.sfx('compile_start'); ok = true;
        } else if (st.item && canAdd(h, st.item)) {
          h.contents.push(st.item.lane); st.item = null; ok = true;
        }
        break;
      case 'coffee': break;
      default:
        if (!SURFACE[st.type]) break;
        if (!st.item) {
          st.item = h; p.held = null; ok = true;
          if (st.type === 'conveyor') { st.convT = 0.5; OW.sfx('conveyor'); }
        } else if (canAdd(st.item, h)) {
          st.item.contents.push(h.lane); p.held = null; ok = true;
        } else if (canAdd(h, st.item)) {
          h.contents.push(st.item.lane); st.item = null; ok = true;
        }
    }
    if (ok) { OW.sfx('drop'); OW.fx('dust', st.x + T / 2, st.y + T - 6, { count: 3 }); }
  };

  Game.prototype.trySquash = function (p) {
    var best = null, bd = 80;
    for (var i = 0; i < this.bugs.length; i++) {
      var b = this.bugs[i];
      if (b.state === 'dead') continue;
      var d = U.dist(p.x, p.y - 12, b.x, b.y);
      if (p.target && b.target === p.target && b.state === 'sit') d = Math.min(d, 30);
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) return false;
    if (best.target) best.target.bug = null;
    best.target = null; best.state = 'dead'; best.deadT = 1.2;
    this.stats.bugs++;
    p.action = 'squashing'; p.actionHold = 0.25;
    OW.sfx('squash');
    OW.fx('sparks', best.x, best.y, { count: 10, color: '#c070ff' });
    OW.fx('text', best.x, best.y - 30, { text: '¡Aplastado!', color: '#d58bff', size: 20 });
    return true;
  };

  Game.prototype.doAction = function (p, ctl, dt) {
    if (p.stun > 0) { p.action = 'stunned'; return; }
    if (p.actionHold > 0) { p.actionHold -= dt; return; }
    p.action = 'none';
    if (ctl.actPressed && !p.held && this.trySquash(p)) return;
    if (!ctl.act) { p.drinkT = 0; return; }
    var st = p.target;
    if (p.held && p.held.kind === 'extinguisher') { this.spray(p, dt); return; }
    if (!st || st.bug || st.fire > 0) return;
    var it = st.item;
    switch (st.type) {
      case 'desk':
        if (!p.held && it && it.kind === 'spec') {
          p.action = 'typing'; it.prog += dt / DESK_TIME; st.workT = 0.15;
          st.sfxT -= dt; if (st.sfxT <= 0) { st.sfxT = 0.13; OW.sfx('type'); }
          st.fxT -= dt; if (st.fxT <= 0) { st.fxT = 0.18; OW.fx('glyphs', st.x + T / 2, st.y + 10, { count: 2 }); }
          if (it.prog >= 1) {
            st.item = item('code', it.lane);
            OW.fx('glyphs', st.x + T / 2, st.y + 10, { count: 8 });
            OW.fx('text', st.x + T / 2, st.y - 14, { text: '// listo', color: '#7cff9b', size: 16 });
            this.emit('code');
          }
        }
        break;
      case 'testbench':
        if (!p.held && it && it.kind === 'build') {
          p.action = 'testing'; it.prog += dt / TEST_TIME; st.workT = 0.15;
          st.sfxT -= dt; if (st.sfxT <= 0) { st.sfxT = 0.3; OW.sfx('type', { pitch: 1.5 }); }
          if (it.prog >= 1) {
            st.item = item('tested', it.lane);
            OW.sfx('test_ok');
            OW.fx('sparks', st.x + T / 2, st.y + 18, { count: 8, color: '#7cff9b' });
            OW.fx('text', st.x + T / 2, st.y - 14, { text: '✔ tests OK', color: '#7cff9b', size: 16 });
            this.emit('tested');
            if (Math.random() < this.level.bugChance && this.aliveBugs() < MAX_BUGS) this.spawnBug(st);
          }
        }
        break;
      case 'review':
        if (!p.held && st.dirty > 0) {
          p.action = 'reviewing'; st.washT += dt / REVIEW_TIME; st.workT = 0.15;
          st.sfxT -= dt; if (st.sfxT <= 0) { st.sfxT = 0.2; OW.sfx('type', { pitch: 0.8 }); }
          if (st.washT >= 1) {
            st.washT = 0; st.dirty--; st.clean++;
            OW.sfx('review_done');
            OW.fx('confetti', st.x + T / 2, st.y + 10, { count: 12 });
            OW.fx('text', st.x + T / 2, st.y - 14, { text: 'LGTM ✔', color: '#7cff9b', size: 16 });
          }
        }
        break;
      case 'coffee':
        p.action = 'drinking'; p.drinkT += dt / COFFEE_TIME; st.workT = 0.15; st.drinkT = p.drinkT;
        st.fxT -= dt; if (st.fxT <= 0) { st.fxT = 0.25; OW.fx('steam', st.x + T / 2, st.y + 6, { count: 2 }); }
        if (p.drinkT >= 1) {
          p.drinkT = 0; st.drinkT = 0; p.energy = 1; this.stats.coffees++;
          OW.sfx('coffee');
          OW.fx('text', p.x, p.y - 70, { text: '¡Cafeína!', color: '#ffcc80', size: 20 });
        }
        break;
    }
  };

  Game.prototype.spray = function (p, dt) {
    p.action = 'spraying';
    var hx = p.x + p.dir.x * 30, hy = p.y - 20 + p.dir.y * 30;
    p.sprayFx = (p.sprayFx || 0) - dt;
    if (p.sprayFx <= 0) { p.sprayFx = 0.05; OW.fx('foam', hx + p.dir.x * 20, hy + p.dir.y * 20, { count: 2, dx: p.dir.x, dy: p.dir.y }); }
    p.sprayS = (p.sprayS || 0) - dt;
    if (p.sprayS <= 0) { p.sprayS = 0.35; OW.sfx('extinguish'); }
    for (var i = 0; i < this.stations.length; i++) {
      var s = this.stations[i];
      if (!(s.fire > 0)) continue;
      var dx = s.x + T / 2 - p.x, dy = s.y + T / 2 - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > T * 1.9) continue;
      if ((dx * p.dir.x + dy * p.dir.y) / d < 0.45 && d > T * 0.9) continue;
      s.fire -= dt / 0.9;
      if (s.fire <= 0) {
        s.fire = 0; s.spreadT = 0;
        OW.fx('steam', s.x + T / 2, s.y + 10, { count: 10 });
        OW.fx('text', s.x + T / 2, s.y - 10, { text: 'HOTFIX aplicado', color: '#9fe8ff', size: 16 });
      }
    }
  };

  Game.prototype.ignite = function (st) {
    if (st.fire > 0 || DECOR[st.type] && st.type !== 'server_rack') return;
    st.fire = 0.35; st.spreadT = U.rand(4, 5.5);
    if (st.bug) { st.bug.target = null; st.bug.state = 'fly'; st.bug = null; }
    this.stats.fires++;
    OW.sfx('fire');
    this.shake = Math.max(this.shake, 10);
    OW.fx('sparks', st.x + T / 2, st.y + 20, { count: 16 });
  };

  /* ---------------- Bugs / manager helpers ---------------- */
  Game.prototype.aliveBugs = function () { return this.bugs.filter(function (b) { return b.state !== 'dead'; }).length; };
  Game.prototype.spawnBug = function (st) {
    var b = new OW.Bug(st.x + T / 2, st.y + T / 2 - 10);
    this.bugs.push(b);
    OW.sfx('bug_spawn');
    OW.fx('text', b.x, b.y - 30, { text: '¡Se escapó un bug!', color: '#d58bff', size: 20 });
  };
  Game.prototype.randomBugTarget = function (bug) {
    var cands = this.stations.filter(function (s) { return !DECOR[s.type] && !s.bug && !(s.fire > 0) && s.type !== 'conveyor'; });
    if (!cands.length) return null;
    // preferir estaciones cercanas
    cands.sort(function (a, b) { return U.dist(bug.x, bug.y, a.x, a.y) - U.dist(bug.x, bug.y, b.x, b.y); });
    return cands[Math.floor(Math.random() * Math.min(cands.length, 8))];
  };
  Game.prototype.nearestPlayer = function (x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      if (p.stun > 0 || p.immune > 0) continue;
      var d = U.dist(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };
  Game.prototype.findPath = function (x0, y0, x1, y1) {
    var sc = U.clamp(Math.floor((x0 - C.OX) / T), 0, C.COLS - 1), sr = U.clamp(Math.floor((y0 - C.OY) / T), 0, C.ROWS - 1);
    var tc = U.clamp(Math.floor((x1 - C.OX) / T), 0, C.COLS - 1), tr = U.clamp(Math.floor((y1 - C.OY) / T), 0, C.ROWS - 1);
    var key = function (c, r) { return r * C.COLS + c; };
    var prev = {}, q = [[sc, sr]], seen = {}; seen[key(sc, sr)] = 1;
    var found = false;
    while (q.length) {
      var n = q.shift();
      if (n[0] === tc && n[1] === tr) { found = true; break; }
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var c = n[0] + nb[i][0], r = n[1] + nb[i][1], k = key(c, r);
        if (seen[k] || this.isSolid(c, r)) continue;
        seen[k] = 1; prev[k] = n; q.push([c, r]);
      }
    }
    if (!found) return [];
    var path = [], cur = [tc, tr];
    while (!(cur[0] === sc && cur[1] === sr)) { path.unshift({ c: cur[0], r: cur[1] }); cur = prev[key(cur[0], cur[1])]; if (!cur) break; }
    return path;
  };

  /* ---------------- Update ---------------- */
  Game.prototype.controlsFor = function (i) {
    var I = OW.Input;
    if (this.solo) return i === this.active ? I.controls([0, 1], [0, 1, 2, 3]) : { mx: 0, my: 0 };
    return i === 0 ? I.controls([0], [0]) : I.controls([1], [1]);
  };

  Game.prototype.update = function (dt) {
    if (this.over) return;
    this.t += dt;
    this.timeLeft -= dt;
    this.scoreBump = Math.max(0, this.scoreBump - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 25);

    if (this.solo && OW.Input.switchPressed()) {
      this.active = 1 - this.active; this.updateSelection(); OW.sfx('ui_move');
      var ap = this.players[this.active];
      OW.fx('text', ap.x, ap.y - 75, { text: '¡Yo!', color: '#fff', size: 18 });
    }

    var i, p, ctl;
    for (i = 0; i < this.players.length; i++) {
      p = this.players[i];
      ctl = this.controlsFor(i);
      p.update(dt, ctl, this);
      p.target = this.findTarget(p);
      if (ctl.pick && p.stun <= 0) this.pickDrop(p);
      this.doAction(p, ctl, dt);
    }
    this.pushPlayers();
    for (i = 0; i < this.stations.length; i++) this.stations[i].highlight = false;
    for (i = 0; i < this.players.length; i++) {
      p = this.players[i];
      if (p.target && (!this.solo || i === this.active)) p.target.highlight = true;
    }

    this.updateStations(dt);

    for (i = this.bugs.length - 1; i >= 0; i--) {
      var b = this.bugs[i];
      b.update(dt, this);
      if (b.state === 'dead') { b.deadT -= dt; if (b.deadT <= 0) this.bugs.splice(i, 1); }
    }
    if (this.manager) this.manager.update(dt, this);

    this.updateOrders(dt);

    for (i = this.returns.length - 1; i >= 0; i--) {
      var r = this.returns[i];
      r.t -= dt;
      if (r.t <= 0) {
        this.returns.splice(i, 1);
        if (this.review) { this.review.dirty++; OW.fx('text', this.review.x + T / 2, this.review.y - 10, { text: 'PR con comentarios', color: '#ffb02e', size: 16 }); }
        else if (this.prStack) this.prStack.count++;
      }
    }
    for (i = this.rockets.length - 1; i >= 0; i--) { this.rockets[i].t += dt; if (this.rockets[i].t > 1.6) this.rockets.splice(i, 1); }

    this.updateLighting(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.timeLeft < 30 && !this.warned30) {
      this.warned30 = true;
      this.banner = { text: '¡30 SEGUNDOS!', sub: 'Último empujón antes de la demo', t: 0, dur: 2 };
    }

    if (this.tutorial) {
      this.tutorial.t += dt;
      var stp = TUTORIAL[this.tutorial.step];
      if (stp && stp.dur && this.tutorial.t > stp.dur) { this.tutorial.step++; this.tutorial.t = 0; }
      if (this.t > 100 && this.tutorial.step < TUTORIAL.length) this.tutorial.step = TUTORIAL.length;
    }

    var inten = this.timeLeft < 30 ? U.clamp(1 - this.timeLeft / 30, 0, 1) : 0;
    if (Math.abs(inten - this.intensity) >= 0.1 || (inten === 0 && this.intensity !== 0)) {
      this.intensity = Math.round(inten * 10) / 10;
      try { OW.Audio.setIntensity(this.intensity); } catch (e) { /* nada */ }
    }

    // tic-tac de los últimos 5 segundos
    var sec = Math.ceil(this.timeLeft);
    if (sec <= 5 && sec >= 1 && sec !== this.lastTick) { this.lastTick = sec; OW.sfx('countdown'); this.scoreBump = Math.max(this.scoreBump, 0.4); }
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.over = true; }
  };

  Game.prototype.pushPlayers = function () {
    var ps = this.players;
    for (var i = 0; i < ps.length; i++) for (var j = i + 1; j < ps.length; j++) {
      var a = ps[i], b = ps[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy), min = a.r + b.r;
      if (d >= min) continue;
      if (d < 0.01) { dx = 1; dy = 0; d = 1; }
      var nx = dx / d, ny = dy / d, ov = min - d;
      var wa = a.dashing() && !b.dashing() ? 0.15 : b.dashing() && !a.dashing() ? 0.85 : 0.5;
      a.x -= nx * ov * (1 - wa); a.y -= ny * ov * (1 - wa);
      b.x += nx * ov * wa; b.y += ny * ov * wa;
      if (a.dashing() && !b.dashing()) { b.vx += nx * 300; b.vy += ny * 300; }
      if (b.dashing() && !a.dashing()) { a.vx -= nx * 300; a.vy -= ny * 300; }
      OW.resolveCircle(this, a, a.r); OW.resolveCircle(this, b, b.r);
    }
  };

  Game.prototype.updateStations = function (dt) {
    var heat = this.level.heat || 1, warnAt = WARN_AFTER / heat, burnAt = warnAt + BURN_AFTER / heat;
    var anyWarn = false;
    for (var i = 0; i < this.stations.length; i++) {
      var st = this.stations[i];
      st.workT = Math.max(0, st.workT - dt);
      if (st.type === 'coffee' && st.workT <= 0) st.drinkT = 0;
      if (st.type === 'compiler' && st.item) {
        var it = st.item;
        if (it.kind === 'code') {
          st.cookT += dt;
          st.fxT -= dt; if (st.fxT <= 0) { st.fxT = 0.5; OW.fx('steam', st.x + T / 2, st.y + 4, { count: 1 }); }
          if (st.cookT >= COMPILE_TIME) {
            st.item = item('build', it.lane); st.overT = 0;
            OW.sfx('compile_done'); OW.fx('sparks', st.x + T / 2, st.y + 16, { count: 8 });
          }
        } else if (it.kind === 'build' && !(st.fire > 0)) {
          st.overT += dt;
          if (st.overT > warnAt) {
            anyWarn = true;
            st.fxT -= dt; if (st.fxT <= 0) { st.fxT = 0.3; OW.fx('smoke', st.x + T / 2, st.y + 6, { count: 2 }); }
          }
          if (st.overT > burnAt) {
            st.item = item('burnt', it.lane); this.stats.burnt++;
            OW.fx('text', st.x + T / 2, st.y - 14, { text: 'SEGFAULT', color: '#ff5d5d', size: 22 });
            this.ignite(st);
          }
        }
      }
      if (st.fire > 0) {
        st.fire = Math.min(1, st.fire + dt * 0.35);
        st.spreadT -= dt;
        st.fxT -= dt; if (st.fxT <= 0) { st.fxT = 0.35; OW.fx('smoke', st.x + T / 2, st.y - 4, { count: 1 }); }
        if (st.spreadT <= 0) {
          st.spreadT = U.rand(4, 5.5);
          var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]], cands = [];
          for (var k = 0; k < 4; k++) {
            var n = this.stationAt(st.col + nb[k][0], st.row + nb[k][1]);
            if (n && !(n.fire > 0) && n.type !== 'wall' && n.type !== 'plant') cands.push(n);
          }
          if (cands.length) this.ignite(U.pick(cands));
        }
      }
      if (st.type === 'conveyor' && st.item && !(st.fire > 0)) {
        st.convT += dt / CONVEYOR_TIME;
        if (st.convT >= 1) {
          st.convT = 1;
          var nx = this.stationAt(st.col + st.dir.x, st.row + st.dir.y);
          if (nx && this.conveyorAccept(nx, st.item)) st.item = null;
        }
      }
    }
    if (anyWarn) {
      this.warnBeepT -= dt;
      if (this.warnBeepT <= 0) { this.warnBeepT = 0.5; OW.sfx('warning'); }
    } else this.warnBeepT = 0;
  };

  Game.prototype.conveyorAccept = function (nx, it) {
    if (nx.fire > 0 || nx.bug) return false;
    if (nx.type === 'conveyor') { if (nx.item) return false; nx.item = it; nx.convT = 0; return true; }
    if (SURFACE[nx.type]) { if (nx.item) { if (canAdd(nx.item, it)) { nx.item.contents.push(it.lane); return true; } return false; } nx.item = it; return true; }
    if (nx.type === 'compiler' && !nx.item && it.kind === 'code') { nx.item = it; nx.cookT = 0; OW.sfx('compile_start'); return true; }
    if (nx.type === 'deploy' && it.kind === 'pr' && it.contents.length) { this.deployPR(it, nx); return true; }
    if (nx.type === 'trash' && it.kind !== 'pr' && it.kind !== 'extinguisher') { OW.sfx('trash'); return true; }
    if (nx.type === 'pr_stack' && it.kind === 'pr' && !it.contents.length) { nx.count++; return true; }
    return false;
  };

  Game.prototype.updateLighting = function (dt) {
    var base = this.level.darkness || 0;
    if (this.level.blackouts) {
      var bo = this.blackout;
      if (!bo.on && this.t >= bo.next) {
        bo.on = true; bo.t = 0; OW.sfx('blackout');
        this.banner = { text: '¡APAGÓN!', sub: 'Sólo se ven monitores, LEDs y linternas', t: 0, dur: 2.2 };
      }
      if (bo.on) {
        bo.t += dt;
        var dark;
        if (bo.t < 0.8) dark = (Math.sin(bo.t * 40) > 0 ? 0.88 : 0.2) * (bo.t / 0.8) + 0.1;
        else if (bo.t < 8.5) dark = 0.9;
        else dark = U.lerp(0.9, base, U.clamp((bo.t - 8.5) / 1, 0, 1));
        this.darkness = dark;
        if (bo.t > 9.5) { bo.on = false; bo.next = this.t + U.rand(22, 30); this.darkness = base; }
        return;
      }
    }
    this.darkness = U.approach(this.darkness, base, dt);
  };

  Game.prototype.lights = function (ox, oy) {
    var L = [], s, i;
    for (i = 0; i < this.stations.length; i++) {
      s = this.stations[i];
      var cx = s.x + T / 2 + ox, cy = s.y + T / 2 + oy;
      if (s.fire > 0) L.push({ x: cx, y: cy - 10, r: 120 + 30 * s.fire, color: '#ff9a3c' });
      switch (s.type) {
        case 'desk': L.push({ x: cx, y: cy - 16, r: 70, color: '#7fd8ff' }); break;
        case 'compiler': L.push({ x: cx, y: cy - 4, r: 48, color: s.item && s.item.kind === 'build' && s.overT > (WARN_AFTER / (this.level.heat || 1)) ? '#ff4040' : '#5cff8a' }); break;
        case 'testbench': L.push({ x: cx, y: cy - 8, r: 52, color: '#80ffea' }); break;
        case 'deploy': L.push({ x: cx, y: cy - 8, r: 72, color: '#ff8a80' }); break;
        case 'coffee': L.push({ x: cx, y: cy - 8, r: 40, color: '#ffcc80' }); break;
        case 'server_rack': L.push({ x: cx, y: cy - 8, r: 34, color: '#00e676' }); break;
        case 'spec_front': case 'spec_back': case 'spec_data': L.push({ x: cx, y: cy - 8, r: 40, color: OW.C.LANE_COLORS[s.type.slice(5)] }); break;
        case 'review': L.push({ x: cx, y: cy - 8, r: 40, color: '#c7a6ff' }); break;
      }
    }
    for (i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      L.push({ x: p.x + ox + p.dir.x * 26, y: p.y - 24 + oy + p.dir.y * 26, r: 125, color: '#fff3c4' });
    }
    for (i = 0; i < this.rockets.length; i++) L.push({ x: this.rockets[i].x + ox, y: this.rockets[i].y - this.rockets[i].t * 250 + oy, r: 90, color: '#ffb74d' });
    return L;
  };

  /* ---------------- Dibujado del mundo ---------------- */
  Game.prototype.stationView = function (st) {
    var state = 'idle', progress = null, it = st.item;
    var warnAt = WARN_AFTER / (this.level.heat || 1);
    if (st.type === 'compiler' && it) {
      if (it.kind === 'code') { state = 'working'; progress = U.clamp(st.cookT / COMPILE_TIME, 0, 1); }
      else if (it.kind === 'build') state = st.overT > warnAt ? 'warning' : 'done';
    } else if ((st.type === 'desk' && it && it.kind === 'spec') || (st.type === 'testbench' && it && it.kind === 'build')) {
      if (it.prog > 0) progress = U.clamp(it.prog, 0, 1);
      if (st.workT > 0) state = 'working';
    } else if (st.type === 'review' && st.dirty > 0) {
      if (st.washT > 0) progress = st.washT;
      if (st.workT > 0) state = 'working';
    } else if (st.type === 'coffee' && st.drinkT > 0) { progress = st.drinkT; state = 'working'; }
    else if (st.type === 'deploy' && st.workT > 0) state = 'working';
    if (st.bug) state = 'blocked';
    if (st.fire > 0) state = 'fire';
    var up = this.stationAt(st.col, st.row - 1);
    return { type: st.type, dir: st.dir, progress: progress, state: state, theme: this.theme, highlight: !!st.highlight, label: null,
      joinTop: !!(up && up.type === st.type && st.type === 'deploy') };
  };

  function badge(ctx, x, y, n, col) {
    ctx.fillStyle = col || '#2b1b4a';
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    U.text(ctx, String(n), x, y + 5, { size: 13, color: '#fff' });
  }

  Game.prototype.drawStationItems = function (ctx, st, t) {
    var A = OW.Art, an = A.itemAnchor ? A.itemAnchor(st.type, T) : { x: T / 2, y: T / 2 - 8 };
    var cx = st.x + an.x, cy = st.y + an.y;
    var i;
    if (st.type === 'pr_stack') {
      for (i = 0; i < Math.min(st.count, 4); i++) A.drawItem(ctx, { kind: 'pr', contents: [], noShadow: i > 0 }, cx, cy - i * 4, 0.9, t);
      if (st.count > 0) badge(ctx, st.x + T - 10, st.y + 10, st.count);
      return;
    }
    if (st.type === 'review') {
      for (i = 0; i < Math.min(st.dirty, 3); i++) A.drawItem(ctx, { kind: 'pr_dirty', contents: [], noShadow: i > 0 }, st.x + 18, cy - i * 4, 0.72, t);
      for (i = 0; i < Math.min(st.clean, 3); i++) A.drawItem(ctx, { kind: 'pr', contents: [], noShadow: i > 0 }, st.x + 34, cy + 4 - i * 4, 0.72, t);
      if (st.dirty > 0) badge(ctx, st.x + 9, st.y + 50, st.dirty, '#b55d2e');
      if (st.clean > 0) badge(ctx, st.x + T - 9, st.y + 50, st.clean, '#2e8b57');
      return;
    }
    if (!st.item) return;
    var ox = 0, oy = 0;
    if (st.type === 'conveyor' && st.dir) { ox = (st.convT - 0.5) * T * st.dir.x; oy = (st.convT - 0.5) * T * st.dir.y; }
    var bob = st.type === 'compiler' && st.item.kind === 'code' ? Math.sin(t * 10) * 1.5 : 0;
    A.drawItem(ctx, st.item, cx + ox, cy + oy + bob, 1, t);
  };

  Game.prototype.drawWorld = function (ctx, t) {
    var A = OW.Art, i, r, c;
    var ox = 0, oy = 0;
    if (this.shake > 0) { ox = (Math.random() * 2 - 1) * this.shake; oy = (Math.random() * 2 - 1) * this.shake; }
    this.shakeOff = { x: ox, y: oy };
    ctx.save();
    A.drawBackground(ctx, this.theme, t);
    ctx.translate(ox, oy);
    A.drawFloor(ctx, this.theme, C.COLS, C.ROWS, C.OX, C.OY, T, t);

    // entidades agrupadas por fila
    var rows = [];
    for (r = 0; r < C.ROWS; r++) rows.push([]);
    var place = function (y, fn) { var rr = U.clamp(Math.floor((y - C.OY) / T), 0, C.ROWS - 1); rows[rr].push({ y: y, fn: fn }); };
    var self = this;
    this.players.forEach(function (p) {
      place(p.y, function () {
        var v = p.view(t);
        v.name = self.solo ? p.name : 'P' + (p.idx + 1) + ' · ' + p.name;
        // el personaje pinta su propio extintor + chorro al rociar: no duplicar el item cargado
        var showHeld = p.held && !(v.action === 'spraying' && p.held.kind === 'extinguisher');
        var cp = A.getCarryPoint ? A.getCarryPoint(v) : { x: p.x + p.dir.x * 16, y: p.y - 30 };
        var behind = p.dir.y < 0 && !(Math.abs(p.dir.x) > Math.abs(p.dir.y) * 1.1);
        if (showHeld && behind) A.drawItem(ctx, p.held, cp.x, cp.y, 0.85, t);
        A.drawCharacter(ctx, v, t);
        if (showHeld && !behind) A.drawItem(ctx, p.held, cp.x, cp.y, 0.85, t);
        if (p.energy < 0.4) {
          // mini barra de café bajo los pies cuando la energía escasea
          var e = p.energy, bw = 34, bx = p.x - bw / 2, by = p.y + 9;
          var blink = e < 0.1 && Math.sin(t * 10) > 0;
          ctx.fillStyle = 'rgba(20,12,40,0.75)'; U.roundRect(ctx, bx - 2, by - 2, bw + 4, 8, 4); ctx.fill();
          ctx.fillStyle = blink ? '#ffffff' : e < 0.1 ? '#ff4d4d' : '#ffb02e'; U.roundRect(ctx, bx, by, Math.max(4, bw * e), 4, 2); ctx.fill();
          if (A.drawIcon) A.drawIcon(ctx, 'coffee', bx + bw + 9, by + 2, 13);
        }
      });
    });
    this.bugs.forEach(function (b) { place(b.y + 4, function () { A.drawBug(ctx, b.view(), t); }); });
    if (this.manager && this.manager.alpha > 0.01) {
      var m = this.manager;
      place(m.y, function () { ctx.save(); ctx.globalAlpha = m.alpha; A.drawManager(ctx, m.view(), t); ctx.restore(); });
    }

    for (r = 0; r < C.ROWS; r++) {
      for (c = 0; c < C.COLS; c++) {
        var st = this.grid[r][c];
        if (!st) continue;
        A.drawStation(ctx, this.stationView(st), st.x, st.y, T, t);
        this.drawStationItems(ctx, st, t);
      }
      for (c = 0; c < C.COLS; c++) {
        var s2 = this.grid[r][c];
        if (s2 && s2.fire > 0) A.drawFire(ctx, s2.x, s2.y, T, s2.fire, t);
      }
      rows[r].sort(function (a, b) { return a.y - b.y; });
      for (i = 0; i < rows[r].length; i++) rows[r][i].fn();
    }
    for (i = 0; i < this.rockets.length; i++) A.drawRocket(ctx, this.rockets[i].x, this.rockets[i].y, t, this.rockets[i].t / 1.6);
    OW.FX.draw(ctx);
    ctx.restore();

    if (this.darkness > 0.01) A.drawLighting(ctx, this.lights(ox, oy), this.darkness);
  };

  /* ---------------- Resultados ---------------- */
  Game.prototype.starsEarned = function () {
    var s = OW.starThresholds(this.level, this.numPlayers), n = 0;
    for (var i = 0; i < 3; i++) if (this.score >= s[i]) n = i + 1;
    return n;
  };

  Game.prototype.snapshot = function () {
    var self = this;
    return {
      level: this.li + 1, name: this.level.name, t: +this.t.toFixed(2), timeLeft: +this.timeLeft.toFixed(2), score: this.score,
      stars: this.starsEarned(), stats: JSON.parse(JSON.stringify(this.stats)), solo: this.solo, active: this.active,
      darkness: +this.darkness.toFixed(2),
      orders: this.liveOrders().map(function (o) { return { name: o.name, lanes: o.lanes, timeLeft: +o.timeLeft.toFixed(1) }; }),
      players: this.players.map(function (p) {
        return { x: Math.round(p.x), y: Math.round(p.y), col: Math.floor((p.x - C.OX) / T), row: Math.floor((p.y - C.OY) / T),
          dir: { x: +p.dir.x.toFixed(2), y: +p.dir.y.toFixed(2) }, held: p.held ? { kind: p.held.kind, lane: p.held.lane, contents: p.held.contents.slice() } : null,
          energy: +p.energy.toFixed(2), stun: +Math.max(0, p.stun).toFixed(2), action: p.action,
          target: p.target ? { type: p.target.type, col: p.target.col, row: p.target.row } : null };
      }),
      stations: this.stations.filter(function (s) { return !DECOR[s.type]; }).map(function (s) {
        var o = { type: s.type, col: s.col, row: s.row, state: self.stationView(s).state };
        if (s.item) o.item = { kind: s.item.kind, lane: s.item.lane, contents: s.item.contents.slice(), prog: +(s.item.prog || 0).toFixed(2) };
        if (s.type === 'pr_stack') o.count = s.count;
        if (s.type === 'review') { o.dirty = s.dirty; o.clean = s.clean; }
        if (s.fire > 0) o.fire = +s.fire.toFixed(2);
        return o;
      }),
      bugs: this.bugs.map(function (b) { return { x: Math.round(b.x), y: Math.round(b.y), state: b.state }; }),
      manager: this.manager ? { x: Math.round(this.manager.x), y: Math.round(this.manager.y), state: this.manager.state } : null,
      tutorial: this.tutorialText()
    };
  };

  OW.Game = Game;
  OW.Game.TUTORIAL = TUTORIAL;
})();
