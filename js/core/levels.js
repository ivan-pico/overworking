/* OVERWORKING — CORE: recetas y niveles (mapas 18×9 hechos a mano).
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
  OW.RECIPE_VALUE = [0, 60, 110, 170];   // puntos base por nº de carriles
  OW.RECIPE_TIME = [0, 60, 80, 100];     // segundos por nº de carriles

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
      duration: 165, recipes: ['landing', 'api', 'login'], weights: [3, 3, 2],
      prs: 3, bugChance: 0, manager: false, conveyors: false, heat: 1, darkness: 0, blackouts: false,
      maxOrders: 4, orderGap: [15, 21], startOrders: 1, stars: [150, 380, 600], tutorial: true,
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
      duration: 150, recipes: ['landing', 'api', 'migration', 'login', 'dashboard'], weights: [2, 2, 2, 2, 2],
      prs: 3, bugChance: 0.3, manager: false, conveyors: false, heat: 1, darkness: 0, blackouts: false,
      maxOrders: 4, orderGap: [14, 20], startOrders: 2, stars: [200, 450, 700],
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
      duration: 150, recipes: ['landing', 'api', 'migration', 'login', 'dashboard', 'micro'], weights: [2, 2, 2, 2, 2, 2],
      prs: 3, bugChance: 0.3, manager: true, conveyors: false, heat: 1, darkness: 0, blackouts: false,
      maxOrders: 4, orderGap: [13, 19], startOrders: 2, stars: [180, 400, 620],
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
      duration: 150, recipes: ['landing', 'api', 'migration', 'login', 'dashboard', 'micro', 'fullstack'], weights: [2, 2, 2, 2, 2, 2, 1],
      prs: 3, bugChance: 0.25, manager: false, conveyors: true, heat: 1.6, darkness: 0.45, blackouts: false,
      maxOrders: 4, orderGap: [13, 19], startOrders: 2, stars: [200, 420, 650],
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
      duration: 150, recipes: ['landing', 'api', 'migration', 'login', 'dashboard', 'micro', 'fullstack'], weights: [2, 2, 2, 2, 2, 2, 2],
      prs: 4, bugChance: 0.35, manager: true, conveyors: true, heat: 1.3, darkness: 0, blackouts: true,
      maxOrders: 5, orderGap: [11, 16], startOrders: 2, stars: [200, 400, 620], timeMul: 0.9,
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

  /* Umbrales de estrellas: los del nivel son para 2 jugadores; en solitario (un jugador
   * manejando dos devs con Tab) se exige un 70 %. Calibrado con un bot de QA. */
  OW.starThresholds = function (lv, players) {
    return players === 1 ? lv.stars.map(function (v) { return Math.round(v * 0.7 / 10) * 10; }) : lv.stars.slice();
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
