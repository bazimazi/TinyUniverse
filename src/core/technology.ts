import type { Domain } from './types.ts';
export interface Technology { name: string; domain: Domain; cost: number; requires: string[]; level: number; description: string }
export const TECHNOLOGIES: Record<string, Technology> = {
  agriculture: { name: 'Agriculture', domain: 'biology', cost: 60, requires: [], level: 1, description: 'Reliable food for growing settlements.' },
  writing: { name: 'Writing', domain: 'social', cost: 80, requires: [], level: 1, description: 'Knowledge can survive its authors.' },
  astronomy: { name: 'Astronomy', domain: 'space', cost: 100, requires: [], level: 1, description: 'The sky becomes a map.' },
  engineering: { name: 'Engineering', domain: 'materials', cost: 120, requires: ['writing'], level: 2, description: 'Infrastructure and scientific tools.' },
  electricity: { name: 'Electricity', domain: 'energy', cost: 240, requires: ['engineering'], level: 3, description: 'Power transforms everyday life.' },
  computing: { name: 'Computing', domain: 'computing', cost: 320, requires: ['electricity'], level: 4, description: 'Machines learn to calculate.' },
  nuclear: { name: 'Nuclear energy', domain: 'physics', cost: 400, requires: ['electricity'], level: 4, description: 'Power from the heart of matter.' },
  spaceflight: { name: 'Spaceflight', domain: 'space', cost: 600, requires: ['astronomy', 'computing'], level: 5, description: 'The first steps beyond a home world.' },
  fusion: { name: 'Fusion', domain: 'energy', cost: 1100, requires: ['nuclear'], level: 6, description: 'The power of a star, carefully contained.' },
  ai: { name: 'Artificial intelligence', domain: 'computing', cost: 1000, requires: ['computing'], level: 6, description: 'New minds and new social questions.' },
  terraforming: { name: 'Terraforming', domain: 'biology', cost: 1500, requires: ['spaceflight', 'agriculture'], level: 6, description: 'Make distant worlds habitable.' },
  gravity: { name: 'Gravity engineering', domain: 'gravity', cost: 1800, requires: ['fusion', 'spaceflight'], level: 7, description: 'Shape orbits and gravitational fields.' },
  interstellar: { name: 'Interstellar travel', domain: 'space', cost: 2200, requires: ['gravity', 'ai'], level: 8, description: 'A civilization can reach another star.' },
  dyson: { name: 'Dyson structures', domain: 'energy', cost: 4000, requires: ['fusion', 'interstellar'], level: 9, description: 'Capture stellar energy at scale.' },
  wormholes: { name: 'Wormholes', domain: 'quantum', cost: 5000, requires: ['interstellar'], level: 9, description: 'Connect distant corners of space.' },
  spacetime: { name: 'Spacetime manipulation', domain: 'quantum', cost: 8000, requires: ['wormholes'], level: 10, description: 'Understand the fabric of a universe.' },
  reality: { name: 'Reality engineering', domain: 'quantum', cost: 12000, requires: ['spacetime', 'dyson'], level: 11, description: 'A new beginning becomes possible.' }
};
