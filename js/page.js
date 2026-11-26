/* OVERWORKING — PÁGINA: integra el lienzo con el contenido "Acerca del juego" que hay debajo.
 * - Si el jugador baja a leer en mitad de una partida, el juego se pausa.
 * - Los enlaces "Volver al juego" devuelven el foco al lienzo. */
(function () {
  'use strict';
  var wrap = document.getElementById('juego');
  var canvas = document.getElementById('game');
  if (!wrap || !canvas) return;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1];
      if (e.isIntersecting && e.intersectionRatio >= 0.5) return;
      var App = window.OW && window.OW.App;
      if (App && App.name === 'play') { try { App.go('pause'); } catch (err) { /* nada */ } }
    }, { threshold: [0, 0.5] }).observe(wrap);
  }

  var links = document.querySelectorAll('a[href="#juego"]');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function () {
      setTimeout(function () { try { canvas.focus({ preventScroll: true }); } catch (err) { canvas.focus(); } }, 0);
    });
  }
})();
