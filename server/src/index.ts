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
 */
import { createServer } from 'http';
import { Server } from 'socket.io';
import { resolvePvp, type PvpSubmission } from './pvp';
import { marchBattle } from './world';
import { newAlliance, joinAlliance, leaveAlliance, donate, alliancePerks, memberCount } from '../../engine/src/alliance';
import type { Alliance, AllianceTechId } from '../../engine/src/alliance';
import { genWorld, spawnPlayer, captureTile, buildTent, powerScore, hexKey } from '../../engine/src/worldmap';
import type { Axial } from '../../engine/src/worldmap';
import { sendMarch, checkArrival, resolveMarchArrival } from '../../engine/src/march';
import type { MarchOrder } from '../../engine/src/march';
import { makeUnit, makeSquad, ZHAO_YUN } from '../../engine/src/sampleData';

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
function worldView() {
  const tiles = Object.values(world.tiles).map((t) => ({ q: t.coord.q, r: t.coord.r, level: t.level, state: t.state, owner: t.owner, tent: t.tent, landmark: t.landmark }));
  const power: Record<string, number> = {};
  for (const pid of Object.keys(world.spawns)) power[pid] = powerScore(world, pid);
  return { radius: world.radius, tiles, power };
}

// M2 行軍令狀態（伺服器持有）
const marchOrders = new Map<string, MarchOrder>();

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

// ── M2 行軍 tick（每 2 秒）────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, order] of marchOrders) {
    if (!checkArrival(order, now)) continue;

    // 更新狀態為 arrived（避免重複結算）
    marchOrders.set(id, { ...order, status: 'arrived' });

    const squad = buildAttackSquad(order.playerId);
    const seed = (Math.abs(order.to.q * 73856093) ^ Math.abs(order.to.r * 19349663)) % 2147483647;
    const { map: updatedMap, outcome, order: doneOrder } = resolveMarchArrival(world, squad, order, seed);

    world = updatedMap;
    marchOrders.set(id, doneOrder);

    // 廣播到達 + 戰報
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
    }
  }
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
  });
});

httpServer.listen(PORT, () => {
  console.log(`[sanguo-pvp] socket.io on :${PORT} path=${SOCKET_PATH}`);
});
