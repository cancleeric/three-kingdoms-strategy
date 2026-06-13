/**
 * Three Kingdoms Strategy — 核心領域模型
 *
 * 直接對應 docs/GAME_RULES.md（GDD）。任何數值/規則改動必須同步更新 GDD。
 * 本檔為純邏輯型別，無框架相依，供戰鬥引擎與未來 UI 共用。
 */

// ── §5.2 核心屬性 ──────────────────────────────────────────────
export interface HeroStats {
  force: number; // 武力 — 物理傷害
  intellect: number; // 智力 — 策略傷害與多數戰法
  command: number; // 統率 — 防禦與帶兵量
  speed: number; // 速度 — 決定出手順序
  politics: number; // 政治 — 內政與資源產出
  charm: number; // 魅力 — 外交、招募、士氣
}

// ── §5.1 稀有度 ────────────────────────────────────────────────
export type Rarity = 3 | 4 | 5 | 6; // Star 3~6（SP 視為 6 + 標記）

// ── §7.3 / §5.5 兵種 ───────────────────────────────────────────
export type TroopType = 'cavalry' | 'spear' | 'shield' | 'bow' | 'apparatus';
// 適性評級（兵種適性 §5.5）
export type Aptitude = 'S' | 'A' | 'B' | 'C';

// ── §6.1 戰法類型 ──────────────────────────────────────────────
export type TacticType =
  | 'command' // 指揮：開戰生效，持續整場
  | 'active' // 主動：每回合機率觸發，主要傷害
  | 'passive' // 被動：條件觸發（如 HP 門檻）
  | 'assault' // 突擊：普攻時觸發
  | 'pursuit' // 追擊：友方主動戰法結算後觸發
  | 'innate'; // 自帶：不可拆，隨紅度成長

// 傷害走武力(physical)或智力(strategic)；strategic 無視兵種相剋（§8.2）
export type DamageKind = 'physical' | 'strategic';

export interface Tactic {
  id: string;
  name: string;
  type: TacticType;
  level: number; // §6.2 Lv.1~10
  /** 觸發機率 0~1（command/innate 視為 1）*/
  triggerRate: number;
  /** 傷害係數（base = atkStat * coefficient），無傷害戰法為 0 */
  coefficient: number;
  damageKind: DamageKind;
  /** 命中目標數（單體=1，群體>1）*/
  targets: number;
  /** 額外效果鉤子（士氣/治療/減益等），MVP 先留擴充點 */
  effects?: TacticEffect[];
}

export interface TacticEffect {
  kind: 'morale' | 'heal' | 'buff' | 'debuff';
  value: number;
  /** 作用對象：self / ally / enemy */
  target: 'self' | 'ally' | 'enemy';
}

// ── 英雄（戰鬥所需子集；完整養成系統另立）──────────────────────
export interface Hero {
  id: string;
  name: string;
  rarity: Rarity;
  stats: HeroStats;
  redStars: number; // §5.4 紅度 0~5
  aptitude: Record<TroopType, Aptitude>; // §5.5 兵種適性
  innate: Tactic; // 自帶戰法
  tactics: Tactic[]; // 已裝的非自帶戰法（含 innate 之外）
}

// ── 戰鬥中的單位（英雄 + 帶兵 + 即時狀態）────────────────────────
export interface BattleUnit {
  hero: Hero;
  troopType: TroopType;
  troops: number; // §7.2 帶兵量
  hp: number; // 以剩餘兵量代表 HP
  maxHp: number;
  side: 'attacker' | 'defender';
}

export interface Squad {
  units: BattleUnit[]; // §7.1 1 主將 + 2 副將
  morale: number; // §8.3 初始 100
}
