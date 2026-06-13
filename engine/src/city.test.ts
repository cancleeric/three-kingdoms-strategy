import { describe, it, expect } from 'vitest';
import { newCity, produce, upgrade, upgradeCost, canAfford, troopCapacity, capacityForTroop, addResources, BUILDINGS } from './city';

describe('city — 城建+資源經濟 (§9/§11)', () => {
  it('新城有基礎建築與起始資源', () => {
    const c = newCity();
    expect(c.levels.farm).toBeGreaterThan(0);
    expect(c.resources.food).toBeGreaterThan(0);
  });

  it('produce 依建築等級產出資源', () => {
    const c = newCity();
    const after = produce(c, 1);
    expect(after.resources.food).toBeGreaterThan(c.resources.food); // 農田產糧
    expect(after.resources.silver).toBeGreaterThan(c.resources.silver); // 錢莊產銀
  });

  it('產出量 = perLevel × 等級', () => {
    const c = newCity();
    const after = produce(c, 1);
    const expectedFood = c.resources.food + BUILDINGS.farm.produces!.perLevel * c.levels.farm;
    expect(after.resources.food).toBe(expectedFood);
  });

  it('資源足夠才能升級，並扣資源', () => {
    let c = newCity();
    c = addResources(c, { wood: 9999, stone: 9999, iron: 9999, silver: 9999 });
    const before = c.levels.farm;
    const r = upgrade(c, 'farm');
    expect(r.ok).toBe(true);
    expect(r.city.levels.farm).toBe(before + 1);
    expect(r.city.resources.wood).toBeLessThan(c.resources.wood);
  });

  it('資源不足無法升級', () => {
    const c = newCity(); // iron=0
    const r = upgrade({ ...c, resources: { food: 0, wood: 0, stone: 0, iron: 0, silver: 0 } }, 'cavalryCamp');
    expect(r.ok).toBe(false);
  });

  it('M5-1 兵營分兵種：各兵種帶兵量由對應兵營等級決定', () => {
    let c = newCity();
    const base = capacityForTroop(c, 'cavalry');
    // 升騎兵營 → 騎兵容量增加，槍兵容量不變
    c = { ...c, levels: { ...c.levels, cavalryCamp: c.levels.cavalryCamp + 2 } };
    expect(capacityForTroop(c, 'cavalry')).toBeGreaterThan(base);
    expect(capacityForTroop(c, 'spear')).toBe(base); // 槍營未升
    // 象兵走槍營、刀盾走盾營、器械走弓營（8 兵種映射 4 營）
    expect(capacityForTroop(c, 'elephant')).toBe(capacityForTroop(c, 'spear'));
    expect(capacityForTroop(c, 'sword')).toBe(capacityForTroop(c, 'shield'));
    expect(capacityForTroop(c, 'apparatus')).toBe(capacityForTroop(c, 'bow'));
  });

  it('升級成本隨等級成長', () => {
    const c5 = upgradeCost('farm', 5);
    const c1 = upgradeCost('farm', 1);
    const sum = (x: ReturnType<typeof upgradeCost>) => Object.values(x).reduce((a, b) => a + b, 0);
    expect(sum(c5)).toBeGreaterThan(sum(c1));
  });

  it('兵營等級越高帶兵越多 (§7.2)', () => {
    expect(troopCapacity(10)).toBeGreaterThan(troopCapacity(5));
  });

  it('canAfford 正確判斷', () => {
    expect(canAfford({ food: 100, wood: 100, stone: 100, iron: 100, silver: 100 }, { food: 50, wood: 0, stone: 0, iron: 0, silver: 0 })).toBe(true);
    expect(canAfford({ food: 10, wood: 0, stone: 0, iron: 0, silver: 0 }, { food: 50, wood: 0, stone: 0, iron: 0, silver: 0 })).toBe(false);
  });
});
