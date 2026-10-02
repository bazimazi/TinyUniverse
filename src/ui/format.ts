import type { Cost } from '../core/types.ts';
export function number(value: number): string {
  if (value >= 1e12) return value.toExponential(2);
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value < 10 ? value.toFixed(1) : Math.floor(value).toLocaleString('en');
}
export function duration(seconds: number): string {
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
}
export function escape(text: string): string { return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }
export function costText(cost: Cost): string { return Object.entries(cost).map(([id, value]) => `${number(value!)} ${id === 'biology' ? 'bio' : id}`).join(' · '); }
