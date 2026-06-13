import { describe, it, expect } from 'vitest';
import {
  genWorld, neighbors, hexDist, hexKey, spawnPlayer, canMarch, captureTile,
  buildTent, powerScore, tileValue, tileYield, canFoundSubCity, tilesOf, STATE_NAME,
} from './worldmap';

describe('worldmap — 世界地圖 (§10)', () => {
  it('六角鄰居 6 個、距離對稱', () => {
    expect(neighbors({ q: 0, r: 0 })).toHaveLength(6);
    expect(hexDist({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2);
    expect(hexDist({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
  });

  it('生成世界：中心是洛陽 lv8、邊緣 lv1', () => {
    const m = genWorld(4);
    expect(m.tiles['0,0'].landmark).toBe('洛陽');
    expect(m.tiles['0,0'].level).toBe(8);
    const edge = Object.values(m.tiles).filter((t) => hexDist(t.coord, { q: 0, r: 0 }) === 4);
    expect(edge.every((t) => t.level === 1)).toBe(true);
    expect(STATE_NAME.si).toBe('司隸');
  });

  it('落地：佔下邊緣家園，重複落地不變', () => {
    let m = genWorld(4);
    m = spawnPlayer(m, 'p1');
    expect(tilesOf(m, 'p1')).toHaveLength(1);
    expect(m.spawns.p1).toBeDefined();
    const before = m.spawns.p1;
    m = spawnPlayer(m, 'p1');
    expect(m.spawns.p1).toBe(before);
  });

  it('兩玩家落地在不同家園', () => {
    let m = genWorld(4);
    m = spawnPlayer(m, 'p1');
    m = spawnPlayer(m, 'p2');
    expect(m.spawns.p1).not.toBe(m.spawns.p2);
  });

  it('§10.2 只能 march 相鄰中立地塊', () => {
    let m = genWorld(4);
    m = spawnPlayer(m, 'p1');
    const home = m.tiles[m.spawns.p1].coord;
    const adj = neighbors(home).find((n) => m.tiles[hexKey(n)]);
    const far = { q: 0, r: 0 }; // 中心非相鄰
    expect(canMarch(m, 'p1', adj!)).toBe(true);
    expect(canMarch(m, 'p1', far)).toBe(false);
    expect(canMarch(m, 'p1', home)).toBe(false); // 已是己方
  });

  it('§10.2 攻佔翻面 + 勢力值上升', () => {
    let m = genWorld(4);
    m = spawnPlayer(m, 'p1');
    const before = powerScore(m, 'p1');
    const home = m.tiles[m.spawns.p1].coord;
    const adj = neighbors(home).find((n) => canMarch(m, 'p1', n))!;
    const cap = captureTile(m, 'p1', adj);
    expect(cap.ok).toBe(true);
    m = cap.map;
    expect(m.tiles[hexKey(adj)].owner).toBe('p1');
    expect(powerScore(m, 'p1')).toBeGreaterThan(before);
    expect(tilesOf(m, 'p1')).toHaveLength(2);
  });

  it('§10.2 營帳加產加值', () => {
    let m = genWorld(4);
    m = spawnPlayer(m, 'p1');
    const home = m.tiles[m.spawns.p1].coord;
    const t0 = m.tiles[hexKey(home)];
    const y0 = tileYield(t0), v0 = tileValue(t0);
    m = buildTent(m, 'p1', home);
    const t1 = m.tiles[hexKey(home)];
    expect(t1.tent).toBe(true);
    expect(tileYield(t1)).toBe(y0 * 2);
    expect(tileValue(t1)).toBe(v0 + 5);
  });

  it('§10.3 分城前置：聲望未達或周圍未全控 → 否', () => {
    let m = genWorld(2);
    m = spawnPlayer(m, 'p1');
    const home = m.tiles[m.spawns.p1].coord;
    expect(canFoundSubCity(m, 'p1', home, 6000)).toBe(false); // lv1 非 lv6+
  });
});
