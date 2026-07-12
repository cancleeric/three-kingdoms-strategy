import { useMemo, useState } from 'react';
import { ROSTER } from './engine';
import type { TroopType, BattleResult, CombatEvent } from './engine';
import { useSocketConnection } from './useSocketConnection';

const HERO_NAME: Record<string, string> = { zhaoyun: '趙雲', lubu: '呂布', zhuge: '諸葛亮', luxun: '陸遜', zhouyu: '周瑜', guanping: '關平', huanggai: '黃蓋', lidian: '李典', zhoucang: '周倉' };
const TROOPS: { v: TroopType; label: string }[] = [
  { v: 'cavalry', label: '騎兵' }, { v: 'spear', label: '槍兵' }, { v: 'shield', label: '盾兵' }, { v: 'bow', label: '弓兵' }, { v: 'apparatus', label: '器械' },
];
const PHASE: Record<string, string> = { command: '指揮', passive: '被動', active: '主動', pursuit: '追擊', attack: '普攻', assault: '突擊', end: '結束' };

export default function Pvp() {
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [seat, setSeat] = useState<'A' | 'B' | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
  const [hero, setHero] = useState('zhaoyun');
  const [troop, setTroop] = useState<TroopType>('cavalry');
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [result, setResult] = useState<{ result: BattleResult; winnerSeat: string } | null>(null);
  const [note, setNote] = useState('');
  // §12 同盟
  const [alliance, setAlliance] = useState<{ id: string; name: string; count: number; members: { name: string; rank: string; contribution: number }[]; tech: Record<string, { level: number; progress: number }>; perks: Record<string, number> } | null>(null);
  const [allyName, setAllyName] = useState('');
  const [allyCode, setAllyCode] = useState('');

  const { status, sockRef, retry } = useSocketConnection('/sanguo/socket', (s) => {
    s.on('sg:roomUpdate', (d: { roomId: string; seats: string[] }) => { setRoomId(d.roomId); setSeats(d.seats); });
    s.on('sg:submitted', (d: { seat: string }) => setSubmitted((p) => [...new Set([...p, d.seat])]));
    s.on('sg:result', (d: { result: BattleResult; winnerSeat: string }) => { setResult(d); setSubmitted([]); });
    s.on('sg:opponentLeft', () => { setNote('對手已離開'); setSeats([]); });
    s.on('sg:allianceUpdate', (d) => setAlliance(d));
  });
  const connected = status === 'connected';

  const RANK: Record<string, string> = { leader: '盟主', vice: '副盟主', officer: '官員', member: '盟眾' };
  const TECH_LABEL: Record<string, string> = { marchSpeed: '行軍加速', troopCapacity: '帶兵擴充', tileYield: '領地增產' };
  const createAlliance = () => { sockRef.current?.emit('sg:setName', { name: '盟主' + Math.floor(Date.now() % 1000) }); sockRef.current?.emit('sg:createAlliance', { name: allyName.trim() || '蒼天同盟' }); };
  const joinAlliance = () => { sockRef.current?.emit('sg:setName', { name: '盟眾' + Math.floor(Date.now() % 1000) }); sockRef.current?.emit('sg:joinAlliance', { allianceId: allyCode.trim() }, (r: { ok: boolean; error?: string }) => { if (!r.ok) setNote(r.error ?? '加盟失敗'); }); };
  const donate = (tech: string) => sockRef.current?.emit('sg:donate', { allianceId: alliance?.id, tech, amount: 500 });

  const createRoom = () => sockRef.current?.emit('sg:createRoom', {}, (r: { roomId: string }) => { setRoomId(r.roomId); setSeat('A'); setResult(null); setNote('已開房，把房號給對手'); });
  const joinRoom = () => sockRef.current?.emit('sg:joinRoom', { roomId: joinCode.trim() }, (r: { ok: boolean; seat?: 'A' | 'B'; error?: string }) => {
    if (r.ok) { setRoomId(joinCode.trim()); setSeat(r.seat!); setResult(null); setNote('已加入房間'); } else setNote(r.error ?? '加入失敗');
  });
  const submit = () => { sockRef.current?.emit('sg:submit', { roomId, submission: { formation: [{ heroId: hero, troop }], level: 20, troops: 5000 } }); setSubmitted((p) => [...new Set([...p, seat!])]); };

  const byTurn = useMemo(() => {
    if (!result) return [] as [number, CombatEvent[]][];
    const m = new Map<number, CombatEvent[]>();
    for (const e of result.result.events) { if (!m.has(e.turn)) m.set(e.turn, []); m.get(e.turn)!.push(e); }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [result]);
  const nameOf = (id: string) => HERO_NAME[id] ?? id;

  return (
    <>
      <div className="panel" style={{ maxWidth: 620, margin: '0 auto' }}>
        <h2>🌐 連線對戰（PvP）｜ {status === 'connected' ? '已連線' : status === 'error' ? '連線失敗' : '連線中…'}</h2>
        {status === 'error' && (
          <div className="subtitle" style={{ color: '#e05a5a', marginTop: 4 }}>
            連線失敗，請確認伺服器已啟動
            <button onClick={retry} style={{ marginLeft: 10, padding: '4px 14px', background: '#5a2e2e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>重試</button>
          </div>
        )}
        {!seat && (
          <div className="controls" style={{ margin: '8px 0', justifyContent: 'flex-start', gap: 16 }}>
            <button className="fight" onClick={createRoom} disabled={!connected} style={{ fontSize: 14, padding: '8px 18px' }}>開房</button>
            <span>或 <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="房號" style={{ width: 90 }} /> <button className="fight" onClick={joinRoom} disabled={!connected} style={{ fontSize: 14, padding: '8px 16px', background: '#3a2e1e' }}>加入</button></span>
          </div>
        )}
        {seat && (
          <>
            <div className="row"><label>房號</label><span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 18 }}>{roomId}</span>（你是 {seat} 座）</div>
            <div className="row"><label>對戰人數</label><span>{seats.length} / 2 {seats.length < 2 ? '（等對手加入…）' : '（可出戰）'}</span></div>
            <div className="row"><label>選將</label>
              <select value={hero} onChange={(e) => setHero(e.target.value)}>{ROSTER.map((h) => <option key={h.id} value={h.id}>{nameOf(h.id)}（{h.rarity}★）</option>)}</select>
              <select value={troop} onChange={(e) => setTroop(e.target.value as TroopType)}>{TROOPS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}</select>
            </div>
            <div className="controls" style={{ margin: '8px 0 0' }}>
              <button className="fight" onClick={submit} disabled={seats.length < 2 || submitted.includes(seat)} style={{ fontSize: 14, padding: '8px 20px' }}>{submitted.includes(seat) ? '已提交，等對手…' : '提交佈陣出戰'}</button>
            </div>
          </>
        )}
        {note && <div className="subtitle" style={{ marginTop: 8 }}>{note}</div>}
      </div>

      {result && (
        <>
          <div className="result">
            <div className="winner">{result.winnerSeat === 'draw' ? '平手' : `${result.winnerSeat} 座勝${seat === result.winnerSeat ? '（你贏了！）' : seat ? '（你輸了）' : ''}`}</div>
            <div className="subtitle">{result.result.turns} 回合 ｜ A 剩 {result.result.attackerHpLeft} ｜ B 剩 {result.result.defenderHpLeft}</div>
          </div>
          <div className="log">
            {byTurn.map(([t, evs]) => (
              <div key={t}><div className="turn-head">{t === 0 ? '開戰' : `第 ${t} 回合`}</div>
                {evs.map((e, i) => (
                  <div className="ev" key={i}><span className="phase-tag">[{PHASE[e.phase]}]</span> {nameOf(e.actorId)}{e.tacticId && ' 施展戰法'}{e.targetId && ` → ${nameOf(e.targetId)}`}{e.damage != null && <span className="dmg"> 造成 {e.damage} 傷害</span>}</div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* §12 同盟 */}
      <div className="panel" style={{ maxWidth: 620, margin: '16px auto 0' }}>
        <h2>🛡️ 同盟（§12）</h2>
        {!alliance ? (
          <div className="controls" style={{ margin: '4px 0', justifyContent: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <input value={allyName} onChange={(e) => setAllyName(e.target.value)} placeholder="盟名" style={{ width: 120 }} />
            <button className="fight" onClick={createAlliance} disabled={!connected} style={{ fontSize: 14, padding: '8px 16px' }}>建盟</button>
            <span>或 <input value={allyCode} onChange={(e) => setAllyCode(e.target.value)} placeholder="盟號 ALxxx" style={{ width: 110 }} /> <button className="fight" onClick={joinAlliance} disabled={!connected} style={{ fontSize: 14, padding: '8px 14px', background: '#3a2e1e' }}>加盟</button></span>
          </div>
        ) : (
          <>
            <div className="row"><label>同盟</label><span style={{ color: 'var(--gold)', fontWeight: 700 }}>{alliance.name}</span>（盟號 {alliance.id} ｜ {alliance.count}/100 人）</div>
            <div className="row"><label>成員</label><span>{alliance.members.map((m) => `${m.name}(${RANK[m.rank]}/捐${m.contribution})`).join('　')}</span></div>
            <div style={{ marginTop: 8 }}>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>盟科技（捐 500 推進，全盟加成）：</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['marchSpeed', 'troopCapacity', 'tileYield'] as const).map((t) => (
                  <button key={t} onClick={() => donate(t)} style={{ flex: '1 1 160px', background: '#3a2e1e', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}>
                    <b>{TECH_LABEL[t]} Lv.{alliance.tech[t].level}</b>（+{alliance.perks[t]}%）<br />
                    <span style={{ color: 'var(--gold)' }}>捐 500 推進</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
