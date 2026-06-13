/**
 * manualStore.ts — 兵書裝備持久化（M5-6）
 *
 * 武將裝備的兵書（heroId → manualId）存 localStorage，
 * applyHeroManual 於 buildSquad 套用，讓兵書真正影響戰鬥。
 */
import type { Hero } from './engine/types';
import { applyManual } from './engine';

const KEY = 'sanguo-manual-v1';

export function loadManuals(): Record<string, string> {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) as Record<string, string> : {}; }
  catch { return {}; }
}

export function saveManuals(m: Record<string, string>): void {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

export function getManual(heroId: string): string {
  return loadManuals()[heroId] ?? '';
}

export function setManual(heroId: string, manualId: string): void {
  const m = loadManuals();
  if (manualId) m[heroId] = manualId; else delete m[heroId];
  saveManuals(m);
}

/** 套用該武將已裝備兵書（供 buildSquad 用）。 */
export function applyHeroManual(hero: Hero): Hero {
  return applyManual(hero, getManual(hero.id) || null);
}
