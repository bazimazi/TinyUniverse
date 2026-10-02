import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hash } from '../src/core/random.ts';
const assets = ['index.html', 'icon.svg', 'manifest.webmanifest', ...readdirSync('dist/assets').map(name => `assets/${name}`)];
const version = hash(assets.map(path => readFileSync(join('dist', path), 'utf8')).join(''));
writeFileSync('dist/sw.js', `const CACHE = 'tiny-universe-${version}';
const FILES = ${JSON.stringify(assets)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tiny-universe-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreVary: true });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) { if (event.request.mode === 'navigate') return await cache.match(new URL('index.html', self.registration.scope), { ignoreVary: true }); throw error; }
  }));
});
`);
console.log(`Offline cache: ${assets.length} files, version ${version}`);
