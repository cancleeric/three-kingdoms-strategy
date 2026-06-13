/**
 * 範例英雄 / 戰法資料（供引擎測試與 demo 原型用）。
 * 數值為原型用佔位值，正式平衡見 docs/BALANCE.md（待建）。
 */
import type { Hero, Tactic, BattleUnit, Squad, TroopType } from './types';

const tactic = (p: Partial<Tactic> & Pick<Tactic, 'id' | 'name' | 'type'>): Tactic => ({
  level: 1,
  triggerRate: 0.35,
  coefficient: 1.4,
  damageKind: 'physical',
  targets: 1,
  ...p,
});

// 自帶戰法
const zhaoYunInnate = tactic({ id: 't_zhaoyun_innate', name: '龍膽', type: 'innate', triggerRate: 0.4, coefficient: 1.8, damageKind: 'physical', targets: 2 });
const luXunInnate = tactic({ id: 't_luxun_innate', name: '火計', type: 'innate', triggerRate: 0.4, coefficient: 1.9, damageKind: 'strategic', targets: 2 });
const genericActive = tactic({ id: 't_assault_break', name: '突陣', type: 'active', triggerRate: 0.35, coefficient: 1.5, damageKind: 'physical' });

const apt = (s: TroopType, rest: Partial<Record<TroopType, 'S' | 'A' | 'B' | 'C'>> = {}) =>
  ({ cavalry: 'C', spear: 'C', shield: 'C', bow: 'C', apparatus: 'C', [s]: 'S', ...rest } as Hero['aptitude']);

export const ZHAO_YUN: Hero = {
  id: 'zhaoyun', name: '趙雲', rarity: 6, redStars: 0,
  stats: { force: 195, intellect: 120, command: 180, speed: 160, politics: 90, charm: 130 },
  aptitude: apt('cavalry', { spear: 'A' }), innate: zhaoYunInnate, tactics: [genericActive],
};

export const LU_XUN: Hero = {
  id: 'luxun', name: '陸遜', rarity: 6, redStars: 0,
  stats: { force: 110, intellect: 200, command: 165, speed: 150, politics: 160, charm: 140 },
  aptitude: apt('bow', { apparatus: 'A' }), innate: luXunInnate, tactics: [],
};

export const GUAN_PING: Hero = { // §4.3 新手贈送
  id: 'guanping', name: '關平', rarity: 4, redStars: 0,
  stats: { force: 150, intellect: 95, command: 140, speed: 120, politics: 70, charm: 90 },
  aptitude: apt('spear'), innate: tactic({ id: 't_guanping_innate', name: '搦戰', type: 'innate', triggerRate: 0.3, coefficient: 1.3 }), tactics: [],
};

export function makeUnit(hero: Hero, troopType: TroopType, troops: number, side: BattleUnit['side']): BattleUnit {
  return { hero, troopType, troops, hp: troops, maxHp: troops, side };
}

export function makeSquad(units: BattleUnit[]): Squad {
  return { units, morale: 100 };
}
