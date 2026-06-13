/**
 * Three Kingdoms Strategy — 陣營系統（§4 M3：魏蜀吳群）
 *
 * 四陣營協力佔州城，以陣營佔城數作為賽季勝利條件基礎。
 * 純資料 + 純函式，無框架相依，可單元測試。
 */

import type { FactionId } from './types';
import type { StateId } from './worldmap';

// ── 陣營狀態 ────────────────────────────────────────────────────
export interface FactionState {
  factionId: FactionId;
  /** 已加入此陣營的玩家 ID 列表 */
  members: string[];
  /** 州城控制者：StateId → playerId（佔領者）| null（中立/無人佔）*/
  capitalTiles: Partial<Record<StateId, string | null>>;
  /** 陣營共建工程進度（工程 id → 當前進度點）*/
  buildings: Record<string, number>;
}

/** 初始化四陣營（全員為空、州城全中立） */
export function newFactionStates(): Record<FactionId, FactionState> {
  const init = (factionId: FactionId): FactionState => ({
    factionId,
    members: [],
    capitalTiles: {},
    buildings: {},
  });
  return {
    wei: init('wei'),
    shu: init('shu'),
    wu:  init('wu'),
    qun: init('qun'),
  };
}

/**
 * 玩家加入陣營（一次性，不可換）。
 * 若玩家已在此陣營，回傳原狀態不重複加入。
 */
export function joinFaction(state: FactionState, playerId: string): FactionState {
  if (state.members.includes(playerId)) return state;
  return { ...state, members: [...state.members, playerId] };
}

/**
 * 查詢陣營佔領的州城數。
 * capitalTiles 中 value 不為 null 且為陣營成員 playerId 的格數。
 */
export function factionCityCount(state: FactionState): number {
  return Object.values(state.capitalTiles).filter(
    (owner) => owner !== null && owner !== undefined && state.members.includes(owner as string),
  ).length;
}

/**
 * 計算陣營加成（依成員數 + 佔城數）。
 *
 * 設計：
 *   marchSpeed 加成（%）：每 3 名成員 +1%，每佔 1 州城 +2%，上限 15%
 *   troopBonus 加成（%）：每佔 1 州城 +3%，上限 15%
 */
export function factionPerk(state: FactionState): { marchSpeed: number; troopBonus: number } {
  const memberCount = state.members.length;
  const cityCount = factionCityCount(state);

  const marchSpeed = Math.min(15, Math.floor(memberCount / 3) + cityCount * 2);
  const troopBonus = Math.min(15, cityCount * 3);

  return { marchSpeed, troopBonus };
}

/**
 * 更新州城佔領狀態（worldmap captureTile 後呼叫）。
 * stateId 是被佔領格對應的州，playerId 是新佔領者。
 */
export function setCapital(state: FactionState, stateId: StateId, playerId: string | null): FactionState {
  return {
    ...state,
    capitalTiles: { ...state.capitalTiles, [stateId]: playerId },
  };
}

/**
 * 推進陣營建設工程（例如洛陽共建）。
 * 回傳更新後的 FactionState（buildings[buildingId] 加上 amount）。
 */
export function contributeBuilding(state: FactionState, buildingId: string, amount: number): FactionState {
  const current = state.buildings[buildingId] ?? 0;
  return { ...state, buildings: { ...state.buildings, [buildingId]: current + amount } };
}
