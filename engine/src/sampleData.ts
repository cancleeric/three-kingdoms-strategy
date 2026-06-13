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
export const genericActive = tactic({ id: 't_assault_break', name: '突陣', type: 'active', triggerRate: 0.35, coefficient: 1.5, damageKind: 'physical' });

// 範例陣法類戰法（M1 新增）
export const tacticFormation: Tactic = tactic({
  id: 't_eight_array', name: '八陣圖', type: 'formation', triggerRate: 1.0, coefficient: 0,
  effects: [{ kind: 'buff', value: 10, target: 'ally' }],
});

// 範例兵種類戰法（M1 新增）
export const tacticTroopCav: Tactic = tactic({
  id: 't_xiliang', name: '西涼鐵騎', type: 'troop', triggerRate: 1.0, coefficient: 0,
  effects: [{ kind: 'buff', value: 15, target: 'self' }],
});

// M3 新增：象兵類戰法（南蠻/吳南方特色）
// 效果：裝備後主將改用象兵，象兵傷害 +18%（象兵踐踏陣形）
export const tacticTroopElephant: Tactic = tactic({
  id: 't_nanban_elephant', name: '南蠻象陣', type: 'troop', triggerRate: 1.0, coefficient: 0,
  effects: [{ kind: 'buff', value: 18, target: 'self' }],
});

// M3 新增：水軍類戰法（吳特色）
// 效果：裝備後主將改用水軍，水軍傷害 +20%（江東水師縱橫水域）
export const tacticTroopNavy: Tactic = tactic({
  id: 't_jiangdong_navy', name: '江東水師', type: 'troop', triggerRate: 1.0, coefficient: 0,
  effects: [{ kind: 'buff', value: 20, target: 'self' }],
});

const apt = (s: TroopType, rest: Partial<Record<TroopType, 'S' | 'A' | 'B' | 'C'>> = {}) =>
  ({ cavalry: 'C', spear: 'C', shield: 'C', bow: 'C', apparatus: 'C', sword: 'C', elephant: 'C', navy: 'C', [s]: 'S', ...rest } as Hero['aptitude']);

// 趙雲：蜀，槽 0 有突陣，槽 1 空（示範一槽有一槽空）
export const ZHAO_YUN: Hero = {
  id: 'zhaoyun', name: '趙雲', faction: 'shu', rarity: 6, redStars: 0,
  stats: { force: 195, intellect: 120, command: 180, speed: 160, politics: 90, charm: 130 },
  aptitude: apt('cavalry', { spear: 'A' }), innate: zhaoYunInnate,
  learnedSlots: [genericActive, null],
};

// 陸遜：吳，兩槽皆空
export const LU_XUN: Hero = {
  id: 'luxun', name: '陸遜', faction: 'wu', rarity: 6, redStars: 0,
  stats: { force: 110, intellect: 200, command: 165, speed: 150, politics: 160, charm: 140 },
  aptitude: apt('bow', { apparatus: 'A', navy: 'A' }), innate: luXunInnate,
  learnedSlots: [null, null],
};

export const GUAN_PING: Hero = { // §4.3 新手贈送
  id: 'guanping', name: '關平', faction: 'shu', rarity: 4, redStars: 0,
  stats: { force: 150, intellect: 95, command: 140, speed: 120, politics: 70, charm: 90 },
  aptitude: apt('spear'),
  innate: tactic({ id: 't_guanping_innate', name: '搦戰', type: 'innate', triggerRate: 0.3, coefficient: 1.3 }),
  learnedSlots: [null, null],
};

const luBuInnate = tactic({ id: 't_lubu_innate', name: '無雙', type: 'innate', triggerRate: 0.45, coefficient: 2.0, damageKind: 'physical', targets: 2 });
const zhugeInnate = tactic({ id: 't_zhuge_innate', name: '八陣', type: 'innate', triggerRate: 0.4, coefficient: 1.85, damageKind: 'strategic', targets: 2 });
const zhouyuInnate = tactic({ id: 't_zhouyu_innate', name: '赤壁', type: 'innate', triggerRate: 0.4, coefficient: 1.9, damageKind: 'strategic', targets: 2 });

// 呂布：群，槽 0 有突陣，槽 1 空
export const LU_BU: Hero = {
  id: 'lubu', name: '呂布', faction: 'qun', rarity: 6, redStars: 0,
  stats: { force: 220, intellect: 80, command: 175, speed: 170, politics: 40, charm: 70 },
  aptitude: apt('cavalry', { spear: 'A' }), innate: luBuInnate,
  learnedSlots: [genericActive, null],
};

// 諸葛亮：蜀，兩槽皆空（需玩家自行學習）
export const ZHUGE_LIANG: Hero = {
  id: 'zhuge', name: '諸葛亮', faction: 'shu', rarity: 6, redStars: 0,
  stats: { force: 90, intellect: 215, command: 175, speed: 140, politics: 200, charm: 175 },
  aptitude: apt('apparatus', { bow: 'A' }), innate: zhugeInnate,
  learnedSlots: [null, null],
};

export const ZHOU_YU: Hero = {
  id: 'zhouyu', name: '周瑜', faction: 'wu', rarity: 6, redStars: 0,
  stats: { force: 120, intellect: 198, command: 170, speed: 158, politics: 150, charm: 160 },
  aptitude: apt('bow', { apparatus: 'A', navy: 'S' }), innate: zhouyuInnate,
  learnedSlots: [null, null],
};

/** 可選武將名冊（沙盒/佈陣用，4★以上）*/
export const ROSTER: Hero[] = [ZHAO_YUN, LU_BU, ZHUGE_LIANG, LU_XUN, ZHOU_YU, GUAN_PING];

// ── 招募池雜兵（§5.1 Star3 綠卡，招募/紅度養成用）──────────────
function fodder(id: string, name: string, force: number, troop: TroopType, faction: Hero['faction']): Hero {
  return {
    id, name, faction, rarity: 3, redStars: 0,
    stats: { force, intellect: force * 0.7, command: force * 0.85, speed: 90 + force * 0.2, politics: 60, charm: 60 },
    aptitude: apt(troop),
    innate: tactic({ id: `${id}_innate`, name: '奮戰', type: 'innate', triggerRate: 0.25, coefficient: 1.15 }),
    learnedSlots: [null, null],
  };
}
export const HUANG_GAI = fodder('huanggai', '黃蓋', 130, 'cavalry', 'wu');
export const LI_DIAN = fodder('lidian', '李典', 120, 'bow', 'wei');
export const ZHOU_CANG = fodder('zhoucang', '周倉', 135, 'shield', 'shu');

/** 招募池（含 3★~6★，依稀有度權重抽取）*/
export const RECRUIT_POOL: Hero[] = [...ROSTER, HUANG_GAI, LI_DIAN, ZHOU_CANG];

export function makeUnit(hero: Hero, troopType: TroopType, troops: number, side: BattleUnit['side']): BattleUnit {
  return { hero, troopType, troops, hp: troops, maxHp: troops, side };
}

export function makeSquad(units: BattleUnit[]): Squad {
  return { units, morale: 100 };
}
