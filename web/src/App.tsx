import { useMemo, useState } from 'react';
import {
  ZHAO_YUN, LU_XUN, GUAN_PING,
  makeUnit, makeSquad, resolveBattle,
} from './engine';
import type { Hero, TroopType, CombatEvent } from './engine';

const HEROES: Hero[] = [ZHAO_YUN, LU_XUN, GUAN_PING];
const HERO_NAME: Record<string, string> = { zhaoyun: '趙雲', luxun: '陸遜', guanping: '關平' };
const TROOPS: { v: TroopType; label: string }[] = [
  { v: 'cavalry', label: '騎兵' }, { v: 'spear', label: '槍兵' },
  { v: 'shield', label: '盾兵' }, { v: 'bow', label: '弓兵' }, { v: 'apparatus', label: '器械' },
];
const PHASE_LABEL: Record<CombatEvent['phase'], string> = {
  command: '指揮', passive: '被動', active: '主動', pursuit: '追擊', attack: '普攻', assault: '突擊', end: '結束',
};
const WINNER_LABEL: Record<string, string> = { attacker: '進攻方勝', defender: '防守方勝', draw: '平手' };

export default function App() {
  const [attHero, setAttHero] = useState('zhaoyun');
  const [attTroop, setAttTroop] = useState<TroopType>('cavalry');
  const [defHero, setDefHero] = useState('luxun');
  const [defTroop, setDefTroop] = useState<TroopType>('bow');
  const [troops, setTroops] = useState(5000);
  const [seed, setSeed] = useState(42);
  const [result, setResult] = useState<ReturnType<typeof resolveBattle> | null>(null);

  const fight = () => {
    const a = HEROES.find((h) => h.id === attHero)!;
    const d = HEROES.find((h) => h.id === defHero)!;
    const att = makeSquad([makeUnit(a, attTroop, troops, 'attacker')]);
    const def = makeSquad([makeUnit(d, defTroop, troops, 'defender')]);
    setResult(resolveBattle({ attacker: att, defender: def, seed }));
  };

  const byTurn = useMemo(() => {
    if (!result) return [];
    const map = new Map<number, CombatEvent[]>();
    for (const e of result.events) {
      if (!map.has(e.turn)) map.set(e.turn, []);
      map.get(e.turn)!.push(e);
    }
    return [...map.entries()].sort((x, y) => x[0] - y[0]);
  }, [result]);

  const Picker = ({ hero, troop, onHero, onTroop }: { hero: string; troop: TroopType; onHero: (v: string) => void; onTroop: (v: TroopType) => void }) => (
    <>
      <div className="row"><label>武將</label>
        <select value={hero} onChange={(e) => onHero(e.target.value)}>
          {HEROES.map((h) => <option key={h.id} value={h.id}>{HERO_NAME[h.id]}（{h.rarity}★）</option>)}
        </select>
      </div>
      <div className="row"><label>兵種</label>
        <select value={troop} onChange={(e) => onTroop(e.target.value as TroopType)}>
          {TROOPS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
      </div>
    </>
  );

  return (
    <div className="wrap">
      <h1>三國志戰略 — 戰鬥模擬器</h1>
      <p className="subtitle">自動戰鬥引擎 v0.1（決定性、兵種相剋、戰法、士氣、8 回合）。同 seed 完全重現。</p>

      <div className="grid">
        <div className="panel side-att">
          <h2>⚔️ 進攻方</h2>
          <Picker hero={attHero} troop={attTroop} onHero={setAttHero} onTroop={setAttTroop} />
        </div>
        <div className="panel side-def">
          <h2>🛡️ 防守方</h2>
          <Picker hero={defHero} troop={defTroop} onHero={setDefHero} onTroop={setDefTroop} />
        </div>
      </div>

      <div className="controls">
        <span>兵力 <input type="number" style={{ width: 90 }} value={troops} onChange={(e) => setTroops(+e.target.value || 0)} /></span>
        <span>Seed <input type="number" style={{ width: 90 }} value={seed} onChange={(e) => setSeed(+e.target.value || 0)} /></span>
        <button className="fight" onClick={fight}>開 戰</button>
      </div>

      {result && (
        <>
          <div className="result">
            <div className="winner">{WINNER_LABEL[result.winner]}</div>
            <div className="subtitle">共 {result.turns} 回合 ｜ 進攻方剩餘 {result.attackerHpLeft} ｜ 防守方剩餘 {result.defenderHpLeft}</div>
          </div>
          <div className="log">
            {byTurn.map(([t, evs]) => (
              <div key={t}>
                <div className="turn-head">{t === 0 ? '開戰' : `第 ${t} 回合`}</div>
                {evs.map((e, i) => {
                  const actorName = HERO_NAME[e.actorId] ?? e.actorId;
                  const targetName = e.targetId ? (HERO_NAME[e.targetId] ?? e.targetId) : '';
                  return (
                    <div className="ev" key={i}>
                      <span className="phase-tag">[{PHASE_LABEL[e.phase]}]</span>{' '}
                      <span>{actorName}</span>
                      {e.tacticId && <span> 施展戰法</span>}
                      {targetName && <span> → {targetName}</span>}
                      {e.damage != null && <span className="dmg"> 造成 {e.damage} 傷害</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
