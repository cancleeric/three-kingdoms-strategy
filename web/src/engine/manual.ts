/**
 * Three Kingdoms Strategy — 兵書系統（M5-6，對齊真實《三戰》武將頁兵書）
 *
 * 每名武將可裝備 1 本兵書，強化單一屬性（與進階的全屬性、軍師的智力增益不同軸）。
 * 純函式，可單元測試；於 buildSquad 套用。
 */
import type { Hero, HeroStats } from './types';

export interface WarManual {
  id: string;
  name: string;
  desc: string;
  stat: keyof HeroStats;
  pct: number; // 該屬性提升百分比
}

export const WAR_MANUALS: WarManual[] = [
  { id: 'wuzi', name: '吳子', desc: '武力 +12%（猛攻）', stat: 'force', pct: 12 },
  { id: 'sanlue', name: '三略', desc: '智力 +12%（謀略）', stat: 'intellect', pct: 12 },
  { id: 'sunzi', name: '孫子兵法', desc: '統率 +12%（守備）', stat: 'command', pct: 12 },
  { id: 'liutao', name: '六韜', desc: '速度 +15%（先攻）', stat: 'speed', pct: 15 },
];

export const manualById = (id: string | null): WarManual | undefined =>
  WAR_MANUALS.find((m) => m.id === id);

/** 把兵書加成套到武將對應屬性。manualId=null 或未知則原樣回傳。 */
export function applyManual(hero: Hero, manualId: string | null): Hero {
  const m = manualById(manualId);
  if (!m) return hero;
  return {
    ...hero,
    stats: { ...hero.stats, [m.stat]: Math.round(hero.stats[m.stat] * (1 + m.pct / 100)) },
  };
}
