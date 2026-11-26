/* OVERWORKING — CORE: recetas y niveles (mapas 18×9 hechos a mano y datos estéticos).
 * Los parámetros de equilibrio de cada nivel están en js/core/tuning.js (OW.TUNING.levels).
 *
 * Leyenda de mapa:
 *  .  suelo            #  pared            C  encimera         E  encimera con extintor (HOTFIX)
 *  F  spec front       B  spec back        D  spec data        K  escritorio (desk)
 *  S  servidor build   T  banco de tests   P  pila de PRs      Y  deploy
 *  R  review           X  papelera         Q  cafetera         p  planta   r  rack de servidores
 *  > < ^ v  cinta transportadora           1 2  aparición jugadores        M  aparición del manager
 */
(function () {
  'use strict';
  var OW = window.OW;

  OW.RECIPES = {
    landing: { name: 'Landing Page', lanes: ['front'] },
    api: { name: 'API REST', lanes: ['back'] },
    migration: { name: 'Migración BD', lanes: ['data'] },
    login: { name: 'Login', lanes: ['front', 'back'] },
    dashboard: { name: 'Dashboard', lanes: ['front', 'data'] },
    micro: { name: 'Microservicio', lanes: ['back', 'data'] },
    fullstack: { name: 'App Full-Stack', lanes: ['front', 'back', 'data'] }
  };
  // Puntos y segundos por nº de carriles: los valores están en js/core/tuning.js (alias, mismo array).
  OW.RECIPE_VALUE = OW.TUNING.recipes.value;
  OW.RECIPE_TIME = OW.TUNING.recipes.time;

  OW.LEGEND = {
    '#': 'wall', 'C': 'counter', 'E': 'counter', 'F': 'spec_front', 'B': 'spec_back', 'D': 'spec_data', 'K': 'desk',
    'S': 'compiler', 'T': 'testbench', 'P': 'pr_stack', 'Y': 'deploy', 'R': 'review', 'X': 'trash', 'Q': 'coffee',
    'p': 'plant', 'r': 'server_rack', '>': 'conveyor', '<': 'conveyor', '^': 'conveyor', 'v': 'conveyor'
  };

  OW.LEVELS = [
    {
      id: 1, name: 'El Garaje', theme: 'garage', branch: 'main', hash: '3f1a9c2',
      commit: 'initial commit: hola mundo',
      desc: 'Tu primer sprint. Front y back, sin sustos.',
      tutorial: true,
      hazards: [],
      map: [
        '##CFCBCCKCKCCSCS##',
        'C................C',
        'C..1..........2..Y',
        'X....CCTCCTCC....Y',
        'C....CPCCCCEC....C',
        'C................R',
        'Q................C',
        'C................C',
        '##CCpCCKCKCCCCpC##'
      ]
    },
    {
      id: 2, name: 'Startup Open Space', theme: 'openspace', branch: 'feature/open-space', hash: '8be04d7',
      commit: 'feat: pivotar a blockchain',
      desc: 'Tres carriles y los primeros bugs sueltos.',
      hazards: ['bug'],
      map: [
        '##FCBCDC##CKCKCK##',
        'C.......##.......S',
        'C..1..........2..S',
        'Y...CCTC..CTCC...C',
        'Y...CPCC..CCEC...S',
        'C.......pp.......C',
        'R...............QC',
        'C.......##.......X',
        '##CCKCCC##CCCCCC##'
      ]
    },
    {
      id: 3, name: 'La Consultora', theme: 'consulting', branch: 'hotfix/consultora', hash: 'c0ffee5',
      commit: 'fix: alinear sinergias',
      desc: 'Cuidado con el manager y sus "5 minutitos".',
      hazards: ['bug', 'manager'],
      map: [
        '##CFCBCDCCKCKCKC##',
        'S................C',
        'S..1..#####...2..T',
        'C.....#...#......T',
        'Y..CC.#.M.....CC.C',
        'Y..CP.#####...CE.C',
        'R................C',
        'C................Q',
        '##CCXCCKCKCCCSCC##'
      ]
    },
    {
      id: 4, name: 'El Datacenter', theme: 'datacenter', branch: 'infra/datacenter', hash: 'd47ac3e',
      commit: 'chore: más RAM para el cluster',
      desc: 'Cintas transportadoras y servidores que se recalientan.',
      hazards: ['bug', 'conveyor', 'heat'],
      map: [
        '#CFCBCDCKCrCTCTCC#',
        'S.........r......Y',
        'S..1......r...2..Y',
        'K...CC..>>>>>C...C',
        'S...CE.......P...C',
        'C.........r......R',
        'C................C',
        'X................Q',
        '#CCKCKCCSCrCCCCXC#'
      ]
    },
    {
      id: 5, name: 'Viernes 17:59 · Deploy Day', theme: 'deploy', branch: 'release/v1.0', hash: 'f41da7e',
      commit: 'release: deploy en viernes (qué puede salir mal)',
      desc: 'Todo a la vez. Y se va la luz.',
      hazards: ['bug', 'manager', 'conveyor', 'blackout'],
      map: [
        '##CFCBCDCCKCKCKC##',
        'S.......CC.......Y',
        'S..1....TT....2..Y',
        'C...CC.......C...C',
        'R...PE..>>>>CX...C',
        'C...CC......CC...Q',
        'S.......CC.......C',
        'C.......TC...M...C',
        '##CCKCKCCCCCCSCC##'
      ]
    }
  ];

  /* Parámetros de equilibrio de cada nivel (duración, recetas, pedidos, peligros, estrellas...):
   * viven en OW.TUNING.levels[id] (js/core/tuning.js). syncLevels() los copia sobre OW.LEVELS;
   * se llama al cargar, al empezar cada partida y cada vez que el panel de ajustes cambia algo. */
  OW.LEVEL_PARAMS = ['duration', 'recipes', 'weights', 'prs', 'bugChance', 'manager', 'conveyors', 'heat', 'darkness',
    'blackouts', 'maxOrders', 'orderGap', 'startOrders', 'stars', 'timeMul'];
  OW.syncLevels = function () {
    OW.LEVELS.forEach(function (lv) {
      var t = OW.TUNING.levels[lv.id];
      if (!t) return;
      OW.LEVEL_PARAMS.forEach(function (k) {
        if (t[k] !== undefined) lv[k] = Array.isArray(t[k]) ? t[k].slice() : t[k];
      });
    });
  };
  OW.syncLevels();

  /* Umbrales de estrellas: los del nivel son para 2 jugadores; en solitario (un jugador
   * manejando dos devs con Tab) se exige un porcentaje (OW.TUNING.recipes.soloStars). Calibrado con un bot de QA. */
  OW.starThresholds = function (lv, players) {
    var f = (players === 1 ? OW.TUNING.recipes.soloStars : 1) * OW.difficulty().stars;
    return lv.stars.map(function (v) { return Math.round(v * f / 10) * 10; });
  };

  OW.HAZARD_NAMES = { bug: 'Bugs', manager: 'Manager', conveyor: 'Cintas', heat: 'Sobrecalentamiento', blackout: 'Apagones' };

  /* Validación de mapas (sólo avisa en consola si alguno está mal formado). */
  OW.LEVELS.forEach(function (lv) {
    if (lv.map.length !== OW.C.ROWS) console.warn('Nivel ' + lv.id + ': filas = ' + lv.map.length);
    lv.map.forEach(function (row, r) {
      if (row.length !== OW.C.COLS) console.warn('Nivel ' + lv.id + ' fila ' + r + ': columnas = ' + row.length);
    });
  });
})();
