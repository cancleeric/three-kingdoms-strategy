import { describe, it, expect } from 'vitest';
import { newAlliance, joinAlliance, leaveAlliance, donate, alliancePerks, memberCount, MAX_MEMBERS, RANK_NAME } from './alliance';

const a0 = () => newAlliance('a1', '蒼天同盟', 'p1', '盟主甲');

describe('alliance — 同盟系統 (§12)', () => {
  it('建盟：盟主自動加入', () => {
    const a = a0();
    expect(a.members.p1.rank).toBe('leader');
    expect(RANK_NAME.leader).toBe('盟主');
    expect(memberCount(a)).toBe(1);
  });

  it('加入：以盟眾身分入盟', () => {
    const { ok, alliance } = joinAlliance(a0(), 'p2', '玩家乙');
    expect(ok).toBe(true);
    expect(alliance.members.p2.rank).toBe('member');
    expect(memberCount(alliance)).toBe(2);
  });

  it('上限 100 人', () => {
    let a = a0();
    for (let i = 2; i <= MAX_MEMBERS; i++) a = joinAlliance(a, `p${i}`, `m${i}`).alliance;
    expect(memberCount(a)).toBe(MAX_MEMBERS);
    const full = joinAlliance(a, 'pX', 'overflow');
    expect(full.ok).toBe(false);
  });

  it('離盟', () => {
    let a = joinAlliance(a0(), 'p2', '乙').alliance;
    a = leaveAlliance(a, 'p2');
    expect(a.members.p2).toBeUndefined();
  });

  it('捐獻累積科技進度並升級 (§12.3)', () => {
    let a = a0();
    a = donate(a, 'p1', 'troopCapacity', 600); // 門檻 500 → 升 1 級，餘 100
    expect(a.tech.troopCapacity.level).toBe(1);
    expect(a.members.p1.contribution).toBe(600);
  });

  it('盟科技加成 = 等級 × 每級', () => {
    let a = a0();
    a = donate(a, 'p1', 'tileYield', 5000); // 多級
    const perks = alliancePerks(a);
    expect(perks.tileYield).toBe(a.tech.tileYield.level * 4);
    expect(perks.tileYield).toBeGreaterThan(0);
  });

  it('非成員捐獻無效', () => {
    const a = a0();
    const after = donate(a, 'stranger', 'marchSpeed', 1000);
    expect(after.tech.marchSpeed.level).toBe(0);
  });
});
