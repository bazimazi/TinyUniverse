# Architecture

Tiny Universe is a static mobile browser game with no production JavaScript dependencies. TypeScript and Vite build the app. Node 24 runs the simulation tests without a browser. Canvas 2D renders a bounded selection of bodies, with keyboard-accessible object chips and panels alongside it.

| Module | Responsibility |
| --- | --- |
| `core` | Serializable models, seeded RNG, generation defaults, configuration, tiers and invariants |
| `simulation` | Economy, orbital calculations, ecology, civilization, stars, diplomacy, construction and aggregate populations |
| `gameplay` | Validated player actions, exploration jobs, abilities, investigations, automation and rebirth |
| `persistence` | Checksummed save envelopes, migrations 1–12, primary/backup saves and storage failures |
| `rendering` | Camera scales, bounded canvas draws, hit testing and reduced motion |
| `ui` | Contextual panels, formatting, accessible controls and progressively unlocked navigation |
| `audio` | Optional locally synthesized ambience and discovery tones |

## Simulation and time

Production integrates analytically between boundaries. Live play and offline catch-up use the same engine. Exploration, investigations, construction and warned flares split time at their exact deadlines. Decision boundaries occur every 30 seconds; neighboring worlds update at 120-second intervals and distant worlds at 600-second intervals. Population and ecological changes use analytical curves, rather than simulating individual organisms or people. Changing the focus can change the approximation tier; identical seeds, actions, focus and elapsed simulation time remain deterministic.

Evolution and research estimates share rate functions with the engine. They describe current conditions in universe time, rather than promising a fixed completion date. The 32-seed active-care playthrough checks opening milestones and interstellar access; its policy and results are recorded separately from human playtesting.

Influence panels, actions and automation share read-only readiness checks before spending. Orbital push and pull share recovery and scale period and climate by the actual change in radius, bounded to normalized radii 60–800 and periods of at least one second. Existing gravity and cooldown saves retain their meaning. Captures remain local to their system and preserve reciprocal orbit links.

Offline time uses a persisted wall-clock high-water mark. A clock rollback awards no duplicate time. The default cap is 24 hours; permanent laws increase it to seven days. Time controls accelerate live play. Large offline returns run in a worker while the UI waits. Automation spends resources through the same validated actions and runs offline after AI is unlocked. Its read-only plans also provide UI status: unavailable expedition destinations fall back, reachable trips reserve their costs, development picks affordable unfinished upgrades in the selected system, and research inspiration retains a 200-knowledge reserve. Automation decisions occur every 60 seconds of universe time.

While exploration waits to launch, development, aid, research and mining retain its resource budget, spending surplus or unrelated resources. Research also retains at least 200 knowledge. Mining establishes one outpost per minute, prioritizing selection, local systems, deposit size and finally stable object IDs. It shares costs/rewards with manual mining. Outposts and their continuous income are included in return summaries. Schema 11 adds the optional mining toggle, disabled when migrating versions 1–10; rebirth restores all automation defaults.

A session clock uses monotonic frame time for active play and detects gaps over five seconds with both frame and wall time. Those gaps use capped offline simulation at normal speed. The universe timestamp records credited time on every frame, independently of autosave frequency; stale animation-frame timestamps cannot repeat credit already awarded by an input event. Catch-up operates on an isolated state and reports net resource changes, new knowledge, population, completed expeditions/construction and recent events. Imports use the same worker path before replacing the live universe.

Catch-up validates input and output state and checks worker credit against the exact requested gap, cap and timestamp. Worker transport failures or a 15-second timeout terminate the worker and run the same bounded engine on the untouched clone; late replies are ignored. Simulation/validation failures reject atomically. A failed saved return pauses simulation and saving while allowing export, inspection, backup import or retry, preserving the original timestamp until recovery. A failed import leaves the current universe playable. The inline fallback uses the main thread.

## Scale and persistence

Schema 12 saves each star’s activity clock, pending flare deadline and suppression expiry. Versions 1–11 initialize activity at the saved simulation time, preserving previous climate, shelters, technology and automation. New systems initialize their clock at discovery. Every 900 seconds, seeded checks may warn of a flare arriving 90 seconds later. Red dwarfs, blue stars and giants are more active; the unstable-stars modifier doubles the chance. Remnants stop activity. Atmosphere and magnetic fields soften heat, atmosphere loss and ecosystem damage; planetary shields or stellar suppression prevent damage. Suppression never changes stellar aging. Witnessed and suppressed flares create separate deduplicated Codex records.

Civilization context prefers an active owner over a world’s historical record. Colonies share gifts, inspiration and their civilization’s recovery timer. Construction can target home or settled colony systems; remote sites require that civilization’s own Interstellar travel research. UI, manual actions and autonomous construction share readiness checks. Structure lookup uses civilization, type and system, preserving legacy IDs and preventing duplicates at another colony in the same system. Civilizations start at most one autonomous project per diplomacy update, checking their home system before colonies. Mediation applies trust/status changes immediately, retains both histories and refuses archived or fully trusted agreements. Diplomacy skips participants that collapsed earlier in the same update.

Each seed describes many potential systems. At most 48 systems and 256 celestial objects become detailed state. Further surveys return aggregate data. Up to 64 galaxies store distant colony counts and populations, rather than thousands of individual entities. History, diplomacy and construction are bounded. Destroyed civilizations keep their histories and stop population/research updates.

The recorded technologies of fallen civilizations preserve player unlocks until rebirth. Expeditions select an uncharted procedural address in their destination galaxy, and refund their resource cost if the destination becomes full before arrival.

Saves retain simulation time, focus, jobs, world modifications, civilizations, unlocks, discoveries, records, laws and settings. Import checks both the envelope checksum and structural/domain invariants before replacing state. Corrupt primary saves fall back to a verified backup. When both are corrupt, automatic overwrites are blocked until the player chooses a fresh save or imports a valid backup. If storage is full, a verified primary can replace an expendable backup; export remains available.

Player actions save immediately; the 15-second autosave also captures ongoing simulation. Visibility/page-exit checkpoints preserve the last credited timestamp for the next catch-up. Return reports are session UI and do not change the save schema.

## Browser deployment

`npm run build` creates `dist`, including a content-versioned service worker that pre-caches the complete local app and simulation worker. Install/first load needs a connection; subsequent launches work offline. Deployment can use any static host with HTTPS. Relative asset paths support subdirectories. Development tools are excluded from production controls.

No external fonts, copyrighted game assets, telemetry, ads, commerce SDKs, cloud saves or multiplayer are required. Optional platform services can be introduced at the browser boundary without changing simulation rules.

The scene caches its static star field at the canvas device-pixel ratio. Viewport intersection stops off-screen drawing without stopping simulation; reduced-motion rendering runs at about 4 Hz and reacts immediately to view/selection/zoom changes. Portrait navigation remains within thumb reach at the bottom of the viewport, with safe-area spacing. Accessible world chips prioritize the selected object and its system before remote favorites, while retaining a 40-item limit.

## Practical limits

Orbits and stellar lifetimes use normalized game units. Large populations represent statistical abstractions. Diplomacy and ecology are deliberately compact systems; this is a playable foundation for the full product vision. Retention, balance, long-term content variety, native-store packaging, real-device battery/60-FPS targets and assistive-technology usability require product playtesting on target devices.
