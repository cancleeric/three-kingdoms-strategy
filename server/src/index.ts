/**
 * 三國誌多人 PvP 伺服器（socket.io）— MMO 多人層第一塊。
 *
 * 房間制：createRoom → 對手 joinRoom → 雙方 submit 佈陣 → 伺服器用引擎結算 → 廣播結果+戰報。
 * 路徑掛閘道 /sanguo/socket（與其他遊戲同模式）。
 */
import { createServer } from 'http';
import { Server } from 'socket.io';
import { resolvePvp, type PvpSubmission } from './pvp';

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

  socket.on('disconnect', () => {
    for (const [id, room] of rooms) {
      if (room.seats.A === socket.id || room.seats.B === socket.id) {
        io.to(id).emit('sg:opponentLeft');
        rooms.delete(id);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[sanguo-pvp] socket.io on :${PORT} path=${SOCKET_PATH}`);
});
