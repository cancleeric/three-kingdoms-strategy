import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

// 與 engine/worldmap 對齊的精簡型別（前端只需展示用欄位）
interface WTile { q: number; r: number; level: number; state: string; owner: string | null; tent: boolean; landmark?: string }
interface WorldView { radius: number; tiles: WTile[]; power: Record<string, number> }

// M2 行軍令（前端展示用）
interface MarchOrderView {
  id: string;
  playerId: string;
  from: { q: number; r: number };
  to: { q: number; r: number };
  departAt: number;
  arriveAt: number;
}

// M2 到達通知
interface MarchArrivedEvent {
  orderId: string;
  playerId: string;
  to: { q: number; r: number };
  won: boolean;
  turns: number;
  playerHpLeft: number;
  garrisonHpLeft: number;
}

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

/** 剩餘秒數倒計時（每秒更新） */
function useCountdown(arriveAt: number): number {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((arriveAt - Date.now()) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => {
      const r = Math.max(0, Math.ceil((arriveAt - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, [arriveAt]);
  return remaining;
}

/** 單個行軍倒計時顯示元件 */
function MarchCountdown({ order, me }: { order: MarchOrderView; me: string | null }) {
  const secs = useCountdown(order.arriveAt);
  if (order.playerId !== me) return null;
  return (
    <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 2 }}>
      行軍中 → ({order.to.q},{order.to.r})　剩 {secs} 秒
    </div>
  );
}

export default function World() {
  const sockRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [view, setView] = useState<WorldView | null>(null);
  const [note, setNote] = useState('進入天下：佔下邊緣家園，向相鄰中立地塊送行軍令推進洛陽。');
  const [troop, setTroop] = useState('cavalry');

  // M2：在途行軍訂單
  const [marchingOrders, setMarchingOrders] = useState<MarchOrderView[]>([]);

  useEffect(() => {
    const s = io({ path: '/sanguo/socket', transports: ['websocket', 'polling'] });
    sockRef.current = s;
    s.on('connect', () => { setConnected(true); s.emit('sg:enterWorld', {}, (r: { you: string }) => setMe(r.you)); });
    s.on('disconnect', () => setConnected(false));
    s.on('sg:worldUpdate', (v: WorldView) => setView(v));

    // M2 事件監聽
    s.on('sg:marchUpdate', (d: { orders: MarchOrderView[] }) => {
      setMarchingOrders(d.orders);
    });

    s.on('sg:marchArrived', (d: MarchArrivedEvent) => {
      // 從在途列表移除
      setMarchingOrders((prev) => prev.filter((o) => o.id !== d.orderId));
      // 顯示戰報 note（僅針對自己的行軍）
      if (d.playerId === s.id) {
        const coord = `(${d.to.q},${d.to.r})`;
        if (d.won) {
          setNote(`攻克 ${coord}（${d.turns} 回合）— 已併入版圖`);
        } else {
          setNote(`守軍頑抗，未能攻下 ${coord}（${d.turns} 回合），整軍再戰`);
        }
      }
    });

    return () => { s.close(); };
  }, []);

  const byKey = useMemo(() => {
    const m = new Map<string, WTile>();
    if (view) for (const t of view.tiles) m.set(hexKey(t.q, t.r), t);
    return m;
  }, [view]);

  const ownsAdjacent = (t: WTile) => DIRS.some(([dq, dr]) => byKey.get(hexKey(t.q + dq, t.r + dr))?.owner === me);
  const canMarch = (t: WTile) => !!me && t.owner === null && ownsAdjacent(t);

  // 是否有在途行軍前往某格
  const isMarching = (t: WTile) => marchingOrders.some((o) => o.to.q === t.q && o.to.r === t.r && o.playerId === me);

  // M2：送行軍令（不再即時翻面）
  const march = (t: WTile) => {
    if (!canMarch(t)) return;
    if (isMarching(t)) { setNote('已有部隊正在行軍前往此格'); return; }
    setNote(`送出行軍令 → ${STATE_NAME[t.state] ?? t.state} Lv.${t.level}，等待到達…`);
    sockRef.current?.emit(
      'sg:march',
      { coord: { q: t.q, r: t.r }, submission: { formation: [{ heroId: 'zhaoyun', troop }], level: Math.min(50, 10 + t.level * 5), troops: 5000 } },
      (res: { ok: boolean; order?: MarchOrderView; error?: string }) => {
        if (!res.ok) {
          setNote(res.error ?? '行軍令失敗');
        } else if (res.order) {
          const secs = Math.ceil((res.order.arriveAt - Date.now()) / 1000);
          setNote(`行軍令已送出 → ${STATE_NAME[t.state] ?? t.state} Lv.${t.level}，約 ${secs} 秒後到達`);
        }
      },
    );
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

  // 我的在途行軍數
  const myMarchCount = marchingOrders.filter((o) => o.playerId === me).length;

  return (
    <>
      <div className="panel" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2>天下大地圖（§10 行軍時間 SLG）｜ {connected ? '已連線' : '連線中…'}</h2>
        <div className="row"><label>我的勢力</label><span>據地 {myTiles} 塊 ｜ 勢力值 <b style={{ color: 'var(--gold)' }}>{myPower}</b></span></div>
        <div className="row"><label>出兵兵種</label>
          <select value={troop} onChange={(e) => setTroop(e.target.value)}>
            <option value="cavalry">騎兵</option>
            <option value="spear">槍兵</option>
            <option value="shield">盾兵</option>
            <option value="bow">弓兵</option>
            <option value="apparatus">器械</option>
            <option value="sword">刀盾（M3）</option>
            <option value="elephant">象兵（M3）</option>
            <option value="navy">水軍（M3）</option>
          </select>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>　點亮邊（金框）格送行軍令；己方地塊右鍵建營帳</span>
        </div>
        <div className="subtitle" style={{ textAlign: 'left', marginTop: 6 }}>{note}</div>
      </div>

      {/* M2：在途行軍列表 */}
      {myMarchCount > 0 && (
        <div className="panel" style={{ maxWidth: 900, margin: '8px auto 0' }}>
          <h2>行軍中部隊（{myMarchCount} 支）</h2>
          {marchingOrders
            .filter((o) => o.playerId === me)
            .map((o) => (
              <MarchCountdown key={o.id} order={o} me={me} />
            ))}
        </div>
      )}

      <div className="panel" style={{ maxWidth: 900, margin: '12px auto 0', overflow: 'auto' }}>
        {layout ? (
          <svg viewBox={layout.vb} style={{ width: '100%', height: 'auto', maxHeight: 560 }}>
            {layout.placed.map(({ t, x, y }) => {
              const owned = t.owner === me;
              const marching = isMarching(t);
              const fill = t.owner === null ? (marching ? '#3a4a6a' : '#332a20') : owned ? '#7a5c12' : colorFor(t.owner);
              const marchable = canMarch(t) && !marching;
              return (
                <g key={hexKey(t.q, t.r)} style={{ cursor: marchable || owned ? 'pointer' : 'default' }}
                  onClick={() => march(t)}
                  onContextMenu={(e) => { e.preventDefault(); buildTent(t); }}>
                  <polygon points={hexPoints(x, y, HEX - 1)} fill={fill}
                    stroke={marchable ? 'var(--gold)' : marching ? '#4a8ad4' : '#15110b'}
                    strokeWidth={marchable ? 2.5 : marching ? 2 : 1} />
                  <text x={x} y={y - 2} textAnchor="middle" fontSize="9" fill={owned || t.owner ? '#fff' : '#b8a98a'}>{t.landmark ?? STATE_NAME[t.state]?.[0] ?? ''}</text>
                  <text x={x} y={y + 9} textAnchor="middle" fontSize="8" fill={owned || t.owner ? '#ffe9a8' : '#8a7c5f'}>L{t.level}{t.tent ? '⛺' : ''}{marching ? '→' : ''}</text>
                </g>
              );
            })}
          </svg>
        ) : <div className="subtitle">載入天下…</div>}
      </div>

      {ranking.length > 0 && (
        <div className="panel" style={{ maxWidth: 900, margin: '12px auto 0' }}>
          <h2>勢力排行</h2>
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
