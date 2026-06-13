/**
 * Three Kingdoms Strategy — 城建 + 資源經濟（§9 城建 / §11 經濟）
 *
 * 串起核心循環（§3）：打地賺資源 → 蓋城變強 → 帶更多兵 → 打更高地。
 * 純資料 + 純函式，可單元測試。
 */

// ── §11.1 資源 ─────────────────────────────────────────────────
export type Resource = 'food' | 'wood' | 'stone' | 'iron' | 'silver';
export type Resources = Record<Resource, number>;

export const emptyResources = (): Resources => ({ food: 0, wood: 0, stone: 0, iron: 0, silver: 0 });

// ── §9.1 建築 ──────────────────────────────────────────────────
export type BuildingId = 'farm' | 'lumber' | 'quarry' | 'ironForge' | 'mint' | 'barracks';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  desc: string;
  /** 每級每 tick 產出的資源（barracks 不產資源，產帶兵量）*/
  produces?: { res: Resource; perLevel: number };
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  farm: { id: 'farm', name: '農田', desc: '產糧', produces: { res: 'food', perLevel: 20 } },
  lumber: { id: 'lumber', name: '伐木場', desc: '產木', produces: { res: 'wood', perLevel: 18 } },
  quarry: { id: 'quarry', name: '採石場', desc: '產石', produces: { res: 'stone', perLevel: 15 } },
  ironForge: { id: 'ironForge', name: '冶鐵坊', desc: '產鐵', produces: { res: 'iron', perLevel: 12 } },
  mint: { id: 'mint', name: '錢莊', desc: '產銀錢（F2P 命脈）', produces: { res: 'silver', perLevel: 25 } },
  barracks: { id: 'barracks', name: '兵營', desc: '提升每將帶兵量' },
};

export interface City {
  levels: Record<BuildingId, number>; // 各建築等級（0=未建）
  resources: Resources;
}

export function newCity(): City {
  return {
    levels: { farm: 1, lumber: 1, quarry: 1, ironForge: 0, mint: 1, barracks: 1 },
    resources: { food: 200, wood: 200, stone: 100, iron: 0, silver: 100 },
  };
}

// ── §9.2 升級成本曲線（隨等級指數成長，門檻在 5/10/15…）─────────
export function upgradeCost(b: BuildingId, currentLevel: number): Resources {
  const next = currentLevel + 1;
  const base = Math.round(80 * Math.pow(1.5, next - 1));
  // 不同建築吃不同主資源，外加少量通用木/石
  const main: Partial<Record<BuildingId, Resource>> = {
    farm: 'wood', lumber: 'stone', quarry: 'wood', ironForge: 'stone', mint: 'iron', barracks: 'iron',
  };
  const cost = emptyResources();
  cost[main[b] ?? 'wood'] += base;
  cost.wood += Math.round(base * 0.4);
  cost.stone += Math.round(base * 0.3);
  if (next >= 5) cost.silver += base; // 門檻關卡額外吃銀
  return cost;
}

export function canAfford(r: Resources, cost: Resources): boolean {
  return (Object.keys(cost) as Resource[]).every((k) => r[k] >= cost[k]);
}

export function upgrade(city: City, b: BuildingId): { ok: boolean; city: City; cost: Resources } {
  const cur = city.levels[b];
  const cost = upgradeCost(b, cur);
  if (cur >= 25 || !canAfford(city.resources, cost)) return { ok: false, city, cost };
  const res = { ...city.resources };
  (Object.keys(cost) as Resource[]).forEach((k) => { res[k] -= cost[k]; });
  return { ok: true, city: { levels: { ...city.levels, [b]: cur + 1 }, resources: res }, cost };
}

// ── §11 產出（每 tick / 每次打地後結算內政產出）──────────────────
export function produce(city: City, ticks = 1): City {
  const res = { ...city.resources };
  (Object.values(BUILDINGS)).forEach((def) => {
    if (def.produces) res[def.produces.res] += def.produces.perLevel * city.levels[def.id] * ticks;
  });
  return { ...city, resources: res };
}

export function addResources(city: City, add: Partial<Resources>): City {
  const res = { ...city.resources };
  (Object.keys(add) as Resource[]).forEach((k) => { res[k] += add[k] ?? 0; });
  return { ...city, resources: res };
}

// ── §7.2 兵營等級 → 每將帶兵量 ─────────────────────────────────
// Lv.5≈1000、Lv.10≈3000（GDD），線性內插放大基底。
export function troopCapacity(barracksLevel: number): number {
  return 600 + barracksLevel * 240;
}
