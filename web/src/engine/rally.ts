/**
 * Three Kingdoms Strategy — 同盟集結攻城（M4）
 *
 * 同盟集結（Rally）：盟主發起，同盟成員加入，到時間合力攻打州城/洛陽。
 * 核心玩法：多支部隊同時到達目標格，合併戰力對守軍結算（PvP 核心）。
 *
 * 設計：
 *   - 戰力合併：各部隊帶兵量加總為「集結總兵力」，取參戰者中最高武將屬性加成
 *   - 結算複用 campaign.attackTile + worldmap.captureTile，傳入合併後的 Squad
 *   - 純函式，時間注入 now，可單元測試
 * ⚠️ 禁用 engine barrel index.ts，直接 import 各模組。
 */

import type { Squad } from './types';
import type { Axial, WorldMap } from './worldmap';
import { attackTile, TILES } from './campaign';
import type { TileBattleOutcome, TileLevel } from './campaign';

// ── 集結令狀態 ────────────────────────────────────────────────────
export type RallyStatus = 'gathering' | 'launching' | 'done' | 'cancelled';

export interface RallyOrder {
  id: string;
  allianceId: string;
  targetTile: Axial;           // 目標州城/洛陽格座標
  initiator: string;           // 發起者 playerId
  joiners: string[];           // 已加入的 playerId 列表（含發起者）
  squads: Record<string, Squad>; // playerId → 部隊（加入時提交）
  launchAt: number;            // 預計出發 Unix ms
  status: RallyStatus;
}

// ── 建立集結令 ────────────────────────────────────────────────────
/**
 * 發起集結攻城。
 * 發起者自動加入並提交部隊。
 *
 * @param params.allianceId   發起者所屬同盟 ID
 * @param params.targetTile   目標格座標
 * @param params.initiator    發起者 playerId
 * @param params.initiatorSquad 發起者部隊
 * @param params.launchAt     集結出發時間（Unix ms），由 server 決定（通常 now + 等待時窗）
 */
export function createRally(params: {
  allianceId: string;
  targetTile: Axial;
  initiator: string;
  initiatorSquad: Squad;
  launchAt: number;
}, now: number): { ok: boolean; rally?: RallyOrder; error?: string } {
  if (params.launchAt <= now) {
    return { ok: false, error: '集結出發時間必須在當前時間之後' };
  }
  const rally: RallyOrder = {
    id: `rally_${params.allianceId}_${now}`,
    allianceId: params.allianceId,
    targetTile: params.targetTile,
    initiator: params.initiator,
    joiners: [params.initiator],
    squads: { [params.initiator]: params.initiatorSquad },
    launchAt: params.launchAt,
    status: 'gathering',
  };
  return { ok: true, rally };
}

// ── 加入集結令 ────────────────────────────────────────────────────
/**
 * 同盟成員加入集結。
 * 條件：集結狀態為 gathering + 尚未出發（now < launchAt）+ 玩家未重複加入。
 *
 * @param memberAllianceId  玩家所屬同盟 ID（必須與 rally.allianceId 相同）
 */
export function joinRally(
  rally: RallyOrder,
  playerId: string,
  memberAllianceId: string,
  squad: Squad,
  now: number,
): { ok: boolean; rally?: RallyOrder; error?: string } {
  if (rally.status !== 'gathering') {
    return { ok: false, error: '集結已出發或已結束' };
  }
  if (now >= rally.launchAt) {
    return { ok: false, error: '集結時窗已關閉，無法加入' };
  }
  if (memberAllianceId !== rally.allianceId) {
    return { ok: false, error: '只有同盟成員可加入集結' };
  }
  if (rally.joiners.includes(playerId)) {
    return { ok: false, error: '已加入此集結' };
  }
  const updated: RallyOrder = {
    ...rally,
    joiners: [...rally.joiners, playerId],
    squads: { ...rally.squads, [playerId]: squad },
  };
  return { ok: true, rally: updated };
}

// ── 合併集結部隊（內部輔助）────────────────────────────────────────
/**
 * 把所有參戰部隊合併成單一 Squad 供結算用。
 *
 * 合併策略：
 *   - 帶兵量：各部隊所有 unit 的 troops/hp/maxHp 加總（視為一支超大部隊）
 *   - 英雄屬性：取全體中每項屬性最高值（英雄指揮加成取最強指揮官）
 *   - 使用發起者的英雄作為「集結主將」，僅覆蓋帶兵量數字
 *   - 這是簡化設計，確保集結規模越大越有優勢
 */
export function mergeRallySquads(squads: Squad[]): Squad {
  if (squads.length === 0) throw new Error('無部隊可合併');
  if (squads.length === 1) return squads[0];

  // 總帶兵量
  const totalTroops = squads.reduce((sum, sq) =>
    sum + sq.units.reduce((s, u) => s + u.troops, 0), 0);
  const totalHp = squads.reduce((sum, sq) =>
    sum + sq.units.reduce((s, u) => s + u.hp, 0), 0);
  const totalMaxHp = squads.reduce((sum, sq) =>
    sum + sq.units.reduce((s, u) => s + u.maxHp, 0), 0);

  // 取各部隊第一個 unit（主將），選屬性最強者作代表英雄
  const allUnits = squads.flatMap((sq) => sq.units);
  const bestUnit = allUnits.reduce((best, u) => {
    const bs = best.hero.stats;
    const us = u.hero.stats;
    const bScore = bs.force + bs.intellect + bs.command + bs.speed;
    const uScore = us.force + us.intellect + us.command + us.speed;
    return uScore > bScore ? u : best;
  }, allUnits[0]);

  // 合併成單一 unit，帶兵量為全體總和
  const mergedUnit = {
    ...bestUnit,
    troops: totalTroops,
    hp: totalHp,
    maxHp: totalMaxHp,
    side: 'attacker' as const,
  };

  return {
    units: [mergedUnit],
    morale: Math.max(...squads.map((sq) => sq.morale)),
  };
}

// ── 結算集結攻城 ──────────────────────────────────────────────────
/**
 * 集結到時間後，合併所有部隊戰力對守軍結算。
 * 複用 campaign.attackTile + worldmap.captureTile 邏輯。
 *
 * @returns 更新後地圖、戰報、完成的集結令
 */
export function resolveRally(
  map: WorldMap,
  rally: RallyOrder,
  seed: number,
  now: number,
): { map: WorldMap; outcome: TileBattleOutcome; rally: RallyOrder } {
  if (rally.status !== 'gathering') {
    // 已結算，直接回傳（使用 lv1 佔位格作為 tile，符合 TileBattleOutcome 型別）
    const placeholder: TileLevel = TILES[0];
    return { map, outcome: { tile: placeholder, won: false, turns: 0, playerHpLeft: 0, garrisonHpLeft: 0 }, rally };
  }

  // 合併所有部隊
  const squadsArr = Object.values(rally.squads);
  const mergedSquad = mergeRallySquads(squadsArr);

  // 查目標格等級
  const tileKey = `${rally.targetTile.q},${rally.targetTile.r}`;
  const tile = map.tiles[tileKey];
  const tileLevel = tile?.level ?? 1;
  const tileIdx = Math.min(TILES.length - 1, Math.max(0, tileLevel - 1));

  // 結算戰鬥
  const outcome = attackTile(mergedSquad, TILES[tileIdx], seed);

  // 勝利 → 地塊歸集結發起者（M4.5：集結是協同強攻，攻克即翻面，
  // 不受 captureTile 的「發起者須與目標相鄰」限制——同盟可遠攻州城/洛陽）。
  let updatedMap = map;
  if (outcome.won && tile) {
    updatedMap = { ...map, tiles: { ...map.tiles, [tileKey]: { ...tile, owner: rally.initiator } } };
  }

  const doneRally: RallyOrder = { ...rally, status: 'done' };
  void now; // 時間注入備用（計時/日誌）

  return { map: updatedMap, outcome, rally: doneRally };
}

// ── 取消集結 ─────────────────────────────────────────────────────
/**
 * 發起者可在出發前取消集結。
 */
export function cancelRally(
  rally: RallyOrder,
  requesterId: string,
  now: number,
): { ok: boolean; rally?: RallyOrder; error?: string } {
  if (rally.status !== 'gathering') {
    return { ok: false, error: '集結已出發或已結束，無法取消' };
  }
  if (requesterId !== rally.initiator) {
    return { ok: false, error: '只有發起者可取消集結' };
  }
  void now;
  return { ok: true, rally: { ...rally, status: 'cancelled' } };
}
