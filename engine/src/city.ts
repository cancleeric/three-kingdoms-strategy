/**
 * Three Kingdoms Strategy — 城建 + 資源經濟（§9 城建 / §11 經濟）
 *
 * 串起核心循環（§3）：打地賺資源 → 蓋城變強 → 帶更多兵 → 打更高地。
 * 純資料 + 純函式，可單元測試。
 */
import type { TroopType } from './types';

// ── §11.1 資源 ─────────────────────────────────────────────────
export type Resource = 'food' | 'wood' | 'stone' | 'iron' | 'silver';
export type Resources = Record<Resource, number>;

export const emptyResources = (): Resources => ({ food: 0, wood: 0, stone: 0, iron: 0, silver: 0 });

// ── §9.1 建築 ──────────────────────────────────────────────────
// M5-1：兵營分兵種——騎/槍/盾/弓營各自等級，提升對應兵種的帶兵量（對齊真實《三戰》）。
export type BuildingId =
  | 'farm' | 'lumber' | 'quarry' | 'ironForge' | 'mint'
  | 'cavalryCamp' | 'spearCamp' | 'shieldCamp' | 'bowCamp';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  desc: string;
  /** 每級每 tick 產出的資源（兵營不產資源，產對應兵種帶兵量）*/
  produces?: { res: Resource; perLevel: number };
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  farm: { id: 'farm', name: '農田', desc: '產糧', produces: { res: 'food', perLevel: 20 } },
  lumber: { id: 'lumber', name: '伐木場', desc: '產木', produces: { res: 'wood', perLevel: 18 } },
  quarry: { id: 'quarry', name: '採石場', desc: '產石', produces: { res: 'stone', perLevel: 15 } },
  ironForge: { id: 'ironForge', name: '冶鐵坊', desc: '產鐵', produces: { res: 'iron', perLevel: 12 } },
  mint: { id: 'mint', name: '錢莊', desc: '產銀錢（F2P 命脈）', produces: { res: 'silver', perLevel: 25 } },
  cavalryCamp: { id: 'cavalryCamp', name: '騎兵營', desc: '提升騎兵帶兵量' },
  spearCamp: { id: 'spearCamp', name: '槍兵營', desc: '提升槍／象兵帶兵量' },
  shieldCamp: { id: 'shieldCamp', name: '盾兵營', desc: '提升盾／刀盾帶兵量' },
  bowCamp: { id: 'bowCamp', name: '弓兵營', desc: '提升弓／器械／水軍帶兵量' },
};

// 8 兵種 → 4 兵營映射
export const TROOP_CAMP: Record<TroopType, BuildingId> = {
  cavalry: 'cavalryCamp',
  spear: 'spearCamp', elephant: 'spearCamp',
  shield: 'shieldCamp', sword: 'shieldCamp',
  bow: 'bowCamp', apparatus: 'bowCamp', navy: 'bowCamp',
};

export interface City {
  levels: Record<BuildingId, number>; // 各建築等級（0=未建）
  resources: Resources;
  building?: Partial<Record<BuildingId, number>>; // M5-5 施工中：BuildingId → 完工 timestamp(ms)
}

export function newCity(): City {
  return {
    levels: { farm: 1, lumber: 1, quarry: 1, ironForge: 0, mint: 1, cavalryCamp: 1, spearCamp: 1, shieldCamp: 1, bowCamp: 1 },
    resources: { food: 200, wood: 200, stone: 100, iron: 0, silver: 100 },
  };
}

// ── §9.2 升級成本曲線（隨等級指數成長，門檻在 5/10/15…）─────────
export function upgradeCost(b: BuildingId, currentLevel: number): Resources {
  const next = currentLevel + 1;
  const base = Math.round(80 * Math.pow(1.5, next - 1));
  // 不同建築吃不同主資源，外加少量通用木/石
  const main: Partial<Record<BuildingId, Resource>> = {
    farm: 'wood', lumber: 'stone', quarry: 'wood', ironForge: 'stone', mint: 'iron',
    cavalryCamp: 'iron', spearCamp: 'iron', shieldCamp: 'iron', bowCamp: 'iron',
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
export function troopCapacity(campLevel: number): number {
  return 600 + campLevel * 240;
}

// M5-1：某兵種的帶兵量 = 其對應兵營等級的容量。
export function capacityForTroop(city: City, troop: TroopType): number {
  return troopCapacity(city.levels[TROOP_CAMP[troop]]);
}

// ── M5-5 建造倒計時 + 加速（對齊真實《三戰》兵營建造計時）──────────
// 升級不再即時完成：扣資源後進入施工，到時間自動完工或花費加速。
// 示範時長：每級 20 秒（真實遊戲為數小時，此處縮短便於觀察施工→加速）。
export const buildDuration = (nextLevel: number): number => nextLevel * 20_000;
export const isBuilding = (city: City, b: BuildingId): boolean => city.building?.[b] != null;

/** 開始升級：扣資源、設完工時刻。已在施工或資源不足則 ok:false。 */
export function startUpgrade(city: City, b: BuildingId, now: number): { ok: boolean; city: City } {
  const cur = city.levels[b];
  if (cur >= 25 || isBuilding(city, b)) return { ok: false, city };
  const cost = upgradeCost(b, cur);
  if (!canAfford(city.resources, cost)) return { ok: false, city };
  const res = { ...city.resources };
  (Object.keys(cost) as Resource[]).forEach((k) => { res[k] -= cost[k]; });
  return { ok: true, city: { ...city, resources: res, building: { ...city.building, [b]: now + buildDuration(cur + 1) } } };
}

/** 結算到時間的施工（完工 → 升級、移除計時）。供每秒 tick 呼叫。 */
export function collectBuilds(city: City, now: number): City {
  if (!city.building) return city;
  const levels = { ...city.levels };
  const building = { ...city.building };
  let changed = false;
  for (const [b, completeAt] of Object.entries(building) as [BuildingId, number][]) {
    if (completeAt <= now) { levels[b] = levels[b] + 1; delete building[b]; changed = true; }
  }
  return changed ? { ...city, levels, building } : city;
}

/** 加速：立即完工某施工中建築（免費，示範用）。 */
export function speedupBuild(city: City, b: BuildingId): City {
  if (!isBuilding(city, b)) return city;
  const building = { ...city.building };
  delete building[b];
  return { ...city, levels: { ...city.levels, [b]: city.levels[b] + 1 }, building };
}
