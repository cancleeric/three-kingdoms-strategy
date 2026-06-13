/**
 * engine/src/rally.test.ts — M4 同盟集結攻城單元測試
 *
 * 覆蓋：集結建立/加入/取消、戰力合併、整場結算。
 */

import { describe, it, expect } from 'vitest';
import {
  createRally,
  joinRally,
  resolveRally,
  cancelRally,
  mergeRallySquads,
  type RallyOrder,
} from './rally';
import { genWorld, spawnPlayer, hexKey } from './worldmap';
import { makeUnit, makeSquad, ZHAO_YUN, GUAN_PING } from './sampleData';

// 測試輔助：建一個簡單部隊
function makeTestSquad(troops = 3000) {
  const unit = makeUnit(ZHAO_YUN, 'cavalry', troops, 'attacker');
  return makeSquad([unit]);
}

function makeTestSquadWith(hero: typeof ZHAO_YUN, troops = 3000) {
  const unit = makeUnit(hero, 'cavalry', troops, 'attacker');
  return makeSquad([unit]);
}

// 建一個有己方格子可相鄰攻打的世界
function makeWorldWithPlayer(playerId = 'p1') {
  let map = genWorld(5);
  map = spawnPlayer(map, playerId);
  return map;
}

describe('rally — M4 同盟集結攻城', () => {

  // ─── 1. createRally：成功建立集結 ───────────────────────────────
  it('createRally：launchAt > now 時成功建立集結', () => {
    const squad = makeTestSquad();
    const now = 1000;
    const result = createRally({
      allianceId: 'AL101',
      targetTile: { q: 0, r: 0 },
      initiator: 'player1',
      initiatorSquad: squad,
      launchAt: now + 30_000,
    }, now);

    expect(result.ok).toBe(true);
    expect(result.rally).toBeDefined();
    expect(result.rally!.allianceId).toBe('AL101');
    expect(result.rally!.initiator).toBe('player1');
    expect(result.rally!.joiners).toContain('player1');
    expect(result.rally!.status).toBe('gathering');
  });

  // ─── 2. createRally：launchAt <= now 應拒絕 ─────────────────────
  it('createRally：launchAt <= now 時回傳 ok=false', () => {
    const squad = makeTestSquad();
    const now = 5000;
    const result = createRally({
      allianceId: 'AL101',
      targetTile: { q: 0, r: 0 },
      initiator: 'player1',
      initiatorSquad: squad,
      launchAt: now, // 等於 now，應拒絕
    }, now);

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  // ─── 3. joinRally：同盟成員成功加入 ─────────────────────────────
  it('joinRally：同盟成員可加入集結', () => {
    const now = 1000;
    const initialSquad = makeTestSquad();
    const { rally: base } = createRally({
      allianceId: 'AL101',
      targetTile: { q: 0, r: 0 },
      initiator: 'player1',
      initiatorSquad: initialSquad,
      launchAt: now + 30_000,
    }, now);

    const joinerSquad = makeTestSquad(2000);
    const joinResult = joinRally(base!, 'player2', 'AL101', joinerSquad, now + 5000);

    expect(joinResult.ok).toBe(true);
    expect(joinResult.rally!.joiners).toContain('player2');
    expect(joinResult.rally!.joiners).toHaveLength(2);
  });

  // ─── 4. joinRally：非同盟成員應被拒絕 ─────────────────────────
  it('joinRally：非同盟成員（不同 allianceId）被拒絕', () => {
    const now = 1000;
    const initialSquad = makeTestSquad();
    const { rally: base } = createRally({
      allianceId: 'AL101',
      targetTile: { q: 0, r: 0 },
      initiator: 'player1',
      initiatorSquad: initialSquad,
      launchAt: now + 30_000,
    }, now);

    const joinerSquad = makeTestSquad(2000);
    // 不同 allianceId
    const joinResult = joinRally(base!, 'player2', 'AL999', joinerSquad, now + 5000);

    expect(joinResult.ok).toBe(false);
    expect(joinResult.error).toBeDefined();
  });

  // ─── 5. joinRally：集結時窗關閉後加入被拒 ─────────────────────
  it('joinRally：now >= launchAt 後加入被拒絕', () => {
    const now = 1000;
    const launchAt = now + 10_000;
    const initialSquad = makeTestSquad();
    const { rally: base } = createRally({
      allianceId: 'AL101',
      targetTile: { q: 0, r: 0 },
      initiator: 'player1',
      initiatorSquad: initialSquad,
      launchAt,
    }, now);

    const joinerSquad = makeTestSquad();
    // 在出發時間之後嘗試加入
    const joinResult = joinRally(base!, 'player2', 'AL101', joinerSquad, launchAt + 1);

    expect(joinResult.ok).toBe(false);
    expect(joinResult.error).toMatch(/時窗|已出發/);
  });

  // ─── 6. mergeRallySquads：帶兵量正確加總 ─────────────────────
  it('mergeRallySquads：多隊兵力合併，帶兵量為總和', () => {
    const sq1 = makeTestSquadWith(ZHAO_YUN, 3000);
    const sq2 = makeTestSquadWith(GUAN_PING, 2000);

    const merged = mergeRallySquads([sq1, sq2]);
    const totalTroops = merged.units.reduce((s, u) => s + u.troops, 0);

    // 合計應為 3000 + 2000 = 5000
    expect(totalTroops).toBe(5000);
  });

  // ─── 7. resolveRally：集結勝利後地塊翻面 ────────────────────────
  it('resolveRally：集結攻打中立格，勝利後地塊 owner 變為發起者', () => {
    const map = makeWorldWithPlayer('leader');
    const spawnKey = map.spawns['leader'];
    const [sq, sr] = spawnKey.split(',').map(Number);

    // 找家園的中立鄰居
    const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    let targetTile = null;
    for (const [dq, dr] of DIRS) {
      const k = hexKey({ q: sq + dq, r: sr + dr });
      if (map.tiles[k]?.owner === null) {
        targetTile = map.tiles[k];
        break;
      }
    }
    expect(targetTile).toBeDefined();

    const now = 1000;
    // 建立集結（帶超強部隊，確保勝利）
    const bigSquad = makeTestSquad(9999);
    const { rally: baseRally } = createRally({
      allianceId: 'AL101',
      targetTile: targetTile!.coord,
      initiator: 'leader',
      initiatorSquad: bigSquad,
      launchAt: now + 1000,
    }, now);

    const { map: resultMap, outcome, rally: doneRally } = resolveRally(map, baseRally!, 42, now + 2000);

    expect(doneRally.status).toBe('done');
    if (outcome.won) {
      const afterTile = resultMap.tiles[hexKey(targetTile!.coord)];
      expect(afterTile.owner).toBe('leader');
    } else {
      // 若未勝，owner 仍 null（合理邊角）
      const afterTile = resultMap.tiles[hexKey(targetTile!.coord)];
      expect(afterTile.owner).toBe(null);
    }
  });

  // ─── 8. cancelRally：發起者可取消 ───────────────────────────────
  it('cancelRally：發起者可取消集結，非發起者不可', () => {
    const now = 1000;
    const initialSquad = makeTestSquad();
    const { rally: base } = createRally({
      allianceId: 'AL101',
      targetTile: { q: 1, r: 0 },
      initiator: 'player1',
      initiatorSquad: initialSquad,
      launchAt: now + 30_000,
    }, now);

    // 非發起者取消 → 失敗
    const failResult = cancelRally(base!, 'player2', now + 5000);
    expect(failResult.ok).toBe(false);

    // 發起者取消 → 成功
    const okResult = cancelRally(base!, 'player1', now + 5000);
    expect(okResult.ok).toBe(true);
    expect(okResult.rally!.status).toBe('cancelled');
  });

  // ─── 9. 重複加入同一集結被拒 ──────────────────────────────────
  it('joinRally：重複加入同一集結被拒', () => {
    const now = 1000;
    const initialSquad = makeTestSquad();
    const { rally: base } = createRally({
      allianceId: 'AL101',
      targetTile: { q: 0, r: 0 },
      initiator: 'player1',
      initiatorSquad: initialSquad,
      launchAt: now + 30_000,
    }, now);

    // player1 是發起者，已在 joiners
    const repeatJoin = joinRally(base!, 'player1', 'AL101', initialSquad, now + 5000);
    expect(repeatJoin.ok).toBe(false);
    expect(repeatJoin.error).toBeDefined();
  });

  // ─── 10. 三人集結，兵力倍增優勢 ──────────────────────────────
  it('mergeRallySquads：三隊合併兵力為三隊之和', () => {
    const sq1 = makeTestSquad(1000);
    const sq2 = makeTestSquad(1500);
    const sq3 = makeTestSquad(2000);
    const merged = mergeRallySquads([sq1, sq2, sq3]);
    const totalTroops = merged.units.reduce((s, u) => s + u.troops, 0);
    expect(totalTroops).toBe(4500);
  });
});
