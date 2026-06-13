/**
 * Three Kingdoms Strategy — 同盟系統（§12）
 *
 * §12.1 結構（盟主/副盟主/階級/上限 100）、§12.3 盟科技（捐獻→研究→全盟加成）。
 * 純資料 + 純函式（伺服器端持有狀態），可單元測試。
 */

// §12.1 內部階級
export type AllianceRank = 'leader' | 'vice' | 'officer' | 'member';
export const RANK_NAME: Record<AllianceRank, string> = { leader: '盟主', vice: '副盟主', officer: '官員', member: '盟眾' };

export interface AllianceMember {
  playerId: string;
  name: string;
  rank: AllianceRank;
  contribution: number; // 捐獻累積
}

// §12.3 盟科技
export type AllianceTechId = 'marchSpeed' | 'troopCapacity' | 'tileYield';
export interface AllianceTechDef { id: AllianceTechId; name: string; perLevel: number; unit: string; }
export const ALLIANCE_TECH: Record<AllianceTechId, AllianceTechDef> = {
  marchSpeed: { id: 'marchSpeed', name: '行軍加速', perLevel: 2, unit: '%' },
  troopCapacity: { id: 'troopCapacity', name: '帶兵擴充', perLevel: 3, unit: '%' },
  tileYield: { id: 'tileYield', name: '領地增產', perLevel: 4, unit: '%' },
};

export interface Alliance {
  id: string;
  name: string;
  members: Record<string, AllianceMember>; // playerId → member
  tech: Record<AllianceTechId, { level: number; progress: number }>;
}

export const MAX_MEMBERS = 100;
const TECH_COST = (level: number) => 500 + level * 500; // 升下一級所需總捐獻

export function newAlliance(id: string, name: string, leaderId: string, leaderName: string): Alliance {
  return {
    id, name,
    members: { [leaderId]: { playerId: leaderId, name: leaderName, rank: 'leader', contribution: 0 } },
    tech: { marchSpeed: { level: 0, progress: 0 }, troopCapacity: { level: 0, progress: 0 }, tileYield: { level: 0, progress: 0 } },
  };
}

export function memberCount(a: Alliance): number { return Object.keys(a.members).length; }

export function joinAlliance(a: Alliance, playerId: string, name: string): { ok: boolean; alliance: Alliance; error?: string } {
  if (a.members[playerId]) return { ok: true, alliance: a };
  if (memberCount(a) >= MAX_MEMBERS) return { ok: false, alliance: a, error: '同盟已滿（100 人）' };
  return { ok: true, alliance: { ...a, members: { ...a.members, [playerId]: { playerId, name, rank: 'member', contribution: 0 } } } };
}

export function leaveAlliance(a: Alliance, playerId: string): Alliance {
  const members = { ...a.members };
  delete members[playerId];
  return { ...a, members };
}

/** §12.3 捐獻：累進科技 progress，達門檻升級 */
export function donate(a: Alliance, playerId: string, tech: AllianceTechId, amount: number): Alliance {
  const m = a.members[playerId];
  if (!m || amount <= 0) return a;
  const t = { ...a.tech[tech] };
  t.progress += amount;
  while (t.progress >= TECH_COST(t.level)) { t.progress -= TECH_COST(t.level); t.level += 1; }
  return {
    ...a,
    members: { ...a.members, [playerId]: { ...m, contribution: m.contribution + amount } },
    tech: { ...a.tech, [tech]: t },
  };
}

/** 全盟加成（§12.3）：科技等級 × 每級加成 */
export function alliancePerks(a: Alliance): Record<AllianceTechId, number> {
  return {
    marchSpeed: a.tech.marchSpeed.level * ALLIANCE_TECH.marchSpeed.perLevel,
    troopCapacity: a.tech.troopCapacity.level * ALLIANCE_TECH.troopCapacity.perLevel,
    tileYield: a.tech.tileYield.level * ALLIANCE_TECH.tileYield.perLevel,
  };
}
