/**
 * Three Kingdoms Strategy — 存檔序列化（單人戰役進度持久化）
 *
 * 純函式：把戰役狀態壓成最小可序列化 SaveState（武將存 id，載入時從名冊還原），
 * 與 localStorage I/O 解耦，可單元測試。GDD §13.3 帳號跨賽季保留的雛形。
 */
import type { Hero, TroopType } from './types';
import type { CampaignHero } from './campaign';
import type { City } from './city';

export const SAVE_VERSION = 1;

export interface CampaignState {
  formation: { id: string; troop: TroopType }[];
  commander: CampaignHero; // commander.hero 為完整 Hero（執行期用）
  city: City;
  tileIdx: number;
  seedCtr: number;
}

export interface SaveState {
  v: number;
  formation: { id: string; troop: TroopType }[];
  commanderId: string;
  level: number;
  xp: number;
  city: City;
  tileIdx: number;
  seedCtr: number;
}

export function serializeCampaign(s: CampaignState): SaveState {
  return {
    v: SAVE_VERSION,
    formation: s.formation,
    commanderId: s.commander.hero.id,
    level: s.commander.level,
    xp: s.commander.xp,
    city: s.city,
    tileIdx: s.tileIdx,
    seedCtr: s.seedCtr,
  };
}

/** 從存檔還原；roster 用於把 commanderId 還原成完整 Hero。版本不符回 null。*/
export function deserializeCampaign(save: SaveState, roster: Hero[]): CampaignState | null {
  if (!save || save.v !== SAVE_VERSION) return null;
  const hero = roster.find((h) => h.id === save.commanderId);
  if (!hero) return null;
  return {
    formation: save.formation,
    commander: { hero, level: save.level, xp: save.xp },
    city: save.city,
    tileIdx: save.tileIdx,
    seedCtr: save.seedCtr,
  };
}
