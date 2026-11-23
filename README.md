# SERRT Solar Race Lab

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

**[Español](#español) · [English](#english)**

**Demo:** https://serrtsolarcarlab.netlify.app/

---

## Español

### Qué es

Un juego de navegador sobre correr un auto solar durante tres días. Eliges la carrocería, la batería y la estrategia, corres contra siete rivales simulados y el juego te muestra por qué cada decisión cambia el resultado.

Existe para explicar a estudiantes y auspiciadores cómo se gana una carrera solar: administrando energía, no acelerando. El auto de inicio es Pitirre 3, el auto de SERRT (Solar Engineering Research Racing Team, UPR Mayagüez) para FSGP 2027.

Creado por Víctor Marrero, Project Management Division Leader de SERRT.

### Qué es real y qué no

| Dato | Estado | Fuente |
| --- | --- | --- |
| Dimensiones (5.03 × 2.12 × 1.40 m), batalla 3.25 m, radio de llanta, peso de diseño de 1,000 lb con piloto, motor en la rueda trasera izquierda | Documentado | Reporte mecánico PVDR, FSGP 2027 (11 nov 2026) |
| Batería: 288 celdas Samsung 50S, 32s9p, 115.2 V, 45 Ah, 5.184 kWh nominal | Documentado | Presentación de SERRT para compañías |
| Área de arrastre CdA 0.14 m², área solar 6 m², eficiencias, resistencia a la rodadura | **Supuesto** | Valores de ejemplo del modelo |
| Los siete equipos rivales | **Ficticio** | Usan nombres de universidades reales, pero sus autos, estrategias y resultados son inventados |

El trazado de la pista es ilustrativo. Esto es un modelo educativo, no una predicción de carrera. Cada valor con su fuente está en [`data/pitirre3.json`](data/pitirre3.json).

### Cómo correrlo

No hay dependencias ni paso de build. Necesitas Node 18 o más nuevo para las pruebas y Python 3 para el servidor local.

```bash
git clone <url-del-repo>
cd serrt-solar-race-lab
npm run serve      # abre http://localhost:8000
```

### Cómo verificar la física

```bash
npm test
```

Las pruebas revisan unidades de batería, límites de carga, arrastre de energía entre días, conteo de vueltas, tiempos de pit, efecto de nubes y arrastre, y que la simulación paso a paso del juego reproduzca exactamente la simulación de referencia. El modelo está explicado en [`docs/PHYSICS.md`](docs/PHYSICS.md).

### Estructura

```
site/               el sitio (esto es lo que publica GitHub Pages)
  index.html        marcado y estilos
  physics.js        modelo de energía de tres días (probado)
  logic.js          clima y equipos rivales simulados
  js/shared.js      utilidades, preset de Pitirre 3 y estado compartido
  js/draw/          dibujo del auto y de la pista (canvas)
  js/ui/            garaje, "Under the hood" y pestañas
  js/game.js        la carrera: decisiones, ritmo, marcador y resumen
  assets/           logo, foto del equipo y fuentes
tests/physics.cjs   pruebas del modelo
data/pitirre3.json  datos del auto con fuente y estado
docs/PHYSICS.md     ecuaciones y supuestos
```

### Licencia

El código está bajo licencia MIT. El logo y la foto de SERRT no están cubiertos por esa licencia. Ver [`NOTICE.md`](NOTICE.md).

---

## English

### What it is

A browser game about racing a solar car for three days. You pick the body, the battery and the strategy, race seven simulated rivals, and the game shows you why each choice changes the result.

It exists to explain to students and sponsors how a solar race is won: by managing energy, not by flooring it. The starting car is Pitirre 3, the FSGP 2027 car of SERRT (Solar Engineering Research Racing Team, University of Puerto Rico at Mayagüez).

Created by Víctor Marrero, Project Management Division Leader, SERRT.

### What is real and what is not

| Data | Status | Source |
| --- | --- | --- |
| Dimensions (5.03 × 2.12 × 1.40 m), 3.25 m wheelbase, tyre radius, 1,000 lb design weight with driver, motor on the left-rear wheel | Documented | Mechanical PVDR, FSGP 2027 (11 Nov 2026) |
| Battery: 288 Samsung 50S cells, 32s9p, 115.2 V, 45 Ah, 5.184 kWh nominal | Documented | SERRT companies presentation |
| Drag area CdA 0.14 m², solar area 6 m², efficiencies, rolling resistance | **Assumed** | Example values in the model |
| The seven rival teams | **Fictional** | They use real school names, but their cars, strategies and results are invented |

The track layout is illustrative. This is an educational model, not a race prediction. Every value and its source is in [`data/pitirre3.json`](data/pitirre3.json).

### Run it

No dependencies and no build step. You need Node 18 or newer for the tests and Python 3 for the local server.

```bash
git clone <repo-url>
cd serrt-solar-race-lab
npm run serve      # open http://localhost:8000
```

### Verify the physics

```bash
npm test
```

The tests check battery units, charge bounds, energy carry-over between days, lap counting, pit timing, cloud and drag effects, and that the game's step-by-step race reproduces the reference simulation exactly. The model is explained in [`docs/PHYSICS.md`](docs/PHYSICS.md).

### Tech and structure

Plain JavaScript, HTML and CSS. Canvas 2D for the car, the track and the charts. No framework, no bundler.

```
site/               the site (this is what GitHub Pages publishes)
  index.html        markup and styles
  physics.js        three-day energy model (tested)
  logic.js          weather and simulated rival teams
  js/shared.js      helpers, the Pitirre 3 preset and shared state
  js/draw/          car and track drawing (canvas)
  js/ui/            garage, "Under the hood" and tabs
  js/game.js        the race: decisions, pace, standings and debrief
  assets/           logo, team photo and fonts
tests/physics.cjs   model tests
data/pitirre3.json  vehicle data with source and status
docs/PHYSICS.md     equations and assumptions
```

### License

Code is MIT licensed. The SERRT logo and team photo are not covered by that license. See [`NOTICE.md`](NOTICE.md).
