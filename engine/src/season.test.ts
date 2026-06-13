import { describe, it, expect } from 'vitest';
import { newAccount, settleSeason, advanceSeason, endAndAdvance, SEASON_NAME, resolveSeasonRanking, checkInstantWin } from './season';
import { newRoster, addHero } from './gacha';
import { GUAN_PING, ZHAO_YUN } from './sampleData';
import { newFactionStates, joinFaction, setCapital } from './faction';

const acct = () => newAccount(newRoster(GUAN_PING));

describe('season — 賽季系統 (§13)', () => {
  it('新帳號 S1、聲望 0、階級 1', () => {
    const a = acct();
    expect(a.seasonNumber).toBe(1);
    expect(a.seasonType).toBe('S1');
    expect(a.prestige).toBe(0);
    expect(SEASON_NAME[a.seasonType]).toContain('新手');
  });

  it('結算依通關進度給聲望，攻克洛陽(8關)額外加成', () => {
    const half = settleSeason(acct(), newRoster(GUAN_PING), 4);
    const full = settleSeason(acct(), newRoster(GUAN_PING), 8);
    expect(half.prestige).toBe(400);
    expect(full.prestige).toBe(8 * 100 + 500); // 1300
  });

  it('聲望累積會升階', () => {
    let a = acct();
    a = settleSeason(a, a.roster, 8); // +1300
    expect(a.rank).toBeGreaterThan(1);
  });

  it('進入下一賽季：賽季號+1、類型輪替', () => {
    const a = advanceSeason(acct());
    expect(a.seasonNumber).toBe(2);
    expect(a.seasonType).toBe('PK');
  });

  it('§13.3 跨賽季：英雄/紅度/聲望保留', () => {
    let roster = newRoster(GUAN_PING);
    roster = addHero(roster, ZHAO_YUN).roster;
    roster = addHero(roster, ZHAO_YUN).roster; // 趙雲紅度 2
    const a0 = newAccount(roster);
    const { account: a1, gainedPrestige } = endAndAdvance(a0, roster, 8);
    expect(gainedPrestige).toBe(1300);
    expect(a1.seasonNumber).toBe(2);
    expect(a1.prestige).toBe(1300); // 聲望保留
    expect(a1.roster.owned.zhaoyun.redStars).toBe(2); // 紅度保留
    expect(Object.keys(a1.roster.owned)).toContain('guanping'); // 武將保留
  });
});

// ── M4：陣營賽季勝利條件判定測試 ──────────────────────────────────
describe('season M4 — 陣營賽季勝利條件', () => {

  it('resolveSeasonRanking：無人佔城、無人佔洛陽時全員 0 分，魏（字母序）排第一', () => {
    const factionStates = newFactionStates();
    const result = resolveSeasonRanking(factionStates, null);
    // 全員 0 分，字母序：qun < shu < wei < wu → qun 排第一？
    // 實際：字母序 q < s < w(ei) < w(u)
    expect(result.rankings).toHaveLength(4);
    expect(result.rankings.every((r) => r.score === 0)).toBe(true);
    // 平局
    expect(result.isTie).toBe(true);
  });

  it('resolveSeasonRanking：蜀佔 3 城 + 控洛陽 → 蜀勝（3+10=13 分）', () => {
    let states = newFactionStates();
    // 蜀成員 p1 加入並佔 3 城
    states.shu = joinFaction(states.shu, 'p1');
    states.shu = setCapital(states.shu, 'yi', 'p1');
    states.shu = setCapital(states.shu, 'jing', 'p1');
    states.shu = setCapital(states.shu, 'yang', 'p1');
    // 蜀控洛陽
    const result = resolveSeasonRanking(states, 'shu');
    expect(result.winner).toBe('shu');
    const shuRank = result.rankings.find((r) => r.factionId === 'shu')!;
    expect(shuRank.cityCount).toBe(3);
    expect(shuRank.hasLuoyang).toBe(true);
    expect(shuRank.score).toBe(13); // 3 + 10
    expect(result.isTie).toBe(false);
  });

  it('resolveSeasonRanking：魏佔 2 城，無洛陽；群佔 3 城，無洛陽 → 群勝', () => {
    let states = newFactionStates();
    // 魏
    states.wei = joinFaction(states.wei, 'weiP');
    states.wei = setCapital(states.wei, 'ji', 'weiP');
    states.wei = setCapital(states.wei, 'yan', 'weiP');
    // 群
    states.qun = joinFaction(states.qun, 'qunP');
    states.qun = setCapital(states.qun, 'yu', 'qunP');
    states.qun = setCapital(states.qun, 'qing', 'qunP');
    states.qun = setCapital(states.qun, 'xu', 'qunP');

    const result = resolveSeasonRanking(states, null);
    expect(result.winner).toBe('qun');
    const qunRank = result.rankings.find((r) => r.factionId === 'qun')!;
    expect(qunRank.score).toBe(3);
  });

  it('resolveSeasonRanking：洛陽控制加成正確（+10 分）', () => {
    let states = newFactionStates();
    // 吳只佔洛陽，1 城
    states.wu = joinFaction(states.wu, 'wuP');
    states.wu = setCapital(states.wu, 'si', 'wuP'); // si = 司隸（洛陽所在）

    const result = resolveSeasonRanking(states, 'wu');
    const wuRank = result.rankings.find((r) => r.factionId === 'wu')!;
    expect(wuRank.hasLuoyang).toBe(true);
    expect(wuRank.score).toBe(11); // 1 城 + 洛陽 10
    expect(result.winner).toBe('wu');
  });

  it('checkInstantWin：連續 3 回合同一陣營控洛陽 → 即時勝利', () => {
    const history: ('wei' | 'shu' | 'wu' | 'qun')[] = ['shu', 'shu', 'shu'];
    const winner = checkInstantWin(history, 3);
    expect(winner).toBe('shu');
  });

  it('checkInstantWin：未達連續回合數 → null', () => {
    const history: ('wei' | 'shu' | 'wu' | 'qun')[] = ['shu', 'wei', 'shu'];
    const winner = checkInstantWin(history, 3);
    expect(winner).toBe(null);
  });

  it('checkInstantWin：歷史不足 → null', () => {
    const history: ('wei' | 'shu' | 'wu' | 'qun')[] = ['shu', 'shu'];
    const winner = checkInstantWin(history, 3);
    expect(winner).toBe(null);
  });
});
