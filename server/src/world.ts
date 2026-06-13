/**
 * 三國誌世界地圖 march 結算（伺服器端，用共用引擎）。
 * 玩家對中立地塊出兵 → 依地塊等級生成守軍 → resolveBattle 決定性結算。
 * 純函式，可單元測試。直接 import 各模組（避免 engine barrel 的 tsx ESM 解析問題）。
 */
import { ROSTER, RECRUIT_POOL, makeUnit, makeSquad } from '../../engine/src/sampleData';
import { leveledHero, attackTile, TILES } from '../../engine/src/campaign';
import type { Squad, TroopType } from '../../engine/src/types';
import type { PvpSubmission } from './pvp';
import type { TileBattleOutcome } from '../../engine/src/campaign';

const heroById = (id: string) =>
  RECRUIT_POOL.find((h) => h.id === id) ?? ROSTER.find((h) => h.id === id) ?? ROSTER[0];

function toAttackSquad(sub: PvpSubmission): Squad {
  const units = sub.formation.slice(0, 3).map((f) =>
    makeUnit(leveledHero({ hero: heroById(f.heroId), level: sub.level, xp: 0 }), f.troop, sub.troops, 'attacker'));
  return makeSquad(units.length ? units : [makeUnit(ROSTER[0], 'spear', sub.troops, 'attacker')]);
}

/** 對 tileLevel 守軍出兵，回傳戰報（won 決定地塊是否翻面）。 */
export function marchBattle(sub: PvpSubmission, tileLevel: number, seed: number): TileBattleOutcome {
  const idx = Math.min(TILES.length - 1, Math.max(0, tileLevel - 1));
  return attackTile(toAttackSquad(sub), TILES[idx], seed);
}
