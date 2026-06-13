/**
 * Three Kingdoms Strategy — 體力系統（M5-2，對齊真實《三戰》武將體力 120/120）
 *
 * SLG 節奏節流閥：每次出兵打地消耗體力，體力隨真實時間回復，體力不足不能出兵。
 * 純函式，時間注入 now（可單元測試，不在純函式內呼叫 Date.now）。
 */

export interface Stamina {
  value: number;     // 上次更新時的體力值
  max: number;
  updatedAt: number; // 上次更新時刻（Unix ms）
}

export const STAMINA_MAX = 120;
export const ATTACK_COST = 15;        // 每次打地消耗
export const REGEN_PER_MIN = 12;      // 每分鐘回復（12/min = 1 點 / 5 秒）

export function newStamina(now: number, max = STAMINA_MAX): Stamina {
  return { value: max, max, updatedAt: now };
}

/** 計算 now 時刻的當前體力（含自 updatedAt 起的時間回復，封頂 max）。 */
export function currentStamina(s: Stamina, now: number): number {
  const elapsedMin = Math.max(0, (now - s.updatedAt) / 60_000);
  const regen = elapsedMin * REGEN_PER_MIN;
  return Math.min(s.max, Math.floor(s.value + regen));
}

/** 是否足夠出兵（當前體力 >= cost）。 */
export function hasStamina(s: Stamina, now: number, cost = ATTACK_COST): boolean {
  return currentStamina(s, now) >= cost;
}

/** 消耗體力：先結算回復再扣除，更新 updatedAt。不足則回 ok:false 不扣。 */
export function spend(s: Stamina, now: number, cost = ATTACK_COST): { ok: boolean; stamina: Stamina } {
  const cur = currentStamina(s, now);
  if (cur < cost) return { ok: false, stamina: { value: cur, max: s.max, updatedAt: now } };
  return { ok: true, stamina: { value: cur - cost, max: s.max, updatedAt: now } };
}

/** 還剩多少秒回滿（UI 顯示用）。已滿回 0。 */
export function secondsToFull(s: Stamina, now: number): number {
  const cur = currentStamina(s, now);
  if (cur >= s.max) return 0;
  return Math.ceil(((s.max - cur) / REGEN_PER_MIN) * 60);
}
