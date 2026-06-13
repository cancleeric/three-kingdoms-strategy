import { describe, it, expect } from 'vitest';
import {
  newTacticLibrary,
  disassembleHero,
  inheritTactic,
  learnTactic,
  upgradeTactic,
  availableToLearn,
} from './tacticbook';
import { GUAN_PING, ZHAO_YUN, genericActive, tacticFormation } from './sampleData';
import type { Hero, Tactic } from './types';

// ── 輔助：建一個 6★ 英雄（用 ZHAO_YUN 改 rarity）────────────
const sixStarHero: Hero = { ...ZHAO_YUN, rarity: 6, learnedSlots: [null, null] };
const fourStarHero: Hero = { ...GUAN_PING };
const threeStarHero: Hero = { ...GUAN_PING, rarity: 3, learnedSlots: [null, null] };

// 測試用戰法列表
const allTactics: Tactic[] = [genericActive, tacticFormation];

describe('inheritTactic — 戰法傳承 (M5-12)', () => {
  it('傳承武將自帶戰法為 1 本書', () => {
    const lib = newTacticLibrary();
    const r = inheritTactic(sixStarHero, lib);
    expect(r.tacticId).toBe(sixStarHero.innate.id);
    expect(r.name).toBe(sixStarHero.innate.name);
    expect(r.lib.books[sixStarHero.innate.id]?.quantity).toBe(1);
  });
  it('傳承固定 1 本（不依稀有度）', () => {
    const r3 = inheritTactic(threeStarHero, newTacticLibrary());
    const r6 = inheritTactic(sixStarHero, newTacticLibrary());
    expect(r3.lib.books[threeStarHero.innate.id]?.quantity).toBe(1);
    expect(r6.lib.books[sixStarHero.innate.id]?.quantity).toBe(1);
  });
});

describe('disassembleHero — 拆書數量', () => {
  it('拆 3★ 武將得 1 本自帶書', () => {
    const lib = newTacticLibrary();
    const { booksGained, lib: newLib } = disassembleHero(threeStarHero, lib);
    expect(booksGained).toHaveLength(1);
    expect(booksGained[0].tacticId).toBe(threeStarHero.innate.id);
    expect(booksGained[0].quantity).toBe(1);
    expect(newLib.books[threeStarHero.innate.id].quantity).toBe(1);
  });

  it('拆 4★ 武將得 1 本自帶書', () => {
    const lib = newTacticLibrary();
    const { booksGained } = disassembleHero(fourStarHero, lib);
    expect(booksGained[0].quantity).toBe(1);
  });

  it('拆 6★ 武將得 3 本自帶書', () => {
    const lib = newTacticLibrary();
    const { booksGained, lib: newLib } = disassembleHero(sixStarHero, lib);
    expect(booksGained[0].quantity).toBe(3);
    expect(newLib.books[sixStarHero.innate.id].quantity).toBe(3);
  });

  it('多次拆解同一武將書庫累加', () => {
    let lib = newTacticLibrary();
    ({ lib } = disassembleHero(fourStarHero, lib));
    ({ lib } = disassembleHero(fourStarHero, lib));
    expect(lib.books[fourStarHero.innate.id].quantity).toBe(2);
  });
});

describe('learnTactic — 習得戰法', () => {
  it('習得戰法成功寫入 slot 0', () => {
    // 先給書庫補充一本 genericActive
    let lib = newTacticLibrary();
    lib = { ...lib, books: { [genericActive.id]: { tacticId: genericActive.id, quantity: 1 } } };
    const hero: Hero = { ...ZHAO_YUN, learnedSlots: [null, null] };

    const { ok, hero: updatedHero, lib: updatedLib } = learnTactic(hero, lib, genericActive.id, 0, allTactics);
    expect(ok).toBe(true);
    expect(updatedHero.learnedSlots[0]).not.toBeNull();
    expect(updatedHero.learnedSlots[0]?.id).toBe(genericActive.id);
    expect(updatedHero.learnedSlots[1]).toBeNull();
    // 書庫消耗
    expect(updatedLib.books[genericActive.id]?.quantity ?? 0).toBe(0);
    // 已習得記錄
    expect(updatedLib.learned[genericActive.id]).toBe(1);
  });

  it('習得戰法書不足時回傳 ok=false', () => {
    const lib = newTacticLibrary(); // 空書庫
    const hero: Hero = { ...ZHAO_YUN, learnedSlots: [null, null] };
    const { ok, error } = learnTactic(hero, lib, genericActive.id, 0, allTactics);
    expect(ok).toBe(false);
    expect(error).toBeTruthy();
  });

  it('兩槽都滿時習得戰法回傳 error', () => {
    // 槽 0 和槽 1 都已有戰法
    let lib = newTacticLibrary();
    lib = { ...lib, books: { [tacticFormation.id]: { tacticId: tacticFormation.id, quantity: 5 } } };
    const hero: Hero = {
      ...ZHAO_YUN,
      learnedSlots: [genericActive, genericActive], // 兩槽都滿
    };
    const { ok, error } = learnTactic(hero, lib, tacticFormation.id, 0, allTactics);
    expect(ok).toBe(false);
    expect(error).toBeTruthy();
  });

  it('目標槽位已有戰法時回傳 error', () => {
    let lib = newTacticLibrary();
    lib = { ...lib, books: { [genericActive.id]: { tacticId: genericActive.id, quantity: 2 } } };
    const hero: Hero = {
      ...ZHAO_YUN,
      learnedSlots: [genericActive, null], // 槽 0 已有
    };
    const { ok, error } = learnTactic(hero, lib, genericActive.id, 0, allTactics);
    expect(ok).toBe(false);
    expect(error).toBeTruthy();
  });
});

describe('upgradeTactic — 升級戰法', () => {
  it('升級戰法消耗正確書數（Lv.1→2 消耗 2 本）', () => {
    const tacticId = genericActive.id;
    let lib = newTacticLibrary();
    // 設定：已習得 Lv.1，書庫有 3 本
    lib = {
      ...lib,
      books: { [tacticId]: { tacticId, quantity: 3 } },
      learned: { [tacticId]: 1 },
    };
    const { ok, lib: updatedLib, newLevel } = upgradeTactic(lib, tacticId);
    expect(ok).toBe(true);
    expect(newLevel).toBe(2);
    // 消耗 2 本（Lv.1+1=2），剩餘 1 本
    expect(updatedLib.books[tacticId]?.quantity ?? 0).toBe(1);
    expect(updatedLib.learned[tacticId]).toBe(2);
  });

  it('Lv.2→3 消耗 3 本', () => {
    const tacticId = genericActive.id;
    let lib = newTacticLibrary();
    lib = {
      ...lib,
      books: { [tacticId]: { tacticId, quantity: 5 } },
      learned: { [tacticId]: 2 },
    };
    const { ok, lib: updatedLib, newLevel } = upgradeTactic(lib, tacticId);
    expect(ok).toBe(true);
    expect(newLevel).toBe(3);
    expect(updatedLib.books[tacticId]?.quantity ?? 0).toBe(2);
  });

  it('升級到 Lv.10 後拒絕再升', () => {
    const tacticId = genericActive.id;
    let lib = newTacticLibrary();
    lib = {
      ...lib,
      books: { [tacticId]: { tacticId, quantity: 100 } },
      learned: { [tacticId]: 10 }, // 已滿
    };
    const { ok, error, newLevel } = upgradeTactic(lib, tacticId);
    expect(ok).toBe(false);
    expect(newLevel).toBe(10);
    expect(error).toContain('最高等級');
  });

  it('書庫不足時升級失敗', () => {
    const tacticId = genericActive.id;
    let lib = newTacticLibrary();
    lib = {
      ...lib,
      books: { [tacticId]: { tacticId, quantity: 1 } }, // 只有 1 本，需要 2
      learned: { [tacticId]: 1 },
    };
    const { ok, error } = upgradeTactic(lib, tacticId);
    expect(ok).toBe(false);
    expect(error).toContain('書庫不足');
  });

  it('尚未習得的戰法無法升級', () => {
    const tacticId = genericActive.id;
    const lib = newTacticLibrary();
    const { ok, error } = upgradeTactic(lib, tacticId);
    expect(ok).toBe(false);
    expect(error).toBeTruthy();
  });
});

describe('availableToLearn — 可習得戰法查詢', () => {
  it('書庫有書且未習得的戰法出現在列表中', () => {
    let lib = newTacticLibrary();
    lib = { ...lib, books: { [genericActive.id]: { tacticId: genericActive.id, quantity: 1 } } };
    const hero: Hero = { ...ZHAO_YUN, learnedSlots: [null, null] };
    const available = availableToLearn(hero, lib, allTactics);
    expect(available.some((t) => t.id === genericActive.id)).toBe(true);
  });

  it('已習得的戰法不再出現在可習得列表', () => {
    let lib = newTacticLibrary();
    lib = { ...lib, books: { [genericActive.id]: { tacticId: genericActive.id, quantity: 1 } } };
    const hero: Hero = { ...ZHAO_YUN, learnedSlots: [genericActive, null] };
    const available = availableToLearn(hero, lib, allTactics);
    expect(available.every((t) => t.id !== genericActive.id)).toBe(true);
  });

  it('書庫無書的戰法不出現在可習得列表', () => {
    const lib = newTacticLibrary(); // 空書庫
    const hero: Hero = { ...ZHAO_YUN, learnedSlots: [null, null] };
    const available = availableToLearn(hero, lib, allTactics);
    expect(available).toHaveLength(0);
  });
});
