# Implementation record

The empty repository has no existing engine contract. Use TypeScript, Vite and Canvas 2D for a playable mobile browser game. Simulation, gameplay, rendering, UI and persistence have separate modules. Each of the ten product phases is a runnable vertical slice and receives its own commit after build, tests, offline performance and UX checks.

## Phase 1 — Core prototype

Implemented a seeded world and star, Keplerian camera view, four resources, five meaningful upgrades, analytical idle production, a 24h offline cap, versioned checksummed saves with backup recovery, import/export, responsive UI and accessibility settings. First upgrade is affordable immediately; atmospheric and ocean development are the next objective.

Validation: `npm run check`; Chromium desktop and 390px portrait smoke tests. Future phases must retain these checks and add domain-specific tests. Performance target is a sub-2s 24h headless simulation; browser FPS requires measurement on actual target mobile hardware.

## Phase 2 — Celestial expansion

Implemented gated 45-second orbital expeditions, deterministic moons/planets/asteroids, nested orbits, climate benefits from moons, mineral outposts, selection and a fitted system camera. Exploration completion splits idle production at its exact deadline so newly discovered planets produce only after discovery. Phase 1 saves migrate automatically.

Validation: build, eight headless tests including deterministic discoveries and migration, 24h benchmark and desktop/mobile smoke tests pass.

## Remaining phase order

## Phase 3 — Life

Implemented aggregate ecological populations, condition-driven evolution, biodiversity, food-chain feedback and deterministic planetary climate events. A 30-second decision cadence is shared by live and offline simulation; production integrates analytically between decisions. Cold/dry worlds develop differently from sheltered worlds.

Validation: build, ten headless tests (including 1h live/offline equivalence and hostile environments), bounded 24h performance and responsive browser checks pass.

2. Celestial expansion: moons, planets, asteroids, exploration and selection.
3. Life: ecosystems, biodiversity, evolution and planetary events.
4. Civilization: population, traits, technology, history and collapse.

## Phase 4 — Civilization

Implemented autonomous seeded cultures and governments, trait/domain-weighted research, 17 prerequisite-linked technologies, analytical population curves, carrying capacity, stability, collapse, preserved personal timelines and following. Knowledge becomes visible only after a civilization appears.

Validation: formation, population growth, technology, history, collapse and live/offline determinism tests; build, performance and portrait/desktop smoke checks.
5. Influence: environment, gravity, gifts and civilization interventions.
6. Star systems: stars, stellar lifecycle, interstellar exploration and remnants.
7. Galaxy: lazy procedural systems, simulation tiers and autonomous expansion.
8. Advanced civilizations: diplomacy, archetypes, megastructures and technology.
9. Discovery: rare events, ruins, codex and exploration chains.
10. Prestige: rebirth, knowledge, laws, modifiers and endless progression.
