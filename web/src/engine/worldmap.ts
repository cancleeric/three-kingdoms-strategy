/**
 * Three Kingdoms Strategy — 世界地圖（§10 Territory & Map）
 *
 * §2 單一共享伺服器世界、六角格（hex tile）；§10.1 地塊等級、§10.2 攻佔流程
 * （march 相鄰己方地塊→打守軍→翻面→建營帳加產/勢力值）、§10.4 勢力值。
 *
 * 純資料 + 純函式（伺服器持有地圖狀態），可單元測試。座標用 axial (q,r)。
 */

// ── 六角座標（axial）────────────────────────────────────────────
export interface Axial { q: number; r: number; }
export const HEX_DIRS: Axial[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];
export const hexKey = (c: Axial): string => `${c.q},${c.r}`;
export const parseKey = (k: string): Axial => { const [q, r] = k.split(',').map(Number); return { q, r }; };
export const neighbors = (c: Axial): Axial[] => HEX_DIRS.map((d) => ({ q: c.q + d.q, r: c.r + d.r }));
/** 六角距離（到中心 = 環數） */
export const hexDist = (a: Axial, b: Axial): number =>
  (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;

// ── 州（§2.Regions，11 州，中心為司隸/洛陽）──────────────────────
export const STATES = ['si', 'yu', 'ji', 'yan', 'qing', 'xu', 'jing', 'yang', 'yi', 'liang', 'you'] as const;
export type StateId = typeof STATES[number];
export const STATE_NAME: Record<StateId, string> = {
  si: '司隸', yu: '豫州', ji: '冀州', yan: '兗州', qing: '青州', xu: '徐州',
  jing: '荊州', yang: '揚州', yi: '益州', liang: '涼州', you: '幽州',
};

// ── 地塊 ────────────────────────────────────────────────────────
export interface WorldTile {
  coord: Axial;
  level: number;          // §10.1 地塊等級 1–8，中心 8=洛陽
  state: StateId;
  owner: string | null;   // playerId；null = 中立（守軍佔據）
  tent: boolean;          // §10.2 營帳（加產 + 勢力值）
  landmark?: string;      // 戰略地標名（洛陽等）
  isPass?: boolean;       // §2 關隘（守備洛陽的隘口 chokepoint）
}
export interface WorldMap {
  radius: number;
  tiles: Record<string, WorldTile>; // hexKey → tile
  spawns: Record<string, string>;   // playerId → 家園 hexKey
}

// §2 戰略關隘：守備洛陽的四大隘口（洛陽外圍 d=2），須攻克方能推進中樞。
export const PASSES: { q: number; r: number; name: string }[] = [
  { q: 2, r: -1, name: '虎牢關' },  // 東
  { q: -2, r: 1, name: '函谷關' },  // 西
  { q: 1, r: 1, name: '武關' },     // 南
  { q: -1, r: -1, name: '孟津關' }, // 北
];

/** 角度 → 州（中心為司隸，其餘依方位扇區分 11 州） */
function stateOf(c: Axial, radius: number): StateId {
  if (hexDist(c, { q: 0, r: 0 }) <= Math.max(1, Math.floor(radius / 4))) return 'si';
  const x = c.q + c.r / 2;
  const y = c.r * 0.8660254; // sqrt(3)/2
  let ang = Math.atan2(y, x);           // -π..π
  if (ang < 0) ang += Math.PI * 2;      // 0..2π
  const sector = Math.min(STATES.length - 2, Math.floor((ang / (Math.PI * 2)) * (STATES.length - 1)));
  return STATES[sector + 1];            // 跳過 si（中心專用）
}

/** §10.1 等級：中心 8（洛陽），邊緣 1（開荒地） */
function levelOf(c: Axial, radius: number): number {
  const d = hexDist(c, { q: 0, r: 0 });
  const t = radius === 0 ? 0 : d / radius;   // 0 中心..1 邊緣
  return Math.max(1, Math.min(8, Math.round(8 - t * 7)));
}

/** 生成半徑 radius 的六角世界（決定性，無 RNG）。 */
export function genWorld(radius: number): WorldMap {
  const tiles: Record<string, WorldTile> = {};
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const coord = { q, r };
      const level = levelOf(coord, radius);
      const state = stateOf(coord, radius);
      const tile: WorldTile = { coord, level, state, owner: null, tent: false };
      if (q === 0 && r === 0) { tile.landmark = '洛陽'; tile.level = 8; }
      const pass = PASSES.find((p) => p.q === q && p.r === r);
      if (pass) { tile.landmark = pass.name; tile.level = 7; tile.isPass = true; } // §2 關隘 chokepoint
      tiles[hexKey(coord)] = tile;
    }
  }
  return { radius, tiles, spawns: {} };
}

/** 邊緣未佔的出生點（lv1 開荒地），依序分配給玩家當家園。 */
export function pickSpawn(map: WorldMap): Axial | null {
  const edge = Object.values(map.tiles)
    .filter((t) => hexDist(t.coord, { q: 0, r: 0 }) === map.radius && t.owner === null)
    .sort((a, b) => hexKey(a.coord) < hexKey(b.coord) ? -1 : 1);
  return edge[0]?.coord ?? null;
}

/** 玩家落地：佔下出生地塊當家園。 */
export function spawnPlayer(map: WorldMap, playerId: string): WorldMap {
  if (map.spawns[playerId]) return map;
  const c = pickSpawn(map);
  if (!c) return map;
  const k = hexKey(c);
  return {
    ...map,
    tiles: { ...map.tiles, [k]: { ...map.tiles[k], owner: playerId, level: 1, landmark: '家園' } },
    spawns: { ...map.spawns, [playerId]: k },
  };
}

export const tilesOf = (map: WorldMap, playerId: string): WorldTile[] =>
  Object.values(map.tiles).filter((t) => t.owner === playerId);

/** §10.2 可否 march：目標為中立、且與玩家某己方地塊相鄰。 */
export function canMarch(map: WorldMap, playerId: string, target: Axial): boolean {
  const k = hexKey(target);
  const t = map.tiles[k];
  if (!t || t.owner !== null) return false;
  return neighbors(target).some((n) => map.tiles[hexKey(n)]?.owner === playerId);
}

/** §10.2 攻佔成功 → 地塊翻面。前置以 canMarch 檢核（戰鬥由伺服器先行結算）。 */
export function captureTile(map: WorldMap, playerId: string, target: Axial): { ok: boolean; map: WorldMap; error?: string } {
  if (!canMarch(map, playerId, target)) return { ok: false, map, error: '非相鄰己方地塊或已佔領' };
  const k = hexKey(target);
  return { ok: true, map: { ...map, tiles: { ...map.tiles, [k]: { ...map.tiles[k], owner: playerId } } } };
}

/** §10.2 建營帳（須為己方地塊）→ 加產 + 勢力值。 */
export function buildTent(map: WorldMap, playerId: string, target: Axial): WorldMap {
  const k = hexKey(target);
  const t = map.tiles[k];
  if (!t || t.owner !== playerId || t.tent) return map;
  return { ...map, tiles: { ...map.tiles, [k]: { ...t, tent: true } } };
}

// ── §10.1 地塊產出（每塊每時段）& §10.4 勢力值 ────────────────────
export const tileYield = (t: WorldTile): number => t.level * 10 * (t.tent ? 2 : 1);
/** §10.4 勢力值（地圖部分）：地塊值 = 等級平方；營帳 +5。英雄/戰法總和於別處計。 */
export const tileValue = (t: WorldTile): number => t.level * t.level + (t.tent ? 5 : 0);
export function powerScore(map: WorldMap, playerId: string): number {
  return tilesOf(map, playerId).reduce((s, t) => s + tileValue(t), 0);
}

/** §10.3 分城前置：聲望達標 且 控制某 lv6+ 錨點地塊周圍 11 塊（此處檢核 6 個相鄰皆己方為簡化版）。 */
export function canFoundSubCity(map: WorldMap, playerId: string, anchor: Axial, reputation: number): boolean {
  const a = map.tiles[hexKey(anchor)];
  if (!a || a.owner !== playerId || a.level < 6 || reputation < 6000) return false;
  return neighbors(anchor).every((n) => map.tiles[hexKey(n)]?.owner === playerId);
}
