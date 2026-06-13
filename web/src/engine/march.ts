/**
 * Three Kingdoms Strategy — 行軍時間 SLG（M2）
 *
 * 純函式模組，供 server tick 與 unit test 共用。
 * ⚠️ 所有時間計算皆接受 `now: number` 參數注入，禁止在純函式內呼叫 Date.now()。
 *
 * BASE_MARCH_MS：每格基礎行軍毫秒數，預設 30000（30 秒/格）。
 * 可透過 process.env.MARCH_MS 覆蓋（方便親測用短秒數）。
 */

import { hexDist, canMarch, captureTile } from './worldmap';
import type { Axial, WorldMap } from './worldmap';
import type { Squad } from './types';
import { attackTile, TILES } from './campaign';
import type { TileBattleOutcome } from './campaign';

// ── 基礎常數（env 可覆寫）──────────────────────────────────────────
// server 端透過 process.env.MARCH_MS 覆寫（方便短秒親測）。
// web 環境無 process，直接用預設值；server import 此模組時才讀 env。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _envMs: string | undefined = (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.MARCH_MS) as string | undefined;
export const BASE_MARCH_MS: number = _envMs ? Number(_envMs) : 30_000;

// ── 行軍令型別 ────────────────────────────────────────────────────
export interface MarchOrder {
  id: string;           // 唯一 ID
  playerId: string;
  squadId: string;      // 哪支部隊
  from: Axial;          // 出發地塊
  to: Axial;            // 目標地塊
  departAt: number;     // Unix timestamp ms（送出時刻）
  arriveAt: number;     // 預計到達 timestamp
  status: 'marching' | 'arrived' | 'returning' | 'done';
}

// ── 計算行軍時間（ms）────────────────────────────────────────────
/**
 * 基礎時間：地塊距離 × BASE_MARCH_MS
 * marchSpeedBonus：% 加速（同盟科技 marchSpeed，0 = 無加速；20 = 縮短 20%）
 */
export function calcMarchDuration(
  from: Axial,
  to: Axial,
  marchSpeedBonus: number,
): number {
  const dist = hexDist(from, to);
  const base = dist * BASE_MARCH_MS;
  const factor = 1 - marchSpeedBonus / 100;
  return Math.max(1, Math.round(base * factor));
}

// ── 發出行軍令 ───────────────────────────────────────────────────
/**
 * 檢核 canMarch（目標中立且與玩家相鄰），通過才建立 MarchOrder。
 * @param order  省略 id/departAt/arriveAt/status 的草稿令
 * @param now    呼叫時刻的 Unix ms（由 server 傳入）
 */
export function sendMarch(
  map: WorldMap,
  order: Omit<MarchOrder, 'id' | 'departAt' | 'arriveAt' | 'status'>,
  now: number,
  marchSpeedBonus: number,
): { ok: boolean; order?: MarchOrder; error?: string } {
  if (!canMarch(map, order.playerId, order.to)) {
    return { ok: false, error: '目標地塊非中立，或非相鄰己方地塊' };
  }
  const duration = calcMarchDuration(order.from, order.to, marchSpeedBonus);
  const fullOrder: MarchOrder = {
    id: `march_${order.playerId}_${now}`,
    ...order,
    departAt: now,
    arriveAt: now + duration,
    status: 'marching',
  };
  return { ok: true, order: fullOrder };
}

// ── 到達檢查 ─────────────────────────────────────────────────────
/**
 * 回傳 true 當且僅當 now >= arriveAt 且 status 仍為 'marching'
 */
export function checkArrival(order: MarchOrder, now: number): boolean {
  return order.status === 'marching' && now >= order.arriveAt;
}

// ── 到達後結算戰鬥 ────────────────────────────────────────────────
/**
 * 複用 campaign.attackTile 結算守軍（依地塊等級選 TILES 守軍）。
 * 勝利後呼叫 worldmap.captureTile 翻面。
 * 回傳：更新後地圖、戰報、order（status=done）。
 */
export function resolveMarchArrival(
  map: WorldMap,
  playerSquad: Squad,
  order: MarchOrder,
  seed: number,
): { map: WorldMap; outcome: TileBattleOutcome; order: MarchOrder } {
  const tile = map.tiles[`${order.to.q},${order.to.r}`];
  const tileLevel = tile?.level ?? 1;
  const idx = Math.min(TILES.length - 1, Math.max(0, tileLevel - 1));

  const outcome = attackTile(playerSquad, TILES[idx], seed);

  let updatedMap = map;
  if (outcome.won) {
    const cap = captureTile(map, order.playerId, order.to);
    if (cap.ok) updatedMap = cap.map;
  }

  const doneOrder: MarchOrder = { ...order, status: 'done' };
  return { map: updatedMap, outcome, order: doneOrder };
}

// ── 補兵時間 ─────────────────────────────────────────────────────
/** 補兵時間（ms）：1000 ms/兵 */
export function troopRecruitDuration(amount: number): number {
  return amount * 1_000;
}
