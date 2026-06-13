/**
 * Three Kingdoms Strategy — 自動戰鬥結算引擎
 *
 * 忠實實作 docs/GAME_RULES.md：
 *  §6.4 回合內結算順序、§7.3 兵種相剋、§8.1 8 回合制、§8.2 傷害公式、§8.3 士氣。
 *
 * 設計原則（GDD §1）：戰鬥由戰前規劃自動結算、所有公式公開、可重現（吃 seed）。
 * 純函式邏輯，無框架相依，可單元測試。
 */

import type {
  BattleUnit,
  Squad,
  Tactic,
  TroopType,
  DamageKind,
} from './types';

// ── 決定性亂數（吃 seed，戰鬥可重現）— mulberry32 ──────────────
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── §7.3 兵種相剋（騎>弓>盾>槍>騎；器中立克工事）─────────────
// key 克 value。匹配剋制 +15%，被剋 -15%（GDD 寫 10~20%，取中位 15%）。
const COUNTERS: Record<TroopType, TroopType> = {
  cavalry: 'bow',
  bow: 'shield',
  shield: 'spear',
  spear: 'cavalry',
  apparatus: 'apparatus', // 中立
};

export function troopMatchup(attacker: TroopType, defender: TroopType): number {
  if (attacker === 'apparatus' || defender === 'apparatus') return 1.0;
  if (COUNTERS[attacker] === defender) return 1.15; // 克制
  if (COUNTERS[defender] === attacker) return 0.85; // 被克
  return 1.0;
}

// ── §8.2 傷害公式 ──────────────────────────────────────────────
// base = atkStat * coefficient - defCommand * 0.7
// final = max(1, base * modifier) * rand(0.95,1.05)
// strategic 用智力、無視兵種相剋（§8.2）。
export interface DamageContext {
  attacker: BattleUnit;
  defender: BattleUnit;
  coefficient: number;
  kind: DamageKind;
  attackerMorale: number; // §8.3 潰敗 -30% 輸出
  rng: () => number;
}

export function computeDamage(ctx: DamageContext): number {
  const { attacker, defender, coefficient, kind, attackerMorale, rng } = ctx;
  const atkStat =
    kind === 'physical' ? attacker.hero.stats.force : attacker.hero.stats.intellect;
  const base = atkStat * coefficient - defender.hero.stats.command * 0.7;

  let modifier = 1.0;
  // 兵種相剋只作用於物理（strategic 無視）
  if (kind === 'physical') {
    modifier *= troopMatchup(attacker.troopType, defender.troopType);
  }
  // 紅度加成（§8.2，每紅度 +3%，上限 5 紅 = +15%）
  modifier *= 1 + 0.03 * attacker.hero.redStars;
  // 潰敗懲罰（§8.3：morale 0 → 輸出 -30%）
  if (attackerMorale <= 0) modifier *= 0.7;

  const randFactor = 0.95 + rng() * 0.1; // 0.95~1.05
  return Math.max(1, base * modifier) * randFactor;
}

// ── §8.3 士氣：傷害造成傷亡 → 扣士氣 ──────────────────────────
// 簡化：每承受 (maxHp 的 5%) 傷亡扣 1 點士氣。
function moraleLossFromCasualties(casualties: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return (casualties / maxHp) * 100 * 0.05 * 20; // 比例化
}

// ── 套用傷害：扣兵量、回傳實際傷亡 ─────────────────────────────
function applyDamage(target: BattleUnit, dmg: number): number {
  const actual = Math.min(target.hp, Math.round(dmg));
  target.hp -= actual;
  return actual;
}

// ── 選目標：敵方存活單位中 HP 最低（聚火）─────────────────────
function pickTarget(enemies: BattleUnit[]): BattleUnit | null {
  const alive = enemies.filter((u) => u.hp > 0);
  if (alive.length === 0) return null;
  return alive.reduce((lo, u) => (u.hp < lo.hp ? u : lo), alive[0]);
}

// ── 戰鬥事件日誌（供 UI 回放）─────────────────────────────────
export interface CombatEvent {
  turn: number;
  phase: 'command' | 'passive' | 'active' | 'pursuit' | 'attack' | 'assault' | 'end';
  actorId: string;
  targetId?: string;
  tacticId?: string;
  damage?: number;
  note?: string;
}

export interface BattleResult {
  winner: 'attacker' | 'defender' | 'draw';
  turns: number;
  events: CombatEvent[];
  attackerHpLeft: number;
  defenderHpLeft: number;
}

function squadHp(s: Squad): number {
  return s.units.reduce((sum, u) => sum + Math.max(0, u.hp), 0);
}
function squadAlive(s: Squad): boolean {
  return s.units.some((u) => u.hp > 0);
}

// ── §6.4 回合內結算 ────────────────────────────────────────────
// passive(turn start) → active(降速排序) → pursuit → normal attack(降速) → assault → passive(turn end)
// MVP：active=主動戰法、assault=普攻觸發戰法、pursuit=主動後追擊。
function unitsBySpeed(squad: Squad): BattleUnit[] {
  return [...squad.units]
    .filter((u) => u.hp > 0)
    .sort((a, b) => b.hero.stats.speed - a.hero.stats.speed);
}

function tacticsOf(u: BattleUnit, type: Tactic['type']): Tactic[] {
  const all = [u.hero.innate, ...u.hero.tactics];
  return all.filter((t) => t.type === type);
}

// ── 主結算 ─────────────────────────────────────────────────────
export interface BattleConfig {
  attacker: Squad;
  defender: Squad;
  seed: number;
  maxTurns?: number; // §8.1 預設 8
}

export function resolveBattle(cfg: BattleConfig): BattleResult {
  const maxTurns = cfg.maxTurns ?? 8;
  const rng = makeRng(cfg.seed);
  const events: CombatEvent[] = [];
  const { attacker, defender } = cfg;

  const enemyOf = (u: BattleUnit): Squad =>
    u.side === 'attacker' ? defender : attacker;
  const moraleOf = (u: BattleUnit): number =>
    u.side === 'attacker' ? attacker.morale : defender.morale;

  function hitMorale(side: Squad, casualties: number, maxHp: number) {
    side.morale = Math.max(0, side.morale - moraleLossFromCasualties(casualties, maxHp));
  }

  // §6.1 指揮戰法：開戰生效（MVP 記錄事件，係數已內含於主動）
  for (const u of [...attacker.units, ...defender.units]) {
    for (const t of tacticsOf(u, 'command')) {
      events.push({ turn: 0, phase: 'command', actorId: u.hero.id, tacticId: t.id });
    }
  }

  let turn = 0;
  for (turn = 1; turn <= maxTurns; turn++) {
    if (!squadAlive(attacker) || !squadAlive(defender)) break;

    // 回合開始被動
    for (const u of [...unitsBySpeed(attacker), ...unitsBySpeed(defender)]) {
      for (const t of tacticsOf(u, 'passive')) {
        if (rng() < t.triggerRate && t.coefficient > 0) {
          const tgt = pickTarget(enemyOf(u).units);
          if (tgt) {
            const dmg = computeDamage({ attacker: u, defender: tgt, coefficient: t.coefficient, kind: t.damageKind, attackerMorale: moraleOf(u), rng });
            const cas = applyDamage(tgt, dmg);
            hitMorale(enemyOf(u), cas, tgt.maxHp);
            events.push({ turn, phase: 'passive', actorId: u.hero.id, targetId: tgt.hero.id, tacticId: t.id, damage: Math.round(dmg) });
          }
        }
      }
    }

    // 主動戰法（雙方依速度交錯，降速排序）+ 追擊
    const order = [...attacker.units, ...defender.units]
      .filter((u) => u.hp > 0)
      .sort((a, b) => b.hero.stats.speed - a.hero.stats.speed);
    for (const u of order) {
      if (u.hp <= 0) continue;
      for (const t of tacticsOf(u, 'active')) {
        if (rng() < t.triggerRate) {
          const tgt = pickTarget(enemyOf(u).units);
          if (tgt) {
            const dmg = computeDamage({ attacker: u, defender: tgt, coefficient: t.coefficient, kind: t.damageKind, attackerMorale: moraleOf(u), rng });
            const cas = applyDamage(tgt, dmg);
            hitMorale(enemyOf(u), cas, tgt.maxHp);
            events.push({ turn, phase: 'active', actorId: u.hero.id, targetId: tgt.hero.id, tacticId: t.id, damage: Math.round(dmg) });
            // 追擊：友方主動結算後觸發（§6.4）
            const allies = u.side === 'attacker' ? attacker.units : defender.units;
            for (const ally of allies) {
              for (const p of tacticsOf(ally, 'pursuit')) {
                if (ally.hp > 0 && rng() < p.triggerRate) {
                  const pt = pickTarget(enemyOf(u).units);
                  if (pt) {
                    const pdmg = computeDamage({ attacker: ally, defender: pt, coefficient: p.coefficient, kind: p.damageKind, attackerMorale: moraleOf(ally), rng });
                    const pcas = applyDamage(pt, pdmg);
                    hitMorale(enemyOf(u), pcas, pt.maxHp);
                    events.push({ turn, phase: 'pursuit', actorId: ally.hero.id, targetId: pt.hero.id, tacticId: p.id, damage: Math.round(pdmg) });
                  }
                }
              }
            }
          }
        }
      }
    }

    // 普攻（降速排序）+ 突擊
    for (const u of order) {
      if (u.hp <= 0) continue;
      const tgt = pickTarget(enemyOf(u).units);
      if (!tgt) continue;
      const atkDmg = computeDamage({ attacker: u, defender: tgt, coefficient: 1.0, kind: 'physical', attackerMorale: moraleOf(u), rng });
      const cas = applyDamage(tgt, atkDmg);
      hitMorale(enemyOf(u), cas, tgt.maxHp);
      events.push({ turn, phase: 'attack', actorId: u.hero.id, targetId: tgt.hero.id, damage: Math.round(atkDmg) });
      // 突擊：普攻時觸發（§6.4）
      for (const t of tacticsOf(u, 'assault')) {
        if (rng() < t.triggerRate) {
          const at = pickTarget(enemyOf(u).units);
          if (at) {
            const adng = computeDamage({ attacker: u, defender: at, coefficient: t.coefficient, kind: t.damageKind, attackerMorale: moraleOf(u), rng });
            const acas = applyDamage(at, adng);
            hitMorale(enemyOf(u), acas, at.maxHp);
            events.push({ turn, phase: 'assault', actorId: u.hero.id, targetId: at.hero.id, tacticId: t.id, damage: Math.round(adng) });
          }
        }
      }
    }
  }

  const aHp = squadHp(attacker);
  const dHp = squadHp(defender);
  let winner: BattleResult['winner'];
  if (!squadAlive(attacker) && !squadAlive(defender)) winner = 'draw';
  else if (!squadAlive(defender)) winner = 'attacker';
  else if (!squadAlive(attacker)) winner = 'defender';
  // §8.1 8 回合未分勝負 → 剩餘 HP 多者勝
  else winner = aHp > dHp ? 'attacker' : aHp < dHp ? 'defender' : 'draw';

  return { winner, turns: Math.min(turn, maxTurns), events, attackerHpLeft: aHp, defenderHpLeft: dHp };
}
