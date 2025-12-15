import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
  },
});

// Szobánként tároljuk az állapotot (MVP-hez elég memóriában)
const rooms = new Map();

function getRoom(roomCode) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      roomCode,
      buzzOpen: false,
      buzzWinnerSeat: null, // 1..5
      players: {
        1: { seat: 1, name: "Játékos 1", score: 0 },
        2: { seat: 2, name: "Játékos 2", score: 0 },
        3: { seat: 3, name: "Játékos 3", score: 0 },
        4: { seat: 4, name: "Játékos 4", score: 0 },
        5: { seat: 5, name: "Játékos 5", score: 0 },
      },
    });
  }
  return rooms.get(roomCode);
}

function emitState(roomCode) {
  const state = getRoom(roomCode);
  io.to(roomCode).emit("state:update", state);
}

io.on("connection", (socket) => {
  // kliens elküldi: { roomCode, role, seat? }
  socket.on("room:join", ({ roomCode, role, seat }) => {
    socket.data.roomCode = roomCode;
    socket.data.role = role;
    socket.data.seat = seat;

    socket.join(roomCode);
    emitState(roomCode);
  });

  // Host megnyitja a buzzert
  socket.on("buzz:open", () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const state = getRoom(roomCode);

    state.buzzOpen = true;
    state.buzzWinnerSeat = null;

    emitState(roomCode);
  });

  // Host reseteli (lezárja) a buzzert
  socket.on("buzz:close", () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const state = getRoom(roomCode);

    state.buzzOpen = false;
    emitState(roomCode);
  });

  // Player nyomja a buzzert: { seat }
  socket.on("buzz:hit", ({ seat }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const state = getRoom(roomCode);

    if (!state.buzzOpen) return;
    if (state.buzzWinnerSeat !== null) return;

    state.buzzWinnerSeat = seat;
    state.buzzOpen = false;

    emitState(roomCode);
  });

  // Host pontot ad a nyertesnek: { delta }
  socket.on("score:awardToWinner", ({ delta }) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const state = getRoom(roomCode);

    const seat = state.buzzWinnerSeat;
    if (!seat) return;

    state.players[seat].score += delta;
    emitState(roomCode);
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
