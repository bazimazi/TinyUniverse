# Tiny Universe

A mobile-first idle universe sandbox. Begin with Aurelia, improve its environment, and watch your universe grow. The simulation is deterministic and runs independently of the browser UI.

Requires Node.js 24 or newer.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build, run `npm run build`, then `npm run preview`. Browser saves are local to the origin; use Settings → Export save for portable backups.

```sh
npm run check
npx playwright install chromium
npm run test:browser
```

See [implementation and phase validation](docs/IMPLEMENTATION.md), [design research](docs/RESEARCH.md), and the [original product plan](docs/PRODUCT_PLAN.md).
