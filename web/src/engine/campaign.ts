/**
 * Three Kingdoms Strategy — 單人戰役（打地）模組
 *
 * 對應 GDD §3 核心循環、§10.1 地塊等級、§5.3 英雄升級。
 * 把戰鬥引擎包成「逐關打地、贏了升級、推進到洛陽」的單人遊戲循環。
 */

import type { Hero, Squad, BattleUnit, TroopType } from './types';
import { resolveBattle } from './combat';

// ── §10.1 地塊等級表（守軍強度逐級提升）──────────────────────
export interface TileLevel {
  level: number;
  name: string; // 關卡名
  recHeroLv: number; // 建議英雄等級
  garrisonForce: number; // 守軍主將基礎武力
  garrisonTroops: number; // 守軍兵量
  garrisonTroop: TroopType;
  reward: { xp: number; silver: number }; // 通關獎勵（§11）
}

// §2 戰略地標：終點洛陽（§10 主目標）
export const TILES: TileLevel[] = [
  { level: 1, name: '荒野 Lv.1', recHeroLv: 1, garrisonForce: 80, garrisonTroops: 800, garrisonTroop: 'spear', reward: { xp: 50, silver: 100 } },
  { level: 2, name: '村落 Lv.2', recHeroLv: 5, garrisonForce: 110, garrisonTroops: 1500, garrisonTroop: 'shield', reward: { xp: 90, silver: 180 } },
  { level: 3, name: '關隘 Lv.3', recHeroLv: 10, garrisonForce: 140, garrisonTroops: 2400, garrisonTroop: 'bow', reward: { xp: 150, silver: 300 } },
  { level: 4, name: '縣城 Lv.4', recHeroLv: 18, garrisonForce: 165, garrisonTroops: 3500, garrisonTroop: 'cavalry', reward: { xp: 240, silver: 480 } },
  { level: 5, name: '郡城 Lv.5', recHeroLv: 22, garrisonForce: 185, garrisonTroops: 5000, garrisonTroop: 'spear', reward: { xp: 360, silver: 720 } },
  { level: 6, name: '雄關 Lv.6', recHeroLv: 35, garrisonForce: 205, garrisonTroops: 7000, garrisonTroop: 'shield', reward: { xp: 540, silver: 1080 } },
  { level: 7, name: '虎牢關 Lv.7', recHeroLv: 42, garrisonForce: 225, garrisonTroops: 9500, garrisonTroop: 'cavalry', reward: { xp: 800, silver: 1600 } },
  { level: 8, name: '洛陽（終點）', recHeroLv: 50, garrisonForce: 250, garrisonTroops: 13000, garrisonTroop: 'cavalry', reward: { xp: 1200, silver: 3000 } },
];

// ── §5.3 英雄等級 → 屬性成長（每級 +2% 武力/智力，封頂 50）──────
export interface CampaignHero {
  hero: Hero;
  level: number;
  xp: number;
}

const XP_PER_LEVEL = (lv: number) => 80 + lv * 40; // 升下一級所需 XP

export function grantXp(ch: CampaignHero, xp: number): CampaignHero {
  let { level, xp: cur } = ch;
  cur += xp;
  while (level < 50 && cur >= XP_PER_LEVEL(level)) {
    cur -= XP_PER_LEVEL(level);
    level += 1;
  }
  return { hero: ch.hero, level, xp: cur };
}

/** 依等級放大英雄屬性（§5.3 成長），回傳戰鬥用 Hero */
export function leveledHero(ch: CampaignHero): Hero {
  const g = 1 + (ch.level - 1) * 0.02;
  const s = ch.hero.stats;
  return {
    ...ch.hero,
    stats: { ...s, force: Math.round(s.force * g), intellect: Math.round(s.intellect * g), command: Math.round(s.command * (1 + (ch.level - 1) * 0.01)) },
  };
}

// ── 守軍生成（依地塊等級）──────────────────────────────────────
function garrisonHero(t: TileLevel): Hero {
  return {
    id: `garrison_${t.level}`, name: `守將·${t.name}`, rarity: 4, redStars: 0,
    stats: { force: t.garrisonForce, intellect: t.garrisonForce * 0.6, command: t.garrisonForce * 0.9, speed: 100 + t.level * 5, politics: 50, charm: 50 },
    aptitude: { cavalry: 'B', spear: 'B', shield: 'B', bow: 'B', apparatus: 'B' },
    innate: { id: `g_innate_${t.level}`, name: '據守', type: 'passive', level: 1, triggerRate: 0.3, coefficient: 1.2, damageKind: 'physical', targets: 1 },
    tactics: [],
  };
}

export function makeGarrison(t: TileLevel): Squad {
  const u: BattleUnit = {
    hero: garrisonHero(t), troopType: t.garrisonTroop,
    troops: t.garrisonTroops, hp: t.garrisonTroops, maxHp: t.garrisonTroops, side: 'defender',
  };
  return { units: [u], morale: 100 };
}

// ── 打一關：玩家隊 vs 該地塊守軍 ───────────────────────────────
export interface TileBattleOutcome {
  tile: TileLevel;
  won: boolean;
  turns: number;
  playerHpLeft: number;
  garrisonHpLeft: number;
  reward?: { xp: number; silver: number };
}

export function attackTile(playerSquad: Squad, tile: TileLevel, seed: number): TileBattleOutcome {
  // 不可變動入參：複製玩家隊（保留原兵量供 UI 顯示）
  const att: Squad = { morale: 100, units: playerSquad.units.map((u) => ({ ...u, hp: u.maxHp, side: 'attacker' as const })) };
  const def = makeGarrison(tile);
  const r = resolveBattle({ attacker: att, defender: def, seed });
  const won = r.winner === 'attacker';
  return {
    tile, won, turns: r.turns,
    playerHpLeft: r.attackerHpLeft, garrisonHpLeft: r.defenderHpLeft,
    reward: won ? tile.reward : undefined,
  };
}
