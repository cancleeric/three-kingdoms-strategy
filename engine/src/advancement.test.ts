import { describe, it, expect } from 'vitest';
import { advancementBonus, advanceCost, applyAdvancement, ADVANCE_MAX, ADVANCE_PER } from './advancement';
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
});
