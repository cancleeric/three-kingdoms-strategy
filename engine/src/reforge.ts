/**
 * Three Kingdoms Strategy — 重塑／洗鍊（M5-11，對齊真實《三戰》武將重塑）
 *
 * 選擇重塑方向（攻/守/速），強化對應屬性群——build 取向選擇，
 * 與進階(全屬性)、兵書(單屬性)不同軸。純函式，可單元測試；buildSquad 套用。
 */
import type { Hero } from './types';

export type ReforgeDir = 'attack' | 'defense' | 'speed';
export const REFORGE_PCT = 0.12;
export const REFORGE_NAME: Record<ReforgeDir, string> = {
  attack: '攻勢（武力＋智力）',
  defense: '守勢（統率）',
  speed: '迅捷（速度）',
};

/** 把重塑方向加成套到對應屬性群。dir=null 原樣回傳。 */
export function applyReforge(hero: Hero, dir: ReforgeDir | null): Hero {
  if (!dir) return hero;
  const s = hero.stats;
  const m = 1 + REFORGE_PCT;
  const stats = { ...s };
  if (dir === 'attack') { stats.force = Math.round(s.force * m); stats.intellect = Math.round(s.intellect * m); }
  else if (dir === 'defense') { stats.command = Math.round(s.command * m); }
  else if (dir === 'speed') { stats.speed = Math.round(s.speed * m); }
  return { ...hero, stats };
}
