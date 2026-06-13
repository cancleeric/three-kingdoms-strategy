import { describe, it, expect } from 'vitest';
import { WAR_MANUALS, manualById, applyManual } from './manual';
import { ROSTER } from './sampleData';

const hero = ROSTER.find((h) => h.id === 'zhaoyun')!;

describe('manual — 兵書系統 (M5-6)', () => {
  it('兵書目錄各強化一屬性', () => {
    expect(WAR_MANUALS.length).toBeGreaterThanOrEqual(4);
    expect(manualById('wuzi')?.stat).toBe('force');
    expect(manualById('liutao')?.stat).toBe('speed');
  });

  it('裝備兵書：對應屬性提升', () => {
    const a = applyManual(hero, 'wuzi'); // 武力
    expect(a.stats.force).toBeGreaterThan(hero.stats.force);
    expect(a.stats.intellect).toBe(hero.stats.intellect); // 其他屬性不變
  });

  it('無兵書原樣回傳', () => {
    expect(applyManual(hero, null)).toBe(hero);
    expect(applyManual(hero, 'unknown')).toBe(hero);
  });

  it('六韜強化速度', () => {
    const a = applyManual(hero, 'liutao');
    expect(a.stats.speed).toBe(Math.round(hero.stats.speed * 1.15));
  });
});
