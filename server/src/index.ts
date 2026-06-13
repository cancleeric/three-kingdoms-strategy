/**
 * 三國誌多人 PvP 伺服器（socket.io）— MMO 多人層第一塊。
 *
 * 房間制：createRoom → 對手 joinRoom → 雙方 submit 佈陣 → 伺服器用引擎結算 → 廣播結果+戰報。
 * 路徑掛閘道 /sanguo/socket（與其他遊戲同模式）。
 */
import { createServer } from 'http';
import { Server } from 'socket.io';
import { resolvePvp, type PvpSubmission } from './pvp';
import { marchBattle } from './world';
import { newAlliance, joinAlliance, leaveAlliance, donate, alliancePerks, memberCount } from '../../engine/src/alliance';
import type { Alliance, AllianceTechId } from '../../engine/src/alliance';
import { genWorld, spawnPlayer, captureTile, buildTent, powerScore, hexKey } from '../../engine/src/worldmap';
import type { Axial } from '../../engine/src/worldmap';

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

const httpServer = createServer((_req, res) => { res.writeHead(200); res.end('sanguo-pvp ok'); });
const io = new Server(httpServer, { path: SOCKET_PATH, cors: { origin: '*' } });

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
  });

  // march 出兵攻佔中立地塊（先打守軍，贏了翻面）
  socket.on('sg:march', (d: { coord: Axial; submission: PvpSubmission }, cb?: (r: { ok: boolean; won?: boolean; turns?: number; error?: string }) => void) => {
    const k = hexKey(d.coord);
    const tile = world.tiles[k];
    if (!tile) return cb?.({ ok: false, error: '地塊不存在' });
    const seed = (Math.abs(d.coord.q * 73856093) ^ Math.abs(d.coord.r * 19349663)) % 2147483647;
    const out = marchBattle(d.submission, tile.level, seed);
    if (!out.won) return cb?.({ ok: true, won: false, turns: out.turns });
    const cap = captureTile(world, socket.id, d.coord);
    if (!cap.ok) return cb?.({ ok: false, error: cap.error });
    world = cap.map;
    cb?.({ ok: true, won: true, turns: out.turns });
    io.to('world').emit('sg:worldUpdate', worldView());
  });

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
