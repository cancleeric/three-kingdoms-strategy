import { test } from 'node:test';
import assert from 'node:assert';
import { resolvePvp, type PvpSubmission } from './pvp';

const subA: PvpSubmission = { formation: [{ heroId: 'lubu', troop: 'cavalry' }], level: 20, troops: 5000 };
const subB: PvpSubmission = { formation: [{ heroId: 'luxun', troop: 'bow' }], level: 20, troops: 5000 };

test('PvP 結算回傳勝者座位', () => {
  const out = resolvePvp(subA, subB, 42);
  assert.ok(['A', 'B', 'draw'].includes(out.winnerSeat));
  assert.ok(out.result.events.length > 0);
});

test('PvP 決定性（同 seed 同結果，雙方可重現）', () => {
  const a = resolvePvp(subA, subB, 7);
  const b = resolvePvp(subA, subB, 7);
  assert.strictEqual(a.winnerSeat, b.winnerSeat);
  assert.strictEqual(a.result.attackerHpLeft, b.result.attackerHpLeft);
});

test('呂布(騎)克陸遜(弓) → A 進攻方優勢勝', () => {
  const out = resolvePvp(subA, subB, 3);
  assert.strictEqual(out.winnerSeat, 'A');
});

test('多將佈陣 PvP 正常結算', () => {
  const three: PvpSubmission = { formation: [{ heroId: 'lubu', troop: 'cavalry' }, { heroId: 'zhaoyun', troop: 'spear' }, { heroId: 'zhuge', troop: 'apparatus' }], level: 25, troops: 4000 };
  const out = resolvePvp(three, subB, 11);
  assert.ok(out.result.events.some((e) => e.actorId === 'zhaoyun'));
});
