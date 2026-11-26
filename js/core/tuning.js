/* OVERWORKING — CORE: ajustes de equilibrio (tuning).
 *
 * Aquí están TODOS los números que deciden la dificultad: velocidad de los devs, café, manager,
 * tiempos del pipeline, pedidos, recetas, dificultades y parámetros de cada nivel.
 *  - Cambia un valor, guarda y recarga la página.
 *  - O pulsa F9 en el juego (panel de desarrollador): ajusta en vivo y usa "Exportar tuning.js"
 *    para generar este mismo fichero con tus valores y sustituirlo aquí.
 *  - Los mapas y textos de los niveles están en js/core/levels.js.
 * Unidades: s = segundos · px/s = píxeles por segundo (una casilla mide 64 px) · × = multiplicador.
 * Los valores de fábrica reproducen el equilibrio original del juego.
 */
(function () {
  'use strict';
  var OW = (window.OW = window.OW || {});

  OW.TUNING = {
    /* Jugador · movimiento */
    player: {
      maxSpeed: 350.0,     // Velocidad máxima [px/s]. Velocidad punta andando con energía llena (una casilla = 64 px). Se multiplica por "walk" de la dificultad.
      accel: 2400,         // Aceleración [px/s²]. Lo rápido que llega a la velocidad máxima al empezar a andar.
      friction: 2800,      // Frenada [px/s²]. Deceleración al soltar las teclas de movimiento.
      dashSpeed: 720,      // Velocidad del dash [px/s]. Impulso inicial del dash.
      dashTime: 0.16,      // Duración del dash [s]. Tiempo que dura el impulso del dash.
      dashCooldown: 0.75,  // Espera entre dashes [s]. Tiempo mínimo entre dos dashes.
      dashTiredKeep: 0.7   // Dash con sueño [0–1]. Parte del dash que se conserva aunque estés agotado: dash × (k + (1 − k) × multiplicador de cansancio).
    },

    /* Café y energía */
    coffee: {
      duration: 90,      // Duración del café [s]. Segundos que dura la energía llena con gasto ×1 (la dificultad lo multiplica con "drain").
      slowBelow: 0.3,    // Umbral cansado [0–1]. Con menos energía que esto vas más lento.
      slowMul: 0.75,     // Velocidad cansado [×]. Multiplicador de velocidad cuando estás cansado.
      zombieBelow: 0.1,  // Umbral zombi [0–1]. Con menos energía que esto vas en modo zombi.
      zombieMul: 0.5,    // Velocidad zombi [×]. Multiplicador de velocidad en modo zombi.
      drinkTime: 1       // Tiempo en la cafetera [s]. Segundos manteniendo acción en la cafetera para recargar.
    },

    /* Manager */
    manager: {
      chaseSpeed: 120,       // Velocidad persiguiendo [px/s]. Velocidad del manager cuando te persigue (× "boss" de la dificultad).
      returnSpeed: 100,      // Velocidad volviendo [px/s]. Velocidad del manager cuando vuelve a su despacho (× "boss").
      catchRadius: 34,       // Radio de captura [px]. Distancia a la que te atrapa para una reunión.
      stunTime: 2.5,         // Duración de la reunión [s]. Tiempo que te deja aturdido con sus "5 minutitos".
      immuneAfter: 5,        // Inmunidad tras reunión [s]. Tiempo que no puede volver a atraparte.
      dodgeImmune: 1,        // Inmunidad al esquivar [s]. Inmunidad al esquivarlo con un dash.
      firstVisit: [14, 20],  // Primera visita [s]. Segundos (aleatorio entre mín y máx) hasta que aparece por primera vez. (al reiniciar nivel)
      chaseTime: 14,         // Tiempo persiguiendo [s]. Cuánto te persigue antes de rendirse.
      awayTime: [16, 24]     // Tiempo entre visitas [s]. Segundos fuera (aleatorio entre mín y máx) antes de volver a salir.
    },

    /* Pipeline */
    pipeline: {
      deskTime: 2.5,     // Programar (escritorio) [s]. Segundos manteniendo acción para convertir una spec en código.
      compileTime: 4,    // Compilar (servidor) [s]. Segundos que tarda el servidor en compilar el código.
      warnAfter: 5,      // Aviso de quemado [s]. Segundos con el build sin recoger hasta que empieza a pitar (÷ heat del nivel).
      burnAfter: 3,      // SEGFAULT tras el aviso [s]. Segundos desde el aviso hasta que arde (÷ heat del nivel).
      testTime: 1.5,     // Banco de tests [s]. Segundos manteniendo acción para testear un build.
      reviewTime: 2,     // Code review [s]. Segundos manteniendo acción para limpiar un PR devuelto.
      returnDelay: 6,    // Vuelta del PR a review [s]. Segundos tras un deploy hasta que el PR vuelve "con comentarios".
      conveyorTime: 1.1  // Cinta: tiempo por casilla [s]. Segundos que tarda un objeto en recorrer una casilla de cinta.
    },

    /* Pedidos */
    orders: {
      expirePenalty: 30,    // Multa por caducado [€]. Dinero que se resta cuando caduca un pedido.
      tipFactor: 0.6,       // Propina máxima [× valor]. Propina = valor × esto × fracción de tiempo restante (redondeada a 5).
      firstGapFactor: 0.6,  // Primer pedido extra [× espera]. Fracción de la espera normal (orderGap) para el primer pedido nuevo. (al reiniciar nivel)
      emptyRefill: 1.2,     // Sin pedidos: siguiente en [s]. Si no queda ningún pedido, el siguiente llega como mucho en este tiempo.
      singleRefill: 5       // Con un pedido: siguiente en [s]. Si sólo queda uno (fuera del tutorial), el siguiente llega como mucho en este tiempo.
    },

    /* Recetas */
    recipes: {
      value: [0, 60, 110, 170],  // Puntos base [€]. Valor de un pedido según su nº de ingredientes (módulos de 1, 2 o 3 carriles). Afecta a pedidos nuevos.
      time: [0, 60, 80, 100],    // Tiempo del pedido [s]. Segundos para entregar según nº de ingredientes (× timeMul del nivel × "order" de la dificultad). Afecta a pedidos nuevos.
      soloStars: 0.7             // Estrellas en 1 jugador [×]. Factor de los umbrales de estrellas en modo 1 jugador (los del nivel son para 2).
    },

    /* Fuego */
    fire: {
      startLevel: 0.35,       // Intensidad inicial [0–1]. Intensidad con la que empieza un fuego.
      growRate: 0.35,         // Crecimiento [/s]. Cuánto crece la intensidad del fuego por segundo (máximo 1).
      spreadEvery: [4, 5.5],  // Propagación cada [s]. Cada cuánto (aleatorio entre mín y máx) salta el fuego a una casilla vecina.
      extinguishTime: 0.9     // Tiempo de extintor [s]. Segundos rociando para apagar un fuego al máximo.
    },

    /* Bugs */
    bugs: {
      maxAlive: 3,       // Máximo de bugs a la vez [bugs]. No se escapan más bugs si ya hay tantos vivos.
      maxChance: 0.8,    // Probabilidad máxima [0–1]. Tope de probabilidad de bug por test (nivel × dificultad). (al reiniciar nivel)
      speed: [95, 125],  // Velocidad de vuelo [px/s]. Velocidad de cada bug (aleatoria entre mín y máx).
      sitTime: [9, 14]   // Tiempo bloqueando [s]. Cuánto se queda un bug posado bloqueando una estación.
    },

    /* Apagones */
    blackout: {
      firstAt: 32,      // Primer apagón [s]. Segundos de partida hasta el primer apagón (niveles con apagones). (al reiniciar nivel)
      duration: 9.5,    // Duración [s]. Duración total de un apagón (incluye 1 s de vuelta de la luz).
      every: [22, 30],  // Siguiente apagón tras [s]. Segundos (aleatorio entre mín y máx) entre el fin de un apagón y el siguiente.
      darkness: 0.9     // Oscuridad [0–1]. Oscuridad durante el apagón (1 = negro total).
    },

    /* Dificultades, en el orden del menú de opciones (por defecto se usa la 1, "Junior Optimista").
     * Los multiplicadores a 1 equivalen al equilibrio base de tuning.js. */
    difficulties: [
      { // 0 · Becario Feliz
        name: 'Becario Feliz',  // Nombre. Nombre que se ve en el menú de opciones.
        order: 2.2,             // Tiempo de pedidos [×]. Multiplica el tiempo de cada pedido (más = más margen). (al reiniciar nivel)
        gap: 1.4,               // Espera entre pedidos [×]. Multiplica la espera entre pedidos nuevos (más = menos agobio). (al reiniciar nivel)
        heat: 0.4,              // Quemado [×]. Multiplica la velocidad a la que se quema un build olvidado (más = antes). (al reiniciar nivel)
        bugs: 0.15,             // Probabilidad de bug [×]. Multiplica la probabilidad de bug del nivel. (al reiniciar nivel)
        drain: 0,               // Gasto de café [×]. Multiplica el gasto de energía (0 = no hace falta café).
        boss: 0.5,              // Velocidad del manager [×]. Multiplica la velocidad del manager.
        walk: 1,                // Velocidad andando [×]. Multiplica la velocidad máxima de los devs al andar.
        stars: 0.45,            // Umbrales de estrellas [×]. Multiplica los puntos necesarios para cada estrella.
        maxOrders: 1,           // Tope de pedidos [pedidos]. Pedidos simultáneos como máximo (0 = el del nivel). (al reiniciar nivel)
        color: '#7cff9b',       // Color. Color del nombre en el menú.
        desc: 'Pedidos sin prisa, sin necesidad de café y el manager de vacaciones mentales.'  // Descripción. Texto bajo la dificultad en el menú de opciones.
      },
      { // 1 · Junior Optimista
        name: 'Junior Optimista',  // Nombre. Nombre que se ve en el menú de opciones.
        order: 1.6,                // Tiempo de pedidos [×]. Multiplica el tiempo de cada pedido (más = más margen). (al reiniciar nivel)
        gap: 1.25,                 // Espera entre pedidos [×]. Multiplica la espera entre pedidos nuevos (más = menos agobio). (al reiniciar nivel)
        heat: 0.6,                 // Quemado [×]. Multiplica la velocidad a la que se quema un build olvidado (más = antes). (al reiniciar nivel)
        bugs: 0.45,                // Probabilidad de bug [×]. Multiplica la probabilidad de bug del nivel. (al reiniciar nivel)
        drain: 0.5,                // Gasto de café [×]. Multiplica el gasto de energía (0 = no hace falta café).
        boss: 0.7,                 // Velocidad del manager [×]. Multiplica la velocidad del manager.
        walk: 1,                   // Velocidad andando [×]. Multiplica la velocidad máxima de los devs al andar.
        stars: 0.65,               // Umbrales de estrellas [×]. Multiplica los puntos necesarios para cada estrella.
        maxOrders: 2,              // Tope de pedidos [pedidos]. Pedidos simultáneos como máximo (0 = el del nivel). (al reiniciar nivel)
        color: '#4da3ff',          // Color. Color del nombre en el menú.
        desc: '"Esto lo saco en una tarde." Mucho margen para aprender.'  // Descripción. Texto bajo la dificultad en el menú de opciones.
      },
      { // 2 · Senior Cafeinado
        name: 'Senior Cafeinado',  // Nombre. Nombre que se ve en el menú de opciones.
        order: 1.25,               // Tiempo de pedidos [×]. Multiplica el tiempo de cada pedido (más = más margen). (al reiniciar nivel)
        gap: 1.1,                  // Espera entre pedidos [×]. Multiplica la espera entre pedidos nuevos (más = menos agobio). (al reiniciar nivel)
        heat: 0.8,                 // Quemado [×]. Multiplica la velocidad a la que se quema un build olvidado (más = antes). (al reiniciar nivel)
        bugs: 0.75,                // Probabilidad de bug [×]. Multiplica la probabilidad de bug del nivel. (al reiniciar nivel)
        drain: 0.8,                // Gasto de café [×]. Multiplica el gasto de energía (0 = no hace falta café).
        boss: 0.85,                // Velocidad del manager [×]. Multiplica la velocidad del manager.
        walk: 1,                   // Velocidad andando [×]. Multiplica la velocidad máxima de los devs al andar.
        stars: 0.85,               // Umbrales de estrellas [×]. Multiplica los puntos necesarios para cada estrella.
        maxOrders: 0,              // Tope de pedidos [pedidos]. Pedidos simultáneos como máximo (0 = el del nivel). (al reiniciar nivel)
        color: '#ffd23f',          // Color. Color del nombre en el menú.
        desc: 'Deadlines de verdad y dos cafés por hora, pero con oficio.'  // Descripción. Texto bajo la dificultad en el menú de opciones.
      },
      { // 3 · Rockstar 10x
        name: 'Rockstar 10x',  // Nombre. Nombre que se ve en el menú de opciones.
        order: 0.8,            // Tiempo de pedidos [×]. Multiplica el tiempo de cada pedido (más = más margen). (al reiniciar nivel)
        gap: 0.85,             // Espera entre pedidos [×]. Multiplica la espera entre pedidos nuevos (más = menos agobio). (al reiniciar nivel)
        heat: 1.35,            // Quemado [×]. Multiplica la velocidad a la que se quema un build olvidado (más = antes). (al reiniciar nivel)
        bugs: 1.4,             // Probabilidad de bug [×]. Multiplica la probabilidad de bug del nivel. (al reiniciar nivel)
        drain: 1.3,            // Gasto de café [×]. Multiplica el gasto de energía (0 = no hace falta café).
        boss: 1.2,             // Velocidad del manager [×]. Multiplica la velocidad del manager.
        walk: 1,               // Velocidad andando [×]. Multiplica la velocidad máxima de los devs al andar.
        stars: 1,              // Umbrales de estrellas [×]. Multiplica los puntos necesarios para cada estrella.
        maxOrders: 0,          // Tope de pedidos [pedidos]. Pedidos simultáneos como máximo (0 = el del nivel). (al reiniciar nivel)
        color: '#ff5d73',      // Color. Color del nombre en el menú.
        desc: 'Deploy en viernes, sin tests y con el servidor ardiendo. Suerte.'  // Descripción. Texto bajo la dificultad en el menú de opciones.
      }
    ],

    /* Parámetros de cada nivel, por id (el mapa, el tema y los textos están en levels.js). */
    levels: {
      1: { // El Garaje
        duration: 165,                         // Duración del sprint [s]. Duración de la partida. (al reiniciar nivel)
        recipes: ['landing', 'api', 'login'],  // Recetas (peso). Recetas que pueden salir y su peso relativo (más peso = sale más). (al reiniciar nivel)
        weights: [3, 3, 2],                    // Pesos de las recetas. Peso relativo de cada receta de "recipes" (mismo orden). (al reiniciar nivel)
        prs: 3,                                // PRs iniciales [PRs]. Carpetas de PR en la pila al empezar. (al reiniciar nivel)
        bugChance: 0,                          // Prob. de bug al testear [0–1]. Probabilidad de que se escape un bug al pasar un test (× "bugs" de la dificultad). (al reiniciar nivel)
        manager: false,                        // Manager. Si aparece el manager (necesita su casilla M o cualquier suelo). (al reiniciar nivel)
        conveyors: false,                      // Cintas activas. Si las cintas transportadoras del mapa se mueven. (al reiniciar nivel)
        heat: 1,                               // Calor [×]. Multiplica la velocidad de quemado del build (× "heat" de la dificultad). (al reiniciar nivel)
        darkness: 0,                           // Oscuridad base [0–1]. Penumbra permanente del nivel (0 = luz normal). (al reiniciar nivel)
        blackouts: false,                      // Apagones. Si hay apagones periódicos. (al reiniciar nivel)
        maxOrders: 4,                          // Pedidos simultáneos [pedidos]. Máximo de pedidos a la vez (más de 5 no caben en el HUD). (al reiniciar nivel)
        orderGap: [15, 21],                    // Espera entre pedidos [s]. Segundos entre pedidos nuevos (aleatorio entre mín y máx, × "gap" de la dificultad). (al reiniciar nivel)
        startOrders: 1,                        // Pedidos al empezar [pedidos]. Pedidos que hay ya al empezar la partida. (al reiniciar nivel)
        stars: [150, 380, 600],                // Estrellas (2 jugadores) [€]. Puntos para 1, 2 y 3 estrellas en modo 2 jugadores (× "stars" de la dificultad). (al reiniciar nivel)
        timeMul: 1                             // Tiempo de pedidos [×]. Multiplica el tiempo de todos los pedidos del nivel. (al reiniciar nivel)
      },
      2: { // Startup Open Space
        duration: 150,             // Duración del sprint [s]. Duración de la partida. (al reiniciar nivel)
        recipes: ['landing', 'api', 'migration', 'login', 'dashboard'],  // Recetas (peso). Recetas que pueden salir y su peso relativo (más peso = sale más). (al reiniciar nivel)
        weights: [2, 2, 2, 2, 2],  // Pesos de las recetas. Peso relativo de cada receta de "recipes" (mismo orden). (al reiniciar nivel)
        prs: 3,                    // PRs iniciales [PRs]. Carpetas de PR en la pila al empezar. (al reiniciar nivel)
        bugChance: 0.3,            // Prob. de bug al testear [0–1]. Probabilidad de que se escape un bug al pasar un test (× "bugs" de la dificultad). (al reiniciar nivel)
        manager: false,            // Manager. Si aparece el manager (necesita su casilla M o cualquier suelo). (al reiniciar nivel)
        conveyors: false,          // Cintas activas. Si las cintas transportadoras del mapa se mueven. (al reiniciar nivel)
        heat: 1,                   // Calor [×]. Multiplica la velocidad de quemado del build (× "heat" de la dificultad). (al reiniciar nivel)
        darkness: 0,               // Oscuridad base [0–1]. Penumbra permanente del nivel (0 = luz normal). (al reiniciar nivel)
        blackouts: false,          // Apagones. Si hay apagones periódicos. (al reiniciar nivel)
        maxOrders: 4,              // Pedidos simultáneos [pedidos]. Máximo de pedidos a la vez (más de 5 no caben en el HUD). (al reiniciar nivel)
        orderGap: [14, 20],        // Espera entre pedidos [s]. Segundos entre pedidos nuevos (aleatorio entre mín y máx, × "gap" de la dificultad). (al reiniciar nivel)
        startOrders: 2,            // Pedidos al empezar [pedidos]. Pedidos que hay ya al empezar la partida. (al reiniciar nivel)
        stars: [200, 450, 700],    // Estrellas (2 jugadores) [€]. Puntos para 1, 2 y 3 estrellas en modo 2 jugadores (× "stars" de la dificultad). (al reiniciar nivel)
        timeMul: 1                 // Tiempo de pedidos [×]. Multiplica el tiempo de todos los pedidos del nivel. (al reiniciar nivel)
      },
      3: { // La Consultora
        duration: 150,                // Duración del sprint [s]. Duración de la partida. (al reiniciar nivel)
        recipes: ['landing', 'api', 'migration', 'login', 'dashboard', 'micro'],  // Recetas (peso). Recetas que pueden salir y su peso relativo (más peso = sale más). (al reiniciar nivel)
        weights: [2, 2, 2, 2, 2, 2],  // Pesos de las recetas. Peso relativo de cada receta de "recipes" (mismo orden). (al reiniciar nivel)
        prs: 3,                       // PRs iniciales [PRs]. Carpetas de PR en la pila al empezar. (al reiniciar nivel)
        bugChance: 0.3,               // Prob. de bug al testear [0–1]. Probabilidad de que se escape un bug al pasar un test (× "bugs" de la dificultad). (al reiniciar nivel)
        manager: true,                // Manager. Si aparece el manager (necesita su casilla M o cualquier suelo). (al reiniciar nivel)
        conveyors: false,             // Cintas activas. Si las cintas transportadoras del mapa se mueven. (al reiniciar nivel)
        heat: 1,                      // Calor [×]. Multiplica la velocidad de quemado del build (× "heat" de la dificultad). (al reiniciar nivel)
        darkness: 0,                  // Oscuridad base [0–1]. Penumbra permanente del nivel (0 = luz normal). (al reiniciar nivel)
        blackouts: false,             // Apagones. Si hay apagones periódicos. (al reiniciar nivel)
        maxOrders: 4,                 // Pedidos simultáneos [pedidos]. Máximo de pedidos a la vez (más de 5 no caben en el HUD). (al reiniciar nivel)
        orderGap: [13, 19],           // Espera entre pedidos [s]. Segundos entre pedidos nuevos (aleatorio entre mín y máx, × "gap" de la dificultad). (al reiniciar nivel)
        startOrders: 2,               // Pedidos al empezar [pedidos]. Pedidos que hay ya al empezar la partida. (al reiniciar nivel)
        stars: [180, 400, 620],       // Estrellas (2 jugadores) [€]. Puntos para 1, 2 y 3 estrellas en modo 2 jugadores (× "stars" de la dificultad). (al reiniciar nivel)
        timeMul: 1                    // Tiempo de pedidos [×]. Multiplica el tiempo de todos los pedidos del nivel. (al reiniciar nivel)
      },
      4: { // El Datacenter
        duration: 150,                   // Duración del sprint [s]. Duración de la partida. (al reiniciar nivel)
        recipes: ['landing', 'api', 'migration', 'login', 'dashboard', 'micro', 'fullstack'],  // Recetas (peso). Recetas que pueden salir y su peso relativo (más peso = sale más). (al reiniciar nivel)
        weights: [2, 2, 2, 2, 2, 2, 1],  // Pesos de las recetas. Peso relativo de cada receta de "recipes" (mismo orden). (al reiniciar nivel)
        prs: 3,                          // PRs iniciales [PRs]. Carpetas de PR en la pila al empezar. (al reiniciar nivel)
        bugChance: 0.25,                 // Prob. de bug al testear [0–1]. Probabilidad de que se escape un bug al pasar un test (× "bugs" de la dificultad). (al reiniciar nivel)
        manager: false,                  // Manager. Si aparece el manager (necesita su casilla M o cualquier suelo). (al reiniciar nivel)
        conveyors: true,                 // Cintas activas. Si las cintas transportadoras del mapa se mueven. (al reiniciar nivel)
        heat: 1.6,                       // Calor [×]. Multiplica la velocidad de quemado del build (× "heat" de la dificultad). (al reiniciar nivel)
        darkness: 0.45,                  // Oscuridad base [0–1]. Penumbra permanente del nivel (0 = luz normal). (al reiniciar nivel)
        blackouts: false,                // Apagones. Si hay apagones periódicos. (al reiniciar nivel)
        maxOrders: 4,                    // Pedidos simultáneos [pedidos]. Máximo de pedidos a la vez (más de 5 no caben en el HUD). (al reiniciar nivel)
        orderGap: [13, 19],              // Espera entre pedidos [s]. Segundos entre pedidos nuevos (aleatorio entre mín y máx, × "gap" de la dificultad). (al reiniciar nivel)
        startOrders: 2,                  // Pedidos al empezar [pedidos]. Pedidos que hay ya al empezar la partida. (al reiniciar nivel)
        stars: [200, 420, 650],          // Estrellas (2 jugadores) [€]. Puntos para 1, 2 y 3 estrellas en modo 2 jugadores (× "stars" de la dificultad). (al reiniciar nivel)
        timeMul: 1                       // Tiempo de pedidos [×]. Multiplica el tiempo de todos los pedidos del nivel. (al reiniciar nivel)
      },
      5: { // Viernes 17:59 · Deploy Day
        duration: 150,                   // Duración del sprint [s]. Duración de la partida. (al reiniciar nivel)
        recipes: ['landing', 'api', 'migration', 'login', 'dashboard', 'micro', 'fullstack'],  // Recetas (peso). Recetas que pueden salir y su peso relativo (más peso = sale más). (al reiniciar nivel)
        weights: [2, 2, 2, 2, 2, 2, 2],  // Pesos de las recetas. Peso relativo de cada receta de "recipes" (mismo orden). (al reiniciar nivel)
        prs: 4,                          // PRs iniciales [PRs]. Carpetas de PR en la pila al empezar. (al reiniciar nivel)
        bugChance: 0.35,                 // Prob. de bug al testear [0–1]. Probabilidad de que se escape un bug al pasar un test (× "bugs" de la dificultad). (al reiniciar nivel)
        manager: true,                   // Manager. Si aparece el manager (necesita su casilla M o cualquier suelo). (al reiniciar nivel)
        conveyors: true,                 // Cintas activas. Si las cintas transportadoras del mapa se mueven. (al reiniciar nivel)
        heat: 1.3,                       // Calor [×]. Multiplica la velocidad de quemado del build (× "heat" de la dificultad). (al reiniciar nivel)
        darkness: 0,                     // Oscuridad base [0–1]. Penumbra permanente del nivel (0 = luz normal). (al reiniciar nivel)
        blackouts: true,                 // Apagones. Si hay apagones periódicos. (al reiniciar nivel)
        maxOrders: 5,                    // Pedidos simultáneos [pedidos]. Máximo de pedidos a la vez (más de 5 no caben en el HUD). (al reiniciar nivel)
        orderGap: [11, 16],              // Espera entre pedidos [s]. Segundos entre pedidos nuevos (aleatorio entre mín y máx, × "gap" de la dificultad). (al reiniciar nivel)
        startOrders: 2,                  // Pedidos al empezar [pedidos]. Pedidos que hay ya al empezar la partida. (al reiniciar nivel)
        stars: [200, 400, 620],          // Estrellas (2 jugadores) [€]. Puntos para 1, 2 y 3 estrellas en modo 2 jugadores (× "stars" de la dificultad). (al reiniciar nivel)
        timeMul: 0.9                     // Tiempo de pedidos [×]. Multiplica el tiempo de todos los pedidos del nivel. (al reiniciar nivel)
      }
    }
  };
})();
