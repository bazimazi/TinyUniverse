# Architecture

Tiny Universe is a static mobile browser game with no production JavaScript dependencies. TypeScript and Vite build the app. Node 24 runs the simulation tests without a browser. Canvas 2D renders a bounded selection of bodies, with keyboard-accessible object chips and panels alongside it.

| Module | Responsibility |
| --- | --- |
| `core` | Serializable models, seeded RNG, generation defaults, configuration, tiers and invariants |
| `simulation` | Economy, orbital calculations, ecology, civilization, stars, diplomacy, construction and aggregate populations |
| `gameplay` | Validated player actions, exploration jobs, abilities, investigations, automation and rebirth |
| `persistence` | Checksummed save envelopes, migrations 1–10, primary/backup saves and storage failures |
| `rendering` | Camera scales, bounded canvas draws, hit testing and reduced motion |
| `ui` | Contextual panels, formatting, accessible controls and progressively unlocked navigation |
| `audio` | Optional locally synthesized ambience and discovery tones |

## Simulation and time

Production integrates analytically between boundaries. Live play and offline catch-up use the same engine. Exploration, investigations and construction split time at their exact deadlines. Decision boundaries occur every 30 seconds; neighboring worlds update at 120-second intervals and distant worlds at 600-second intervals. Population and ecological changes use analytical curves, rather than simulating individual organisms or people. Changing the focus can change the approximation tier; identical seeds, actions, focus and elapsed simulation time remain deterministic.

Offline time uses a persisted wall-clock high-water mark. A clock rollback awards no duplicate time. The default cap is 24 hours; permanent laws increase it to seven days. Time controls accelerate live play. Large offline returns run in a worker while the UI waits. Automation spends resources through the same validated actions and runs offline after AI is unlocked.

A session clock uses monotonic frame time for active play and detects gaps over five seconds with both frame and wall time. Those gaps use capped offline simulation at normal speed. The universe timestamp records credited time on every frame, independently of autosave frequency; stale animation-frame timestamps cannot repeat credit already awarded by an input event. Catch-up operates on an isolated state and reports net resource changes, new knowledge, population, completed expeditions/construction and recent events. Imports use the same worker path before replacing the live universe.

## Scale and persistence

Each seed describes many potential systems. At most 48 systems and 256 celestial objects become detailed state. Further surveys return aggregate data. Up to 64 galaxies store distant colony counts and populations, rather than thousands of individual entities. History, diplomacy and construction are bounded. Destroyed civilizations keep their histories and stop population/research updates.

The recorded technologies of fallen civilizations preserve player unlocks until rebirth. Expeditions select an uncharted procedural address in their destination galaxy, and refund their resource cost if the destination becomes full before arrival.

Saves retain simulation time, focus, jobs, world modifications, civilizations, unlocks, discoveries, records, laws and settings. Import checks both the envelope checksum and structural/domain invariants before replacing state. Corrupt primary saves fall back to a verified backup. When both are corrupt, automatic overwrites are blocked until the player chooses a fresh save or imports a valid backup. If storage is full, a verified primary can replace an expendable backup; export remains available.

Player actions save immediately; the 15-second autosave also captures ongoing simulation. Visibility/page-exit checkpoints preserve the last credited timestamp for the next catch-up. Return reports are session UI and do not change the save schema.

## Browser deployment

`npm run build` creates `dist`, including a content-versioned service worker that pre-caches the complete local app and simulation worker. Install/first load needs a connection; subsequent launches work offline. Deployment can use any static host with HTTPS. Relative asset paths support subdirectories. Development tools are excluded from production controls.

No external fonts, copyrighted game assets, telemetry, ads, commerce SDKs, cloud saves or multiplayer are required. Optional platform services can be introduced at the browser boundary without changing simulation rules.

## Practical limits

Orbits and stellar lifetimes use normalized game units. Large populations represent statistical abstractions. Diplomacy and ecology are deliberately compact systems; this is a playable foundation for the full product vision. Retention, balance, long-term content variety, native-store packaging, real-device battery/60-FPS targets and assistive-technology usability require product playtesting on target devices.
