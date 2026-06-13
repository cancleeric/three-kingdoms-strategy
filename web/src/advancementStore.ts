/**
 * advancementStore.ts — 武將進階持久化（M5-4）
 *
 * 進階等級存 localStorage（heroId → level），與存檔 schema 解耦，
 * applyHeroAdvancement 於 buildSquad 套用，讓進階真正影響戰鬥。
 */
import type { Hero } from './engine/types';
import { applyAdvancement } from './engine';

const KEY = 'sanguo-advancement-v1';

export function loadAdvancement(): Record<string, number> {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) as Record<string, number> : {}; }
  catch { return {}; }
}

export function saveAdvancement(m: Record<string, number>): void {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

export function getAdvanceLevel(heroId: string): number {
  return loadAdvancement()[heroId] ?? 0;
}

export function setAdvanceLevel(heroId: string, level: number): void {
  const m = loadAdvancement();
  m[heroId] = level;
  saveAdvancement(m);
}

// M5-7 覺醒狀態（heroId → true）
const AWAKEN_KEY = 'sanguo-awaken-v1';
export function loadAwakened(): Record<string, boolean> {
  try { const s = localStorage.getItem(AWAKEN_KEY); return s ? JSON.parse(s) as Record<string, boolean> : {}; }
  catch { return {}; }
}
export function getAwakened(heroId: string): boolean {
  return loadAwakened()[heroId] ?? false;
}
export function setAwakened(heroId: string): void {
  const m = loadAwakened();
  m[heroId] = true;
  try { localStorage.setItem(AWAKEN_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

/** 把該武將進階等級 + 覺醒狀態套到屬性上（供實戰 buildSquad 用）。 */
export function applyHeroAdvancement(hero: Hero): Hero {
  return applyAdvancement(hero, getAdvanceLevel(hero.id), getAwakened(hero.id));
}
