import { describe, it, expect } from 'vitest';
import { advisorBonus, applyAdvisor, ADVISOR_FACTOR } from './advisor';
import { ROSTER, makeUnit, makeSquad } from './sampleData';

const zhuge = ROSTER.find((h) => h.id === 'zhuge')!; // 高智力
const guanping = ROSTER.find((h) => h.id === 'guanping')!;

describe('advisor — 軍師槽 (M5-3)', () => {
  it('軍師增益依智力', () => {
    expect(advisorBonus(zhuge)).toBeCloseTo(zhuge.stats.intellect * ADVISOR_FACTOR, 2);
    expect(advisorBonus(zhuge)).toBeGreaterThan(0);
  });

  it('套用軍師：全隊武力/智力提升', () => {
    const sq = makeSquad([makeUnit(guanping, 'spear', 5000, 'attacker')]);
    const before = sq.units[0].hero.stats.force;
    const buffed = applyAdvisor(sq, zhuge);
    expect(buffed.units[0].hero.stats.force).toBeGreaterThan(before);
    expect(buffed.units[0].hero.stats.intellect).toBeGreaterThan(sq.units[0].hero.stats.intellect);
  });

  it('無軍師原樣回傳', () => {
    const sq = makeSquad([makeUnit(guanping, 'spear', 5000, 'attacker')]);
    expect(applyAdvisor(sq, null)).toBe(sq);
  });

  it('軍師不改變兵量/血量', () => {
    const sq = makeSquad([makeUnit(guanping, 'spear', 5000, 'attacker')]);
    const buffed = applyAdvisor(sq, zhuge);
    expect(buffed.units[0].troops).toBe(5000);
    expect(buffed.units[0].hp).toBe(sq.units[0].hp);
  });
});
