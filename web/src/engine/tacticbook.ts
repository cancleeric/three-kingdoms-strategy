/**
 * Three Kingdoms Strategy — 戰法書拆書養成系統（M1-2）
 *
 * 純函式，負責：
 *  - disassembleHero：拆武將取戰法書
 *  - learnTactic：習得戰法到可學槽
 *  - upgradeTactic：升級已習得戰法（吃同名書）
 *  - availableToLearn：查詢武將可習得但尚未習得的戰法
 *  - newTacticLibrary：初始化書庫
 *
 * 拆書數量：
 *  3★/4★ → innate 書 × 1
 *  5★    → innate 書 × 2
 *  6★    → innate 書 × 3（隨機額外書由上層決定，此函式不處理隨機）
 *
 * 習得成本：1 本對應書
 * 升級成本：Lv.n → Lv.(n+1) 需 (n+1) 本同名書，上限 Lv.10
 */

import type { Hero, Tactic, TacticBook, TacticLibrary } from './types';

// ── 書庫初始化 ────────────────────────────────────────────────
export function newTacticLibrary(): TacticLibrary {
  return { books: {}, learned: {} };
}

// ── 取得書庫中某戰法的書數 ─────────────────────────────────────
function bookCount(lib: TacticLibrary, tacticId: string): number {
  return lib.books[tacticId]?.quantity ?? 0;
}

// ── 增加書庫中某戰法的書數 ─────────────────────────────────────
function addBooks(lib: TacticLibrary, tacticId: string, qty: number): TacticLibrary {
  const cur = bookCount(lib, tacticId);
  const newQty = cur + qty;
  const books = { ...lib.books };
  if (newQty <= 0) {
    delete books[tacticId];
  } else {
    books[tacticId] = { tacticId, quantity: newQty };
  }
  return { ...lib, books };
}

// ── 拆書數量（依稀有度）─────────────────────────────────────────
function disassembleCount(rarity: Hero['rarity']): number {
  if (rarity <= 4) return 1;
  if (rarity === 5) return 2;
  return 3; // 6★
}

/**
 * 拆解武將：取得其自帶戰法書，寫入 lib。
 * 6★ 的額外隨機書由此函式不處理（上層可自行決定）。
 * 回傳更新後的 lib 與取得的書列表。
 */
export function disassembleHero(
  hero: Hero,
  lib: TacticLibrary,
): { lib: TacticLibrary; booksGained: TacticBook[] } {
  const qty = disassembleCount(hero.rarity);
  const tacticId = hero.innate.id;
  const newLib = addBooks(lib, tacticId, qty);
  const booksGained: TacticBook[] = [{ tacticId, quantity: qty }];
  return { lib: newLib, booksGained };
}

/**
 * 習得戰法：消耗 1 本對應書，寫入 hero.learnedSlots[slotIdx]。
 * 條件：
 *  1. lib 中有至少 1 本對應書
 *  2. 目標 slotIdx（0 或 1）尚未填入（null），或允許覆蓋（此處不允許覆蓋）
 *  3. 若兩槽都已滿則拒絕
 */
export function learnTactic(
  hero: Hero,
  lib: TacticLibrary,
  tacticId: string,
  slotIdx: 0 | 1,
  allTactics: Tactic[],
): { ok: boolean; hero: Hero; lib: TacticLibrary; error?: string } {
  // 找到對應戰法定義
  const tacticDef = allTactics.find((t) => t.id === tacticId);
  if (!tacticDef) {
    return { ok: false, hero, lib, error: `找不到戰法 ${tacticId}` };
  }
  // 檢查書數
  if (bookCount(lib, tacticId) < 1) {
    return { ok: false, hero, lib, error: `${tacticDef.name} 書庫不足（需要 1 本）` };
  }
  // 檢查槽位是否已滿
  if (hero.learnedSlots[slotIdx] !== null) {
    return { ok: false, hero, lib, error: `可學槽 ${slotIdx + 1} 已有戰法，請先移除` };
  }
  // 檢查兩槽是否都滿（額外防護）
  if (hero.learnedSlots[0] !== null && hero.learnedSlots[1] !== null) {
    return { ok: false, hero, lib, error: '兩個可學槽都已填滿，無法學習新戰法' };
  }

  // 消耗書、寫入槽位（設等級為 1）
  const newLib = addBooks(lib, tacticId, -1);
  const learnedTactic: Tactic = { ...tacticDef, level: 1 };
  const newSlots: [Tactic | null, Tactic | null] = [...hero.learnedSlots] as [Tactic | null, Tactic | null];
  newSlots[slotIdx] = learnedTactic;
  const newHero: Hero = { ...hero, learnedSlots: newSlots };
  // 記錄已習得等級
  const newLearnedLib: TacticLibrary = { ...newLib, learned: { ...newLib.learned, [tacticId]: 1 } };

  return { ok: true, hero: newHero, lib: newLearnedLib };
}

/**
 * 升級已習得戰法：消耗同名書 (currentLevel + 1) 本，等級上限 10。
 * 此函式作用於書庫中已習得的戰法，不直接修改 Hero（hero 上的 level 由上層更新）。
 */
export function upgradeTactic(
  lib: TacticLibrary,
  tacticId: string,
): { ok: boolean; lib: TacticLibrary; newLevel: number; error?: string } {
  const currentLevel = lib.learned[tacticId] ?? 0;
  if (currentLevel === 0) {
    return { ok: false, lib, newLevel: 0, error: `戰法 ${tacticId} 尚未習得` };
  }
  if (currentLevel >= 10) {
    return { ok: false, lib, newLevel: 10, error: '已達最高等級 Lv.10，無法再升級' };
  }
  const cost = currentLevel + 1; // Lv.n → Lv.(n+1) 需 (n+1) 本
  if (bookCount(lib, tacticId) < cost) {
    return { ok: false, lib, newLevel: currentLevel, error: `書庫不足（需要 ${cost} 本，現有 ${bookCount(lib, tacticId)} 本）` };
  }
  const newLevel = currentLevel + 1;
  const newLib = addBooks(lib, tacticId, -cost);
  const updatedLib: TacticLibrary = { ...newLib, learned: { ...newLib.learned, [tacticId]: newLevel } };
  return { ok: true, lib: updatedLib, newLevel };
}

/**
 * 查詢：某武將書庫中有書、且尚未在其 learnedSlots 中習得的戰法列表。
 */
export function availableToLearn(
  hero: Hero,
  lib: TacticLibrary,
  allTactics: Tactic[],
): Tactic[] {
  const learnedIds = new Set(
    hero.learnedSlots.filter((t): t is Tactic => t !== null).map((t) => t.id),
  );
  return allTactics.filter(
    (t) => bookCount(lib, t.id) > 0 && !learnedIds.has(t.id) && t.id !== hero.innate.id,
  );
}
