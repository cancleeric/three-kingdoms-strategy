/**
 * Three Kingdoms Strategy — 英雄招募（抽卡）+ 紅度養成
 *
 * 對應 GDD §5.4 紅度（重複武將提升，封頂 5）、§14.1 F2P 招募、§14.3 保底（pity，上限 60）。
 * 純函式 + 決定性（吃 rng），可單元測試。
 */
import type { Hero, Rarity } from './types';

export const RECRUIT_COST = 300; // §14 每次招募花費銀錢
const PITY_MAX = 60; // §14.3 保底：60 抽必出 6★

// 稀有度權重（§5.1）— 數字越大越常見
const RARITY_WEIGHT: Record<Rarity, number> = { 3: 50, 4: 30, 5: 15, 6: 5 };

export interface OwnedHero {
  hero: Hero;
  redStars: number; // §5.4 紅度 1~5
}

export interface Roster {
  owned: Record<string, OwnedHero>; // heroId → 擁有狀態
  pity: number; // 距上次 6★ 的抽數
}

export function newRoster(starter: Hero): Roster {
  return { owned: { [starter.id]: { hero: starter, redStars: 1 } }, pity: 0 };
}

export function ownedList(r: Roster): OwnedHero[] {
  return Object.values(r.owned);
}

// 加入武將：已有 → +1 紅度（封頂 5）；無 → 新增（紅度 1）。回傳是否為重複。
export function addHero(r: Roster, hero: Hero): { roster: Roster; dup: boolean; redStars: number } {
  const cur = r.owned[hero.id];
  if (cur) {
    const redStars = Math.min(5, cur.redStars + 1);
    return { roster: { ...r, owned: { ...r.owned, [hero.id]: { hero: cur.hero, redStars } } }, dup: true, redStars };
  }
  return { roster: { ...r, owned: { ...r.owned, [hero.id]: { hero, redStars: 1 } } }, dup: false, redStars: 1 };
}

/** 從 pool 抽一名武將（吃 rng 決定性）。pity 達上限強制 6★。*/
export function rollHero(pool: Hero[], pity: number, rng: () => number): Hero {
  const forceSix = pity + 1 >= PITY_MAX;
  const candidates = forceSix ? pool.filter((h) => h.rarity === 6) : pool;
  const list = candidates.length ? candidates : pool;
  const total = list.reduce((s, h) => s + RARITY_WEIGHT[h.rarity], 0);
  let pick = rng() * total;
  for (const h of list) {
    pick -= RARITY_WEIGHT[h.rarity];
    if (pick <= 0) return h;
  }
  return list[list.length - 1];
}

export interface RecruitResult {
  roster: Roster;
  hero: Hero;
  dup: boolean;
  redStars: number;
  gotSix: boolean;
}

/** 招募一次：從 pool 抽武將、更新名冊與 pity。呼叫端先確認銀錢足夠並扣費。*/
export function recruit(roster: Roster, pool: Hero[], rng: () => number): RecruitResult {
  const hero = rollHero(pool, roster.pity, rng);
  const gotSix = hero.rarity === 6;
  const afterPity: Roster = { ...roster, pity: gotSix ? 0 : roster.pity + 1 };
  const { roster: r2, dup, redStars } = addHero(afterPity, hero);
  return { roster: r2, hero, dup, redStars, gotSix };
}
