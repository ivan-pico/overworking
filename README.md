# OVERWORKING

Co-op caótico tipo "cocina frenética" ambientado en una oficina de programadores. Los "platos" son
*features* que piden los clientes: hay que coger specs, programarlas, compilarlas, testearlas, meterlas
en un Pull Request y desplegarlas antes de que caduque el ticket. Todo ello mientras arden servidores,
se escapan bugs y el manager pregunta si tienes "5 minutitos".

HTML5 Canvas + JavaScript vanilla. No necesita build, ni dependencias, ni servidor: todos los gráficos
y el audio se generan por código.

## Cómo jugar

Abre `index.html` en un navegador moderno (Chrome, Firefox, Edge): basta con hacer doble clic.
El audio se activa al pulsar la primera tecla.

- **1 jugador**: manejas a dos devs y alternas entre ellos con `Tab` (o `Y` en el mando).
- **2 jugadores**: co-op local en el mismo teclado o con mandos.

## Jugar online

**https://ivan-pico.github.io/overworking/**

### Despliegue en GitHub Pages

El juego es estático, así que se publica tal cual:

1. En GitHub: *Settings → Pages → Build and deployment → Source: Deploy from a branch*, rama `main`, carpeta `/ (root)`.
2. A los pocos minutos queda en `https://ivan-pico.github.io/overworking/`.
3. (Opcional) Da de alta la URL en Google Search Console y envía `sitemap.xml`.

La página incluye metadatos SEO, Open Graph/Twitter (`img/og-image.png`), datos estructurados
`VideoGame` (JSON-LD), `manifest.webmanifest` (instalable como PWA), `robots.txt` y `sitemap.xml`.
Si cambia la URL pública, actualízala en `index.html` (canonical, `og:*`, JSON-LD), `sitemap.xml` y `robots.txt`.
Bajo la pantalla de juego hay una sección "Acerca del juego" en HTML: al bajar a leerla la partida se pausa.

## Controles

| Acción | Jugador 1 | Jugador 2 | Mando |
|---|---|---|---|
| Mover | `W A S D` | Flechas | Stick / cruceta |
| Coger / dejar | `E` | `.` (punto) | A |
| Acción (mantener) | `F` | `,` (coma) | X |
| Dash | `Shift` izq. | `-` / `/` | B |
| Cambiar de dev (solo) | `Tab` | `Tab` | Y |
| Pausa | `Esc` / `P` | `Esc` / `P` | Start |
| Silenciar | `M` | `M` | — |

Los menús se manejan con flechas/WASD + `Enter`, con el ratón o con el mando.

## Mecánicas

1. **Impresoras de specs** (azul = front, verde = back, ámbar = datos): coge una spec.
2. **Escritorio**: deja la spec y mantén *Acción* ~2,5 s → código.
3. **Servidor de build**: deja el código; compila solo en 4 s. Si no recoges el build a tiempo empieza
   a pitar y acaba en **SEGFAULT**: el servidor arde y el fuego se propaga. Apágalo con el extintor
   **HOTFIX** manteniendo *Acción* mientras miras al fuego. Lo quemado sólo va a la papelera.
4. **Banco de tests**: deja el build y mantén *Acción* 1,5 s → módulo testeado. A veces se escapa un **bug**
   que se posa sobre las estaciones y las bloquea: aplástalo con *Acción* (manos vacías).
5. **Pull Request**: coge una carpeta de la pila de PRs y mete un módulo testeado de cada carril que
   pida el ticket (puedes dejar el PR en una encimera e ir añadiendo módulos).
6. **Deploy**: deja el PR en la plataforma. Si coincide con un pedido → cohete, confeti y dinero
   (+ propina por rapidez). Si no, se rechaza.
7. **Code review**: 6 s después de cada deploy el PR vuelve "con comentarios" a la estación de review;
   mantén *Acción* allí para dejarlo limpio y reutilizarlo.
8. **Café**: la energía baja con el tiempo; con poca vas más lento y sin nada vas en modo zombi.
   Mantén *Acción* en la cafetera para recargar.
9. **Papelera** (`/dev/null`) destruye lo que llevas (si es un PR, lo vacía). **Encimeras**: superficie libre.

Recetas: Landing Page [front], API REST [back], Migración BD [datos], Login [front+back],
Dashboard [front+datos], Microservicio [back+datos], App Full-Stack [front+back+datos].

Cada pedido caducado resta 30 €. Las estrellas (1–3) dependen de la puntuación; en modo 1 jugador
los umbrales son un 70 % de los de 2 jugadores. Con al menos 1 estrella se desbloquea el siguiente
nivel. El progreso se guarda en `localStorage`.

## Niveles

| # | Nivel | Novedad |
|---|---|---|
| 1 | El Garaje | Tutorial guiado; front y back, sin peligros |
| 2 | Startup Open Space | Tres carriles y bugs |
| 3 | La Consultora | El manager y sus "5 minutitos" (el dash lo esquiva) |
| 4 | El Datacenter | Cintas transportadoras, servidores que se recalientan antes, luz tenue |
| 5 | Viernes 17:59 · Deploy Day | Todo a la vez + apagones |

## Ajustar la dificultad (tuning)

Todos los parámetros de equilibrio están en **`js/core/tuning.js`** (`OW.TUNING`), cada uno con un
comentario que explica qué hace y su unidad: velocidad, aceleración y dash de los devs, café,
manager, tiempos del pipeline, propina y multa, puntos/tiempo de las recetas, fuego, bugs, apagones,
las 4 dificultades (multiplicadores, incluido `walk` para la velocidad al andar y `maxOrders`) y los
parámetros de cada nivel por id (duración, recetas y pesos, PRs, peligros, pedidos, estrellas...).
Los mapas y textos de los niveles siguen en `levels.js`. Cambia un valor, guarda y recarga.

**Panel de ajustes en el juego (modo desarrollador):** pulsa **F9** en cualquier momento (o abre
`index.html?dev=1`, que muestra un botón `⚙ DEV`). La partida se congela mientras está abierto.

- Pestañas *Jugador*, *Pipeline y pedidos*, *Dificultades* y *Niveles* (tablas editables).
- `●` = se nota al instante; `↻` = se aplica al empezar un nivel: usa **Reiniciar nivel con estos ajustes**.
- Los valores cambiados se resaltan en amarillo y tienen un botón `↺` para volver al de `tuning.js`.
- Los cambios se guardan en `localStorage` (`overworking_tuning_v1`), sólo en ese navegador; mientras
  haya alguno activo se ve el aviso `DEV: ajustes modificados` en la esquina.
- **Exportar tuning.js** genera el fichero completo (con comentarios) con los valores actuales, lo copia
  y permite descargarlo: sustituye `js/core/tuning.js` por él y los cambios quedan para todos.
- **Exportar / importar JSON** para compartir sólo los cambios; **Restaurar todo por defecto** los borra.

## Estructura

```
index.html              punto de entrada (scripts clásicos con defer, sin módulos: funciona con file://) + SEO
js/page.js              integración con la sección "Acerca del juego" (pausa al hacer scroll)
manifest.webmanifest    PWA · robots.txt, sitemap.xml · img/og-image.png (imagen social 1200×630) · icons/
css/style.css           letterbox del lienzo 1280×720
js/audio.js             OW.Audio: música chiptune y SFX sintetizados con WebAudio
js/art/                 OW.Art / OW.FX: todo el dibujo procedural
  art.js                utilidades, temas, fondos, suelos, iluminación, barras de progreso
  characters.js         devs, bugs, manager, bocadillos
  stations.js           estaciones de trabajo y cohete
  items.js              specs, código, builds, módulos, PRs, extintor
  fx.js                 partículas (chispas, humo, confeti, glifos, monedas, espuma, texto flotante...)
  ui.js                 paneles, botones, tarjetas de pedido, iconos, logo, fondo de menú
js/core/                lógica del juego
  fallbacks.js          sustitutos mínimos si falta ART o AUDIO
  tuning.js             TODOS los parámetros de equilibrio (OW.TUNING), comentados
  config.js             constantes, utilidades, guardado, overrides de tuning (OW.Tuning)
  input.js              teclado (event.code), mandos (Gamepad API) y ratón
  levels.js             recetas, mapas 18×9 y textos de cada nivel (+ sus parámetros desde tuning.js)
  entities.js           jugadores, bugs y manager
  game.js               partida: estaciones, pipeline, pedidos, peligros, dibujado del mundo
  hud.js                HUD de partida
  menus.js              pantallas: título, menú, opciones, controles, créditos, selector, pausa, resultados
  devpanel.js           panel de ajustes en el juego (F9) · estilos en css/devpanel.css
  main.js               bucle principal (paso fijo 60 Hz) y ganchos de depuración
tools/                  galería de arte y banco de pruebas de audio
```

### Depuración

- `index.html?level=3&players=2&skipintro=1` arranca directamente un nivel.
- `index.html?screen=levels` (o `menu`, `options`, `controls`, `credits`) abre una pantalla.
- En consola: `OW.debug.state()`, `OW.debug.startLevel(n, jugadores)`, `OW.debug.skipTime(s)`,
  `OW.debug.unlockAll()`...
