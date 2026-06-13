import { describe, it, expect } from 'vitest';
import { advancementBonus, advanceCost, applyAdvancement, canAwaken, AWAKEN_BONUS, ADVANCE_MAX, ADVANCE_PER } from './advancement';
import { ROSTER } from './sampleData';

const hero = ROSTER.find((h) => h.id === 'zhaoyun')!;

describe('advancement — 武將進階 (M5-4)', () => {
  it('進階加成 = 階數 × 每階', () => {
    expect(advancementBonus(3)).toBeCloseTo(3 * ADVANCE_PER, 5);
    expect(advancementBonus(0)).toBe(0);
  });

  it('封頂 ADVANCE_MAX 階', () => {
    expect(advancementBonus(99)).toBe(ADVANCE_MAX * ADVANCE_PER);
    expect(advanceCost(ADVANCE_MAX)).toBeNull();
  });

  it('進階成本隨階遞增', () => {
    expect(advanceCost(0)!).toBeLessThan(advanceCost(2)!);
  });

  it('套用進階：全屬性提升', () => {
    const a = applyAdvancement(hero, 5);
    expect(a.stats.force).toBeGreaterThan(hero.stats.force);
    expect(a.stats.intellect).toBeGreaterThan(hero.stats.intellect);
    expect(a.stats.command).toBeGreaterThan(hero.stats.command);
  });

  it('0 階原樣回傳', () => {
    expect(applyAdvancement(hero, 0)).toBe(hero);
  });

  it('M5-7 覺醒：滿階才可覺醒', () => {
    expect(canAwaken(ADVANCE_MAX, false)).toBe(true);
    expect(canAwaken(ADVANCE_MAX - 1, false)).toBe(false); // 未滿階
    expect(canAwaken(ADVANCE_MAX, true)).toBe(false); // 已覺醒
  });

  it('M5-7 覺醒額外 +25% 全屬性', () => {
    const full = applyAdvancement(hero, ADVANCE_MAX, false);
    const awakened = applyAdvancement(hero, ADVANCE_MAX, true);
    expect(awakened.stats.force).toBeGreaterThan(full.stats.force);
    // 覺醒總加成 = 滿階 30% + 覺醒 25%
    expect(awakened.stats.force).toBe(Math.round(hero.stats.force * (1 + ADVANCE_MAX * ADVANCE_PER + AWAKEN_BONUS)));
  });
});
