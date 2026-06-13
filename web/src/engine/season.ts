/**
 * Three Kingdoms Strategy — 賽季系統（§13）
 *
 * §13.3 跨賽季繼承：英雄/紅度/招募名冊 PERSIST；地圖進度/城建/佈陣 RESET。
 * §13.2 結算：依賽季表現給聲望、帳號升階。把單人戰役包成可重複的「賽季」元循環。
 * M4：接入陣營佔城數 + 洛陽控制者，算出賽季陣營排名與勝利陣營。
 * 純函式，可單元測試。
 */
import type { Roster } from './gacha';
import type { FactionId } from './types';
import type { FactionState } from './faction';
import { factionCityCount } from './faction';

// §13.1 賽季類型
export type SeasonType = 'S1' | 'PK' | 'hanzhong' | 'qunxiong' | 'yanyi';
export const SEASON_NAME: Record<SeasonType, string> = {
  S1: 'S1 新手賽季', PK: 'PK 標準賽季', hanzhong: '漢中爭奪', qunxiong: '群雄逐鹿', yanyi: '演弈劇本',
};

/** 帳號級狀態：跨賽季保留（§13.3）*/
export interface Account {
  seasonNumber: number;
  seasonType: SeasonType;
  prestige: number; // §13.2 聲望，跨賽季累積
  rank: number; // 帳號階級（聲望換算）
  roster: Roster; // 英雄+紅度，跨賽季保留
}

const SEASON_ORDER: SeasonType[] = ['S1', 'PK', 'hanzhong', 'qunxiong', 'yanyi'];

export function newAccount(roster: Roster): Account {
  return { seasonNumber: 1, seasonType: 'S1', prestige: 0, rank: 1, roster };
}

function rankOf(prestige: number): number {
  return 1 + Math.floor(prestige / 500); // 每 500 聲望升一階
}

/** §13.2 賽季結算：依通關進度(tileIdx/8)給聲望 */
export function settleSeason(account: Account, roster: Roster, tilesCleared: number): Account {
  const cleared = Math.max(0, Math.min(8, tilesCleared));
  const gained = cleared * 100 + (cleared >= 8 ? 500 : 0); // 攻克洛陽額外 +500
  const prestige = account.prestige + gained;
  return { ...account, prestige, rank: rankOf(prestige), roster };
}

/** 進入下一賽季：英雄/紅度/聲望保留，賽季號+1、類型輪替（§13.3 map/buildings reset 由戰役端重置）*/
export function advanceSeason(account: Account): Account {
  const nextNum = account.seasonNumber + 1;
  const nextType = SEASON_ORDER[(SEASON_ORDER.indexOf(account.seasonType) + 1) % SEASON_ORDER.length];
  return { ...account, seasonNumber: nextNum, seasonType: nextType };
}

/** 賽季結算 + 進入下一賽季（一步）*/
export function endAndAdvance(account: Account, roster: Roster, tilesCleared: number): { account: Account; gainedPrestige: number } {
  const before = account.prestige;
  const settled = settleSeason(account, roster, tilesCleared);
  const advanced = advanceSeason(settled);
  return { account: advanced, gainedPrestige: settled.prestige - before };
}

// ── M4：陣營賽季勝利條件 ────────────────────────────────────────────

/**
 * 賽季陣營排名項目
 */
export interface FactionSeasonRank {
  factionId: FactionId;
  cityCount: number;          // 陣營佔領的州城數
  hasLuoyang: boolean;        // 是否控制洛陽（州城 'si'）
  score: number;              // 綜合分：洛陽 = 10 分 + 城數
}

/**
 * 賽季結算結果（陣營層面）
 */
export interface SeasonSettleResult {
  rankings: FactionSeasonRank[];   // 由高到低排序
  winner: FactionId;               // 勝利陣營
  isTie: boolean;                  // 是否平局（同分，依 factionId 字母序決定）
}

/**
 * M4 賽季勝利條件判定：
 *   - 洛陽（stateId='si'）控制陣營得 10 分
 *   - 每佔一個其他州城得 1 分
 *   - 分數最高者為勝利陣營；同分時依 factionId 字母序（稀少邊角情況）
 *
 * @param factionStates  四陣營狀態（Record<FactionId, FactionState>）
 * @param luoyangOwnerFactionId  控制洛陽的陣營（null = 無人控制）
 */
export function resolveSeasonRanking(
  factionStates: Record<FactionId, FactionState>,
  luoyangOwnerFactionId: FactionId | null,
): SeasonSettleResult {
  const FACTION_IDS: FactionId[] = ['wei', 'shu', 'wu', 'qun'];

  const rankings: FactionSeasonRank[] = FACTION_IDS.map((fid) => {
    const state = factionStates[fid];
    const cityCount = factionCityCount(state);
    const hasLuoyang = luoyangOwnerFactionId === fid;
    const score = cityCount + (hasLuoyang ? 10 : 0);
    return { factionId: fid, cityCount, hasLuoyang, score };
  });

  // 由高到低；同分時字母序小的排前面（穩定決勝）
  rankings.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.factionId < b.factionId ? -1 : 1;
  });

  const topScore = rankings[0].score;
  const isTie = rankings.filter((r) => r.score === topScore).length > 1;

  return {
    rankings,
    winner: rankings[0].factionId,
    isTie,
  };
}

/**
 * 判斷某陣營是否已達「即時勝利」條件：
 *   控制洛陽連續 N 回合（預設 3 回合）。
 *   此函式供 server tick 呼叫，追蹤每回合的洛陽控制狀態。
 */
export function checkInstantWin(
  luoyangHistory: FactionId[],  // 最近 N 回合的洛陽控制者（依時序 push）
  requiredRounds: number = 3,
): FactionId | null {
  if (luoyangHistory.length < requiredRounds) return null;
  const recent = luoyangHistory.slice(-requiredRounds);
  const first = recent[0];
  if (recent.every((fid) => fid === first)) return first;
  return null;
}
