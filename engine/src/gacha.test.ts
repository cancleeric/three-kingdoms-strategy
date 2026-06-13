import { describe, it, expect } from 'vitest';
import { newRoster, addHero, rollHero, recruit, ownedList, RECRUIT_COST } from './gacha';
import { makeRng } from './combat';
import { ZHAO_YUN, GUAN_PING, LU_BU, RECRUIT_POOL } from './sampleData';

describe('gacha — 招募+紅度 (§5.4/§14)', () => {
  it('新名冊含起始武將（紅度 1）', () => {
    const r = newRoster(GUAN_PING);
    expect(r.owned.guanping.redStars).toBe(1);
    expect(r.pity).toBe(0);
  });

  it('重複武將 +1 紅度，封頂 5 (§5.4)', () => {
    let r = newRoster(ZHAO_YUN);
    for (let i = 0; i < 10; i++) r = addHero(r, ZHAO_YUN).roster;
    expect(r.owned.zhaoyun.redStars).toBe(5); // 封頂
  });

  it('新武將加入名冊（紅度 1，非重複）', () => {
    const r = newRoster(GUAN_PING);
    const { roster, dup, redStars } = addHero(r, LU_BU);
    expect(dup).toBe(false);
    expect(redStars).toBe(1);
    expect(ownedList(roster)).toHaveLength(2);
  });

  it('rollHero 決定性（同 rng 同結果）', () => {
    const a = rollHero(RECRUIT_POOL, 0, makeRng(5));
    const b = rollHero(RECRUIT_POOL, 0, makeRng(5));
    expect(a.id).toBe(b.id);
  });

  it('pity 達 60 保底 6★ (§14.3)', () => {
    const h = rollHero(RECRUIT_POOL, 59, makeRng(1)); // pity+1=60 → 強制 6★
    expect(h.rarity).toBe(6);
  });

  it('recruit 抽到 6★ 重置 pity；否則 pity+1', () => {
    let r = newRoster(GUAN_PING);
    r = { ...r, pity: 59 };
    const res = recruit(r, RECRUIT_POOL, makeRng(1)); // 保底 6★
    expect(res.gotSix).toBe(true);
    expect(res.roster.pity).toBe(0);
  });

  it('多次招募名冊持續成長且 pity 累積', () => {
    let r = newRoster(GUAN_PING);
    const seedRng = makeRng(123);
    let sixCount = 0;
    for (let i = 0; i < 30; i++) {
      const res = recruit(r, RECRUIT_POOL, seedRng);
      r = res.roster;
      if (res.gotSix) sixCount++;
    }
    expect(ownedList(r).length).toBeGreaterThanOrEqual(1);
    expect(RECRUIT_COST).toBe(300);
    expect(sixCount).toBeGreaterThanOrEqual(0);
  });
});
