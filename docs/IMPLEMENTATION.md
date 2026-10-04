# Implementation record

All ten requested development phases were implemented in order as runnable slices, with a separate commit for each. The original empty repository had no engine contract; the implementation uses TypeScript, Vite and Canvas for a mobile-first browser game.

| Phase | Delivered slice | Commit |
| --- | --- | --- |
| 1. Core prototype | Seeded planet/star, resources, upgrades, camera, idle/offline progression, save/load and responsive UI | `570c2de` |
| 2. Celestial expansion | Timed deterministic exploration, moons, planets, nested orbits, asteroids, mining and selection | `1e62d08` |
| 3. Life | Aggregate ecosystems, biodiversity, evolution, food-web feedback and planetary events | `bd64161` |
| 4. Civilization | Autonomous cultures, population, 17 technologies, traits, research domains, timelines, following and collapse | `7ac57f9` |
| 5. Player influence | Nine costed abilities, cooldowns, gravity, orbital capture, gifts, shielding, research influence and debug tools | `278e910` |
| 6. Star systems | Interstellar exploration, seeded systems, stellar classes/lifecycles, gas giants and mass-dependent remnants | `77d9d71` |
| 7. Galaxy | Lazy galaxy catalogs, simulation tiers, aggregate populations, colonization, camera scales and statistics atlas | `990e122` |
| 8. Advanced civilizations | Archetypes, contact/trade/alliances/war, mediation, industry and four megastructure types | `192c9c8` |
| 9. Discovery | Rare signals, branching investigations, ancient records, codex, artifacts, 120 milestones and personal records | `973eadd` |
| 10. Prestige / endgame | Rebirth, Cosmic Knowledge, four laws, five modifiers, new seeds/start conditions, continuous meta production, late anomalies and AI automation | `c7342ac` |

Phase 10 also completes production offline caching, optional local audio, accessibility settings, renaming/favorites, progressive menus, worker catch-up, save validation/migrations, CI and final UX/performance fixes.

## Validation

Each phase passed its build, domain tests, headless performance check and desktop/portrait browser regression gates before being committed. Final coverage:

- 40 headless tests: generation, production/costs, clock rollback, offline caps, orbits, ecosystem/population/research behavior, collapse/colonization, interventions/capture, construction, diplomacy, discoveries, rebirth, all save versions 1-9, corruption and quota handling.
- 8 Chromium browser checks across desktop and 390px portrait: first upgrades, settings/reload, civilization following/influence, atlas/codex, renaming/favorites, large text, seed input/rebirth and worker catch-up.
- 2 production checks: cached launch with the network disabled, optional audio and absence of developer controls.
- A deliberately played ten-minute simulation reaches a moon within three minutes and intelligent life/civilization within ten minutes.
- A 24-hour benchmark with 48 detailed systems, 144 generated objects and 64 galaxy summaries completes in approximately 0.9 seconds on this development machine; resulting state is about 1.13 MB. The automated budget is two seconds.
- Desktop and portrait screenshots were visually reviewed. Mobile viewport emulation does not establish performance on a physical phone.

## Review outcomes

Fixed repeated civilization/planet scans with an occupancy index; cached diplomacy counts; retained open histories and seed inputs during panel refresh; avoided replacing controls mid-click; made construction and investigation deadlines exact; corrected cross-system capture links and extinct-age records; validated imports before simulation; preserved corrupt saves; reclaimed expendable backup space on quota pressure; and fixed cached asset matching for offline production loads.

The remaining product work is balancing, retention/playtesting, richer content and verification on target mobile hardware. Native-store packaging and astronomical-precision physics are outside this browser implementation.

## Follow-up phase 11: progression safeguards

Interstellar expeditions now choose the first uncharted procedural address in their destination galaxy. Galactic expeditions skip known reaches. At the detailed-world limit, distant surveys award knowledge; fully charted destinations stop accepting expedition costs. An expedition refunds its costs if its region fills before arrival. Procedural generation also enforces address and capacity limits directly, and imports reject invalid expedition origins and schedules.

Player technology unlocks retain the recorded knowledge of fallen civilizations until rebirth. Extinct civilizations cannot build or resume research. Exploration controls reflect capacity limits, and expedition messages describe their destination.

Validation: 46 headless tests, eight desktop/portrait browser checks, two production offline-launch checks, production build and the 24-hour benchmark. Six new regression tests cover destination collisions, bounds, refunds, aggregate surveys, collapse/rebirth unlocks and invalid expedition schedules. The benchmark completed in approximately 1.3 seconds on this machine.

Phase 11 commit: `173c13d`.

## Follow-up phase 12: time recovery and return summaries

Long frame/wall-clock gaps now use capped offline catch-up at normal speed. Live timestamps track credited simulation rather than the last autosave, and stale animation frames cannot double-count time already credited by input events. Catch-up works on an isolated state; save imports use the worker for large returns before replacing the current universe. Scene and action mutations are blocked while catch-up runs. Player actions save immediately.

The return card shows net resource changes (including automation spending), population, newly recorded technology, new civilizations/collapse, expeditions, construction, Codex entries and recent moments. It can be dismissed or used to open the journal. Civilization histories keep their expanded state when following reorders cards. The home link respects relative deployment paths. Existing save versions remain compatible.

Validation: 52 headless tests, 14 desktop/portrait browser checks and two production offline checks, plus the production build and 24-hour benchmark. New coverage exercises atomic catch-up, caps, costs in reports, escaping, stale frames, accelerated live time followed by a stall, worker imports, rejected imports and reordered histories. Production checks also import a large save and load the cached worker with the network disabled. Return summaries were visually reviewed at desktop and 390px portrait widths. The final 24-hour benchmark completed in approximately 0.9 seconds on this machine. Browser time jumps use [Playwright's documented Clock API](https://playwright.dev/docs/clock).

Phase 12 commit: `2ec69c0`.

## Follow-up phase 13: progression feedback and repeatable playthroughs

Suggested steps now open the relevant world and panel. First-moon guidance appears immediately after two upgrades; later climate changes no longer restart introductory guidance. Early civilization collapse offers a path to a fresh world. Evolution and civilization research show progress and estimates using the simulation's own rate functions. Upgrade cards show readiness and waiting estimates at current production. Estimates describe current conditions and universe time; future climate, support, population and production changes can change them.

`npm run playtest` runs a repeatable four-hour active-care policy over 32 fixed seeds without debug resources, gifts or time acceleration. It also runs in `npm run check` / CI. Every sampled opening found a moon at 70 seconds and a civilization at 510 seconds. Spaceflight ranged from 1,710 to 4,230 seconds; a second system from 2,825 to 4,350 seconds; a galaxy from 5,150 to 9,240 seconds. Thirty of 32 runs reached the rebirth gate within four hours. This policy is a regression baseline, not human retention testing or a guarantee for every player strategy; no balance constants were changed without evidence.

Validation: 58 headless tests, 16 desktop/portrait browser checks, two production offline checks, production build, 24-hour benchmark and 32-seed playthrough gates. New tests cover early pacing, affordability, shared evolution/research rates, support/laws, cold late worlds, collapse recovery and suggested-step navigation.

Phase 13 commit: `de23348`.

## Follow-up phase 14: mobile navigation and economical rendering

Portrait panel navigation stays at the bottom of the viewport with safe-area spacing. Choosing a panel reveals its controls and keeps its navigation button in view. A keyboard skip link jumps directly to game controls. Selected worlds and their local neighbors now take precedence over remote favorites in the bounded world list; the selected object cannot disappear behind 40 favorites.

The canvas reuses a rasterized star background. [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) pauses drawing outside the viewport, while production and UI updates continue. Reduced-motion scenes redraw about four times per second, with immediate updates for zoom, selection, view changes and resize. Returning to the scene draws current state. Stale canvas hits cannot select an object missing from a replacement universe.

Validation: 60 headless tests, 20 desktop/portrait browser checks, two production offline checks, production build, 24-hour benchmark and 32-seed playthrough gates. Browser instrumentation confirms off-screen drawing stops without pausing production, resumes on return, and drops to 3–5 draws per second with reduced motion. Crowded favorites, late navigation, large text and viewport overflow are covered. Initial and late-game layouts were reviewed at desktop and 390px portrait sizes. This verifies browser behavior; battery usage and frame rate still require measurement on physical phones.

Phase 14 commit: `d0d28ff`.

## Follow-up phase 15: reliable autonomous management

Exploration automation falls back when technology or a charting limit makes its preferred destination unavailable. It saves resources for the preferred reachable expedition rather than continually spending them on cheaper trips. Manual and automatic expeditions share destination checks. Development balances affordable, unfinished upgrades on the selected world, or a planet in the selected system, and stops at the upgrade cap.

Research assistance keeps at least 200 knowledge in reserve across multiple civilizations, skips already funded projects and respects cooldowns. Civilization assistance skips terraforming that would have no meaningful effect. Each automation shows its next action or reason for waiting, including while a checkbox has focus. AI makes these controls accessible even before spaceflight; toggles persist and run every minute of universe time, including offline.

Validation: 68 headless tests, 22 desktop/portrait browser checks, two production offline checks, production build, 24-hour benchmark and 32-seed playthrough gates. New regressions cover charting capacity, unlock/resource fallbacks, selected-system development, capped upgrades, reserves, cooldowns, extinct civilizations, escaped world names, saved toggles and matching live/offline decisions. Resource totals agree within floating-point tolerance. Automation controls were visually reviewed at desktop and 390px portrait sizes.

Phase 15 commit: `61b77a2`.

## Follow-up phase 16: recoverable offline failures

Offline catch-up validates its source and completed state on both worker and inline paths. Invalid timestamps are rejected before time or resources change. Worker replies must match the requested interval, offline cap and wall-clock high-water mark. Simulation errors and incomplete or invalid replies reject cleanly without replacing the live universe. Every worker completion releases handlers and the timeout.

Worker construction, loading, message-transfer and decoding failures fall back to the same bounded simulation on an untouched clone. A worker that has not replied after 15 seconds is terminated and falls back; late messages cannot apply a second result. The fallback runs on the main thread, so very large returns can briefly delay interaction when workers are unavailable.

When a saved return actually fails simulation, a persistent recovery card pauses progression and protects the save. Export, Settings and retry remain available; a successful retry credits the original gap exactly once and resumes saving. Failed imports preserve the playable current universe. Existing save schemas remain compatible.

Validation: 74 headless tests, 28 desktop/portrait browser checks, four production offline checks, production build, 24-hour benchmark and 32-seed playthrough gates. Tests cover worker failures and timeouts, late replies, validation failures, capped/rolled-back clocks, blocked asset requests, paused save protection, escaping, exports, successful retry and failed-import isolation. Production checks restore a large save without a network when workers are unavailable. Recovery cards were visually reviewed at desktop and 390px portrait sizes. The 24-hour benchmark completed in approximately one second on this machine; physical-phone performance remains unverified.

Phase 16 commit: `1cb755e`.

## Follow-up phase 17: orbital pull and consistent influence

The planned orbital pull moves a planet inward, warms its climate and shortens its period. It shares a 90-second recovery with orbital push, including cooldowns in older saves. Both directions show radius and temperature previews and use their actual bounded movement to calculate period and climate. Planet orbits stop at radii 60–800 in normalized game units, with a one-second minimum period. Gravity changes preserve the minimum period of companions.

Manual controls, actions and civilization automation now share influence readiness checks. Settled terraforming, capped gravity, existing shelter/support, funded research, incorrect targets and unavailable orbits cannot charge resources or start cooldowns. Capture supports parentless asteroids, preserves existing planetary companions and requires a planet in the same system. Unknown and inherited action names are rejected before spending. Gift support is extended without shortening existing aid.

Validation: 81 headless tests, 30 desktop/portrait browser checks, four production offline checks, production build, 24-hour benchmark and 32-seed playthrough gates. Regressions cover clipped movement, push/pull reversal and shared recovery, legacy cooldown saves, bounds, hot climates, minimum periods, rejected-action atomicity, parentless capture, planetless systems and read-only readiness. Browser checks verify previews, disabled capped actions, saved movement and recovery after reload. Influence cards were visually reviewed at desktop and 390px portrait sizes.

Phase 17 commit: `1228aee`.

## Follow-up phase 18: automatic mining and expedition budgets

AI unlocks optional automatic asteroid mining. Each minute it establishes one outpost, prioritizing the selected asteroid, other local asteroids, then the richest remaining deposit elsewhere. It uses the manual action's costs and awards the deposit once, capped at the resource limit, followed by continuous mineral production. Exploration cards show recoverable minerals or an active outpost; offline summaries count newly established outposts and include their costs and income.

While an automatic expedition waits to launch, other automations retain its required resources. They can still spend unrelated resources, and spend surplus above the reservation. Research keeps the larger of its 200-knowledge reserve and the waiting expedition's knowledge budget. Waiting status explains reserved funds. After launch, the job's costs are already paid and its reservation ends. Manual actions remain player-controlled.

Save schema 11 adds the mining toggle. Versions 1–10 migrate with mining disabled, preserving existing preferences and progression. New saves validate the toggle strictly, exports retain it, and rebirth resets it along with the other local automation choices.

Validation: 89 headless tests, 32 desktop/portrait browser checks, four production offline checks, production build, two 24-hour benchmarks and 32-seed playthrough gates. Regressions cover target priority, resource costs, one-time rewards, continuous income, all automation reservations, unrelated spending, migration/preferences, invalid toggles, rebirth and return totals. Browser checks verify migration, opting in, saved outposts and reload; production tests run mining through the cached worker with the network disabled. Mining and return cards were visually reviewed at desktop and 390px portrait widths. The benchmark with 48 detailed systems, 64 galaxies, 160 objects, every automation enabled and 16 mined asteroids completed in approximately 1.4 seconds on this machine, within the two-second budget. Physical-phone performance remains unverified.

Phase 18 commit: `b814066`.

## Follow-up phase 19: colonies and responsive diplomacy

Civilization cards list colonies and let players visit them. Research, Influence and construction controls resolve the living owner of a settled world, even when the world also retains an extinct civilization’s record. Gifts and inspiration support that owner from any colony, share recovery across its worlds and record the recipient world in its history. Construction explicitly identifies the civilization’s home system. Imported names and traits are escaped in these cards.

Mediation raises trust, immediately updates war/trade/alliance status and records the intervention in both histories. Its controls and action share readiness checks; archived relationships, maximum trust, invalid identifiers and insufficient funds cannot charge resources. Archived agreements retain their last recorded status. A civilization that collapses during one conflict is excluded from subsequent pairs in the same diplomacy update.

Validation: 94 headless tests, 34 desktop/portrait browser checks, four production offline checks, production build, both 24-hour benchmarks and 32-seed playthrough gates. New regressions cover immediate peace/alliance, saved agreements, rejected-action atomicity, collapse during diplomacy, colony ownership, shared recovery after save/reload and escaped imported text. Colony and diplomacy cards were visually reviewed at 390px portrait width. Existing save schema 11 remains compatible; progression balance is unchanged.

Phase 19 commit: `27e54a2`.

## Follow-up phase 20: stellar activity and flare suppression

Living stars make deterministic activity checks every 15 minutes of universe time, starting after the opening ten minutes. A flare gives 90 seconds of warning and arrives at its exact deadline during active or offline play. Exposed worlds warm slightly, lose a little atmosphere and experience ecosystem disruption; magnetic fields and atmospheres soften damage. Planetary shelter prevents damage to its world. Fusion unlocks Suppress flare, costing 1,200 energy and 60 knowledge for ten minutes of system-wide protection, with a five-minute recovery. Remnants stop activity and suppression cannot delay stellar aging. Red dwarfs, blue stars and giants are more active; the unstable-stars modifier also doubles flare probability.

Develop and Influence show warnings, protection coverage and remaining suppression. Explore adds direct star navigation, and star selections put suppression first in Influence. Civilization histories record affected settled worlds; the journal and return summary retain hazard events. Witnessing and suppressing flares add distinct, deduplicated Codex discoveries.

Save schema 12 persists activity clocks, warning deadlines and protection. Versions 1–11 initialize stellar activity at the saved time without replaying earlier hazards or changing existing worlds, shelters or automation. Newly discovered stars start their clock on discovery. Imports reject missing or impossible activity state before simulation.

Validation: 105 headless tests, 36 desktop/portrait browser checks, four production offline checks, production build, both 24-hour benchmarks and 32-seed playthrough gates. New coverage exercises exact deadlines, seeded warnings, natural protection, local shelter/expiry, suppression/costs/recovery, remnants, isolated systems, saved warnings, live/offline agreement, migration and Codex persistence. Cached production workers and worker fallback both resolve pending flares with the network disabled. Warning and suppression cards were visually reviewed at desktop and 390px portrait widths. Every sampled opening still finds its moon at 70 seconds and its civilization at 510 seconds. The full automation 24-hour benchmark completed in approximately 1.4 seconds on this development machine, within the two-second budget; physical-phone performance remains unverified.

Phase 20 commit: `d7e665a`.

## Follow-up phase 21: construction across colony systems

Players can support megastructures in the selected settled world’s system. Remote sites require the owning civilization’s own Interstellar travel research. Civilizations can have one structure of each kind per system; choosing another colony in that system cannot duplicate it. Existing home structures and legacy IDs remain valid, and new remote IDs retain their site through save/reload. Construction histories identify the system. Black-hole collectors now have useful remote sites without requiring their civilization to originate there.

Read-only readiness checks drive the UI, manual construction and autonomous industry spending. They reject invalid or inherited action names, extinct owners, unsettled targets, missing technology, wrong star types, duplicates, occupied addresses, resource shortages and the global 64-structure limit before any cost or event. Autonomous civilizations check their home system and then colonies, skip unsuitable sites and start at most one successful project per update.

Validation: 111 headless tests, 38 desktop/portrait browser checks, four production offline checks, production build, both 24-hour benchmarks and 32-seed playthrough gates. New regressions cover remote construction, same-system duplicates, legacy IDs, changed home systems, black-hole requirements, rejected-action atomicity, autonomous fallback/industry costs, exact offline completion and the global limit. Colony construction cards were visually reviewed at desktop and 390px portrait widths. Save schema 12 remains compatible.

Phase 21 commit: `0ee86be`.

## Follow-up phase 22: colony and habitat population support

Colonies and completed owned orbital habitats now contribute to their civilization’s population capacity and living conditions. Each habitat supports up to one million people with controlled habitability and food. Planetary capacity retains its existing calculation; shared habitability, food, solar collection and research gravity are weighted by settlement capacity. Healthy settlements can sustain a civilization whose home world has become hostile. Unfinished and foreign habitats provide no capacity, duplicate colony references cannot add capacity twice, and completing a habitat cannot revive a civilization that already collapsed.

Life cards show total potential population capacity, settled worlds and completed orbital habitats. Population, stability and research remain shared; the home world does not move. Existing schema 12 saves gain support from their recorded colonies and habitats without migration or new fields.

Profiling kept the large offline simulations within their existing two-second budget. Habitat counts are collected once per update, ownership queries return directly, and known Codex records skip repeated description work. A numerically stable analytical curve also keeps extreme imported populations finite at zero growth. The automation benchmark now requires completed habitats so it exercises the new support model.

Validation: 118 headless tests, 40 desktop/portrait browser checks and four production offline checks, plus the production build, both 24-hour benchmarks and 32-seed playthrough gates. New tests cover capacity weighting, research gravity, colony resilience, habitat ownership and exact completion, save round trips, extreme population values and live/offline agreement. Browser checks verify support through offline completion and reload; the cached production worker sustains a civilization on a hostile home world with the network disabled. Support cards were visually reviewed at desktop and 390px portrait widths. Every sampled opening still finds its moon at 70 seconds and its civilization at 510 seconds. The baseline and full automation benchmarks completed in approximately 0.93 and 1.25 seconds on this development machine; the latter included 63 completed habitats. Physical-phone performance remains unverified.

Phase 22 commit: `17f3e5b`.

## Follow-up phase 23: recoverable civilization legacies

Collapse now leaves a named archive at the civilization’s home world. Life links directly to its legacy in Discoveries; recovery and its branch choice remain in the fallen civilization’s personal history. Existing fallen civilizations gain archives on the next discovery update. Archive addresses include the universe seed and rebirth count, so repeated universes retain distinct records. Ruins share the existing 64-signal limit without replacing other investigations; Life explains a full archive.

A 60-second survey reveals a permanent choice, followed by 90 seconds of investigation. Preservation adds 120 biological resources, 180 evolution progress and restores ecosystem abundance by up to ten percentage points. Decoding recovers 250 minerals and 60 exotic matter, and adds 500 research to a living owner with an active project, including a colony owner. Both branches recover an enduring artifact and the existing knowledge reward, which scales with rebirths. The fallen civilization remains extinct. Resources respect their existing caps, and artifacts cannot be awarded twice.

Investigation controls now show costs, duration, rewards and unavailable actions before spending. Shared read-only readiness checks reject inherited or missing identifiers, invalid choices, premature branching, incompatible stages, repeated actions and insufficient resources atomically. Import validation also rejects impossible stage/choice combinations and oversized signal archives. Existing valid schema 12 saves remain compatible; generic exploration signals retain their branch rewards, with research assistance going to the current active owner rather than banking for idle or fallen civilizations.

Validation: 128 headless tests, 44 desktop/portrait browser checks and six production offline checks, plus the production build, both 24-hour benchmarks and 32-seed playthrough gates. New regressions cover named/deduplicated archives, old-save backfill, rejected actions, exact saved completion, ecology restoration, successor research, resource bounds, archive capacity, escaping, live/offline agreement and collection retention through rebirth. Both choices were tested through browser reload and offline completion. The cached production worker resolves a pending ruin investigation with the network disabled. Choice cards were visually reviewed at desktop and 390px portrait widths. Opening and progression gates remain unchanged; the baseline and full automation benchmarks completed in approximately 1.13 and 1.53 seconds on this development machine, within the two-second budget. Physical-phone performance remains unverified.

Phase 23 commit: `7a61b51`.

## Follow-up phase 24: asteroid warnings and debris deflection

Unsecured orbiting asteroids make seeded activity checks every fifteen minutes of universe time, starting fifteen minutes after discovery. An 8% chance warns of debris reaching a planet in the same system two minutes later. The warning persists through saves and arrives at its exact deadline during active or offline simulation. Debris warms its target, reduces atmosphere and water, and disrupts its ecosystem. Population and stability losses scale with the threatened world’s share of its civilization’s settlement capacity; colonies and completed habitats limit exposure. A depleted civilization can collapse and leave a recoverable archive.

Explore lists pending threats across known systems. Develop and Influence show relevant warnings and whether shelter covers arrival, with links to the asteroid’s controls or the threatened world. Spaceflight unlocks Deflect debris for 800 energy and 150 minerals, with a three-minute recovery. Orbital capture also secures an incoming asteroid. Planetary shelter intercepts debris only if its protection extends beyond arrival. Each shower resolves once; secured trajectories and captured companions cannot schedule new threats. The original asteroid and mining outpost remain after an impact. Protection and impacts create distinct Codex records and affected civilization history entries.

Save schema 13 persists asteroid activity and trajectories. Versions 1–12 initialize quiet activity clocks at the saved simulation time without replaying earlier impacts or changing existing deposits, mining, captures, stellar activity or automation. New orbital discoveries initialize their clock at discovery. Imports reject missing or incompatible state, invalid or cross-system targets and stale, nonfinite or impossible deadlines. Shared influence readiness rejects unavailable deflection before spending; stellar and asteroid deadlines share one bounded engine scan.

Validation: 141 headless tests, 48 desktop/portrait browser checks and six production offline checks, plus the production build, both 24-hour benchmarks and 32-seed playthrough gates. New regressions cover exact deadlines, one-time damage, protected worlds and expiry, deflection costs/readiness/recovery, capture links, colony/habitat resilience, collapse legacies, seeded warnings, late discoveries, save migration, escaping and live/offline agreement. Browser checks navigate from distant warnings to deflection and shelter, then verify protection after reload and offline arrival. Cached production workers and worker fallback both resolve pending impacts without a network. Warning and deflection cards were visually reviewed at desktop and 390px portrait widths. Progression results remain unchanged across the 32 seeds. The baseline and full automation benchmarks completed in approximately 1.27 and 1.73 seconds on this development machine; the latter resolved 16 debris showers while retaining all 16 mining outposts and 63 completed habitats. Both remain within the two-second budget; physical-phone performance remains unverified.
