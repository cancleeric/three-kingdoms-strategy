import { describe, it, expect } from 'vitest';
import { newStamina, currentStamina, hasStamina, spend, secondsToFull, STAMINA_MAX, ATTACK_COST, REGEN_PER_MIN } from './stamina';

const T0 = 1_000_000_000_000; // 固定起始時刻

describe('stamina — 體力系統 (M5-2)', () => {
  it('新體力為滿', () => {
    const s = newStamina(T0);
    expect(currentStamina(s, T0)).toBe(STAMINA_MAX);
  });

  it('出兵消耗體力', () => {
    const r = spend(newStamina(T0), T0);
    expect(r.ok).toBe(true);
    expect(currentStamina(r.stamina, T0)).toBe(STAMINA_MAX - ATTACK_COST);
  });

  it('隨時間回復（每分鐘 REGEN_PER_MIN）', () => {
    let s = spend(newStamina(T0), T0).stamina; // 120-15=105
    // 過 5 分鐘 → +60，但封頂 120
    expect(currentStamina(s, T0 + 5 * 60_000)).toBe(STAMINA_MAX);
    // 只過 1 分鐘 → 105 + 12 = 117
    expect(currentStamina(s, T0 + 60_000)).toBe(105 + REGEN_PER_MIN);
  });

  it('體力不足不能出兵、不扣除', () => {
    // 連續花到不足
    let s = newStamina(T0, 20); // max 20
    const first = spend(s, T0); // 20-15=5
    expect(first.ok).toBe(true);
    const second = spend(first.stamina, T0); // 5 < 15
    expect(second.ok).toBe(false);
    expect(currentStamina(second.stamina, T0)).toBe(5); // 未扣
    expect(hasStamina(first.stamina, T0)).toBe(false);
  });

  it('回滿秒數計算', () => {
    const s = spend(newStamina(T0), T0).stamina; // 105/120，差 15
    // 15 點 / 12 每分 = 1.25 分 = 75 秒
    expect(secondsToFull(s, T0)).toBe(75);
    expect(secondsToFull(newStamina(T0), T0)).toBe(0); // 已滿
  });
});
