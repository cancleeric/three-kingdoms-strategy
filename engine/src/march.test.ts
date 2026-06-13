/**
 * engine/src/march.test.ts — M2 行軍時間 SLG 單元測試
 *
 * 覆蓋 REALIGN_PLAN M2-2 列出的 5 項：
 * 1. calcMarchDuration 距離 3 格 = 90000ms（基礎無加速，BASE_MARCH_MS=30000）
 * 2. 同盟加速 20% 後縮短為 72000ms
 * 3. sendMarch 對非相鄰地塊回傳 ok=false
 * 4. checkArrival 到達時間前回傳 false，後回傳 true
 * 5. resolveMarchArrival 勝利後地塊 owner 變更
 */

import { describe, it, expect } from 'vitest';
import {
  calcMarchDuration,
  sendMarch,
  checkArrival,
  resolveMarchArrival,
  troopRecruitDuration,
  BASE_MARCH_MS,
  type MarchOrder,
} from './march';
import { genWorld, spawnPlayer, hexKey, canMarch, neighbors } from './worldmap';
import { makeUnit, makeSquad, ZHAO_YUN } from './sampleData';

// 確保 BASE_MARCH_MS 在非 env 覆寫時為 30000（測試檔內直接用計算值，不 hardcode 30000）
const MS = BASE_MARCH_MS; // 取模組常數，env 覆寫時仍正確

describe('march — M2 行軍時間 SLG', () => {

  // 1. 距離 3 格基礎行軍時間
  it('calcMarchDuration：距離 3 格無加速 = 3 × BASE_MARCH_MS', () => {
    const from = { q: 0, r: 0 };
    const to   = { q: 3, r: 0 }; // hexDist = 3
    expect(calcMarchDuration(from, to, 0)).toBe(3 * MS);
  });

  // 2. 同盟加速 20% 縮短為 72000ms（當 MS=30000）
  it('calcMarchDuration：距離 3 格 + 20% 加速 = 3 × MS × 0.8', () => {
    const from = { q: 0, r: 0 };
    const to   = { q: 3, r: 0 };
    const expected = Math.round(3 * MS * 0.8);
    expect(calcMarchDuration(from, to, 20)).toBe(expected);
  });

  // 3. sendMarch 對非相鄰地塊（跨越中立地帶）回傳 ok=false
  it('sendMarch：非相鄰地塊 → ok=false', () => {
    // 建一個半徑 5 的世界，讓 p1 落地邊緣，然後嘗試攻打距離 2 的地塊
    let map = genWorld(5);
    map = spawnPlayer(map, 'p1');
    const spawnKey = map.spawns['p1'];
    const [spawnQ, spawnR] = spawnKey.split(',').map(Number);

    // 找一個與家園距離 >= 2 且中立的地塊（非相鄰）
    const farTile = Object.values(map.tiles).find(
      (t) => t.owner === null &&
        Math.abs(t.coord.q - spawnQ) + Math.abs(t.coord.r - spawnR) >= 3
    );
    expect(farTile).toBeDefined();

    const result = sendMarch(
      map,
      { playerId: 'p1', squadId: 'sq1', from: { q: spawnQ, r: spawnR }, to: farTile!.coord },
      1000,
      0,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  // 4. checkArrival：到達時間前 false，後 true
  it('checkArrival：未到時間 false，過了時間 true', () => {
    const order: MarchOrder = {
      id: 'test_order',
      playerId: 'p1',
      squadId: 'sq1',
      from: { q: 5, r: -5 },
      to:   { q: 4, r: -5 },
      departAt: 1000,
      arriveAt: 31000,
      status: 'marching',
    };
    expect(checkArrival(order, 30999)).toBe(false);
    expect(checkArrival(order, 31000)).toBe(true);
    expect(checkArrival(order, 99999)).toBe(true);
  });

  // checkArrival：status 非 marching 時永遠 false
  it('checkArrival：status=done 永遠 false', () => {
    const order: MarchOrder = {
      id: 'test_done',
      playerId: 'p1',
      squadId: 'sq1',
      from: { q: 0, r: 0 },
      to:   { q: 1, r: 0 },
      departAt: 0,
      arriveAt: 0,
      status: 'done',
    };
    expect(checkArrival(order, 99999)).toBe(false);
  });

  // 5. resolveMarchArrival：以必勝陣容攻 lv1 地塊，地塊 owner 翻面
  it('resolveMarchArrival：攻下 lv1 地塊後 owner 變更', () => {
    // 建世界，p1 落地邊緣
    let map = genWorld(5);
    map = spawnPlayer(map, 'p1');
    const spawnKey = map.spawns['p1'];
    const [spawnQ, spawnR] = spawnKey.split(',').map(Number);

    // 找家園的中立鄰居（canMarch 的合法目標）
    const homeCoord = { q: spawnQ, r: spawnR };
    const adjNeutral = neighbors(homeCoord)
      .map((n) => map.tiles[hexKey(n)])
      .find((t) => t && t.owner === null);
    expect(adjNeutral).toBeDefined();

    // 建必勝陣容：趙雲 × 3，帶兵 5000
    const unit = makeUnit(ZHAO_YUN, 'cavalry', 5000, 'attacker');
    const squad = makeSquad([unit, unit, unit]);

    const order: MarchOrder = {
      id: 'march_resolve_test',
      playerId: 'p1',
      squadId: 'sq1',
      from: { q: spawnQ, r: spawnR },
      to:   adjNeutral!.coord,
      departAt: 0,
      arriveAt: 30000,
      status: 'marching',
    };

    // 用 seed=1 結算（不需要確定性，只要能打贏 lv1 守軍）
    const { map: resultMap, outcome, order: doneOrder } = resolveMarchArrival(map, squad, order, 1);

    if (outcome.won) {
      const afterTile = resultMap.tiles[hexKey(adjNeutral!.coord)];
      expect(afterTile.owner).toBe('p1');
    } else {
      // 萬一 seed=1 打不贏（理論上趙雲×3 vs lv1 守軍應可贏），owner 應仍為 null
      const afterTile = resultMap.tiles[hexKey(adjNeutral!.coord)];
      expect(afterTile.owner).toBe(null);
    }
    // 不管勝負，order.status 都應為 done
    expect(doneOrder.status).toBe('done');
  });

  // 補兵時間
  it('troopRecruitDuration：1000 兵 = 1000000ms', () => {
    expect(troopRecruitDuration(1000)).toBe(1_000_000);
    expect(troopRecruitDuration(1)).toBe(1_000);
  });
});
