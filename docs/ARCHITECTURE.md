# Architecture

Tiny Universe is a static mobile browser game with no production JavaScript dependencies. TypeScript and Vite build the app. Node 24 runs the simulation tests without a browser. Canvas 2D renders a bounded selection of bodies, with keyboard-accessible object chips and panels alongside it.

| Module | Responsibility |
| --- | --- |
| `core` | Serializable models, seeded RNG, generation defaults, configuration, tiers and invariants |
| `simulation` | Economy, orbital calculations, ecology, civilization, stars, diplomacy, construction and aggregate populations |
| `gameplay` | Validated player actions, exploration jobs, abilities, investigations, automation and rebirth |
| `persistence` | Checksummed save envelopes, migrations 1–13, primary/backup saves and storage failures |
| `rendering` | Camera scales, bounded canvas draws, hit testing and reduced motion |
| `ui` | Contextual panels, formatting, accessible controls and progressively unlocked navigation |
| `audio` | Optional locally synthesized ambience and discovery tones |

## Simulation and time

Production integrates analytically between boundaries. Live play and offline catch-up use the same engine. Exploration, investigations, construction, warned flares and debris impacts split time at their exact deadlines. Decision boundaries occur every 30 seconds; neighboring worlds update at 120-second intervals and distant worlds at 600-second intervals. Population and ecological changes use analytical curves, rather than simulating individual organisms or people. Changing the focus can change the approximation tier; identical seeds, actions, focus and elapsed simulation time remain deterministic.

Evolution and research estimates share rate functions with the engine. They describe current conditions in universe time, rather than promising a fixed completion date. The 32-seed active-care playthrough checks opening milestones and interstellar access; its policy and results are recorded separately from human playtesting.

Civilization population capacity combines its home world, distinct colonies and completed owned orbital habitats. Living conditions, food, solar collection and research gravity are weighted by each settlement’s capacity. Habitats add one million capacity each, with controlled habitability and food at 0.8 and gravity at 1. Population, stability and research remain shared across the civilization; healthy colonies or habitats can prevent collapse on a hostile home world. Unfinished or foreign habitats provide no support, and completing construction cannot revive a fallen civilization. These values derive from existing records without new save fields or moving the home world.

The engine counts completed habitats once per civilization update and uses a numerically stable analytical population curve. Ownership checks return the active owner directly, and Codex updates skip previously recorded entries before creating descriptions. The 24-hour automation benchmark exercises completed habitats alongside exploration, mining and construction within the existing two-second budget.

Influence panels, actions and automation share read-only readiness checks before spending. Orbital push and pull share recovery and scale period and climate by the actual change in radius, bounded to normalized radii 60–800 and periods of at least one second. Existing gravity and cooldown saves retain their meaning. Captures remain local to their system and preserve reciprocal orbit links.

Offline time uses a persisted wall-clock high-water mark. A clock rollback awards no duplicate time. The default cap is 24 hours; permanent laws increase it to seven days. Time controls accelerate live play. Large offline returns run in a worker while the UI waits. Automation spends resources through the same validated actions and runs offline after AI is unlocked. Its read-only plans also provide UI status: unavailable expedition destinations fall back, reachable trips reserve their costs, development picks affordable unfinished upgrades in the selected system, and research inspiration retains a 200-knowledge reserve. Automation decisions occur every 60 seconds of universe time.

While exploration waits to launch, development, aid, research and mining retain its resource budget, spending surplus or unrelated resources. Research also retains at least 200 knowledge. Mining establishes one outpost per minute, prioritizing selection, local systems, deposit size and finally stable object IDs. It shares costs/rewards with manual mining. Outposts and their continuous income are included in return summaries. Schema 11 adds the optional mining toggle, disabled when migrating versions 1–10; rebirth restores all automation defaults.

A session clock uses monotonic frame time for active play and detects gaps over five seconds with both frame and wall time. Those gaps use capped offline simulation at normal speed. The universe timestamp records credited time on every frame, independently of autosave frequency; stale animation-frame timestamps cannot repeat credit already awarded by an input event. Catch-up operates on an isolated state and reports net resource changes, new knowledge, population, completed expeditions/construction and recent events. Imports use the same worker path before replacing the live universe.

Catch-up validates input and output state and checks worker credit against the exact requested gap, cap and timestamp. Worker transport failures or a 15-second timeout terminate the worker and run the same bounded engine on the untouched clone; late replies are ignored. Simulation/validation failures reject atomically. A failed saved return pauses simulation and saving while allowing export, inspection, backup import or retry, preserving the original timestamp until recovery. A failed import leaves the current universe playable. The inline fallback uses the main thread.

## Scale and persistence

Schema 12 saves each star’s activity clock, pending flare deadline and suppression expiry. Versions 1–11 initialize activity at the saved simulation time, preserving previous climate, shelters, technology and automation. New systems initialize their clock at discovery. Every 900 seconds, seeded checks may warn of a flare arriving 90 seconds later. Red dwarfs, blue stars and giants are more active; the unstable-stars modifier doubles the chance. Remnants stop activity. Atmosphere and magnetic fields soften heat, atmosphere loss and ecosystem damage; planetary shields or stellar suppression prevent damage. Suppression never changes stellar aging. Witnessed and suppressed flares create separate deduplicated Codex records.

Schema 13 adds an asteroid activity clock, trajectory status, threatened world and exact impact deadline. Versions 1–12 initialize quiet asteroid state at the saved simulation time, preserving existing mining and orbital captures. New asteroid discoveries start their activity clock on discovery. Every 900 seconds, an unsecured orbiting asteroid has an 8% seeded chance of warning about debris reaching a planet in its system 120 seconds later. Captured companions, secured trajectories and spent showers cannot schedule another threat.

Debris impacts warm their target, reduce atmosphere and water, and disrupt its food web. Shared population and stability losses scale with the world’s share of the civilization’s settlement capacity, including completed habitats. Severe losses can collapse a civilization and create its recoverable archive. Spaceflight deflection and orbital capture clear the warning; planetary shelter must extend beyond the deadline to intercept it. Each shower resolves once, retaining the asteroid, orbital links and mining income. Successful protection and witnessed impacts add distinct Codex entries and affected civilization histories. Import checks reject missing activity state, incompatible statuses, invalid targets, cross-system trajectories and impossible deadlines. The engine scans stellar and asteroid deadlines together without separate temporary arrays.

Civilization context prefers an active owner over a world’s historical record. Colonies share gifts, inspiration and their civilization’s recovery timer. Construction can target home or settled colony systems; remote sites require that civilization’s own Interstellar travel research. UI, manual actions and autonomous construction share readiness checks. Structure lookup uses civilization, type and system, preserving legacy IDs and preventing duplicates at another colony in the same system. Civilizations start at most one autonomous project per diplomacy update, checking their home system before colonies. Mediation applies trust/status changes immediately, retains both histories and refuses archived or fully trusted agreements. Diplomacy skips participants that collapsed earlier in the same update.

Each seed describes many potential systems. At most 48 systems and 256 celestial objects become detailed state. Further surveys return aggregate data. Up to 64 galaxies store distant colony counts and populations, rather than thousands of individual entities. History, diplomacy and construction are bounded. Destroyed civilizations keep their histories and stop population/research updates.

The recorded technologies of fallen civilizations preserve player unlocks until rebirth. Expeditions select an uncharted procedural address in their destination galaxy, and refund their resource cost if the destination becomes full before arrival.

Collapse records one named ancient-ruins investigation at the civilization’s home world. The existing anomaly records hold its survey, permanent branch choice and exact deadline; its address includes the universe seed, rebirth count and civilization ID. Discovery updates backfill archives for older fallen civilizations when a slot is available. Ruins share the 64-signal limit with exploration anomalies and never replace existing investigations. No save fields or version change are needed.

Investigation actions and UI share read-only stage, choice and affordability checks. Imports reject impossible stage/choice combinations and archives above the bound. Resolution awards resources within the existing resource cap and an enduring artifact once. Preserving ruins restores aggregate ecology; decoding recovers materials and can assist an active research project belonging to the living owner of the site, including a colony owner. Recovery appends to the fallen civilization’s history without restarting its population or research. Rebirth retains Codex records and artifacts while clearing local investigations.

Saves retain simulation time, focus, jobs, world modifications, civilizations, unlocks, discoveries, records, laws and settings. Import checks both the envelope checksum and structural/domain invariants before replacing state. Corrupt primary saves fall back to a verified backup. When both are corrupt, automatic overwrites are blocked until the player chooses a fresh save or imports a valid backup. If storage is full, a verified primary can replace an expendable backup; export remains available.

Player actions save immediately; the 15-second autosave also captures ongoing simulation. Visibility/page-exit checkpoints preserve the last credited timestamp for the next catch-up. Return reports are session UI and do not change the save schema.

## Browser deployment

`npm run build` creates `dist`, including a content-versioned service worker that pre-caches the complete local app and simulation worker. Install/first load needs a connection; subsequent launches work offline. Deployment can use any static host with HTTPS. Relative asset paths support subdirectories. Development tools are excluded from production controls.

No external fonts, copyrighted game assets, telemetry, ads, commerce SDKs, cloud saves or multiplayer are required. Optional platform services can be introduced at the browser boundary without changing simulation rules.

The scene caches its static star field at the canvas device-pixel ratio. Viewport intersection stops off-screen drawing without stopping simulation; reduced-motion rendering runs at about 4 Hz and reacts immediately to view/selection/zoom changes. Portrait navigation remains within thumb reach at the bottom of the viewport, with safe-area spacing. Accessible world chips prioritize the selected object and its system before remote favorites, while retaining a 40-item limit.

## Practical limits

Orbits and stellar lifetimes use normalized game units. Large populations represent statistical abstractions. Diplomacy and ecology are deliberately compact systems; this is a playable foundation for the full product vision. Retention, balance, long-term content variety, native-store packaging, real-device battery/60-FPS targets and assistive-technology usability require product playtesting on target devices.
