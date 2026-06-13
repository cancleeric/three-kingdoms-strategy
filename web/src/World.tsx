import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

// 與 engine/worldmap 對齊的精簡型別（前端只需展示用欄位）
interface WTile { q: number; r: number; level: number; state: string; owner: string | null; tent: boolean; landmark?: string }
interface WorldView { radius: number; tiles: WTile[]; power: Record<string, number> }

const STATE_NAME: Record<string, string> = {
  si: '司隸', yu: '豫州', ji: '冀州', yan: '兗州', qing: '青州', xu: '徐州',
  jing: '荊州', yang: '揚州', yi: '益州', liang: '涼州', you: '幽州',
};
const HEX = 24; // 六角半徑(px)，flat-top
const hexKey = (q: number, r: number) => `${q},${r}`;
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
// 他人顏色調色盤（穩定 hash → 顏色）
const PALETTE = ['#c0392b', '#27ae60', '#2980b9', '#8e44ad', '#d35400', '#16a085', '#c2185b', '#00838f'];
const colorFor = (id: string) => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };

function hexPoints(cx: number, cy: number, s: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i); pts.push(`${(cx + s * Math.cos(a)).toFixed(1)},${(cy + s * Math.sin(a)).toFixed(1)}`); }
  return pts.join(' ');
}

export default function World() {
  const sockRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [view, setView] = useState<WorldView | null>(null);
  const [note, setNote] = useState('進入天下：佔下邊緣家園，向相鄰中立地塊出兵推進洛陽。');
  const [troop, setTroop] = useState('cavalry');

  useEffect(() => {
    const s = io({ path: '/sanguo/socket', transports: ['websocket', 'polling'] });
    sockRef.current = s;
    s.on('connect', () => { setConnected(true); s.emit('sg:enterWorld', {}, (r: { you: string }) => setMe(r.you)); });
    s.on('disconnect', () => setConnected(false));
    s.on('sg:worldUpdate', (v: WorldView) => setView(v));
    return () => { s.close(); };
  }, []);

  const byKey = useMemo(() => {
    const m = new Map<string, WTile>();
    if (view) for (const t of view.tiles) m.set(hexKey(t.q, t.r), t);
    return m;
  }, [view]);

  const ownsAdjacent = (t: WTile) => DIRS.some(([dq, dr]) => byKey.get(hexKey(t.q + dq, t.r + dr))?.owner === me);
  const canMarch = (t: WTile) => !!me && t.owner === null && ownsAdjacent(t);

  const march = (t: WTile) => {
    if (!canMarch(t)) return;
    setNote(`出兵 ${STATE_NAME[t.state] ?? t.state} Lv.${t.level}…`);
    sockRef.current?.emit('sg:march', { coord: { q: t.q, r: t.r }, submission: { formation: [{ heroId: 'zhaoyun', troop }], level: Math.min(50, 10 + t.level * 5), troops: 5000 } },
      (res: { ok: boolean; won?: boolean; turns?: number; error?: string }) => {
        if (!res.ok) setNote(res.error ?? '出兵失敗');
        else if (res.won) setNote(`✅ 攻克 ${STATE_NAME[t.state] ?? t.state} Lv.${t.level}（${res.turns} 回合）— 已併入版圖`);
        else setNote(`⚔️ 守軍頑抗，未能攻下 Lv.${t.level}（${res.turns} 回合），整軍再戰`);
      });
  };
  const buildTent = (t: WTile) => { if (t.owner === me && !t.tent) sockRef.current?.emit('sg:buildTent', { coord: { q: t.q, r: t.r } }); };

  // 版面：flat-top axial → pixel，計算 viewBox
  const layout = useMemo(() => {
    if (!view) return null;
    const px = (q: number, r: number) => ({ x: HEX * 1.5 * q, y: HEX * Math.sqrt(3) * (r + q / 2) });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const placed = view.tiles.map((t) => { const p = px(t.q, t.r); minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); return { t, ...p }; });
    const pad = HEX + 4;
    return { placed, vb: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}` };
  }, [view]);

  const myPower = me && view ? (view.power[me] ?? 0) : 0;
  const myTiles = view ? view.tiles.filter((t) => t.owner === me).length : 0;
  const ranking = view ? Object.entries(view.power).sort((a, b) => b[1] - a[1]) : [];

  return (
    <>
      <div className="panel" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2>🗺️ 天下大地圖（§10）｜ {connected ? '已連線' : '連線中…'}</h2>
        <div className="row"><label>我的勢力</label><span>據地 {myTiles} 塊 ｜ 勢力值 <b style={{ color: 'var(--gold)' }}>{myPower}</b></span></div>
        <div className="row"><label>出兵兵種</label>
          <select value={troop} onChange={(e) => setTroop(e.target.value)}>
            <option value="cavalry">騎兵</option><option value="spear">槍兵</option><option value="shield">盾兵</option><option value="bow">弓兵</option><option value="apparatus">器械</option>
          </select>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>　點亮邊（金框）的中立地塊出兵；己方地塊可右鍵建營帳加產</span>
        </div>
        <div className="subtitle" style={{ textAlign: 'left', marginTop: 6 }}>{note}</div>
      </div>

      <div className="panel" style={{ maxWidth: 900, margin: '12px auto 0', overflow: 'auto' }}>
        {layout ? (
          <svg viewBox={layout.vb} style={{ width: '100%', height: 'auto', maxHeight: 560 }}>
            {layout.placed.map(({ t, x, y }) => {
              const owned = t.owner === me;
              const fill = t.owner === null ? '#332a20' : owned ? '#7a5c12' : colorFor(t.owner);
              const marchable = canMarch(t);
              return (
                <g key={hexKey(t.q, t.r)} style={{ cursor: marchable || owned ? 'pointer' : 'default' }}
                  onClick={() => march(t)}
                  onContextMenu={(e) => { e.preventDefault(); buildTent(t); }}>
                  <polygon points={hexPoints(x, y, HEX - 1)} fill={fill}
                    stroke={marchable ? 'var(--gold)' : '#15110b'} strokeWidth={marchable ? 2.5 : 1} />
                  <text x={x} y={y - 2} textAnchor="middle" fontSize="9" fill={owned || t.owner ? '#fff' : '#b8a98a'}>{t.landmark ?? STATE_NAME[t.state]?.[0] ?? ''}</text>
                  <text x={x} y={y + 9} textAnchor="middle" fontSize="8" fill={owned || t.owner ? '#ffe9a8' : '#8a7c5f'}>L{t.level}{t.tent ? '⛺' : ''}</text>
                </g>
              );
            })}
          </svg>
        ) : <div className="subtitle">載入天下…</div>}
      </div>

      {ranking.length > 0 && (
        <div className="panel" style={{ maxWidth: 900, margin: '12px auto 0' }}>
          <h2>🏆 勢力排行</h2>
          {ranking.map(([pid, pw], i) => (
            <div className="row" key={pid}>
              <label>#{i + 1}</label>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: pid === me ? '#7a5c12' : colorFor(pid), borderRadius: 3, marginRight: 6, verticalAlign: 'middle' }} />{pid === me ? '我（' + pid.slice(0, 4) + '…）' : pid.slice(0, 6) + '…'} ｜ 勢力值 {pw}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
