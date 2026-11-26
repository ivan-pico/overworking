/* OVERWORKING — CORE: entidades (devs, bugs, manager) y física básica. */
(function () {
  'use strict';
  var OW = window.OW, C = OW.C, U = OW.U;

  var NAMES = ['Ana', 'Leo', 'Iris', 'Max'];
  var PLAYER_R = 18;

  /* ---------- Colisión círculo vs tiles sólidos ---------- */
  function resolveCircle(game, e, r) {
    var T = C.TILE;
    for (var pass = 0; pass < 2; pass++) {
      var c0 = Math.floor((e.x - C.OX - r) / T), c1 = Math.floor((e.x - C.OX + r) / T);
      var r0 = Math.floor((e.y - C.OY - r) / T), r1 = Math.floor((e.y - C.OY + r) / T);
      for (var row = r0; row <= r1; row++) {
        for (var col = c0; col <= c1; col++) {
          if (!game.isSolid(col, row)) continue;
          var rx = C.OX + col * T, ry = C.OY + row * T;
          var nx = U.clamp(e.x, rx, rx + T), ny = U.clamp(e.y, ry, ry + T);
          var dx = e.x - nx, dy = e.y - ny, d2 = dx * dx + dy * dy;
          if (d2 >= r * r) continue;
          if (d2 > 0.0001) {
            var d = Math.sqrt(d2), push = r - d;
            e.x += dx / d * push; e.y += dy / d * push;
            // cancelar velocidad hacia la pared
            var vn = (e.vx || 0) * dx / d + (e.vy || 0) * dy / d;
            if (vn < 0 && e.vx != null) { e.vx -= vn * dx / d; e.vy -= vn * dy / d; }
          } else {
            // centro dentro del tile: expulsar por el lado más cercano
            var left = e.x - rx, right = rx + T - e.x, top = e.y - ry, bottom = ry + T - e.y;
            var m = Math.min(left, right, top, bottom);
            if (m === left) e.x = rx - r; else if (m === right) e.x = rx + T + r;
            else if (m === top) e.y = ry - r; else e.y = ry + T + r;
          }
        }
      }
    }
  }
  OW.resolveCircle = resolveCircle;

  /* ---------- Jugador ---------- */
  function Player(idx, x, y) {
    this.idx = idx;
    this.name = NAMES[idx] || ('Dev ' + (idx + 1));
    this.colorIndex = idx;
    this.hair = [0, 2, 1, 3][idx] || 0;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.dir = { x: 0, y: 1 };
    this.held = null;
    this.energy = 1;
    this.stun = 0; this.immune = 0;
    this.dashT = 0; this.dashCd = 0;
    this.moving = false; this.walkPhase = 0;
    this.action = 'none'; this.actionHold = 0;
    this.selected = false;
    this.target = null;
    this.drinkT = 0;
    this.zzzT = 0; this.dustT = 0; this.sfxT = 0;
    this.r = PLAYER_R;
  }
  /* Multiplicador de velocidad por cansancio (umbrales en OW.TUNING.coffee). */
  Player.prototype.speedMul = function () {
    var K = OW.TUNING.coffee;
    if (this.energy < K.zombieBelow) return K.zombieMul;
    if (this.energy < K.slowBelow) return K.slowMul;
    return 1;
  };
  Player.prototype.update = function (dt, ctl, game) {
    var P = OW.TUNING.player, D = OW.difficulty();
    this.energy = Math.max(0, this.energy - dt * D.drain / OW.TUNING.coffee.duration);
    if (this.immune > 0) this.immune -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    var MAX = P.maxSpeed * this.speedMul() * (D.walk == null ? 1 : D.walk), ACC = P.accel, FRICTION = P.friction;

    if (this.stun > 0) {
      this.stun -= dt;
      ctl = { mx: 0, my: 0 };
      this.action = 'stunned';
    }
    var mx = ctl.mx || 0, my = ctl.my || 0;
    var len = Math.sqrt(mx * mx + my * my);
    if (len > 0.1) { this.dir = { x: mx / len, y: my / len }; }

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.dustT -= dt;
      if (this.dustT <= 0) { this.dustT = 0.04; OW.fx('dust', this.x, this.y, { count: 2 }); }
    } else if (len > 0.1) {
      var tx = mx * MAX, ty = my * MAX;
      this.vx = U.approach(this.vx, tx, ACC * dt);
      this.vy = U.approach(this.vy, ty, ACC * dt);
    } else {
      this.vx = U.approach(this.vx, 0, FRICTION * dt);
      this.vy = U.approach(this.vy, 0, FRICTION * dt);
    }
    if (ctl.dash && this.dashCd <= 0 && this.stun <= 0) {
      this.dashT = P.dashTime; this.dashCd = P.dashCooldown;
      var DS = P.dashSpeed * (P.dashTiredKeep + (1 - P.dashTiredKeep) * this.speedMul());
      this.vx = this.dir.x * DS; this.vy = this.dir.y * DS;
      OW.sfx('dash'); OW.fx('dust', this.x, this.y, { count: 6 });
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    resolveCircle(game, this, this.r);
    var sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    this.moving = sp > 20;
    if (this.moving) this.walkPhase += dt * (6 + sp / 30);

    if (this.energy < OW.TUNING.coffee.zombieBelow) {
      this.zzzT -= dt;
      if (this.zzzT <= 0) { this.zzzT = 1.6; OW.fx('zzz', this.x + 10, this.y - 60, { count: 1 }); }
    }
  };
  Player.prototype.dashing = function () { return this.dashT > 0; };
  Player.prototype.view = function (t) {
    return {
      x: this.x, y: this.y, dir: this.dir, colorIndex: this.colorIndex, hair: this.hair, moving: this.moving,
      walkPhase: this.walkPhase, action: this.stun > 0 ? 'stunned' : this.action, carrying: !!this.held,
      energy: this.energy, dashing: this.dashT > 0, selected: this.selected, name: this.name
    };
  };
  OW.Player = Player;

  /* ---------- Bug ---------- */
  function Bug(x, y) {
    this.x = x; this.y = y; this.angle = Math.random() * Math.PI * 2; this.phase = Math.random() * 10;
    this.squashed = 0; this.state = 'fly'; this.target = null; this.sitT = 0; this.wanderT = 0.6;
    this.speed = U.rand(OW.TUNING.bugs.speed[0], OW.TUNING.bugs.speed[1]);
  }
  Bug.prototype.update = function (dt, game) {
    this.phase += dt * 12;
    if (this.state === 'dead') { this.squashed = Math.min(1, this.squashed + dt * 2.5); return; }
    if (this.state === 'sit') {
      this.sitT -= dt;
      this.angle += Math.sin(this.phase * 0.5) * dt;
      if (this.sitT <= 0 || !this.target || this.target.fire > 0) {
        if (this.target) this.target.bug = null;
        this.target = null; this.state = 'fly'; this.wanderT = 0.4;
      }
      return;
    }
    // volar: pequeño paseo, luego buscar estación libre
    if (!this.target) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) this.target = game.randomBugTarget(this);
    }
    var tx, ty;
    if (this.target) { tx = this.target.x + C.TILE / 2; ty = this.target.y + C.TILE / 2 - 8; }
    else { tx = this.x + Math.cos(this.angle) * 40; ty = this.y + Math.sin(this.angle) * 40; }
    var dx = tx - this.x, dy = ty - this.y, d = Math.sqrt(dx * dx + dy * dy);
    var want = Math.atan2(dy, dx) + Math.sin(this.phase * 0.7) * 0.6;
    var da = Math.atan2(Math.sin(want - this.angle), Math.cos(want - this.angle));
    this.angle += U.clamp(da, -6 * dt, 6 * dt);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.x = U.clamp(this.x, C.OX + 8, C.OX + C.COLS * C.TILE - 8);
    this.y = U.clamp(this.y, C.OY + 8, C.OY + C.ROWS * C.TILE - 8);
    if (this.target && d < 10) {
      if (this.target.bug || this.target.fire > 0) { this.target = null; return; }
      this.state = 'sit'; this.sitT = U.rand(OW.TUNING.bugs.sitTime[0], OW.TUNING.bugs.sitTime[1]); this.target.bug = this;
      this.x = tx; this.y = ty;
    }
  };
  Bug.prototype.view = function () { return { x: this.x, y: this.y, angle: this.angle, phase: this.phase, squashed: this.squashed }; };
  OW.Bug = Bug;

  /* ---------- Manager NPC ---------- */
  var LINES = ['¿Tienes 5 minutitos?', '¿Hacemos una call rápida?', 'Esto es sólo un cambio pequeñito...', '¿Lo podemos tener para ayer?'];
  function Manager(game, col, row) {
    this.homeCol = col; this.homeRow = row;
    this.x = C.OX + col * C.TILE + C.TILE / 2; this.y = C.OY + row * C.TILE + C.TILE / 2 + 10;
    this.dir = { x: 0, y: 1 }; this.moving = false; this.walkPhase = 0;
    var MG = OW.TUNING.manager;
    this.state = 'away'; this.timer = U.rand(MG.firstVisit[0], MG.firstVisit[1]);
    this.talking = false; this.text = ''; this.path = null; this.repath = 0; this.victim = null;
    this.visible = false; this.alpha = 0;
  }
  Manager.prototype.update = function (dt, game) {
    var MG = OW.TUNING.manager;
    this.alpha = U.approach(this.alpha, this.visible ? 1 : 0, dt * 3);
    switch (this.state) {
      case 'away':
        this.visible = false;
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'chase'; this.timer = MG.chaseTime; this.visible = true;
          this.x = C.OX + this.homeCol * C.TILE + C.TILE / 2; this.y = C.OY + this.homeRow * C.TILE + C.TILE / 2 + 10;
          OW.sfx('manager');
          OW.fx('text', this.x, this.y - 70, { text: '¡Ey, equipo!', color: '#ffd23f' });
        }
        break;
      case 'chase': {
        this.timer -= dt;
        var target = game.nearestPlayer(this.x, this.y);
        if (!target || this.timer <= 0) { this.leave(); break; }
        this.repath -= dt;
        if (this.repath <= 0 || !this.path) { this.repath = 0.4; this.path = game.findPath(this.x, this.y, target.x, target.y); }
        this.walk(dt, MG.chaseSpeed * OW.difficulty().boss, target);
        var d = U.dist(this.x, this.y, target.x, target.y);
        if (d < MG.catchRadius && target.stun <= 0 && target.immune <= 0) {
          if (target.dashing()) {
            target.immune = MG.dodgeImmune;
            OW.fx('text', target.x, target.y - 70, { text: '¡Esquivado!', color: '#7cff9b' });
          } else {
            target.stun = MG.stunTime; target.immune = MG.immuneAfter; target.action = 'stunned';
            this.state = 'talk'; this.timer = MG.stunTime; this.talking = true; this.text = U.pick(LINES);
            this.victim = target; this.moving = false;
            // separarse un poco para que no se solapen los sprites durante la charla
            // (preferimos ponerse al lado, en horizontal, para no tapar al dev)
            var side = this.x >= target.x ? 1 : -1, placed = false;
            for (var tries = 0; tries < 2 && !placed; tries++, side = -side) {
              var nx = target.x + side * 46, col = Math.floor((nx - C.OX) / C.TILE), row = Math.floor((target.y - C.OY) / C.TILE);
              if (!game.isSolid(col, row)) { this.x = nx; this.y = target.y; placed = true; }
            }
            if (!placed) {
              var sx = this.x - target.x, sy = this.y - target.y, sl = Math.sqrt(sx * sx + sy * sy) || 1;
              if (sl < 44) { this.x = target.x + sx / sl * 44; this.y = target.y + sy / sl * 44; }
            }
            OW.resolveCircle(game, this, 16);
            OW.sfx('stun'); game.stats.meetings++;
            game.shake = Math.max(game.shake, 4);
          }
        }
        break;
      }
      case 'talk':
        this.timer -= dt;
        if (this.victim) {
          var vx = this.victim.x - this.x, vy = this.victim.y - this.y, l = Math.sqrt(vx * vx + vy * vy) || 1;
          this.dir = { x: vx / l, y: vy / l };
        }
        if (this.timer <= 0) { this.talking = false; this.leave(); }
        break;
      case 'leave': {
        var hx = C.OX + this.homeCol * C.TILE + C.TILE / 2, hy = C.OY + this.homeRow * C.TILE + C.TILE / 2 + 10;
        this.repath -= dt;
        if (this.repath <= 0 || !this.path) { this.repath = 0.8; this.path = game.findPath(this.x, this.y, hx, hy); }
        this.walk(dt, MG.returnSpeed * OW.difficulty().boss, { x: hx, y: hy });
        if (U.dist(this.x, this.y, hx, hy) < 12) { this.state = 'away'; this.timer = U.rand(MG.awayTime[0], MG.awayTime[1]); this.visible = false; }
        break;
      }
    }
  };
  Manager.prototype.leave = function () { this.state = 'leave'; this.path = null; this.repath = 0; this.talking = false; };
  Manager.prototype.walk = function (dt, speed, final) {
    var tx = final.x, ty = final.y;
    if (this.path && this.path.length) {
      var n = this.path[0];
      tx = C.OX + n.c * C.TILE + C.TILE / 2; ty = C.OY + n.r * C.TILE + C.TILE / 2 + 8;
      if (U.dist(this.x, this.y, tx, ty) < 8) { this.path.shift(); if (this.path.length === 0) { tx = final.x; ty = final.y; } }
      if (this.path.length === 1) { tx = final.x; ty = final.y; }
    }
    var dx = tx - this.x, dy = ty - this.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > 1) {
      var s = Math.min(d, speed * dt);
      this.x += dx / d * s; this.y += dy / d * s;
      this.dir = { x: dx / d, y: dy / d };
      this.moving = true; this.walkPhase += dt * 8;
    } else this.moving = false;
  };
  Manager.prototype.view = function () {
    return { x: this.x, y: this.y, dir: this.dir, moving: this.moving, walkPhase: this.walkPhase, talking: this.talking, text: this.text };
  };
  OW.Manager = Manager;
})();
