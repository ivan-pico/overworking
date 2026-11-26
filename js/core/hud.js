/* OVERWORKING — CORE: HUD de partida (pedidos, reloj de sprint, puntuación, energía, tutorial, avisos). */
(function () {
  'use strict';
  var OW = window.OW, C = OW.C, U = OW.U;
  var CARD_W = 168, CARD_H = 104, CARD_GAP = 8;

  function drawOrders(ctx, g, t, dt) {
    var A = OW.Art;
    for (var i = 0; i < g.orders.length; i++) {
      var o = g.orders[i];
      var tx = 16 + i * (CARD_W + CARD_GAP);
      if (o.drawX == null) o.drawX = tx + 40;
      o.drawX = U.lerp(o.drawX, tx, Math.min(1, dt * 10));
      var enter = o.done ? U.clamp(o.removing / 0.5, 0, 1) : U.easeOutBack(U.clamp(o.entering, 0, 1));
      var y = 8;
      ctx.save();
      if (o.done && o.delivered) { y -= (1 - enter) * 30; }
      if (o.done && o.failed) { ctx.translate(Math.sin(t * 60) * 4 * enter, 0); }
      A.drawOrderCard(ctx, {
        id: o.id, name: o.name, lanes: o.lanes, timeLeft: o.timeLeft, timeTotal: o.timeTotal, flash: o.flash, entering: enter,
        delivered: !!o.delivered, failed: !!o.failed
      }, o.drawX, y, CARD_W, CARD_H, t);
      ctx.restore();
    }
  }

  function drawRight(ctx, g, t) {
    var A = OW.Art;
    // reloj de sprint
    var low = g.timeLeft < 30;
    A.drawPanel(ctx, 902, 8, 128, 62, { color: low ? '#ffe1e1' : '#fff8ec', alpha: 0.96, radius: 14 });
    var pulse = low ? 1 + Math.max(0, Math.sin(t * 8)) * 0.12 : 1;
    A.drawIcon(ctx, 'clock', 926, 40, 28);
    ctx.save(); ctx.translate(986, 52); ctx.scale(pulse, pulse);
    U.text(ctx, U.fmtTime(g.timeLeft), 0, 0, { size: 28, color: low ? '#d62828' : '#2b1b4a', font: C.MONO });
    ctx.restore();
    U.text(ctx, 'SPRINT', 986, 24, { size: 11, color: '#7a6a90' });

    // puntuación + estrellas conseguidas
    A.drawPanel(ctx, 1038, 8, 150, 62, { color: '#fff8ec', alpha: 0.96, radius: 14 });
    var bump = 1 + g.scoreBump * 0.25;
    A.drawIcon(ctx, 'coin', 1062, 44, 26 * bump);
    ctx.save(); ctx.translate(1128, 56); ctx.scale(bump, bump);
    U.text(ctx, g.score + '€', 0, 0, { size: 26, color: '#2b1b4a' });
    ctx.restore();
    var stars = g.starsEarned();
    for (var s = 0; s < 3; s++) A.drawIcon(ctx, s < stars ? 'star' : 'star_empty', 1106 + s * 22, 22, 17);

    // energía (café) de cada dev
    A.drawPanel(ctx, 1196, 8, 76, 62, { color: '#2a2152', alpha: 0.92, radius: 14 });
    for (var i = 0; i < g.players.length; i++) {
      var p = g.players[i], x = 1204, y = 14 + i * 28;
      var sel = g.solo && i === g.active;
      var col = A.PLAYER_COLORS[p.colorIndex % A.PLAYER_COLORS.length];
      if (sel) { ctx.fillStyle = 'rgba(255,210,63,0.28)'; U.roundRect(ctx, x - 4, y - 1, 68, 24, 8); ctx.fill(); }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 9, y + 11, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = sel ? '#ffd23f' : '#fff'; ctx.lineWidth = 2; ctx.stroke();
      U.text(ctx, g.solo ? p.name.charAt(0) : String(i + 1), x + 9, y + 16, { size: 12, color: '#fff', stroke: 'rgba(0,0,0,0.45)', strokeWidth: 3 });
      var e = p.energy, ec = e < 0.1 ? '#ff4d4d' : e < 0.3 ? '#ffb02e' : '#5cff8a';
      var blink = e < 0.1 && Math.sin(t * 10) > 0;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; U.roundRect(ctx, x + 22, y + 6, 40, 10, 5); ctx.fill();
      ctx.fillStyle = blink ? '#fff' : ec; U.roundRect(ctx, x + 22, y + 6, Math.max(6, 40 * e), 10, 5); ctx.fill();
      A.drawIcon(ctx, 'coffee', x + 58, y + 5, 12);
    }
    if (g.solo) U.text(ctx, 'TAB / (Y): cambiar de dev', 1087, 718 - 2, { size: 12, color: 'rgba(255,255,255,0.8)', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 3 });
  }

  function drawTutorial(ctx, g, t) {
    var txt = g.tutorialText();
    if (!txt) return;
    var w = 940, x = 640 - w / 2, y = 584;
    var a = U.clamp(g.tutorial.t * 3, 0, 1);
    for (var i = 0; i < g.players.length; i++) if (g.players[i].y > y - 10 && g.players[i].y < y + 110) a = Math.min(a, 0.35);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,12,40,0.88)'; U.roundRect(ctx, x, y, w, 50, 14); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
    U.text(ctx, 'TUTORIAL ' + (g.tutorial.step + 1) + '/' + OW.Game.TUTORIAL.length, x + 16, y + 20, { size: 12, align: 'left', color: '#ffd23f' });
    U.text(ctx, txt, x + 16, y + 40, { size: 17, align: 'left', color: '#fff' });
    if (g.solo && g.tutorial.step === 0) U.text(ctx, 'Tab: cambiar de dev', x + w - 16, y + 20, { size: 12, align: 'right', color: '#9fe8ff' });
    ctx.restore();
  }

  function drawBanner(ctx, g) {
    var b = g.banner;
    if (!b) return;
    var k = b.t < 0.3 ? U.easeOutBack(b.t / 0.3) : b.t > b.dur - 0.3 ? U.clamp((b.dur - b.t) / 0.3, 0, 1) : 1;
    ctx.save(); ctx.globalAlpha = U.clamp(k, 0, 1);
    ctx.translate(640, 380); ctx.scale(k, k);
    U.text(ctx, b.text, 0, 0, { size: 64, color: '#ffd23f', stroke: '#2b1b4a', strokeWidth: 10 });
    if (b.sub) U.text(ctx, b.sub, 0, 40, { size: 22, color: '#fff', stroke: '#2b1b4a', strokeWidth: 6 });
    ctx.restore();
  }

  OW.HUD = {
    draw: function (ctx, g, t, dt) {
      ctx.save();
      var band = ctx.createLinearGradient(0, 0, 0, 112);
      band.addColorStop(0, 'rgba(15,10,30,0.45)'); band.addColorStop(1, 'rgba(15,10,30,0)');
      ctx.fillStyle = band; ctx.fillRect(0, 0, C.W, 112);
      drawOrders(ctx, g, t, dt || 1 / 60);
      drawRight(ctx, g, t);
      drawTutorial(ctx, g, t);
      drawBanner(ctx, g);
      ctx.restore();
    }
  };
})();
