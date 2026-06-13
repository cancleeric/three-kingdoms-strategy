/**
 * reforgeStore.ts — 重塑方向持久化（M5-11）
 *
 * 武將重塑方向（heroId → dir）存 localStorage，applyHeroReforge 於 buildSquad 套用。
 */
import type { Hero } from './engine/types';
import { applyReforge, type ReforgeDir } from './engine';

const KEY = 'sanguo-reforge-v1';

export function loadReforge(): Record<string, ReforgeDir> {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) as Record<string, ReforgeDir> : {}; }
  catch { return {}; }
}
export function getReforge(heroId: string): ReforgeDir | '' {
  return loadReforge()[heroId] ?? '';
}
export function setReforge(heroId: string, dir: ReforgeDir | ''): void {
  const m = loadReforge();
  if (dir) m[heroId] = dir; else delete m[heroId];
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

/** 套用該武將重塑方向（供 buildSquad 用）。 */
export function applyHeroReforge(hero: Hero): Hero {
  return applyReforge(hero, getReforge(hero.id) || null);
}
