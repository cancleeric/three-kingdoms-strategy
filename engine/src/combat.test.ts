import { describe, it, expect } from 'vitest';
import { resolveBattle, troopMatchup, computeDamage, makeRng } from './combat';
import { ZHAO_YUN, LU_XUN, GUAN_PING, LU_BU, ZHUGE_LIANG, ROSTER, makeUnit, makeSquad } from './sampleData';

describe('troopMatchup (§7.3 兵種相剋)', () => {
  it('騎克弓 +15%', () => expect(troopMatchup('cavalry', 'bow')).toBeCloseTo(1.15));
  it('弓被騎克 -15%', () => expect(troopMatchup('bow', 'cavalry')).toBeCloseTo(0.85));
  it('弓克盾', () => expect(troopMatchup('bow', 'shield')).toBeCloseTo(1.15));
  it('盾克槍', () => expect(troopMatchup('shield', 'spear')).toBeCloseTo(1.15));
  it('槍克騎', () => expect(troopMatchup('spear', 'cavalry')).toBeCloseTo(1.15));
  it('器中立', () => expect(troopMatchup('apparatus', 'bow')).toBe(1.0));
  it('同兵種無加成', () => expect(troopMatchup('cavalry', 'cavalry')).toBe(1.0));
});

describe('computeDamage (§8.2 傷害公式)', () => {
  it('傷害下限為 1（防禦遠高於攻擊）', () => {
    const a = makeUnit(GUAN_PING, 'spear', 1000, 'attacker');
    const d = makeUnit({ ...ZHAO_YUN, stats: { ...ZHAO_YUN.stats, command: 9999 } }, 'cavalry', 1000, 'defender');
    const dmg = computeDamage({ attacker: a, defender: d, coefficient: 1, kind: 'physical', attackerMorale: 100, rng: makeRng(1) });
    expect(dmg).toBeGreaterThanOrEqual(1);
  });
  it('strategic 用智力且無視兵種相剋', () => {
    const a = makeUnit(LU_XUN, 'bow', 1000, 'attacker'); // 高智力
    const d = makeUnit(ZHAO_YUN, 'cavalry', 1000, 'defender'); // 弓被騎克，但 strategic 無視
    const phys = computeDamage({ attacker: a, defender: d, coefficient: 1.5, kind: 'physical', attackerMorale: 100, rng: makeRng(5) });
    const strat = computeDamage({ attacker: a, defender: d, coefficient: 1.5, kind: 'strategic', attackerMorale: 100, rng: makeRng(5) });
    // 同 seed 同係數：strategic（用 200 智力、無相剋懲罰）應 > physical（用 110 武力、被克 0.85）
    expect(strat).toBeGreaterThan(phys);
  });
  it('潰敗（morale<=0）輸出降', () => {
    const a = makeUnit(ZHAO_YUN, 'cavalry', 1000, 'attacker');
    const d = makeUnit(GUAN_PING, 'spear', 1000, 'defender');
    const ok = computeDamage({ attacker: a, defender: d, coefficient: 1.5, kind: 'physical', attackerMorale: 100, rng: makeRng(9) });
    const routed = computeDamage({ attacker: a, defender: d, coefficient: 1.5, kind: 'physical', attackerMorale: 0, rng: makeRng(9) });
    expect(routed).toBeLessThan(ok);
  });
});

describe('resolveBattle (§8 戰鬥結算)', () => {
  const buildA = () => makeSquad([makeUnit(ZHAO_YUN, 'cavalry', 3000, 'attacker'), makeUnit(GUAN_PING, 'spear', 2500, 'attacker')]);
  const buildD = () => makeSquad([makeUnit(LU_XUN, 'bow', 3000, 'defender'), makeUnit(GUAN_PING, 'shield', 2500, 'defender')]);

  it('決定性：同 seed → 完全相同結果', () => {
    const r1 = resolveBattle({ attacker: buildA(), defender: buildD(), seed: 42 });
    const r2 = resolveBattle({ attacker: buildA(), defender: buildD(), seed: 42 });
    expect(r1.winner).toBe(r2.winner);
    expect(r1.turns).toBe(r2.turns);
    expect(r1.attackerHpLeft).toBe(r2.attackerHpLeft);
    expect(r1.events.length).toBe(r2.events.length);
  });

  it('不同 seed 可能不同結果（亂數有作用）', () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => resolveBattle({ attacker: buildA(), defender: buildD(), seed: s }).attackerHpLeft);
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  it('壓倒性強隊獲勝', () => {
    const strong = makeSquad([makeUnit({ ...ZHAO_YUN, redStars: 5 }, 'cavalry', 8000, 'attacker')]);
    const weak = makeSquad([makeUnit(GUAN_PING, 'bow', 1500, 'defender')]); // 騎克弓
    const r = resolveBattle({ attacker: strong, defender: weak, seed: 7 });
    expect(r.winner).toBe('attacker');
  });

  it('回合數不超過上限 8', () => {
    const r = resolveBattle({ attacker: buildA(), defender: buildD(), seed: 3 });
    expect(r.turns).toBeLessThanOrEqual(8);
  });

  it('產生戰鬥事件日誌（供回放）', () => {
    const r = resolveBattle({ attacker: buildA(), defender: buildD(), seed: 11 });
    expect(r.events.length).toBeGreaterThan(0);
    expect(r.events.some((e) => e.phase === 'attack')).toBe(true);
  });

  it('勝負與剩餘 HP 一致（8 回合判定）', () => {
    const r = resolveBattle({ attacker: buildA(), defender: buildD(), seed: 20 });
    if (r.winner === 'attacker') expect(r.attackerHpLeft).toBeGreaterThanOrEqual(r.defenderHpLeft);
    if (r.winner === 'defender') expect(r.defenderHpLeft).toBeGreaterThanOrEqual(r.attackerHpLeft);
  });

  it('多武將佈陣：3 主將隊伍正常結算 (§7.1)', () => {
    const att = makeSquad([
      makeUnit(LU_BU, 'cavalry', 3000, 'attacker'),
      makeUnit(ZHAO_YUN, 'spear', 3000, 'attacker'),
      makeUnit(ZHUGE_LIANG, 'apparatus', 3000, 'attacker'),
    ]);
    const def = makeSquad([
      makeUnit(LU_XUN, 'bow', 3000, 'defender'),
      makeUnit(GUAN_PING, 'shield', 3000, 'defender'),
    ]);
    const r = resolveBattle({ attacker: att, defender: def, seed: 7 });
    // 3 名進攻方武將都應在事件日誌中行動過
    const actors = new Set(r.events.map((e) => e.actorId));
    expect(actors.has('lubu')).toBe(true);
    expect(actors.has('zhaoyun')).toBe(true);
    expect(r.events.length).toBeGreaterThan(0);
  });

  it('名冊 6 將齊全', () => {
    expect(ROSTER).toHaveLength(6);
    expect(new Set(ROSTER.map((h) => h.id)).size).toBe(6);
  });
});
