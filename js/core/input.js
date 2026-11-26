/* OVERWORKING — CORE: entrada (teclado por event.code, Gamepad API, ratón para menús). */
(function () {
  'use strict';
  var OW = window.OW;

  var SCHEMES = [
    { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], pick: ['KeyE'], act: ['KeyF'], dash: ['ShiftLeft'] },
    { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], pick: ['Period', 'NumpadDecimal'],
      act: ['Comma', 'Numpad0'], dash: ['Slash', 'Minus', 'NumpadSubtract', 'ShiftRight'] }
  ];
  var PREVENT = { Tab: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1, Slash: 1, Quote: 1, Backspace: 1 };

  var down = {}, pressed = {};
  var pads = [], prevPads = [];
  var anyPressed = false;
  var mouse = { x: 0, y: 0, moved: false, clicked: false };

  function setKey(code, isDown) {
    if (isDown) {
      if (!down[code]) pressed[code] = true;
      down[code] = true;
      anyPressed = true;
    } else {
      down[code] = false;
    }
  }

  var Input = (OW.Input = {
    SCHEMES: SCHEMES,
    mouse: mouse,
    setKey: setKey,
    attach: function (canvas) {
      window.addEventListener('keydown', function (e) {
        // Con el juego fuera de la vista (leyendo "Acerca del juego") las teclas vuelven a ser de la página.
        if ((window.scrollY || window.pageYOffset || 0) > window.innerHeight * 0.5) return;
        if (PREVENT[e.code]) e.preventDefault();
        if (e.repeat) return;
        setKey(e.code, true);
        if (Input.onAnyKey) Input.onAnyKey();
      });
      window.addEventListener('keyup', function (e) { setKey(e.code, false); });
      window.addEventListener('blur', function () { down = {}; });
      function toLogical(e) {
        var r = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) / r.width * OW.C.W;
        mouse.y = (e.clientY - r.top) / r.height * OW.C.H;
      }
      canvas.addEventListener('mousemove', function (e) { toLogical(e); mouse.moved = true; });
      canvas.addEventListener('mousedown', function (e) {
        toLogical(e); mouse.clicked = true; anyPressed = true;
        if (Input.onAnyKey) Input.onAnyKey();
      });
      canvas.addEventListener('touchstart', function () { anyPressed = true; if (Input.onAnyKey) Input.onAnyKey(); }, { passive: true });
    },
    /* Llamar al inicio de cada paso de simulación. */
    poll: function () {
      prevPads = pads;
      pads = [];
      var gp = [];
      try { gp = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { gp = []; }
      for (var i = 0; i < (gp ? gp.length : 0); i++) {
        var g = gp[i];
        if (!g || !g.connected) continue;
        var b = function (n) { return !!(g.buttons[n] && g.buttons[n].pressed); };
        var ax = g.axes[0] || 0, ay = g.axes[1] || 0;
        if (Math.abs(ax) < 0.25) ax = 0;
        if (Math.abs(ay) < 0.25) ay = 0;
        if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
        pads.push({ ax: ax, ay: ay, a: b(0), b: b(1), x: b(2), y: b(3), start: b(9) || b(8),
          up: ay < -0.5, down: ay > 0.5, left: ax < -0.5, right: ax > 0.5 });
      }
      for (var j = 0; j < pads.length; j++) {
        var p = pads[j], q = prevPads[j] || {};
        p.pressed = {};
        ['a', 'b', 'x', 'y', 'start', 'up', 'down', 'left', 'right'].forEach(function (k) { p.pressed[k] = p[k] && !q[k]; });
        if (p.pressed.a || p.pressed.start) anyPressed = true;
      }
    },
    /* Llamar al final de cada paso de simulación. */
    endStep: function () { pressed = {}; anyPressed = false; mouse.clicked = false; mouse.moved = false; },
    isDown: function (code) { return !!down[code]; },
    wasPressed: function (code) { return !!pressed[code]; },
    anyPressed: function () { return anyPressed; },
    padCount: function () { return pads.length; },
    pad: function (i) { return pads[i] || null; },
    downAny: function (codes) { for (var i = 0; i < codes.length; i++) if (down[codes[i]]) return true; return false; },
    pressedAny: function (codes) { for (var i = 0; i < codes.length; i++) if (pressed[codes[i]]) return true; return false; },

    /* Estado de control de un personaje combinando esquemas de teclado y mandos. */
    controls: function (schemeIdx, padIdx) {
      var c = { mx: 0, my: 0, pick: false, act: false, dash: false };
      for (var s = 0; s < schemeIdx.length; s++) {
        var k = SCHEMES[schemeIdx[s]];
        if (this.downAny(k.left)) c.mx -= 1;
        if (this.downAny(k.right)) c.mx += 1;
        if (this.downAny(k.up)) c.my -= 1;
        if (this.downAny(k.down)) c.my += 1;
        if (this.pressedAny(k.pick)) c.pick = true;
        if (this.downAny(k.act)) c.act = true;
        if (this.pressedAny(k.dash)) c.dash = true;
        if (this.pressedAny(k.act)) c.actPressed = true;
      }
      for (var i = 0; i < padIdx.length; i++) {
        var p = pads[padIdx[i]];
        if (!p) continue;
        c.mx += p.ax; c.my += p.ay;
        if (p.pressed.a) c.pick = true;
        if (p.x) c.act = true;
        if (p.pressed.x) c.actPressed = true;
        if (p.pressed.b) c.dash = true;
      }
      var len = Math.sqrt(c.mx * c.mx + c.my * c.my);
      if (len > 1) { c.mx /= len; c.my /= len; }
      return c;
    },
    switchPressed: function () {
      if (pressed.Tab) return true;
      for (var i = 0; i < pads.length; i++) if (pads[i].pressed.y) return true;
      return false;
    },
    pausePressed: function () {
      if (pressed.Escape || pressed.KeyP) return true;
      for (var i = 0; i < pads.length; i++) if (pads[i].pressed.start) return true;
      return false;
    },

    /* Navegación de menús. */
    menu: function () {
      var m = {
        up: this.pressedAny(['KeyW', 'ArrowUp']),
        down: this.pressedAny(['KeyS', 'ArrowDown']),
        left: this.pressedAny(['KeyA', 'ArrowLeft']),
        right: this.pressedAny(['KeyD', 'ArrowRight']),
        confirm: this.pressedAny(['Enter', 'NumpadEnter', 'Space', 'KeyE', 'Period']),
        back: this.pressedAny(['Escape', 'Backspace'])
      };
      for (var i = 0; i < pads.length; i++) {
        var p = pads[i].pressed;
        m.up = m.up || p.up; m.down = m.down || p.down; m.left = m.left || p.left; m.right = m.right || p.right;
        m.confirm = m.confirm || p.a || p.start; m.back = m.back || p.b;
      }
      return m;
    }
  });
})();
