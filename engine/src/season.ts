/**
 * Three Kingdoms Strategy — 賽季系統（§13）
 *
 * §13.3 跨賽季繼承：英雄/紅度/招募名冊 PERSIST；地圖進度/城建/佈陣 RESET。
 * §13.2 結算：依賽季表現給聲望、帳號升階。把單人戰役包成可重複的「賽季」元循環。
 * 純函式，可單元測試。
 */
import type { Roster } from './gacha';

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
