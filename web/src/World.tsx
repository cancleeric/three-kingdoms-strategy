import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { FactionId } from './engine/types';

// 與 engine/worldmap 對齊的精簡型別（前端只需展示用欄位）
interface WTile { q: number; r: number; level: number; state: string; owner: string | null; tent: boolean; landmark?: string }
// M3.5：WorldView 加 factionOf
interface WorldView { radius: number; tiles: WTile[]; power: Record<string, number>; factionOf?: Record<string, FactionId> }

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

// M4 陣營視圖
interface FactionView {
  factionId: FactionId;
  memberCount: number;
  cityCount: number;
  capitalTiles: Record<string, string | null>;
}

// M4 集結視圖
interface RallyView {
  id: string;
  allianceId: string;
  targetTile: { q: number; r: number };
  initiator: string;
  joinerCount: number;
  joiners: string[];
  launchAt: number;
  status: string;
}

// M4 賽季結算結果
interface FactionSeasonRank {
  factionId: FactionId;
  cityCount: number;
  hasLuoyang: boolean;
  score: number;
}
interface SeasonSettleResult {
  rankings: FactionSeasonRank[];
  winner: FactionId;
  isTie: boolean;
}

const STATE_NAME: Record<string, string> = {
  si: '司隸', yu: '豫州', ji: '冀州', yan: '兗州', qing: '青州', xu: '徐州',
  jing: '荊州', yang: '揚州', yi: '益州', liang: '涼州', you: '幽州',
};

// 陣營顏色
const FACTION_COLOR: Record<FactionId, string> = {
  wei: '#4a90d9',   // 魏：藍
  shu: '#27ae60',   // 蜀：綠
  wu: '#e67e22',    // 吳：橙
  qun: '#8e44ad',   // 群：紫
};
const FACTION_NAME_ZH: Record<FactionId, string> = { wei: '魏', shu: '蜀', wu: '吳', qun: '群' };
const HEX = 24; // 六角半徑(px)，flat-top
const hexKey = (q: number, r: number) => `${q},${r}`;
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

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

  // M3.5：陣營
  const [myFaction, setMyFaction] = useState<FactionId | null>(null);
  const [factions, setFactions] = useState<FactionView[]>([]);

  // M4：集結（allianceId 在 sg:allianceUpdate 時設定）
  const [myAllianceId, setMyAllianceId] = useState<string | null>(null);
  const [activeRallies, setActiveRallies] = useState<RallyView[]>([]);
  const [rallyNote, setRallyNote] = useState<string>('');

  // M4：賽季結算
  const [seasonResult, setSeasonResult] = useState<SeasonSettleResult | null>(null);

  useEffect(() => {
    const s = io({ path: '/sanguo/socket', transports: ['websocket', 'polling'] });
    sockRef.current = s;
    s.on('connect', () => {
      setConnected(true);
      s.emit('sg:enterWorld', {}, (r: { you: string }) => {
        setMe(r.you);
        // 拉取初始陣營狀態
        s.emit('sg:getFactionState', {}, (res: { factions: FactionView[] }) => {
          setFactions(res.factions);
        });
        // 拉取進行中集結
        s.emit('sg:listRallies', {}, (res: { rallies: RallyView[] }) => {
          setActiveRallies(res.rallies);
        });
      });
    });
    s.on('disconnect', () => setConnected(false));
    s.on('sg:worldUpdate', (v: WorldView) => setView(v));

    // M2 事件監聽
    s.on('sg:marchUpdate', (d: { orders: MarchOrderView[] }) => {
      setMarchingOrders(d.orders);
    });

    s.on('sg:marchArrived', (d: MarchArrivedEvent) => {
      setMarchingOrders((prev) => prev.filter((o) => o.id !== d.orderId));
      if (d.playerId === s.id) {
        const coord = `(${d.to.q},${d.to.r})`;
        if (d.won) {
          setNote(`攻克 ${coord}（${d.turns} 回合）— 已併入版圖`);
        } else {
          setNote(`守軍頑抗，未能攻下 ${coord}（${d.turns} 回合），整軍再戰`);
        }
      }
    });

    // M3.5：陣營更新
    s.on('sg:factionUpdate', (data: FactionView[]) => {
      setFactions(data);
    });

    // M4：監聽同盟更新，記錄自己所在同盟 ID（供集結功能使用）
    s.on('sg:allianceUpdate', (data: { id: string; members: { playerId: string }[] }) => {
      if (data.members.some((m) => m.playerId === s.id)) {
        setMyAllianceId(data.id);
      }
    });

    // M4：集結更新
    s.on('sg:rallyUpdate', (rally: RallyView) => {
      setActiveRallies((prev) => {
        const idx = prev.findIndex((r) => r.id === rally.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = rally;
          return next;
        }
        return [...prev, rally];
      });
    });

    s.on('sg:rallyResult', (d: {
      rallyId: string; allianceId: string; targetTile: { q: number; r: number };
      initiator: string; joiners: string[]; won: boolean; turns: number;
      playerHpLeft: number; garrisonHpLeft: number;
    }) => {
      // 移除已完成的集結
      setActiveRallies((prev) => prev.filter((r) => r.id !== d.rallyId));
      if (d.initiator === s.id || d.joiners.includes(s.id ?? '')) {
        const coord = `(${d.targetTile.q},${d.targetTile.r})`;
        setRallyNote(d.won
          ? `集結攻城成功！攻克 ${coord}（${d.turns} 回合，${d.joiners.length} 人合力）`
          : `集結攻城失敗，未能攻下 ${coord}（${d.turns} 回合）`);
      }
    });

    // M4：賽季結算
    s.on('sg:seasonSettle', (result: SeasonSettleResult) => {
      setSeasonResult(result);
    });

    return () => { s.close(); };
  }, []);

  // 陣營顏色：優先用陣營色覆蓋玩家個人色
  const factionOf = view?.factionOf ?? {};
  const colorForPlayer = (pid: string) => {
    const fid = factionOf[pid] as FactionId | undefined;
    if (fid) return FACTION_COLOR[fid];
    // 沒有陣營，用 hash 色
    const palette = ['#c0392b', '#27ae60', '#2980b9', '#8e44ad', '#d35400', '#16a085', '#c2185b', '#00838f'];
    let h = 0;
    for (const ch of pid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return palette[h % palette.length];
  };

  // 加入陣營
  const joinFaction = (fid: FactionId) => {
    if (myFaction) { setNote('已選擇陣營，不可更換'); return; }
    sockRef.current?.emit('sg:joinFaction', { factionId: fid }, (r: { ok: boolean; factionId?: FactionId; error?: string }) => {
      if (r.ok && r.factionId) {
        setMyFaction(r.factionId);
        setNote(`已加入${FACTION_NAME_ZH[r.factionId]}陣營！同陣營玩家地圖上同色顯示。`);
      } else {
        setNote(r.error ?? '加入陣營失敗');
      }
    });
  };

  // 發起集結攻城
  const createRally = (coord: { q: number; r: number }) => {
    if (!myAllianceId) { setRallyNote('請先加入同盟才能發起集結'); return; }
    sockRef.current?.emit('sg:createRally', { targetTile: coord, allianceId: myAllianceId },
      (r: { ok: boolean; rallyId?: string; launchAt?: number; error?: string }) => {
        if (r.ok && r.launchAt) {
          const secs = Math.ceil((r.launchAt - Date.now()) / 1000);
          setRallyNote(`集結令已發起，${secs} 秒後出發攻城（同盟成員可加入）`);
        } else {
          setRallyNote(r.error ?? '發起集結失敗');
        }
      });
  };

  // 加入集結
  const joinRallyById = (rallyId: string) => {
    sockRef.current?.emit('sg:joinRally', { rallyId },
      (r: { ok: boolean; error?: string }) => {
        if (r.ok) {
          setRallyNote('已加入集結！等待出發時間到達後合力攻城。');
        } else {
          setRallyNote(r.error ?? '加入集結失敗');
        }
      });
  };

  // 手動觸發賽季結算（測試用，生產由管理員定時觸發）
  const triggerSeasonSettle = () => {
    sockRef.current?.emit('sg:seasonSettle', {}, (result: SeasonSettleResult) => {
      setSeasonResult(result);
    });
  };

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
        <h2>天下大地圖（M4：賽季 + 集結攻城）｜ {connected ? '已連線' : '連線中…'}</h2>
        <div className="row"><label>我的勢力</label><span>據地 {myTiles} 塊 ｜ 勢力值 <b style={{ color: 'var(--gold)' }}>{myPower}</b>
          {myFaction && <span style={{ marginLeft: 8, padding: '2px 8px', background: FACTION_COLOR[myFaction], borderRadius: 4, fontSize: 13, color: '#fff' }}>{FACTION_NAME_ZH[myFaction]}陣營</span>}
        </span></div>
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

      {/* M3.5：陣營選擇（未選時顯示） */}
      {!myFaction && (
        <div className="panel" style={{ maxWidth: 900, margin: '8px auto 0' }}>
          <h2>選擇陣營（一次性，不可更換）</h2>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(['wei', 'shu', 'wu', 'qun'] as FactionId[]).map((fid) => {
              const fv = factions.find((f) => f.factionId === fid);
              return (
                <button key={fid}
                  style={{ background: FACTION_COLOR[fid], color: '#fff', border: 'none', padding: '6px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}
                  onClick={() => joinFaction(fid)}>
                  {FACTION_NAME_ZH[fid]}　{fv ? `${fv.memberCount}人 / ${fv.cityCount}城` : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* M3.5：四陣營勢力排行 */}
      {factions.length > 0 && (
        <div className="panel" style={{ maxWidth: 900, margin: '8px auto 0' }}>
          <h2>陣營勢力</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {factions.map((f) => (
              <div key={f.factionId} style={{
                padding: '6px 14px', borderRadius: 4,
                background: myFaction === f.factionId ? FACTION_COLOR[f.factionId] : '#2a2015',
                border: `2px solid ${FACTION_COLOR[f.factionId]}`,
                color: '#fff', fontSize: 13,
              }}>
                <b style={{ color: FACTION_COLOR[f.factionId] }}>{FACTION_NAME_ZH[f.factionId]}</b>
                &nbsp;{f.memberCount}人 | {f.cityCount}城
                {myFaction === f.factionId && <span style={{ marginLeft: 4 }}>（我）</span>}
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* M4：同盟集結攻城入口 */}
      <div className="panel" style={{ maxWidth: 900, margin: '8px auto 0' }}>
        <h2>同盟集結攻城</h2>
        {!myAllianceId ? (
          <div className="subtitle">加入同盟後才能使用集結功能。</div>
        ) : (
          <>
            <div className="subtitle" style={{ color: 'var(--gold)', marginBottom: 6 }}>{rallyNote || '點擊地圖州城（L6+）右鍵發起集結攻城'}</div>
            {activeRallies.length > 0 ? (
              <div>
                <b style={{ fontSize: 13, color: 'var(--muted)' }}>進行中集結：</b>
                {activeRallies.filter((r) => r.status === 'gathering').map((r) => {
                  const secs = Math.max(0, Math.ceil((r.launchAt - Date.now()) / 1000));
                  return (
                    <div key={r.id} className="row" style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 13 }}>
                        目標 ({r.targetTile.q},{r.targetTile.r}) ｜ {r.joinerCount} 人加入 ｜ 剩 {secs} 秒出發
                      </span>
                      {!r.joiners.includes(me ?? '') && (
                        <button
                          style={{ marginLeft: 8, padding: '2px 10px', background: '#3a5c3a', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}
                          onClick={() => joinRallyById(r.id)}>
                          加入集結
                        </button>
                      )}
                      {r.joiners.includes(me ?? '') && (
                        <span style={{ marginLeft: 8, color: '#27ae60', fontSize: 12 }}>已加入</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="subtitle">目前無進行中的集結。對州城地塊（L6+）按右鍵發起集結。</div>
            )}
          </>
        )}
      </div>

      <div className="panel" style={{ maxWidth: 900, margin: '12px auto 0', overflow: 'auto' }}>
        {layout ? (
          <svg viewBox={layout.vb} style={{ width: '100%', height: 'auto', maxHeight: 560 }}>
            {layout.placed.map(({ t, x, y }) => {
              const owned = t.owner === me;
              const marching = isMarching(t);
              // M3.5：用陣營色覆蓋玩家色
              const fill = t.owner === null ? (marching ? '#3a4a6a' : '#332a20') : owned ? '#7a5c12' : colorForPlayer(t.owner);
              const marchable = canMarch(t) && !marching;
              const isCapital = t.level >= 6; // 州城級格，可發起集結
              return (
                <g key={hexKey(t.q, t.r)} style={{ cursor: marchable || owned ? 'pointer' : 'default' }}
                  onClick={() => march(t)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (owned) {
                      buildTent(t);
                    } else if (isCapital && myAllianceId) {
                      // 州城格右鍵：發起集結攻城
                      createRally({ q: t.q, r: t.r });
                    }
                  }}>
                  <polygon points={hexPoints(x, y, HEX - 1)} fill={fill}
                    stroke={marchable ? 'var(--gold)' : marching ? '#4a8ad4' : isCapital ? '#e0c050' : '#15110b'}
                    strokeWidth={marchable ? 2.5 : marching ? 2 : isCapital ? 1.5 : 1} />
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
          {ranking.map(([pid, pw], i) => {
            const fid = factionOf[pid] as FactionId | undefined;
            return (
              <div className="row" key={pid}>
                <label>#{i + 1}</label>
                <span>
                  <span style={{ display: 'inline-block', width: 12, height: 12, background: pid === me ? '#7a5c12' : colorForPlayer(pid), borderRadius: 3, marginRight: 6, verticalAlign: 'middle' }} />
                  {pid === me ? '我（' + pid.slice(0, 4) + '…）' : pid.slice(0, 6) + '…'}
                  {fid && <span style={{ marginLeft: 4, fontSize: 11, padding: '1px 5px', background: FACTION_COLOR[fid], color: '#fff', borderRadius: 3 }}>{FACTION_NAME_ZH[fid]}</span>}
                  {' '}｜ 勢力值 {pw}
                </span>
              </div>
            );
          })}
          {/* M4：賽季結算按鈕（測試用） */}
          <div style={{ marginTop: 12, borderTop: '1px solid #3a3020', paddingTop: 10 }}>
            <button
              style={{ padding: '4px 14px', background: '#5a2a0a', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 3, cursor: 'pointer', fontSize: 13 }}
              onClick={triggerSeasonSettle}>
              賽季結算（觸發）
            </button>
          </div>
        </div>
      )}

      {/* M4：賽季結算公告（彈窗） */}
      {seasonResult && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#1a1208', border: '2px solid var(--gold)', borderRadius: 8,
            padding: '32px 40px', minWidth: 340, textAlign: 'center',
          }}>
            <h2 style={{ color: 'var(--gold)', marginBottom: 8 }}>賽季結算</h2>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: FACTION_COLOR[seasonResult.winner], marginBottom: 16 }}>
              {FACTION_NAME_ZH[seasonResult.winner]}陣營{seasonResult.isTie ? '（平局最終勝出）' : '勝利！'}
            </div>
            {seasonResult.rankings.map((r, i) => (
              <div key={r.factionId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 0', borderBottom: '1px solid #3a3020',
                color: i === 0 ? 'var(--gold)' : '#ccc',
              }}>
                <span style={{ width: 24, fontWeight: 'bold' }}>#{i + 1}</span>
                <span style={{
                  display: 'inline-block', width: 16, height: 16,
                  background: FACTION_COLOR[r.factionId], borderRadius: 3,
                }} />
                <span style={{ flex: 1, textAlign: 'left', fontWeight: i === 0 ? 'bold' : 'normal' }}>
                  {FACTION_NAME_ZH[r.factionId]}
                </span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {r.cityCount}城{r.hasLuoyang ? ' + 洛陽' : ''} = {r.score}分
                </span>
              </div>
            ))}
            <button
              style={{ marginTop: 20, padding: '6px 24px', background: 'var(--gold)', color: '#1a1208', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => setSeasonResult(null)}>
              關閉
            </button>
          </div>
        </div>
      )}
    </>
  );
}
