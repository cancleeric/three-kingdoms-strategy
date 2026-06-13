/**
 * Three Kingdoms Strategy — 武將進階／突破（M5-4，對齊真實《三戰》武將頁進階養成）
 *
 * 每名武將可進階 0–5 階，每階全屬性 +6%。純函式，可單元測試；
 * 進階等級存於獨立 store（不動存檔 schema），於 buildSquad 套用。
 */
import type { Hero } from './types';

export const ADVANCE_MAX = 5;
export const ADVANCE_PER = 0.06; // 每階 +6% 全屬性

/** 進階加成百分比（封頂 ADVANCE_MAX 階）。 */
export function advancementBonus(level: number): number {
  return Math.min(ADVANCE_MAX, Math.max(0, level)) * ADVANCE_PER;
}

/** 下一階進階成本（銀錢，隨階遞增）。已達上限回 null。 */
export function advanceCost(level: number): number | null {
  if (level >= ADVANCE_MAX) return null;
  return (level + 1) * 300;
}

/** 把進階加成套到武將全屬性。level<=0 原樣回傳。 */
export function applyAdvancement(hero: Hero, level: number): Hero {
  if (level <= 0) return hero;
  const b = 1 + advancementBonus(level);
  const s = hero.stats;
  return {
    ...hero,
    stats: {
      force: Math.round(s.force * b),
      intellect: Math.round(s.intellect * b),
      command: Math.round(s.command * b),
      speed: Math.round(s.speed * b),
      politics: Math.round(s.politics * b),
      charm: Math.round(s.charm * b),
    },
  };
}
