/**
 * Three Kingdoms Strategy — 存檔序列化（單人戰役進度持久化）
 *
 * 純函式：把戰役狀態壓成最小可序列化 SaveState（武將存 id，載入時從名冊還原），
 * 與 localStorage I/O 解耦，可單元測試。GDD §13.3 帳號跨賽季保留的雛形。
 */
import type { Hero, TroopType } from './types';
import type { CampaignHero } from './campaign';
import type { City } from './city';
import type { Roster } from './gacha';

export const SAVE_VERSION = 4; // M5-1 兵營分兵種，city schema 變更

export interface CampaignState {
  formation: { id: string; troop: TroopType }[];
  commander: CampaignHero; // commander.hero 為完整 Hero（執行期用）
  city: City;
  roster: Roster; // 招募名冊（含紅度/pity）
  tileIdx: number;
  seedCtr: number;
  season?: { seasonNumber: number; seasonType: string; prestige: number; rank: number }; // §13 賽季帳號
}

export interface SaveState {
  v: number;
  formation: { id: string; troop: TroopType }[];
  commanderId: string;
  level: number;
  xp: number;
  city: City;
  roster: { owned: Record<string, number>; pity: number }; // heroId → 紅度
  tileIdx: number;
  seedCtr: number;
  season?: { seasonNumber: number; seasonType: string; prestige: number; rank: number };
}

export function serializeCampaign(s: CampaignState): SaveState {
  const owned: Record<string, number> = {};
  Object.values(s.roster.owned).forEach((o) => { owned[o.hero.id] = o.redStars; });
  return {
    v: SAVE_VERSION,
    formation: s.formation,
    commanderId: s.commander.hero.id,
    level: s.commander.level,
    xp: s.commander.xp,
    city: s.city,
    roster: { owned, pity: s.roster.pity },
    tileIdx: s.tileIdx,
    seedCtr: s.seedCtr,
    season: s.season,
  };
}

/** 從存檔還原；pool 用於把 id 還原成完整 Hero。版本不符或找不到主將回 null。*/
export function deserializeCampaign(save: SaveState, pool: Hero[]): CampaignState | null {
  if (!save || save.v !== SAVE_VERSION) return null;
  const hero = pool.find((h) => h.id === save.commanderId);
  if (!hero) return null;
  const owned: Roster['owned'] = {};
  Object.entries(save.roster?.owned ?? {}).forEach(([id, redStars]) => {
    const h = pool.find((x) => x.id === id);
    if (h) owned[id] = { hero: h, redStars };
  });
  return {
    formation: save.formation,
    commander: { hero, level: save.level, xp: save.xp },
    city: save.city,
    roster: { owned, pity: save.roster?.pity ?? 0 },
    tileIdx: save.tileIdx,
    seedCtr: save.seedCtr,
    season: save.season,
  };
}
