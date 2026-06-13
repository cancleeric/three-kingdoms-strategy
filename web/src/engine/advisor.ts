/**
 * Three Kingdoms Strategy — 軍師槽（M5-3，對齊真實《三戰》每部隊一軍師）
 *
 * 指定一名武將為軍師，以其智力給全隊「武力＋智力」增益（運籌帷幄）。
 * 純函式，可單元測試；於 buildSquad 套用，不動戰鬥引擎。
 */
import type { Hero, Squad } from './types';

// 智力 → 增益係數：智力 250 ≈ +20%
export const ADVISOR_FACTOR = 0.0008;

/** 軍師增益百分比（依智力）。 */
export function advisorBonus(advisor: Hero): number {
  return Math.round(advisor.stats.intellect * ADVISOR_FACTOR * 1000) / 1000;
}

/** 把軍師增益套到全隊（武力/智力 ×(1+bonus)）。advisor=null 則原樣回傳。 */
export function applyAdvisor(squad: Squad, advisor: Hero | null): Squad {
  if (!advisor) return squad;
  const b = 1 + advisorBonus(advisor);
  return {
    ...squad,
    units: squad.units.map((u) => ({
      ...u,
      hero: { ...u.hero, stats: { ...u.hero.stats, force: Math.round(u.hero.stats.force * b), intellect: Math.round(u.hero.stats.intellect * b) } },
    })),
  };
}
