import { useMemo, useState } from 'react';
import {
  ROSTER,
  makeUnit, makeSquad, resolveBattle,
  TILES, grantXp, leveledHero, attackTile, makeGarrison,
  newCity, produce, upgrade, addResources, troopCapacity, upgradeCost, canAfford, BUILDINGS,
} from './engine';
import type { Hero, TroopType, CombatEvent, CampaignHero, TileBattleOutcome, City, BuildingId, Resource } from './engine';

const HEROES: Hero[] = ROSTER;
const HERO_NAME: Record<string, string> = { zhaoyun: '趙雲', lubu: '呂布', zhuge: '諸葛亮', luxun: '陸遜', zhouyu: '周瑜', guanping: '關平' };
const nameOf = (id: string) => HERO_NAME[id] ?? (id.startsWith('garrison') ? '守將' : id);
const heroById = (id: string) => HEROES.find((h) => h.id === id)!;
const TROOPS: { v: TroopType; label: string }[] = [
  { v: 'cavalry', label: '騎兵' }, { v: 'spear', label: '槍兵' },
  { v: 'shield', label: '盾兵' }, { v: 'bow', label: '弓兵' }, { v: 'apparatus', label: '器械' },
];
const PHASE_LABEL: Record<CombatEvent['phase'], string> = {
  command: '指揮', passive: '被動', active: '主動', pursuit: '追擊', attack: '普攻', assault: '突擊', end: '結束',
};
const WINNER_LABEL: Record<string, string> = { attacker: '進攻方勝', defender: '防守方勝', draw: '平手' };

function HeroPicker({ hero, troop, onHero, onTroop }: { hero: string; troop: TroopType; onHero: (v: string) => void; onTroop: (v: TroopType) => void }) {
  return (
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
}

function BattleLog({ events }: { events: CombatEvent[] }) {
  const byTurn = useMemo(() => {
    const map = new Map<number, CombatEvent[]>();
    for (const e of events) { if (!map.has(e.turn)) map.set(e.turn, []); map.get(e.turn)!.push(e); }
    return [...map.entries()].sort((x, y) => x[0] - y[0]);
  }, [events]);
  return (
    <div className="log">
      {byTurn.map(([t, evs]) => (
        <div key={t}>
          <div className="turn-head">{t === 0 ? '開戰' : `第 ${t} 回合`}</div>
          {evs.map((e, i) => (
            <div className="ev" key={i}>
              <span className="phase-tag">[{PHASE_LABEL[e.phase]}]</span>{' '}
              <span>{nameOf(e.actorId)}</span>
              {e.tacticId && <span> 施展戰法</span>}
              {e.targetId && <span> → {nameOf(e.targetId)}</span>}
              {e.damage != null && <span className="dmg"> 造成 {e.damage} 傷害</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── 沙盒模式 ───────────────────────────────────────────────────
function Sandbox() {
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
    setResult(resolveBattle({
      attacker: makeSquad([makeUnit(a, attTroop, troops, 'attacker')]),
      defender: makeSquad([makeUnit(d, defTroop, troops, 'defender')]),
      seed,
    }));
  };

  return (
    <>
      <div className="grid">
        <div className="panel side-att"><h2>⚔️ 進攻方</h2><HeroPicker hero={attHero} troop={attTroop} onHero={setAttHero} onTroop={setAttTroop} /></div>
        <div className="panel side-def"><h2>🛡️ 防守方</h2><HeroPicker hero={defHero} troop={defTroop} onHero={setDefHero} onTroop={setDefTroop} /></div>
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
          <BattleLog events={result.events} />
        </>
      )}
    </>
  );
}

// ── 打地戰役模式 ───────────────────────────────────────────────
const RES_LABEL: Record<Resource, string> = { food: '糧', wood: '木', stone: '石', iron: '鐵', silver: '銀' };
const BUILD_ORDER: BuildingId[] = ['barracks', 'farm', 'lumber', 'quarry', 'ironForge', 'mint'];

function Campaign() {
  const [formation, setFormation] = useState<{ id: string; troop: TroopType }[]>([{ id: 'zhaoyun', troop: 'cavalry' }]);
  const [started, setStarted] = useState(false);
  const [ch, setCh] = useState<CampaignHero>({ hero: heroById('zhaoyun'), level: 1, xp: 0 });
  const [city, setCity] = useState<City>(newCity());
  const [tileIdx, setTileIdx] = useState(0);
  const [seedCtr, setSeedCtr] = useState(1);
  const [outcome, setOutcome] = useState<(TileBattleOutcome & { events: CombatEvent[] }) | null>(null);

  const start = () => {
    setCh({ hero: heroById(formation[0].id), level: 1, xp: 0 });
    setCity(newCity()); setTileIdx(0); setSeedCtr(1); setOutcome(null); setStarted(true);
  };

  const cleared = tileIdx >= TILES.length;
  const tile = cleared ? null : TILES[tileIdx];
  const playerTroops = troopCapacity(city.levels.barracks); // §7.2 帶兵量由兵營等級決定
  // 多將佈陣：每名武將依軍隊等級成長，各帶 playerTroops 兵（§7.1）
  const buildSquad = () => makeSquad(formation.map((f) => makeUnit(leveledHero({ hero: heroById(f.id), level: ch.level, xp: ch.xp }), f.troop, playerTroops, 'attacker')));

  const attack = () => {
    if (!tile) return;
    const out = attackTile(buildSquad(), tile, seedCtr);
    const full = resolveBattle({ attacker: buildSquad(), defender: makeGarrison(tile), seed: seedCtr });
    setOutcome({ ...out, events: full.events });
    setSeedCtr((s) => s + 1);
    // 每次出戰，內政照常產出（§11）
    setCity((c) => produce(c, 1));
    if (out.won && out.reward) {
      setCh((c) => grantXp(c, out.reward!.xp));
      // 打地獎勵：銀 + 糧木石（§11 地塊產資源）
      setCity((c) => addResources(c, { silver: out.reward!.silver, food: out.reward!.xp, wood: out.reward!.xp, stone: Math.round(out.reward!.xp * 0.6) }));
      setTileIdx((i) => i + 1);
    }
  };

  const doBuild = (b: BuildingId) => setCity((c) => upgrade(c, b).city);

  if (!started) {
    return (
      <>
        <div className="panel" style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2>🚩 開始打地戰役 — 佈陣</h2>
          <p className="subtitle" style={{ textAlign: 'left' }}>編組最多 3 名武將（§7.1 主將+副將），從荒野 Lv.1 一路打到洛陽。核心循環：打地賺資源 → 蓋城（兵營帶更多兵）→ 打更高地。</p>
          {formation.map((slot, i) => (
            <div key={i} style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 8 }}>
              <div className="row"><label>{i === 0 ? '主將' : `副將 ${i}`}</label>
                <select value={slot.id} onChange={(e) => setFormation((f) => f.map((s, j) => j === i ? { ...s, id: e.target.value } : s))}>
                  {HEROES.map((h) => <option key={h.id} value={h.id}>{HERO_NAME[h.id]}（{h.rarity}★）</option>)}
                </select>
                <select value={slot.troop} onChange={(e) => setFormation((f) => f.map((s, j) => j === i ? { ...s, troop: e.target.value as TroopType } : s))}>
                  {TROOPS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                </select>
                {formation.length > 1 && <button onClick={() => setFormation((f) => f.filter((_, j) => j !== i))} style={{ flex: '0 0 auto', background: '#5a2a2a', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>移除</button>}
              </div>
            </div>
          ))}
          {formation.length < 3 && <div className="controls" style={{ margin: '12px 0 0' }}><button onClick={() => setFormation((f) => [...f, { id: HEROES.find((h) => !f.some((s) => s.id === h.id))?.id ?? 'guanping', troop: 'spear' }])} style={{ background: '#3a2e1e', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>＋ 加入武將</button></div>}
        </div>
        <div className="controls"><button className="fight" onClick={start}>出 征</button></div>
      </>
    );
  }

  return (
    <>
      <div className="grid">
        <div className="panel side-att">
          <h2>🗡️ 我軍（軍隊 Lv.{ch.level}）</h2>
          {formation.map((f, i) => (
            <div className="row" key={i}><label>{i === 0 ? '主將' : `副將${i}`}</label>
              <span>{nameOf(f.id)} ／ {TROOPS.find((t) => t.v === f.troop)?.label} ／ {playerTroops} 兵</span></div>
          ))}
          <div className="row"><label>軍隊</label><span>Lv.{ch.level}／50（XP {ch.xp}）｜ 兵營 Lv.{city.levels.barracks}</span></div>
          <div className="row"><label>進度</label><span>{Math.min(tileIdx, TILES.length)} / {TILES.length} 關</span></div>
        </div>
        <div className="panel side-def">
          <h2>🏯 {cleared ? '全境平定' : tile!.name}</h2>
          {!cleared && <>
            <div className="row"><label>守軍</label><span>武力 {tile!.garrisonForce} ／ {tile!.garrisonTroops} 兵（{TROOPS.find((t) => t.v === tile!.garrisonTroop)?.label}）</span></div>
            <div className="row"><label>建議</label><span>英雄 Lv.{tile!.recHeroLv}+</span></div>
            <div className="row"><label>獎勵</label><span>XP {tile!.reward.xp} ／ 銀 {tile!.reward.silver}</span></div>
          </>}
        </div>
      </div>

      {/* 城建面板（§9/§11）*/}
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>🏛️ 城建 ｜ 資源：{(['food', 'wood', 'stone', 'iron', 'silver'] as Resource[]).map((r) => `${RES_LABEL[r]} ${city.resources[r]}`).join('　')}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {BUILD_ORDER.map((b) => {
            const lv = city.levels[b];
            const cost = upgradeCost(b, lv);
            const afford = canAfford(city.resources, cost) && lv < 25;
            const costStr = (Object.keys(cost) as Resource[]).filter((k) => cost[k] > 0).map((k) => `${RES_LABEL[k]}${cost[k]}`).join('/');
            return (
              <button key={b} onClick={() => doBuild(b)} disabled={!afford}
                style={{ flex: '1 1 140px', background: afford ? '#3a2e1e' : '#241c14', color: afford ? 'var(--ink)' : '#666', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', cursor: afford ? 'pointer' : 'not-allowed', textAlign: 'left', fontSize: 13 }}>
                <b>{BUILDINGS[b].name} Lv.{lv}</b><br />
                <span style={{ color: 'var(--muted)' }}>{BUILDINGS[b].desc}</span><br />
                <span style={{ color: afford ? 'var(--gold)' : '#666' }}>升級：{costStr}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="controls">
        {cleared
          ? <div className="winner">🎉 攻克洛陽，問鼎天下！</div>
          : <button className="fight" onClick={attack}>攻打 {tile!.name}</button>}
        <button className="fight" style={{ background: '#444' }} onClick={() => setStarted(false)}>重新開始</button>
      </div>
      {outcome && (
        <>
          <div className="result">
            <div className="winner" style={{ color: outcome.won ? '#c9a227' : '#e06666' }}>{outcome.won ? `攻克 ${outcome.tile.name}！` : `攻打 ${outcome.tile.name} 失敗`}</div>
            <div className="subtitle">{outcome.turns} 回合 ｜ 我軍剩 {outcome.playerHpLeft} ｜ 守軍剩 {outcome.garrisonHpLeft}{outcome.reward ? ` ｜ +XP ${outcome.reward.xp} +資源` : ''}</div>
          </div>
          <BattleLog events={outcome.events} />
        </>
      )}
    </>
  );
}

export default function App() {
  const [mode, setMode] = useState<'campaign' | 'sandbox'>('campaign');
  return (
    <div className="wrap">
      <h1>三國志戰略 — 戰鬥模擬器</h1>
      <p className="subtitle">自動戰鬥引擎 v0.1（決定性、兵種相剋、戰法、士氣、8 回合）</p>
      <div className="controls" style={{ marginTop: 0 }}>
        <button className="fight" style={{ background: mode === 'campaign' ? 'var(--accent)' : '#444', padding: '8px 20px', fontSize: 14 }} onClick={() => setMode('campaign')}>打地戰役</button>
        <button className="fight" style={{ background: mode === 'sandbox' ? 'var(--accent)' : '#444', padding: '8px 20px', fontSize: 14 }} onClick={() => setMode('sandbox')}>對戰沙盒</button>
      </div>
      {mode === 'campaign' ? <Campaign /> : <Sandbox />}
    </div>
  );
}
