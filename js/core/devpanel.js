/* OVERWORKING — CORE: panel de ajustes de equilibrio (modo desarrollador).
 *
 * F9 lo abre/cierra en cualquier momento (también ?dev=1 muestra un botón "⚙ DEV"). Mientras está
 * abierto la simulación se congela y las teclas no llegan al juego. Edita OW.TUNING (js/core/tuning.js)
 * en el sitio; los cambios se guardan en localStorage (OW.Tuning) y se pueden exportar como un
 * tuning.js completo para dejarlos permanentes.
 */
(function () {
  'use strict';
  var OW = window.OW, TU = OW && OW.Tuning;
  if (!TU || !document.body) return;

  /* ====================================================================================
   * Descripción de cada parámetro: etiqueta, unidad, ayuda (también es el comentario del
   * tuning.js exportado), límites y si el cambio se nota en vivo o al reiniciar el nivel.
   * ==================================================================================== */
  function N(k, label, unit, help, min, max, o) {
    o = o || {};
    return { k: k, type: o.type || 'num', label: label, unit: unit, help: help, min: min, max: max, int: !!o.int,
      live: o.live !== false, idx: o.idx, labels: o.labels, asc: !!o.asc };
  }
  function R(k, label, unit, help, min, max, opt) {
    var o = {}; for (var x in opt || {}) o[x] = opt[x];
    o.type = 'tuple'; o.idx = [0, 1]; o.labels = ['mín', 'máx']; o.asc = true;
    return N(k, label, unit, help, min, max, o);
  }
  var RESTART = { live: false };

  var GROUPS = [
    { key: 'player', tab: 'player', title: 'Jugador · movimiento', fields: [
      N('maxSpeed', 'Velocidad máxima', 'px/s', 'Velocidad punta andando con energía llena (una casilla = 64 px). Se multiplica por "walk" de la dificultad.', 20, 2000),
      N('accel', 'Aceleración', 'px/s²', 'Lo rápido que llega a la velocidad máxima al empezar a andar.', 100, 50000),
      N('friction', 'Frenada', 'px/s²', 'Deceleración al soltar las teclas de movimiento.', 100, 50000),
      N('dashSpeed', 'Velocidad del dash', 'px/s', 'Impulso inicial del dash.', 0, 5000),
      N('dashTime', 'Duración del dash', 's', 'Tiempo que dura el impulso del dash.', 0.02, 2),
      N('dashCooldown', 'Espera entre dashes', 's', 'Tiempo mínimo entre dos dashes.', 0, 10),
      N('dashTiredKeep', 'Dash con sueño', '0–1', 'Parte del dash que se conserva aunque estés agotado: dash × (k + (1 − k) × multiplicador de cansancio).', 0, 1)
    ] },
    { key: 'coffee', tab: 'player', title: 'Café y energía', fields: [
      N('duration', 'Duración del café', 's', 'Segundos que dura la energía llena con gasto ×1 (la dificultad lo multiplica con "drain").', 5, 3600),
      N('slowBelow', 'Umbral cansado', '0–1', 'Con menos energía que esto vas más lento.', 0, 1),
      N('slowMul', 'Velocidad cansado', '×', 'Multiplicador de velocidad cuando estás cansado.', 0.05, 3),
      N('zombieBelow', 'Umbral zombi', '0–1', 'Con menos energía que esto vas en modo zombi.', 0, 1),
      N('zombieMul', 'Velocidad zombi', '×', 'Multiplicador de velocidad en modo zombi.', 0.05, 3),
      N('drinkTime', 'Tiempo en la cafetera', 's', 'Segundos manteniendo acción en la cafetera para recargar.', 0.05, 30)
    ] },
    { key: 'manager', tab: 'player', title: 'Manager', fields: [
      N('chaseSpeed', 'Velocidad persiguiendo', 'px/s', 'Velocidad del manager cuando te persigue (× "boss" de la dificultad).', 0, 2000),
      N('returnSpeed', 'Velocidad volviendo', 'px/s', 'Velocidad del manager cuando vuelve a su despacho (× "boss").', 0, 2000),
      N('catchRadius', 'Radio de captura', 'px', 'Distancia a la que te atrapa para una reunión.', 4, 200),
      N('stunTime', 'Duración de la reunión', 's', 'Tiempo que te deja aturdido con sus "5 minutitos".', 0, 60),
      N('immuneAfter', 'Inmunidad tras reunión', 's', 'Tiempo que no puede volver a atraparte.', 0, 120),
      N('dodgeImmune', 'Inmunidad al esquivar', 's', 'Inmunidad al esquivarlo con un dash.', 0, 60),
      R('firstVisit', 'Primera visita', 's', 'Segundos (aleatorio entre mín y máx) hasta que aparece por primera vez.', 0, 600, RESTART),
      N('chaseTime', 'Tiempo persiguiendo', 's', 'Cuánto te persigue antes de rendirse.', 1, 600),
      R('awayTime', 'Tiempo entre visitas', 's', 'Segundos fuera (aleatorio entre mín y máx) antes de volver a salir.', 0, 600)
    ] },
    { key: 'pipeline', tab: 'pipeline', title: 'Pipeline', fields: [
      N('deskTime', 'Programar (escritorio)', 's', 'Segundos manteniendo acción para convertir una spec en código.', 0.05, 60),
      N('compileTime', 'Compilar (servidor)', 's', 'Segundos que tarda el servidor en compilar el código.', 0.05, 120),
      N('warnAfter', 'Aviso de quemado', 's', 'Segundos con el build sin recoger hasta que empieza a pitar (÷ heat del nivel).', 0, 120),
      N('burnAfter', 'SEGFAULT tras el aviso', 's', 'Segundos desde el aviso hasta que arde (÷ heat del nivel).', 0, 120),
      N('testTime', 'Banco de tests', 's', 'Segundos manteniendo acción para testear un build.', 0.05, 60),
      N('reviewTime', 'Code review', 's', 'Segundos manteniendo acción para limpiar un PR devuelto.', 0.05, 60),
      N('returnDelay', 'Vuelta del PR a review', 's', 'Segundos tras un deploy hasta que el PR vuelve "con comentarios".', 0, 300),
      N('conveyorTime', 'Cinta: tiempo por casilla', 's', 'Segundos que tarda un objeto en recorrer una casilla de cinta.', 0.05, 20)
    ] },
    { key: 'orders', tab: 'pipeline', title: 'Pedidos', fields: [
      N('expirePenalty', 'Multa por caducado', '€', 'Dinero que se resta cuando caduca un pedido.', 0, 10000, { int: true }),
      N('tipFactor', 'Propina máxima', '× valor', 'Propina = valor × esto × fracción de tiempo restante (redondeada a 5).', 0, 10),
      N('firstGapFactor', 'Primer pedido extra', '× espera', 'Fracción de la espera normal (orderGap) para el primer pedido nuevo.', 0, 5, RESTART),
      N('emptyRefill', 'Sin pedidos: siguiente en', 's', 'Si no queda ningún pedido, el siguiente llega como mucho en este tiempo.', 0, 300),
      N('singleRefill', 'Con un pedido: siguiente en', 's', 'Si sólo queda uno (fuera del tutorial), el siguiente llega como mucho en este tiempo.', 0, 300)
    ] },
    { key: 'recipes', tab: 'pipeline', title: 'Recetas', fields: [
      N('value', 'Puntos base', '€', 'Valor de un pedido según su nº de ingredientes (módulos de 1, 2 o 3 carriles). Afecta a pedidos nuevos.', 0, 10000,
        { type: 'tuple', idx: [1, 2, 3], labels: ['1 ingr.', '2 ingr.', '3 ingr.'], int: true }),
      N('time', 'Tiempo del pedido', 's', 'Segundos para entregar según nº de ingredientes (× timeMul del nivel × "order" de la dificultad). Afecta a pedidos nuevos.', 1, 3600,
        { type: 'tuple', idx: [1, 2, 3], labels: ['1 ingr.', '2 ingr.', '3 ingr.'] }),
      N('soloStars', 'Estrellas en 1 jugador', '×', 'Factor de los umbrales de estrellas en modo 1 jugador (los del nivel son para 2).', 0.05, 5)
    ] },
    { key: 'fire', tab: 'pipeline', title: 'Fuego', fields: [
      N('startLevel', 'Intensidad inicial', '0–1', 'Intensidad con la que empieza un fuego.', 0.01, 1),
      N('growRate', 'Crecimiento', '/s', 'Cuánto crece la intensidad del fuego por segundo (máximo 1).', 0, 10),
      R('spreadEvery', 'Propagación cada', 's', 'Cada cuánto (aleatorio entre mín y máx) salta el fuego a una casilla vecina.', 0.1, 600),
      N('extinguishTime', 'Tiempo de extintor', 's', 'Segundos rociando para apagar un fuego al máximo.', 0.05, 60)
    ] },
    { key: 'bugs', tab: 'pipeline', title: 'Bugs', fields: [
      N('maxAlive', 'Máximo de bugs a la vez', 'bugs', 'No se escapan más bugs si ya hay tantos vivos.', 0, 50, { int: true }),
      N('maxChance', 'Probabilidad máxima', '0–1', 'Tope de probabilidad de bug por test (nivel × dificultad).', 0, 1, RESTART),
      R('speed', 'Velocidad de vuelo', 'px/s', 'Velocidad de cada bug (aleatoria entre mín y máx).', 0, 2000),
      R('sitTime', 'Tiempo bloqueando', 's', 'Cuánto se queda un bug posado bloqueando una estación.', 0, 600)
    ] },
    { key: 'blackout', tab: 'pipeline', title: 'Apagones', fields: [
      N('firstAt', 'Primer apagón', 's', 'Segundos de partida hasta el primer apagón (niveles con apagones).', 0, 3600, RESTART),
      N('duration', 'Duración', 's', 'Duración total de un apagón (incluye 1 s de vuelta de la luz).', 2, 120),
      R('every', 'Siguiente apagón tras', 's', 'Segundos (aleatorio entre mín y máx) entre el fin de un apagón y el siguiente.', 0, 3600),
      N('darkness', 'Oscuridad', '0–1', 'Oscuridad durante el apagón (1 = negro total).', 0, 1)
    ] }
  ];

  var DIFF_FIELDS = [
    N('name', 'Nombre', '', 'Nombre que se ve en el menú de opciones.', 0, 0, { type: 'text' }),
    N('order', 'Tiempo de pedidos', '×', 'Multiplica el tiempo de cada pedido (más = más margen).', 0.05, 20, RESTART),
    N('gap', 'Espera entre pedidos', '×', 'Multiplica la espera entre pedidos nuevos (más = menos agobio).', 0.05, 20, RESTART),
    N('heat', 'Quemado', '×', 'Multiplica la velocidad a la que se quema un build olvidado (más = antes).', 0.05, 20, RESTART),
    N('bugs', 'Probabilidad de bug', '×', 'Multiplica la probabilidad de bug del nivel.', 0, 20, RESTART),
    N('drain', 'Gasto de café', '×', 'Multiplica el gasto de energía (0 = no hace falta café).', 0, 20),
    N('boss', 'Velocidad del manager', '×', 'Multiplica la velocidad del manager.', 0, 10),
    N('walk', 'Velocidad andando', '×', 'Multiplica la velocidad máxima de los devs al andar.', 0.1, 5),
    N('stars', 'Umbrales de estrellas', '×', 'Multiplica los puntos necesarios para cada estrella.', 0.05, 10),
    N('maxOrders', 'Tope de pedidos', 'pedidos', 'Pedidos simultáneos como máximo (0 = el del nivel).', 0, 5, { int: true, live: false }),
    N('color', 'Color', '', 'Color del nombre en el menú.', 0, 0, { type: 'color' }),
    N('desc', 'Descripción', '', 'Texto bajo la dificultad en el menú de opciones.', 0, 0, { type: 'text' })
  ];

  var LEVEL_FIELDS = [
    N('duration', 'Duración del sprint', 's', 'Duración de la partida.', 10, 3600, RESTART),
    N('recipes', 'Recetas (peso)', '', 'Recetas que pueden salir y su peso relativo (más peso = sale más).', 0, 0, { type: 'recipes', live: false }),
    N('weights', 'Pesos de las recetas', '', 'Peso relativo de cada receta de "recipes" (mismo orden).', 0.01, 100, { type: 'weights', live: false }),
    N('prs', 'PRs iniciales', 'PRs', 'Carpetas de PR en la pila al empezar.', 0, 20, { int: true, live: false }),
    N('bugChance', 'Prob. de bug al testear', '0–1', 'Probabilidad de que se escape un bug al pasar un test (× "bugs" de la dificultad).', 0, 1, RESTART),
    N('manager', 'Manager', '', 'Si aparece el manager (necesita su casilla M o cualquier suelo).', 0, 0, { type: 'bool', live: false }),
    N('conveyors', 'Cintas activas', '', 'Si las cintas transportadoras del mapa se mueven.', 0, 0, { type: 'bool', live: false }),
    N('heat', 'Calor', '×', 'Multiplica la velocidad de quemado del build (× "heat" de la dificultad).', 0.05, 20, RESTART),
    N('darkness', 'Oscuridad base', '0–1', 'Penumbra permanente del nivel (0 = luz normal).', 0, 1, RESTART),
    N('blackouts', 'Apagones', '', 'Si hay apagones periódicos.', 0, 0, { type: 'bool', live: false }),
    N('maxOrders', 'Pedidos simultáneos', 'pedidos', 'Máximo de pedidos a la vez (más de 5 no caben en el HUD).', 1, 5, { int: true, live: false }),
    R('orderGap', 'Espera entre pedidos', 's', 'Segundos entre pedidos nuevos (aleatorio entre mín y máx, × "gap" de la dificultad).', 0, 600, RESTART),
    N('startOrders', 'Pedidos al empezar', 'pedidos', 'Pedidos que hay ya al empezar la partida.', 1, 5, { int: true, live: false }),
    N('stars', 'Estrellas (2 jugadores)', '€', 'Puntos para 1, 2 y 3 estrellas en modo 2 jugadores (× "stars" de la dificultad).', 0, 100000,
      { type: 'tuple', idx: [0, 1, 2], labels: ['★', '★★', '★★★'], asc: true, int: true, live: false }),
    N('timeMul', 'Tiempo de pedidos', '×', 'Multiplica el tiempo de todos los pedidos del nivel.', 0.05, 20, RESTART)
  ];

  var GROUP_BY_KEY = {};
  GROUPS.forEach(function (g) { GROUP_BY_KEY[g.key] = g; });
  function findField(list, k) { for (var i = 0; i < list.length; i++) if (list[i].k === k) return list[i]; return null; }
  function fieldForPath(path) {
    var ps = path.split('.');
    if (ps[0] === 'difficulties' && ps.length === 3) return findField(DIFF_FIELDS, ps[2]);
    if (ps[0] === 'levels' && ps.length === 3) return findField(LEVEL_FIELDS, ps[2]);
    if (ps.length === 2 && GROUP_BY_KEY[ps[0]]) return findField(GROUP_BY_KEY[ps[0]].fields, ps[1]);
    return null;
  }

  /* ---------- Validación (también la usa OW.Tuning al cargar overrides de localStorage) ---------- */
  function numOk(f, v) { return typeof v === 'number' && isFinite(v) && v >= f.min && v <= f.max && (!f.int || Math.round(v) === v); }
  function validate(path, v) {
    var f = fieldForPath(path);
    if (!f) return false;
    switch (f.type) {
      case 'num': return numOk(f, v);
      case 'bool': return typeof v === 'boolean';
      case 'text': return typeof v === 'string' && v.length <= 140 && !/[\r\n]/.test(v);
      case 'color': return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
      case 'tuple': {
        var d = TU.def(path);
        if (!Array.isArray(v) || !d || v.length !== d.length) return false;
        for (var i = 0; i < v.length; i++) {
          if (f.idx.indexOf(i) < 0) { if (v[i] !== d[i]) return false; } else if (!numOk(f, v[i])) return false;
        }
        if (f.asc) for (var j = 1; j < f.idx.length; j++) if (v[f.idx[j]] < v[f.idx[j - 1]]) return false;
        return true;
      }
      case 'recipes': {
        if (!Array.isArray(v) || !v.length) return false;
        for (var r = 0; r < v.length; r++) if (!OW.RECIPES || !OW.RECIPES[v[r]] || v.indexOf(v[r]) !== r) return false;
        return true;
      }
      case 'weights': {
        if (!Array.isArray(v) || !v.length) return false;
        for (var w = 0; w < v.length; w++) if (!numOk(f, v[w])) return false;
        return true;
      }
    }
    return false;
  }
  TU.validate = validate;

  /* ====================================================================================
   * Exportar: genera un js/core/tuning.js completo con los valores actuales y comentarios.
   * ==================================================================================== */
  function lit(v) {
    if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
    return String(v);
  }
  function comment(f) {
    var u = f.unit ? ' [' + f.unit + ']' : '';
    return f.label + u + '. ' + f.help + (f.live ? '' : ' (al reiniciar nivel)');
  }
  function emitObject(lines, indent, entries) {
    // entries: [{ code, comment }]; alinea los comentarios en columna
    var w = 0;
    // (las líneas muy largas, como las descripciones, no empujan la columna del resto)
    entries.forEach(function (e, i) { e.code = e.code + (i < entries.length - 1 ? ',' : ''); if (e.code.length <= 44) w = Math.max(w, e.code.length); });
    entries.forEach(function (e) {
      var pad = e.code.length < w ? new Array(w - e.code.length + 1).join(' ') : '';
      lines.push(indent + e.code + (e.comment ? pad + '  // ' + e.comment : ''));
    });
  }
  function exportTuningJS() {
    var T = OW.TUNING, L = [];
    L.push('/* OVERWORKING — CORE: ajustes de equilibrio (tuning).');
    L.push(' *');
    L.push(' * Aquí están TODOS los números que deciden la dificultad: velocidad de los devs, café, manager,');
    L.push(' * tiempos del pipeline, pedidos, recetas, dificultades y parámetros de cada nivel.');
    L.push(' *  - Cambia un valor, guarda y recarga la página.');
    L.push(' *  - O pulsa F9 en el juego (panel de desarrollador): ajusta en vivo y usa "Exportar tuning.js"');
    L.push(' *    para generar este mismo fichero con tus valores y sustituirlo aquí.');
    L.push(' *  - Los mapas y textos de los niveles están en js/core/levels.js.');
    L.push(' * Unidades: s = segundos · px/s = píxeles por segundo (una casilla mide 64 px) · × = multiplicador.');
    L.push(' * Los valores de fábrica reproducen el equilibrio original del juego.');
    L.push(' */');
    L.push('(function () {');
    L.push("  'use strict';");
    L.push('  var OW = (window.OW = window.OW || {});');
    L.push('');
    L.push('  OW.TUNING = {');
    GROUPS.forEach(function (g) {
      L.push('    /* ' + g.title + ' */');
      L.push('    ' + g.key + ': {');
      emitObject(L, '      ', g.fields.map(function (f) { return { code: f.k + ': ' + lit(T[g.key][f.k]), comment: comment(f) }; }));
      L.push('    },');
      L.push('');
    });
    L.push('    /* Dificultades, en el orden del menú de opciones (por defecto se usa la 1, "Junior Optimista").');
    L.push('     * Los multiplicadores a 1 equivalen al equilibrio base de tuning.js. */');
    L.push('    difficulties: [');
    T.difficulties.forEach(function (d, i) {
      L.push('      { // ' + i + ' · ' + d.name.replace(/\*\//g, ''));
      emitObject(L, '        ', DIFF_FIELDS.map(function (f) { return { code: f.k + ': ' + lit(d[f.k]), comment: comment(f) }; }));
      L.push('      }' + (i < T.difficulties.length - 1 ? ',' : ''));
    });
    L.push('    ],');
    L.push('');
    L.push('    /* Parámetros de cada nivel, por id (el mapa, el tema y los textos están en levels.js). */');
    L.push('    levels: {');
    var ids = Object.keys(T.levels);
    ids.forEach(function (id, i) {
      var lv = null;
      (OW.LEVELS || []).forEach(function (x) { if (String(x.id) === id) lv = x; });
      L.push('      ' + id + ': { // ' + (lv ? lv.name.replace(/\*\//g, '') : 'nivel ' + id));
      emitObject(L, '        ', LEVEL_FIELDS.map(function (f) { return { code: f.k + ': ' + lit(T.levels[id][f.k]), comment: comment(f) }; }));
      L.push('      }' + (i < ids.length - 1 ? ',' : ''));
    });
    L.push('    }');
    L.push('  };');
    L.push('})();');
    return L.join('\n') + '\n';
  }

  /* ====================================================================================
   * Interfaz (DOM)
   * ==================================================================================== */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmt(v) { return typeof v === 'number' ? String(+v.toFixed(6)) : String(v); }
  function parseNum(s) {
    s = String(s).trim().replace(',', '.');
    if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(s)) return NaN;
    return parseFloat(s);
  }
  var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };

  var state = { open: false, tab: 'player', view: null, armedReset: 0 };
  var controls = [];   // { paths: [...], root: elemento resaltable, refresh() }

  var root = el('div', 'owd');
  root.id = 'ow-dev';
  root.hidden = true;
  var backdrop = el('div', 'owd-backdrop');
  var panel = el('section', 'owd-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Panel de ajustes de equilibrio');
  panel.tabIndex = -1;
  root.appendChild(backdrop); root.appendChild(panel);

  var head = el('header', 'owd-head');
  var title = el('div', 'owd-title');
  title.appendChild(el('span', 'owd-gear', '⚙'));
  title.appendChild(document.createTextNode(' Ajustes de equilibrio '));
  title.appendChild(el('span', 'owd-sub', 'modo desarrollador · F9'));
  var counter = el('div', 'owd-counter');
  var closeBtn = el('button', 'owd-x', '✕');
  closeBtn.type = 'button'; closeBtn.title = 'Cerrar (F9 / Esc)';
  head.appendChild(title); head.appendChild(counter); head.appendChild(closeBtn);

  var note = el('p', 'owd-note');
  note.innerHTML = '<span class="owd-tag live">● en vivo</span> se nota al instante (movimiento, café, manager, tiempos, propina, multa) · ' +
    '<span class="owd-tag rst">↻ al reiniciar</span> se aplica al empezar un nivel (niveles y casi toda la dificultad). Se guarda solo en este navegador.';

  var tabs = el('nav', 'owd-tabs');
  var TABS = [['player', 'Jugador'], ['pipeline', 'Pipeline y pedidos'], ['diff', 'Dificultades'], ['levels', 'Niveles']];
  var tabBtns = {};
  TABS.forEach(function (t) {
    var b = el('button', 'owd-tab', t[1]);
    b.type = 'button';
    b.addEventListener('click', function () { state.tab = t[0]; state.view = null; render(); });
    tabBtns[t[0]] = b; tabs.appendChild(b);
  });

  var body = el('div', 'owd-body');
  var foot = el('footer', 'owd-foot');
  function btn(label, cls, fn, titleTxt) {
    var b = el('button', 'owd-btn ' + (cls || ''), label);
    b.type = 'button'; if (titleTxt) b.title = titleTxt;
    b.addEventListener('click', fn);
    return b;
  }
  var restartBtn = btn('↻ Reiniciar nivel con estos ajustes', 'primary', function () { restartLevel(); }, 'Vuelve a empezar la partida actual aplicando los parámetros de nivel y dificultad');
  var resetAllBtn = btn('Restaurar todo por defecto', 'danger', function () {
    if (!state.armedReset) {
      state.armedReset = 1; resetAllBtn.textContent = '¿Seguro? Pulsa otra vez';
      setTimeout(function () { state.armedReset = 0; resetAllBtn.textContent = 'Restaurar todo por defecto'; }, 3000);
      return;
    }
    state.armedReset = 0; resetAllBtn.textContent = 'Restaurar todo por defecto';
    TU.resetAll(); changed(); render(); flash('Valores de fábrica restaurados (los de tuning.js).');
  });
  var exportBtn = btn('Exportar tuning.js', '', function () { showExport(); }, 'Genera el fichero js/core/tuning.js completo con estos valores');
  var jsonBtn = btn('Exportar / importar JSON', '', function () { showJSON(); });
  var msg = el('span', 'owd-msg');
  foot.appendChild(restartBtn); foot.appendChild(msg);
  var spacer = el('span', 'owd-spacer'); foot.appendChild(spacer);
  foot.appendChild(jsonBtn); foot.appendChild(exportBtn); foot.appendChild(resetAllBtn);

  panel.appendChild(head); panel.appendChild(note); panel.appendChild(tabs); panel.appendChild(body); panel.appendChild(foot);

  var msgT = null;
  function flash(text, bad) {
    msg.textContent = text; msg.className = 'owd-msg show' + (bad ? ' bad' : '');
    clearTimeout(msgT); msgT = setTimeout(function () { msg.className = 'owd-msg'; }, 4000);
  }

  /* ---------- Insignia de esquina: "⚙ DEV" (?dev=1) y aviso de ajustes modificados ---------- */
  var devQuery = /(?:^|[?&])dev=1(?:&|$)/.test(location.search.slice(1));
  var badge = el('div', 'owd-badge');
  var devBtn = el('button', 'owd-chip dev', '⚙ DEV');
  devBtn.type = 'button'; devBtn.title = 'Panel de ajustes (F9)';
  var modChip = el('button', 'owd-chip mod', '');
  modChip.type = 'button'; modChip.title = 'Hay ajustes de equilibrio distintos de tuning.js. Clic o F9 para verlos.';
  devBtn.addEventListener('click', function () { open(); });
  modChip.addEventListener('click', function () { open(); });
  badge.appendChild(devBtn); badge.appendChild(modChip);
  var host = document.getElementById('juego') || document.body;
  if (host === document.body) badge.classList.add('fixed');
  host.appendChild(badge);
  document.body.appendChild(root);

  function updateBadge() {
    var n = TU.count();
    devBtn.hidden = !devQuery;
    modChip.hidden = n === 0;
    modChip.textContent = 'DEV: ajustes modificados (' + n + ')';
    badge.hidden = devBtn.hidden && modChip.hidden;
    counter.textContent = n ? n + (n === 1 ? ' valor modificado' : ' valores modificados') : 'todo como en tuning.js';
    counter.classList.toggle('on', n > 0);
  }

  /* ---------- Tras cada cambio ---------- */
  function changed() {
    if (OW.syncLevels) OW.syncLevels();
    TU.save();
    controls.forEach(function (c) { c.mark(); });
    updateBadge();
  }

  /* ---------- Controles ---------- */
  function liveTag(f) {
    var t = el('span', 'owd-tag ' + (f.live ? 'live' : 'rst'), f.live ? '●' : '↻');
    t.title = f.live ? 'En vivo: se nota al instante' : 'Se aplica al reiniciar el nivel';
    return t;
  }
  function resetButton(paths, after) {
    var b = el('button', 'owd-reset', '↺');
    b.type = 'button'; b.tabIndex = -1;
    b.addEventListener('click', function () { paths.forEach(function (p) { TU.reset(p); }); changed(); after(); });
    return b;
  }
  function defText(f, d) {
    if (f.type === 'tuple') return f.idx.map(function (i) { return fmt(d[i]); }).join(' / ');
    if (f.type === 'bool') return d ? 'sí' : 'no';
    if (f.type === 'recipes') return d.join(', ');
    return fmt(d);
  }

  /* Construye el editor de un valor en `path`; devuelve el elemento con los inputs. */
  function makeEditor(f, path, highlightEl) {
    var wrap = el('div', 'owd-ed owd-t-' + f.type);
    var ctl = { paths: [path], root: highlightEl, refresh: null, mark: null };
    var inputs = [];

    function numInput(get, onVal) {
      var i = el('input', 'owd-in');
      i.type = 'text'; i.inputMode = 'decimal'; i.spellcheck = false; i.autocomplete = 'off';
      i.addEventListener('input', function () { onVal(i); });
      i.addEventListener('blur', function () { i.classList.remove('bad'); i.title = ''; ctl.refresh(); });
      i._get = get;
      inputs.push(i);
      return i;
    }
    function bad(i, why) { i.classList.add('bad'); i.title = why; }
    function rangeMsg() { return 'Valor entre ' + f.min + ' y ' + f.max + (f.int ? ' (entero)' : ''); }

    if (f.type === 'num') {
      var ni = numInput(function () { return fmt(TU.get(path)); }, function (i) {
        var v = parseNum(i.value);
        if (validate(path, v)) { i.classList.remove('bad'); TU.set(path, v); changed(); } else bad(i, rangeMsg());
      });
      wrap.appendChild(ni);
    } else if (f.type === 'tuple') {
      f.idx.forEach(function (ix, n) {
        var cell = el('label', 'owd-sub');
        if (f.labels) cell.appendChild(el('span', 'owd-sublbl', f.labels[n]));
        var ti = numInput(function () { return fmt(TU.get(path)[ix]); }, function () {
          var cur = TU.get(path).slice(), okAll = true;
          inputs.forEach(function (inp, m) { var v = parseNum(inp.value); cur[f.idx[m]] = v; if (!numOk(f, v)) { okAll = false; bad(inp, rangeMsg()); } else inp.classList.remove('bad'); });
          if (okAll && validate(path, cur)) { TU.set(path, cur); changed(); }
          else if (okAll) inputs.forEach(function (inp) { bad(inp, f.asc ? 'Deben ir de menor a mayor' : rangeMsg()); });
        });
        cell.appendChild(ti);
        wrap.appendChild(cell);
      });
    } else if (f.type === 'bool') {
      var cb = el('input', 'owd-cb');
      cb.type = 'checkbox';
      cb.addEventListener('change', function () { TU.set(path, cb.checked); changed(); });
      cb._get = function () { return TU.get(path); };
      inputs.push(cb);
      var sw = el('label', 'owd-switch'); sw.appendChild(cb); sw.appendChild(el('span', 'owd-knob'));
      wrap.appendChild(sw);
    } else if (f.type === 'text') {
      var tx = el('input', 'owd-in owd-text');
      tx.type = 'text'; tx.maxLength = 140; tx.spellcheck = false;
      tx.addEventListener('input', function () { if (validate(path, tx.value)) { tx.classList.remove('bad'); TU.set(path, tx.value); changed(); } else bad(tx, 'Máximo 140 caracteres'); });
      tx._get = function () { return TU.get(path); };
      inputs.push(tx); wrap.appendChild(tx);
    } else if (f.type === 'color') {
      var co = el('input', 'owd-color');
      co.type = 'color';
      co.addEventListener('input', function () { if (validate(path, co.value)) { TU.set(path, co.value); changed(); } });
      co._get = function () { return TU.get(path); };
      inputs.push(co); wrap.appendChild(co);
    } else if (f.type === 'recipes') {
      var wPath = path.replace(/recipes$/, 'weights');
      ctl.paths.push(wPath);
      var keys = Object.keys(OW.RECIPES), rows = [];
      var apply = function () {
        var rec = [], wts = [], okW = true;
        rows.forEach(function (r) {
          if (!r.cb.checked) { r.w.classList.remove('bad'); return; }
          var w = parseNum(r.w.value);
          if (!numOk(findField(LEVEL_FIELDS, 'weights'), w)) { okW = false; bad(r.w, 'Peso entre 0.01 y 100'); } else r.w.classList.remove('bad');
          rec.push(r.key); wts.push(w);
        });
        if (!rec.length) { flash('Al menos una receta por nivel', true); return; }
        if (!okW) return;
        if (validate(path, rec) && validate(wPath, wts)) { TU.set(path, rec); TU.set(wPath, wts); changed(); }
      };
      keys.forEach(function (key) {
        var line = el('label', 'owd-rec');
        var cb = el('input', 'owd-cb'); cb.type = 'checkbox';
        var lanes = el('span', 'owd-lanes');
        OW.RECIPES[key].lanes.forEach(function (ln) { var d = el('i', 'ln-' + ln); lanes.appendChild(d); });
        var name = el('span', 'owd-recname', OW.RECIPES[key].name);
        line.title = OW.RECIPES[key].name + ': ' + OW.RECIPES[key].lanes.map(function (ln) { return OW.C.LANE_NAMES[ln]; }).join(' + ');
        var w = el('input', 'owd-in owd-w'); w.type = 'text'; w.inputMode = 'decimal'; w.title = 'Peso';
        var r = { key: key, cb: cb, w: w, last: '2' };
        cb.addEventListener('change', function () { w.disabled = !cb.checked; if (cb.checked && !w.value) w.value = r.last; apply(); });
        w.addEventListener('input', apply);
        w.addEventListener('blur', function () { ctl.refresh(); });
        line.appendChild(cb); line.appendChild(lanes); line.appendChild(name); line.appendChild(w);
        wrap.appendChild(line); rows.push(r);
      });
      ctl.refreshRecipes = function () {
        var rec = TU.get(path), wts = TU.get(wPath);
        rows.forEach(function (r) {
          var i = rec.indexOf(r.key);
          r.cb.checked = i >= 0; r.w.disabled = i < 0; r.w.classList.remove('bad');
          if (i >= 0) { r.w.value = fmt(wts[i]); r.last = r.w.value; } else r.w.value = '';
        });
      };
    }

    ctl.refresh = function () {
      if (ctl.refreshRecipes) ctl.refreshRecipes();
      inputs.forEach(function (i) {
        if (document.activeElement === i && i.type === 'text' && i.classList.contains('bad')) return;
        if (i.type === 'checkbox') i.checked = !!i._get(); else if (i._get) i.value = i._get();
      });
      ctl.mark();
    };
    ctl.mark = function () {
      var mod = ctl.paths.some(function (p) { return !same(TU.get(p), TU.def(p)); });
      highlightEl.classList.toggle('mod', mod);
      var d = TU.def(path);
      highlightEl.title = mod ? 'Modificado. Por defecto: ' + defText(f, d) : '';
    };
    var rb = resetButton(ctl.paths, function () { ctl.refresh(); });
    rb.title = 'Restaurar el valor de tuning.js: ' + defText(f, TU.def(path));
    wrap.appendChild(rb);
    controls.push(ctl);
    ctl.refresh();
    return wrap;
  }

  /* ---------- Pestañas ---------- */
  function renderGroups(tab) {
    var grid = el('div', 'owd-grid');
    GROUPS.filter(function (g) { return g.tab === tab; }).forEach(function (g) {
      var card = el('section', 'owd-card');
      card.appendChild(el('h3', null, g.title));
      g.fields.forEach(function (f) {
        var row = el('div', 'owd-row');
        var lab = el('div', 'owd-lab');
        var top = el('div', 'owd-labtop');
        top.appendChild(liveTag(f));
        top.appendChild(el('span', 'owd-name', f.label));
        lab.appendChild(top);
        lab.appendChild(el('div', 'owd-help', f.help));
        row.appendChild(lab);
        row.appendChild(makeEditor(f, g.key + '.' + f.k, row));
        row.appendChild(el('span', 'owd-unit', f.unit));
        card.appendChild(row);
      });
      grid.appendChild(card);
    });
    return grid;
  }

  function renderTable(fields, cols, pathOf, headOf) {
    var wrap = el('div', 'owd-tablewrap');
    var t = el('table', 'owd-table');
    var thead = el('thead'), tr = el('tr');
    tr.appendChild(el('th', 'owd-corner', 'Parámetro'));
    cols.forEach(function (c, i) { tr.appendChild(headOf(c, i)); });
    thead.appendChild(tr); t.appendChild(thead);
    var tb = el('tbody');
    fields.forEach(function (f) {
      if (f.type === 'weights') return; // se edita junto a las recetas
      var row = el('tr');
      var th = el('th', 'owd-rowhead');
      var top = el('div', 'owd-labtop');
      top.appendChild(liveTag(f));
      top.appendChild(el('span', 'owd-name', f.label));
      if (f.unit) top.appendChild(el('span', 'owd-unit', f.unit));
      th.appendChild(top);
      th.appendChild(el('div', 'owd-help', f.help));
      row.appendChild(th);
      cols.forEach(function (c, i) {
        var td = el('td');
        td.appendChild(makeEditor(f, pathOf(c, i, f), td));
        row.appendChild(td);
      });
      tb.appendChild(row);
    });
    t.appendChild(tb); wrap.appendChild(t);
    return wrap;
  }

  function renderDiff() {
    return renderTable(DIFF_FIELDS, OW.TUNING.difficulties, function (c, i, f) { return 'difficulties.' + i + '.' + f.k; }, function (d, i) {
      var th = el('th', 'owd-colhead');
      var sw = el('span', 'owd-dot'); sw.style.background = d.color;
      th.appendChild(sw); th.appendChild(document.createTextNode(d.name));
      var cur = OW.Save && OW.Save.data.difficulty;
      if (cur === i) th.appendChild(el('span', 'owd-cur', 'actual'));
      return th;
    });
  }
  function renderLevels() {
    var ids = Object.keys(OW.TUNING.levels);
    return renderTable(LEVEL_FIELDS, ids, function (id, i, f) { return 'levels.' + id + '.' + f.k; }, function (id) {
      var lv = null; OW.LEVELS.forEach(function (x) { if (String(x.id) === id) lv = x; });
      var th = el('th', 'owd-colhead');
      th.appendChild(el('span', 'owd-num', id));
      th.appendChild(document.createTextNode(lv ? lv.name : 'Nivel ' + id));
      var g = OW.App && OW.App.game;
      if (g && lv && g.li === OW.LEVELS.indexOf(lv) && inGame()) th.appendChild(el('span', 'owd-cur', 'jugando'));
      return th;
    });
  }

  /* ---------- Vistas de exportación ---------- */
  function copyText(text, ta) {
    var done = function () { flash('Copiado al portapapeles.'); };
    var fallback = function () {
      try { ta.focus(); ta.select(); if (document.execCommand('copy')) done(); else flash('No se pudo copiar: selecciona el texto y copia a mano.', true); }
      catch (e) { flash('No se pudo copiar: selecciona el texto y copia a mano.', true); }
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }
  function download(name, text) {
    try {
      var blob = new Blob([text], { type: 'text/javascript;charset=utf-8' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
      flash('Descargado ' + name + '.');
    } catch (e) { flash('No se pudo descargar: copia el texto.', true); }
  }
  function ioView(titleTxt, intro, text, buttons, editable) {
    var v = el('div', 'owd-io');
    var h = el('div', 'owd-iohead');
    h.appendChild(btn('← Volver', 'ghost', function () { state.view = null; render(); }));
    h.appendChild(el('h3', null, titleTxt));
    v.appendChild(h);
    var p = el('p', 'owd-iointro'); p.innerHTML = intro; v.appendChild(p);
    var ta = el('textarea', 'owd-ta');
    ta.value = text; ta.spellcheck = false; ta.readOnly = !editable;
    v.appendChild(ta);
    var bar = el('div', 'owd-iobar');
    buttons(ta).forEach(function (b) { bar.appendChild(b); });
    v.appendChild(bar);
    return { el: v, ta: ta };
  }
  function showExport() { state.view = 'export'; render(); }
  function showJSON() { state.view = 'json'; render(); }
  function renderExport() {
    var text = exportTuningJS();
    var v = ioView('Exportar tuning.js',
      'Este es el contenido <b>completo</b> de <code>js/core/tuning.js</code> con los valores actuales. Sustituye el fichero por este ' +
      'y los ajustes quedarán permanentes para todos (después puedes pulsar «Restaurar todo por defecto»: ya serán los de fábrica).',
      text, function (ta) {
        return [btn('Copiar al portapapeles', 'primary', function () { copyText(text, ta); }),
          btn('Descargar tuning.js', '', function () { download('tuning.js', text); })];
      }, false);
    setTimeout(function () { copyText(text, v.ta); }, 0);
    return v.el;
  }
  function renderJSON() {
    var text = JSON.stringify({ format: 'overworking-tuning', version: 1, overrides: TU.diff() }, null, 2);
    var v = ioView('Exportar / importar JSON',
      'Sólo los valores distintos de <code>tuning.js</code>. Pega aquí un JSON exportado (o un objeto con la forma de <code>OW.TUNING</code>) y pulsa «Importar»: ' +
      'los valores inválidos se ignoran.', text, function (ta) {
        return [btn('Importar', 'primary', function () { importJSON(ta.value); }),
          btn('Copiar', '', function () { copyText(ta.value, ta); })];
      }, true);
    return v.el;
  }
  function flatten(o, pre, out) {
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      var p = pre ? pre + '.' + k : k, v = o[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out); else out[p] = v;
    }
    return out;
  }
  function importJSON(txt) {
    var o;
    try { o = JSON.parse(txt); } catch (e) { flash('JSON no válido: ' + e.message, true); return; }
    if (!o || typeof o !== 'object') { flash('JSON no válido', true); return; }
    var src = o.overrides && typeof o.overrides === 'object' ? o.overrides : o;
    var map = {};
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (k.indexOf('.') >= 0) map[k] = src[k];
      else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) flatten(src[k], k, map);
    }
    // recetas y pesos van juntos: aplicar primero las recetas
    var keys = Object.keys(map).sort(function (a, b) { return (/\.weights$/.test(a) ? 1 : 0) - (/\.weights$/.test(b) ? 1 : 0); });
    var ordered = {}; keys.forEach(function (k2) { ordered[k2] = map[k2]; });
    var total = keys.length, okN = TU.apply(ordered);
    changed(); state.view = null; render();
    flash('Importados ' + okN + ' de ' + total + ' valores' + (okN < total ? ' (el resto no era válido)' : '') + '.', okN < total);
  }

  /* ---------- Render principal ---------- */
  function inGame() {
    var A = OW.App;
    return !!(A && A.game && ['play', 'pause', 'intro', 'timeup'].indexOf(A.name) >= 0);
  }
  function render() {
    controls = [];
    body.textContent = '';
    for (var k in tabBtns) tabBtns[k].classList.toggle('on', k === state.tab && !state.view);
    if (state.view === 'export') body.appendChild(renderExport());
    else if (state.view === 'json') body.appendChild(renderJSON());
    else if (state.tab === 'player' || state.tab === 'pipeline') body.appendChild(renderGroups(state.tab));
    else if (state.tab === 'diff') body.appendChild(renderDiff());
    else body.appendChild(renderLevels());
    restartBtn.hidden = !inGame();
    updateBadge();
  }

  /* ---------- Abrir / cerrar ---------- */
  var htmlEl = document.documentElement;
  function open() {
    if (state.open) return;
    state.open = true;
    if (OW.App) OW.App.frozen = true;
    if (OW.Input && OW.Input.releaseAll) OW.Input.releaseAll();
    root.hidden = false;
    htmlEl.classList.add('owd-lock');
    render();
    try { panel.focus({ preventScroll: true }); } catch (e) { panel.focus(); }
  }
  function close() {
    if (!state.open) return;
    state.open = false;
    root.hidden = true;
    htmlEl.classList.remove('owd-lock');
    if (OW.Input && OW.Input.releaseAll) OW.Input.releaseAll();
    if (OW.App) OW.App.frozen = false;
    var c = document.getElementById('game');
    if (c) { try { c.focus({ preventScroll: true }); } catch (e) { c.focus(); } }
  }
  function toggle() { if (state.open) close(); else open(); }
  function restartLevel() {
    var A = OW.App;
    if (!A || !A.game) return;
    var li = A.game.li, pl = A.players;
    close();
    A.startLevel(li, pl, false);
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  // En fase de captura: F9/Esc se gestionan aquí y no llegan al juego.
  window.addEventListener('keydown', function (e) {
    if (e.code === 'F9' || e.key === 'F9') { e.preventDefault(); e.stopPropagation(); toggle(); return; }
    if (state.open && (e.code === 'Escape' || e.key === 'Escape')) { e.preventDefault(); e.stopPropagation(); close(); }
  }, true);
  if (OW.Input) OW.Input.blockKeys = function () { return state.open; };

  updateBadge();

  OW.DevPanel = {
    open: open, close: close, toggle: toggle, isOpen: function () { return state.open; },
    exportTuningJS: exportTuningJS, validate: validate, restartLevel: restartLevel,
    tab: function (t) { state.tab = t; state.view = null; if (state.open) render(); },
    view: function (v) { state.view = v; if (state.open) render(); },
    importJSON: importJSON, refreshBadge: updateBadge,
    META: { groups: GROUPS, difficulty: DIFF_FIELDS, level: LEVEL_FIELDS }
  };
})();
