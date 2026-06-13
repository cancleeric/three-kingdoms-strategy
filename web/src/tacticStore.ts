/**
 * tacticStore.ts — 戰法配置持久化（M1.5）
 *
 * 把武將戰法配置頁（TacticConfig）設定的 learnedSlots 與書庫存到 localStorage，
 * 讓打地戰役 / 沙盒 / PvP 的實戰真正吃到玩家配置的戰法 deck。
 * 沒有此層，戰法 deck 只是個獨立 demo，配了不影響戰鬥（M1 的誠實缺口）。
 */
import type { Hero, Tactic, TacticLibrary } from './engine/types';

const KEY = 'sanguo-tactic-config-v1';

export interface TacticConfig {
  slots: Record<string, (Tactic | null)[]>; // heroId → 該武將 2 個可學槽
  library: TacticLibrary;
}

export function loadTacticConfig(): TacticConfig | null {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) as TacticConfig : null; }
  catch { return null; }
}

export function saveTacticConfig(cfg: TacticConfig): void {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

/** 把已配置的可學槽覆蓋到武將上，供實戰（combat allTacticsOf）讀取。無配置則原樣回傳。 */
export function applyConfiguredTactics(hero: Hero): Hero {
  const cfg = loadTacticConfig();
  const slots = cfg?.slots[hero.id];
  if (!slots) return hero;
  return { ...hero, learnedSlots: [slots[0] ?? null, slots[1] ?? null] };
}
