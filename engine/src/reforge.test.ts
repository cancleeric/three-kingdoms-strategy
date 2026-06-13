import { describe, it, expect } from 'vitest';
import { applyReforge, REFORGE_PCT, REFORGE_NAME } from './reforge';
import { ROSTER } from './sampleData';

const hero = ROSTER.find((h) => h.id === 'zhaoyun')!;

describe('reforge — 重塑 (M5-11)', () => {
  it('攻勢：武力+智力提升、統率不變', () => {
    const a = applyReforge(hero, 'attack');
    expect(a.stats.force).toBe(Math.round(hero.stats.force * (1 + REFORGE_PCT)));
    expect(a.stats.intellect).toBeGreaterThan(hero.stats.intellect);
    expect(a.stats.command).toBe(hero.stats.command);
  });

  it('守勢：僅統率提升', () => {
    const a = applyReforge(hero, 'defense');
    expect(a.stats.command).toBeGreaterThan(hero.stats.command);
    expect(a.stats.force).toBe(hero.stats.force);
  });

  it('迅捷：僅速度提升', () => {
    const a = applyReforge(hero, 'speed');
    expect(a.stats.speed).toBe(Math.round(hero.stats.speed * (1 + REFORGE_PCT)));
    expect(a.stats.force).toBe(hero.stats.force);
  });

  it('無重塑原樣回傳', () => {
    expect(applyReforge(hero, null)).toBe(hero);
    expect(REFORGE_NAME.attack).toBeTruthy();
  });
});
