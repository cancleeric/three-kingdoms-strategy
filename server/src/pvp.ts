/**
 * 三國誌多人 PvP 戰鬥結算（伺服器端，用共用戰鬥引擎）。
 * 兩名玩家各提交佈陣 → 伺服器用 resolveBattle 決定性結算 → 回傳結果+戰報。
 * 純函式，可單元測試。MMO 多人層的第一塊。
 */
import { ROSTER, RECRUIT_POOL, makeUnit, makeSquad } from '../../engine/src/sampleData';
import { resolveBattle } from '../../engine/src/combat';
import { leveledHero } from '../../engine/src/campaign';
import type { TroopType } from '../../engine/src/types';
import type { BattleResult } from '../../engine/src/combat';

export interface PvpFormationSlot { heroId: string; troop: TroopType }
export interface PvpSubmission {
  formation: PvpFormationSlot[];
  level: number; // 軍隊等級（套用成長）
  troops: number; // 每將帶兵
}

const heroById = (id: string) =>
  RECRUIT_POOL.find((h) => h.id === id) ?? ROSTER.find((h) => h.id === id) ?? ROSTER[0];

function toSquad(sub: PvpSubmission, side: 'attacker' | 'defender') {
  const units = sub.formation.slice(0, 3).map((f) =>
    makeUnit(leveledHero({ hero: heroById(f.heroId), level: sub.level, xp: 0 }), f.troop, sub.troops, side));
  return makeSquad(units.length ? units : [makeUnit(ROSTER[0], 'spear', sub.troops, side)]);
}

export interface PvpResult {
  result: BattleResult;
  winnerSeat: 'A' | 'B' | 'draw';
}

/** 決定性 PvP 結算：A=進攻、B=防守、共用 seed（雙方可重現驗證）。*/
export function resolvePvp(a: PvpSubmission, b: PvpSubmission, seed: number): PvpResult {
  const result = resolveBattle({ attacker: toSquad(a, 'attacker'), defender: toSquad(b, 'defender'), seed });
  const winnerSeat = result.winner === 'attacker' ? 'A' : result.winner === 'defender' ? 'B' : 'draw';
  return { result, winnerSeat };
}
