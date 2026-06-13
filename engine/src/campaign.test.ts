import { describe, it, expect } from 'vitest';
import { TILES, grantXp, leveledHero, makeGarrison, attackTile } from './campaign';
import { ZHAO_YUN, makeUnit, makeSquad } from './sampleData';
import type { CampaignHero } from './campaign';

describe('campaign — 打地戰役 (§10/§5.3)', () => {
  it('地塊 8 關，終點洛陽，守軍逐級變強', () => {
    expect(TILES).toHaveLength(8);
    expect(TILES[7].name).toContain('洛陽');
    for (let i = 1; i < TILES.length; i++) {
      expect(TILES[i].garrisonTroops).toBeGreaterThan(TILES[i - 1].garrisonTroops);
    }
  });

  it('grantXp 累積升級（§5.3，封頂 50）', () => {
    let ch: CampaignHero = { hero: ZHAO_YUN, level: 1, xp: 0 };
    ch = grantXp(ch, 10000);
    expect(ch.level).toBeGreaterThan(1);
    expect(ch.level).toBeLessThanOrEqual(50);
    const maxed = grantXp({ hero: ZHAO_YUN, level: 1, xp: 0 }, 9_999_999);
    expect(maxed.level).toBe(50);
  });

  it('leveledHero 等級越高屬性越強', () => {
    const lv1 = leveledHero({ hero: ZHAO_YUN, level: 1, xp: 0 });
    const lv30 = leveledHero({ hero: ZHAO_YUN, level: 30, xp: 0 });
    expect(lv30.stats.force).toBeGreaterThan(lv1.stats.force);
  });

  it('makeGarrison 產生防守方守軍', () => {
    const g = makeGarrison(TILES[0]);
    expect(g.units[0].side).toBe('defender');
    expect(g.units[0].troops).toBe(TILES[0].garrisonTroops);
  });

  it('強隊打 Lv.1 荒野必勝並給獎勵', () => {
    const squad = makeSquad([makeUnit({ ...ZHAO_YUN, redStars: 5 }, 'cavalry', 6000, 'attacker')]);
    const out = attackTile(squad, TILES[0], 1);
    expect(out.won).toBe(true);
    expect(out.reward?.xp).toBe(TILES[0].reward.xp);
  });

  it('attackTile 決定性（同 seed 同結果）', () => {
    const squad = () => makeSquad([makeUnit(ZHAO_YUN, 'cavalry', 4000, 'attacker')]);
    const a = attackTile(squad(), TILES[3], 99);
    const b = attackTile(squad(), TILES[3], 99);
    expect(a.won).toBe(b.won);
    expect(a.playerHpLeft).toBe(b.playerHpLeft);
  });

  it('attackTile 不破壞入參 squad（兵量保留）', () => {
    const squad = makeSquad([makeUnit(ZHAO_YUN, 'cavalry', 4000, 'attacker')]);
    attackTile(squad, TILES[5], 3);
    expect(squad.units[0].hp).toBe(4000); // 原隊未被扣血
  });
});
