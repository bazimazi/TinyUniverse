export function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}
export function random(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function entitySeed(seed: number, id: string): number { return hash(`${seed}:${id}`); }
export function nameFor(seed: number): string {
  const rng = random(seed);
  const starts = ['Ae', 'Ve', 'Lu', 'Ori', 'Sol', 'Ny', 'Ca', 'Eli', 'Ta', 'Io'];
  const ends = ['ra', 'ria', 'lon', 'thea', 'na', 'ris', 'lia', 'nus', 'ma', 'on'];
  return starts[Math.floor(rng() * starts.length)] + ends[Math.floor(rng() * ends.length)];
}
