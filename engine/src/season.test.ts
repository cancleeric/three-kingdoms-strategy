import { describe, it, expect } from 'vitest';
import { newAccount, settleSeason, advanceSeason, endAndAdvance, SEASON_NAME } from './season';
import { newRoster, addHero } from './gacha';
import { GUAN_PING, ZHAO_YUN } from './sampleData';

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
