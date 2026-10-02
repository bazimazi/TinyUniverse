import { random } from '../core/random.ts';
import { selectedObject } from '../core/universe.ts';
import { worldPosition } from '../simulation/orbits.ts';
import type { CelestialObject, Universe } from '../core/types.ts';
export class Scene {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private stars: { x: number; y: number; size: number; alpha: number }[] = [];
  private hits: { id: string; x: number; y: number; radius: number }[] = [];
  private scale = 1;
  private targetScale = 1;
  private canvas: HTMLCanvasElement;
  view: 'planet' | 'system' = 'planet';
  constructor(canvas: HTMLCanvasElement, select: (id: string) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable in this browser.');
    this.ctx = ctx;
    const rng = random(9941);
    this.stars = Array.from({ length: 140 }, () => ({ x: rng(), y: rng(), size: rng() * 1.3 + 0.3, alpha: rng() * 0.65 + 0.15 }));
    canvas.addEventListener('click', event => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      const hit = [...this.hits].reverse().find(hit => Math.hypot(x - hit.x, y - hit.y) < Math.max(22, hit.radius));
      if (hit) select(hit.id);
    });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.targetScale = Math.max(0.5, Math.min(2, this.targetScale * (event.deltaY < 0 ? 1.1 : 0.9)));
    }, { passive: false });
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }
  zoom(amount: number): void { this.targetScale = Math.max(0.5, Math.min(2, this.targetScale * amount)); }
  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width; this.height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * dpr; this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  draw(state: Universe): void {
    const c = this.ctx, w = this.width, h = this.height;
    if (!w || !h) return;
    this.scale += (this.targetScale - this.scale) * (state.settings.reducedMotion ? 1 : 0.1);
    c.clearRect(0, 0, w, h);
    for (const star of this.stars) {
      c.fillStyle = `rgba(205,223,255,${star.alpha})`;
      c.beginPath(); c.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2); c.fill();
    }
    this.hits.length = 0;
    const selected = selectedObject(state);
    if (this.view === 'planet') {
      const radius = Math.min(w * 0.28, h * 0.29) * this.scale;
      this.body(selected, w / 2, h * 0.46, radius, true, state.time);
      const parent = selected.parentId ? state.objects[selected.parentId] : null;
      if (parent) this.body(parent, w * 0.85, h * 0.12, 13, false, state.time);
    } else {
      const unit = Math.min(w, h) / 350 * this.scale;
      for (const object of Object.values(state.objects)) {
        const pos = worldPosition(state, object.id, state.settings.reducedMotion ? 0 : state.time);
        const x = w / 2 + pos.x * unit, y = h / 2 + pos.y * unit;
        if (object.orbit) {
          const parent = worldPosition(state, object.parentId!, state.settings.reducedMotion ? 0 : state.time);
          c.strokeStyle = '#b6d8ec20'; c.lineWidth = 1;
          c.beginPath(); c.ellipse(w / 2 + parent.x * unit, h / 2 + parent.y * unit, object.orbit.radius * unit, object.orbit.radius * unit * Math.sqrt(1 - object.orbit.eccentricity ** 2), 0, 0, Math.PI * 2); c.stroke();
        }
        this.body(object, x, y, Math.max(5, object.radius * unit * 0.5), object.id === state.selectedId, state.time);
      }
    }
  }
  private body(object: CelestialObject, x: number, y: number, r: number, selected: boolean, time: number): void {
    const c = this.ctx;
    this.hits.push({ id: object.id, x, y, radius: r });
    const glow = c.createRadialGradient(x, y, r * 0.7, x, y, r * 1.65);
    glow.addColorStop(0, `${object.color}30`); glow.addColorStop(1, `${object.color}00`);
    c.fillStyle = glow; c.beginPath(); c.arc(x, y, r * 1.65, 0, Math.PI * 2); c.fill();
    c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
    const gradient = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x + r * 0.25, y + r * 0.25, r * 1.3);
    gradient.addColorStop(0, object.color); gradient.addColorStop(0.55, object.type === 'star' ? '#ef9e54' : '#287f8f'); gradient.addColorStop(1, '#061629');
    c.fillStyle = gradient; c.fillRect(x - r, y - r, r * 2, r * 2);
    if (object.planet && r > 20) {
      const rng = random(object.seed);
      for (let i = 0; i < 12; i++) {
        const px = x + (rng() - 0.5) * r * 1.8, py = y + (rng() - 0.5) * r * 1.8;
        c.fillStyle = i % 2 ? '#7ed9a955' : '#cfffea33';
        c.beginPath(); c.ellipse(px, py, r * (rng() * 0.18 + 0.12), r * (rng() * 0.12 + 0.07), rng() * 3, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = '#eafff53b'; c.lineWidth = r * 0.035;
      for (let i = 0; i < 4; i++) {
        c.beginPath(); c.ellipse(x + Math.sin(time / 100 + i) * r * 0.2, y - r * 0.6 + i * r * 0.36, r * 0.8, r * 0.09, -0.3, 0, Math.PI); c.stroke();
      }
    }
    c.restore();
    if (selected) { c.strokeStyle = '#9ee9d977'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r + 8, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = '#deebfa'; c.font = '12px system-ui'; c.textAlign = 'center';
    c.fillText(object.name, x, y + r + 28);
  }
}
