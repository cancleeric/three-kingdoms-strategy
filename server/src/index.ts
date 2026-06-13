/**
 * 三國誌多人 PvP 伺服器（socket.io）— MMO 多人層第一塊。
 *
 * 房間制：createRoom → 對手 joinRoom → 雙方 submit 佈陣 → 伺服器用引擎結算 → 廣播結果+戰報。
 * 路徑掛閘道 /sanguo/socket（與其他遊戲同模式）。
 *
 * M2：行軍時間 SLG
 * - sg:march 改為送行軍令（不再即時翻面）
 * - setInterval tick 每 ~2 秒檢查到達 → resolveMarchArrival → 廣播結果
 * - 廣播：sg:marchUpdate（在途列表）、sg:marchArrived（到達+戰報）、sg:worldUpdate（翻面）
 *
 * M3.5：server 陣營整合
 * - 持有 factionStates（四陣營），玩家入陣營事件 sg:joinFaction，廣播 sg:factionUpdate
 * - 行軍到達後更新對應陣營的 capitalTiles
 * - sg:worldUpdate 加 factionOf 供前端陣營著色
 *
 * M4：同盟集結攻城 + 賽季結算
 * - sg:createRally / sg:joinRally：集結攻城事件
 * - tick 結算到時間的集結，廣播 sg:rallyResult
 * - sg:seasonSettle：廣播陣營排名
 */
import { createServer } from 'http';
import { Server } from 'socket.io';
import { resolvePvp, type PvpSubmission } from './pvp';
import { marchBattle } from './world';
import { newAlliance, joinAlliance, leaveAlliance, donate, alliancePerks, memberCount } from '../../engine/src/alliance';
import type { Alliance, AllianceTechId } from '../../engine/src/alliance';
import { genWorld, spawnPlayer, captureTile, buildTent, powerScore, hexKey } from '../../engine/src/worldmap';
import type { Axial, WorldTile } from '../../engine/src/worldmap';
import { sendMarch, checkArrival, resolveMarchArrival } from '../../engine/src/march';
import type { MarchOrder } from '../../engine/src/march';
import { makeUnit, makeSquad, ZHAO_YUN } from '../../engine/src/sampleData';
// M3.5 陣營
import { newFactionStates, joinFaction, setCapital, factionCityCount } from '../../engine/src/faction';
import type { FactionState } from '../../engine/src/faction';
import type { FactionId } from '../../engine/src/types';
// M4 集結攻城
import { createRally, joinRally, resolveRally } from '../../engine/src/rally';
import type { RallyOrder } from '../../engine/src/rally';
// M4 賽季結算
import { resolveSeasonRanking, checkInstantWin } from '../../engine/src/season';
import type { SeasonSettleResult } from '../../engine/src/season';

const PORT = Number(process.env.PORT ?? 3300);
const SOCKET_PATH = process.env.SOCKET_PATH ?? '/sanguo/socket';

interface Room {
  id: string;
  seats: { A?: string; B?: string }; // socket id
  subs: { A?: PvpSubmission; B?: PvpSubmission };
  seed: number;
}
const rooms = new Map<string, Room>();
const roomCode = (() => { let n = 1000; return () => String(++n); })();

// §12 同盟（伺服器持有共享狀態）
const alliances = new Map<string, Alliance>();
const allianceCode = (() => { let n = 100; return () => 'AL' + (++n); })();
const playerName = new Map<string, string>(); // socketId → 名稱
function allianceView(a: Alliance) {
  return { id: a.id, name: a.name, count: memberCount(a), members: Object.values(a.members), tech: a.tech, perks: alliancePerks(a) };
}

// §10 世界地圖（單一共享伺服器世界）
let world = genWorld(Number(process.env.WORLD_RADIUS ?? 5));

// M3.5 陣營狀態（伺服器持有）
let factionStates: Record<FactionId, FactionState> = newFactionStates();
// 玩家 → 陣營對應表
const playerFaction = new Map<string, FactionId>();
// 洛陽控制歷史（每 tick 追蹤，供即時勝利判定）
const luoyangHistory: FactionId[] = [];

/** 取洛陽（格(0,0)）的控制陣營，null=無人控制 */
function getLuoyangOwnerFaction(): FactionId | null {
  const luoyangTile = world.tiles['0,0'];
  if (!luoyangTile || !luoyangTile.owner) return null;
  return playerFaction.get(luoyangTile.owner) ?? null;
}

/** 玩家佔領某格後，更新對應陣營的 capitalTiles（如果是州城級格） */
function updateFactionCapital(playerId: string, tile: WorldTile) {
  const fid = playerFaction.get(playerId);
  if (!fid) return;
  // 州城：level >= 6 或 landmark 含洛陽，視為州城級目標
  if (tile.level >= 6 || tile.landmark) {
    factionStates[fid] = setCapital(factionStates[fid], tile.state, playerId);
  }
}

function worldView() {
  const tiles = Object.values(world.tiles).map((t) => ({ q: t.coord.q, r: t.coord.r, level: t.level, state: t.state, owner: t.owner, tent: t.tent, landmark: t.landmark }));
  const power: Record<string, number> = {};
  for (const pid of Object.keys(world.spawns)) power[pid] = powerScore(world, pid);
  // M3.5：附帶 factionOf 供前端陣營著色
  const factionOf: Record<string, FactionId> = {};
  for (const [pid, fid] of playerFaction.entries()) factionOf[pid] = fid;
  return { radius: world.radius, tiles, power, factionOf };
}

// M2 行軍令狀態（伺服器持有）
const marchOrders = new Map<string, MarchOrder>();

// M4 集結令狀態（伺服器持有）
const rallyOrders = new Map<string, RallyOrder>();
const RALLY_WINDOW_MS = Number(process.env.RALLY_WINDOW_MS ?? 60_000); // 集結等待時窗（env 可調，預設 60 秒）

/** 陣營視圖（供前端）*/
function factionViewAll() {
  const FACTION_IDS: FactionId[] = ['wei', 'shu', 'wu', 'qun'];
  return FACTION_IDS.map((fid) => {
    const s = factionStates[fid];
    return {
      factionId: fid,
      memberCount: s.members.length,
      cityCount: factionCityCount(s),
      capitalTiles: s.capitalTiles,
    };
  });
}

/** 集結視圖（供前端）*/
function rallyView(rally: RallyOrder) {
  return {
    id: rally.id,
    allianceId: rally.allianceId,
    targetTile: rally.targetTile,
    initiator: rally.initiator,
    joinerCount: rally.joiners.length,
    joiners: rally.joiners,
    launchAt: rally.launchAt,
    status: rally.status,
  };
}

/** 取玩家同盟的 marchSpeed 加成（%），預設 0 */
function getMarchSpeedBonus(playerId: string): number {
  for (const a of alliances.values()) {
    if (a.members[playerId]) {
      return a.tech.marchSpeed.level * 2; // 每級 +2%（對齊 ALLIANCE_TECH.marchSpeed.perLevel）
    }
  }
  return 0;
}

/** 建一個攻擊用部隊（使用趙雲預設，後續可從玩家 submission 取） */
function buildAttackSquad(playerId: string) {
  // M2 暫時以單趙雲（帶兵 5000）代表玩家部隊；後續 M3+ 可接入 submission
  const unit = makeUnit(ZHAO_YUN, 'cavalry', 5000, 'attacker');
  return makeSquad([unit, unit, unit]);
}

/** 廣播在途行軍列表 */
function broadcastMarchUpdate(io: Server) {
  const list = Array.from(marchOrders.values()).filter((o) => o.status === 'marching').map((o) => ({
    id: o.id,
    playerId: o.playerId,
    from: o.from,
    to: o.to,
    departAt: o.departAt,
    arriveAt: o.arriveAt,
  }));
  io.to('world').emit('sg:marchUpdate', { orders: list });
}

const httpServer = createServer((_req, res) => { res.writeHead(200); res.end('sanguo-pvp ok'); });
const io = new Server(httpServer, { path: SOCKET_PATH, cors: { origin: '*' } });

// ── M2 + M4 行軍/集結 tick（每 2 秒）────────────────────────────────
setInterval(() => {
  const now = Date.now();

  // M2：行軍到達結算
  for (const [id, order] of marchOrders) {
    if (!checkArrival(order, now)) continue;

    marchOrders.set(id, { ...order, status: 'arrived' });

    const squad = buildAttackSquad(order.playerId);
    const seed = (Math.abs(order.to.q * 73856093) ^ Math.abs(order.to.r * 19349663)) % 2147483647;
    const { map: updatedMap, outcome, order: doneOrder } = resolveMarchArrival(world, squad, order, seed);

    world = updatedMap;
    marchOrders.set(id, doneOrder);

    // M3.5：勝利後更新陣營佔城
    if (outcome.won) {
      const capturedTile = world.tiles[hexKey(order.to)];
      if (capturedTile) updateFactionCapital(order.playerId, capturedTile);
    }

    io.to('world').emit('sg:marchArrived', {
      orderId: id,
      playerId: order.playerId,
      to: order.to,
      won: outcome.won,
      turns: outcome.turns,
      playerHpLeft: outcome.playerHpLeft,
      garrisonHpLeft: outcome.garrisonHpLeft,
    });

    if (outcome.won) {
      io.to('world').emit('sg:worldUpdate', worldView());
      io.to('world').emit('sg:factionUpdate', factionViewAll());
    }
  }

  // M4：集結到時間結算
  for (const [id, rally] of rallyOrders) {
    if (rally.status !== 'gathering' || now < rally.launchAt) continue;

    const seed = (Math.abs(rally.targetTile.q * 73856093) ^ Math.abs(rally.targetTile.r * 19349663)) % 2147483647;
    const { map: updatedMap, outcome, rally: doneRally } = resolveRally(world, rally, seed, now);

    world = updatedMap;
    rallyOrders.set(id, doneRally);

    // M3.5：集結勝利後更新陣營佔城
    if (outcome.won) {
      const capturedTile = world.tiles[hexKey(rally.targetTile)];
      if (capturedTile) updateFactionCapital(rally.initiator, capturedTile);
    }

    io.to('world').emit('sg:rallyResult', {
      rallyId: id,
      allianceId: rally.allianceId,
      targetTile: rally.targetTile,
      initiator: rally.initiator,
      joiners: rally.joiners,
      won: outcome.won,
      turns: outcome.turns,
      playerHpLeft: outcome.playerHpLeft,
      garrisonHpLeft: outcome.garrisonHpLeft,
    });

    if (outcome.won) {
      io.to('world').emit('sg:worldUpdate', worldView());
      io.to('world').emit('sg:factionUpdate', factionViewAll());
    }
  }

  // M4：洛陽歷史追蹤（每 30 秒採樣一次，防過快累積）
  // 這裡用簡化策略：每 tick 不更新，改在 sg:seasonSettle 時一次性結算
}, 2000);

io.on('connection', (socket) => {
  socket.on('sg:createRoom', (_d, cb?: (r: { roomId: string }) => void) => {
    const id = roomCode();
    rooms.set(id, { id, seats: { A: socket.id }, subs: {}, seed: (Number(id) * 7919) % 2147483647 });
    socket.join(id);
    cb?.({ roomId: id });
    io.to(id).emit('sg:roomUpdate', { roomId: id, seats: ['A'] });
  });

  socket.on('sg:joinRoom', (d: { roomId: string }, cb?: (r: { ok: boolean; seat?: 'A' | 'B'; error?: string }) => void) => {
    const room = rooms.get(d.roomId);
    if (!room) return cb?.({ ok: false, error: '房間不存在' });
    if (room.seats.B) return cb?.({ ok: false, error: '房間已滿' });
    room.seats.B = socket.id;
    socket.join(room.id);
    cb?.({ ok: true, seat: 'B' });
    io.to(room.id).emit('sg:roomUpdate', { roomId: room.id, seats: ['A', 'B'] });
  });

  socket.on('sg:submit', (d: { roomId: string; submission: PvpSubmission }) => {
    const room = rooms.get(d.roomId);
    if (!room) return;
    const seat = room.seats.A === socket.id ? 'A' : room.seats.B === socket.id ? 'B' : null;
    if (!seat) return;
    room.subs[seat] = d.submission;
    io.to(room.id).emit('sg:submitted', { seat });
    // 雙方都提交 → 結算
    if (room.subs.A && room.subs.B) {
      const out = resolvePvp(room.subs.A, room.subs.B, room.seed);
      io.to(room.id).emit('sg:result', out);
      room.subs = {}; // 可再戰
    }
  });

  // ── §12 同盟 ──
  socket.on('sg:setName', (d: { name: string }) => { playerName.set(socket.id, d.name || '無名'); });

  socket.on('sg:createAlliance', (d: { name: string }, cb?: (r: { allianceId: string }) => void) => {
    const id = allianceCode();
    const name = playerName.get(socket.id) ?? '盟主';
    alliances.set(id, newAlliance(id, d.name || '無名同盟', socket.id, name));
    socket.join('al:' + id);
    cb?.({ allianceId: id });
    io.to('al:' + id).emit('sg:allianceUpdate', allianceView(alliances.get(id)!));
  });

  socket.on('sg:joinAlliance', (d: { allianceId: string }, cb?: (r: { ok: boolean; error?: string }) => void) => {
    const a = alliances.get(d.allianceId);
    if (!a) return cb?.({ ok: false, error: '同盟不存在' });
    const res = joinAlliance(a, socket.id, playerName.get(socket.id) ?? '盟眾');
    if (!res.ok) return cb?.({ ok: false, error: res.error });
    alliances.set(a.id, res.alliance);
    socket.join('al:' + a.id);
    cb?.({ ok: true });
    io.to('al:' + a.id).emit('sg:allianceUpdate', allianceView(res.alliance));
  });

  socket.on('sg:donate', (d: { allianceId: string; tech: AllianceTechId; amount: number }) => {
    const a = alliances.get(d.allianceId);
    if (!a) return;
    const updated = donate(a, socket.id, d.tech, d.amount);
    alliances.set(a.id, updated);
    io.to('al:' + a.id).emit('sg:allianceUpdate', allianceView(updated));
  });

  // ── §10 世界地圖 ──
  socket.on('sg:enterWorld', (_d, cb?: (r: { you: string }) => void) => {
    world = spawnPlayer(world, socket.id);
    socket.join('world');
    cb?.({ you: socket.id });
    io.to('world').emit('sg:worldUpdate', worldView());
    // 新玩家進入時也廣播當前在途行軍
    broadcastMarchUpdate(io);
  });

  // ── M2 sg:march（送行軍令，改為排程而非即時翻面）──
  socket.on(
    'sg:march',
    (
      d: { coord: Axial; submission?: PvpSubmission },
      cb?: (r: { ok: boolean; order?: Omit<MarchOrder, 'status'>; error?: string }) => void,
    ) => {
      const tile = world.tiles[hexKey(d.coord)];
      if (!tile) return cb?.({ ok: false, error: '地塊不存在' });

      // 找玩家家園作為出發地塊（簡化：以家園為唯一出發點）
      const spawnKey = world.spawns[socket.id];
      if (!spawnKey) return cb?.({ ok: false, error: '尚未進入世界' });
      const [fromQ, fromR] = spawnKey.split(',').map(Number);
      const from: Axial = { q: fromQ, r: fromR };

      const speedBonus = getMarchSpeedBonus(socket.id);
      const result = sendMarch(
        world,
        { playerId: socket.id, squadId: `sq_${socket.id}`, from, to: d.coord },
        Date.now(),
        speedBonus,
      );

      if (!result.ok || !result.order) {
        return cb?.({ ok: false, error: result.error });
      }

      marchOrders.set(result.order.id, result.order);

      cb?.({ ok: true, order: { id: result.order.id, playerId: result.order.playerId, squadId: result.order.squadId, from: result.order.from, to: result.order.to, departAt: result.order.departAt, arriveAt: result.order.arriveAt } });

      // 廣播最新行軍列表給所有在世界的玩家
      broadcastMarchUpdate(io);
    },
  );

  socket.on('sg:buildTent', (d: { coord: Axial }) => {
    world = buildTent(world, socket.id, d.coord);
    io.to('world').emit('sg:worldUpdate', worldView());
  });

  // ── M3.5 陣營 ──────────────────────────────────────────────────

  /**
   * 玩家加入陣營（一次性，不可換）。
   * 若已有陣營，回傳錯誤。
   */
  socket.on(
    'sg:joinFaction',
    (d: { factionId: FactionId }, cb?: (r: { ok: boolean; factionId?: FactionId; error?: string }) => void) => {
      if (playerFaction.has(socket.id)) {
        return cb?.({ ok: false, error: '已選擇陣營，不可更換' });
      }
      const fid = d.factionId;
      if (!(['wei', 'shu', 'wu', 'qun'] as FactionId[]).includes(fid)) {
        return cb?.({ ok: false, error: '無效陣營 ID' });
      }
      factionStates[fid] = joinFaction(factionStates[fid], socket.id);
      playerFaction.set(socket.id, fid);
      cb?.({ ok: true, factionId: fid });
      // 廣播更新陣營視圖給世界中的玩家
      io.to('world').emit('sg:factionUpdate', factionViewAll());
    },
  );

  /**
   * 查詢當前陣營狀態。
   */
  socket.on('sg:getFactionState', (_d, cb?: (r: { factions: ReturnType<typeof factionViewAll> }) => void) => {
    cb?.({ factions: factionViewAll() });
  });

  // ── M4 同盟集結攻城 ────────────────────────────────────────────

  /**
   * sg:createRally：同盟成員發起集結攻城。
   * 前提：玩家必須在某同盟中。
   */
  socket.on(
    'sg:createRally',
    (
      d: { targetTile: Axial; allianceId: string },
      cb?: (r: { ok: boolean; rallyId?: string; launchAt?: number; error?: string }) => void,
    ) => {
      const a = alliances.get(d.allianceId);
      if (!a) return cb?.({ ok: false, error: '同盟不存在' });
      if (!a.members[socket.id]) return cb?.({ ok: false, error: '非此同盟成員' });

      const now = Date.now();
      const launchAt = now + RALLY_WINDOW_MS;
      const squad = buildAttackSquad(socket.id);

      const result = createRally({
        allianceId: d.allianceId,
        targetTile: d.targetTile,
        initiator: socket.id,
        initiatorSquad: squad,
        launchAt,
      }, now);

      if (!result.ok || !result.rally) {
        return cb?.({ ok: false, error: result.error });
      }

      rallyOrders.set(result.rally.id, result.rally);
      cb?.({ ok: true, rallyId: result.rally.id, launchAt });

      // 廣播給同盟頻道
      io.to('al:' + d.allianceId).emit('sg:rallyUpdate', rallyView(result.rally));
    },
  );

  /**
   * sg:joinRally：同盟成員加入已有集結。
   */
  socket.on(
    'sg:joinRally',
    (
      d: { rallyId: string },
      cb?: (r: { ok: boolean; error?: string }) => void,
    ) => {
      const rally = rallyOrders.get(d.rallyId);
      if (!rally) return cb?.({ ok: false, error: '集結不存在' });

      const a = alliances.get(rally.allianceId);
      if (!a || !a.members[socket.id]) {
        return cb?.({ ok: false, error: '非此同盟成員' });
      }

      const squad = buildAttackSquad(socket.id);
      const now = Date.now();
      const result = joinRally(rally, socket.id, rally.allianceId, squad, now);

      if (!result.ok || !result.rally) {
        return cb?.({ ok: false, error: result.error });
      }

      rallyOrders.set(rally.id, result.rally);
      cb?.({ ok: true });

      // 廣播給同盟頻道
      io.to('al:' + rally.allianceId).emit('sg:rallyUpdate', rallyView(result.rally));
    },
  );

  /**
   * sg:listRallies：列出進行中的集結（供前端顯示可加入的集結）。
   */
  socket.on('sg:listRallies', (_d, cb?: (r: { rallies: ReturnType<typeof rallyView>[] }) => void) => {
    const active = Array.from(rallyOrders.values())
      .filter((r) => r.status === 'gathering')
      .map(rallyView);
    cb?.({ rallies: active });
  });

  /**
   * sg:seasonSettle：手動觸發賽季結算（廣播陣營排名）。
   * 生產環境應由定時器/管理員觸發。
   */
  socket.on('sg:seasonSettle', (_d, cb?: (r: SeasonSettleResult) => void) => {
    const luoyangFaction = getLuoyangOwnerFaction();
    const result = resolveSeasonRanking(factionStates, luoyangFaction);
    cb?.(result);
    io.to('world').emit('sg:seasonSettle', result);
  });

  socket.on('disconnect', () => {
    for (const [id, room] of rooms) {
      if (room.seats.A === socket.id || room.seats.B === socket.id) {
        io.to(id).emit('sg:opponentLeft');
        rooms.delete(id);
      }
    }
    for (const [id, a] of alliances) {
      if (a.members[socket.id]) {
        const updated = leaveAlliance(a, socket.id);
        if (memberCount(updated) === 0) alliances.delete(id);
        else { alliances.set(id, updated); io.to('al:' + id).emit('sg:allianceUpdate', allianceView(updated)); }
      }
    }
    playerName.delete(socket.id);
    // 注意：玩家斷線後陣營成員資格不移除（保留賽季貢獻）
  });
});

httpServer.listen(PORT, () => {
  console.log(`[sanguo-pvp] socket.io on :${PORT} path=${SOCKET_PATH}`);
});
