# Tiny Universe

A mobile-first idle exploration and civilization sandbox. Begin with Aurelia, develop its environment, discover companion worlds, watch independent cultures emerge, explore galaxies and carry your discoveries into another Big Bang.

All ten development phases are implemented in separate commits. The simulation runs independently of rendering and uses deterministic seeds, bounded detailed worlds and aggregate distant populations.

Requires Node.js 24 or newer.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:4186). Buy your first Solar collection upgrade, then a second upgrade to unlock exploration. Navigation reveals new systems as you progress. Follow civilizations in Life, influence worlds, collect discoveries and complete a Dyson swarm to unlock rebirth.

```sh
npm run check
npm run playtest
npx playwright install chromium
npm run test:browser
npm run test:production
```

For a production build, run `npm run build`, then `npm run preview`. Deploy `dist` to a static HTTPS host. After its first online load, the production app caches its assets and can launch offline. Browser saves belong to the current origin; Settings > Export save creates a portable backup. Initial offline progress is capped at 24 hours, with permanent upgrades extending it to seven days.

Returns show net resource changes, population, new research, discoveries and completed expeditions/construction. Browser stalls use offline catch-up at normal speed; time controls accelerate active play. Player actions save immediately. Technology recorded by fallen civilizations keeps player unlocks available until rebirth.

AI unlocks optional automation in Rebirth. It works every minute of universe time, including offline, and shows its next action or reason for waiting. Development follows the selected world/system; exploration saves for a reachable destination; research inspiration keeps 200 knowledge in reserve.

Offline returns recover automatically when a worker fails to load or stalls. A simulation error pauses progress and protects the saved universe, with export, retry and backup import available from the recovery card.

Spaceflight unlocks orbital push and pull in Influence. Previews show the resulting orbit and climate; both directions share a recovery period. Influence controls explain unavailable targets and limits before spending resources.

Suggested steps open the relevant world and panel. Evolution and research bars estimate the next milestone in universe time; upgrade cards estimate resource waiting time at 1× production. `npm run playtest` reports progression over 32 fixed seeds under a repeatable active-care policy. These checks complement human playtesting.

On phones, panel navigation stays at the bottom of the screen. The observatory stops drawing off-screen while the universe keeps evolving. Reduced motion lowers drawing frequency, and a keyboard skip link opens game controls directly.

Development builds include an inspector and simulation tools in Settings. Accessibility controls include reduced motion, large text, high contrast, optional music/discovery sounds and haptics. No network telemetry or monetization is included.

See [phase commits and validation](docs/IMPLEMENTATION.md), [architecture and limits](docs/ARCHITECTURE.md), [design research](docs/RESEARCH.md), and the [original product plan](docs/PRODUCT_PLAN.md).
