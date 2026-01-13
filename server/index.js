import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { exec as execCallback } from "child_process";
import { promisify } from "util";
import { Server } from "socket.io";
import { prisma } from "./prismaClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
  },
  cors: { origin: true, methods: ["GET", "POST"] },
});

const ROOM_CODE = "ROOM1";
const exec = promisify(execCallback);
const QUESTION_DURATION_MS = 30_000;
const TIMER_TICK_MS = 250;

const runtime = {
  activeQuestionId: null,
  buzzOpen: false,
  buzzWinnerSeat: null,
  hostSocketId: null,
  disabledBuzzSeats: new Set(),
  timerEndsAt: null,
  timerRemainingMs: null,
  timerPaused: false,
  sfxEnabled: true,
  screenCoverEnabled: false,
  waitingForRevealQuestionId: null,
};

const resetTimer = () => {
  runtime.timerEndsAt = null;
  runtime.timerRemainingMs = null;
  runtime.timerPaused = false;
};

const startTimer = () => {
  runtime.timerRemainingMs = QUESTION_DURATION_MS;
  runtime.timerEndsAt = Date.now() + QUESTION_DURATION_MS;
  runtime.timerPaused = false;
};

const pauseTimer = () => {
  if (runtime.timerPaused || runtime.timerEndsAt == null) return;
  runtime.timerRemainingMs = Math.max(0, runtime.timerEndsAt - Date.now());
  runtime.timerEndsAt = null;
  runtime.timerPaused = true;
};

const resumeTimer = () => {
  if (!runtime.timerPaused || runtime.timerRemainingMs == null) return;
  runtime.timerEndsAt = Date.now() + runtime.timerRemainingMs;
  runtime.timerPaused = false;
};

const getTimerRemainingMs = () => {
  if (runtime.timerEndsAt != null && !runtime.timerPaused) {
    return Math.max(0, runtime.timerEndsAt - Date.now());
  }
  return runtime.timerRemainingMs;
};

const resetQuestionState = () => {
  runtime.activeQuestionId = null;
  runtime.buzzOpen = false;
  runtime.buzzWinnerSeat = null;
  runtime.disabledBuzzSeats = new Set();
  runtime.waitingForRevealQuestionId = null;
  resetTimer();
};

async function buildPublicState() {
  const [players, questions] = await Promise.all([
    prisma.player.findMany({
      orderBy: { seat: "asc" },
    }),
    prisma.question.findMany({
      select: {
        id: true,
        category: true,
        point: true,
        isVisible: true,
      },
      orderBy: [{ category: "asc" }, { point: "asc" }],
    }),
  ]);

  let activeQuestion = null;
  if (runtime.activeQuestionId) {
    const fullQuestion = await prisma.question.findUnique({
      where: { id: runtime.activeQuestionId },
    });
    if (fullQuestion) {
      const { correctAnswer, ...publicQuestion } = fullQuestion;
      activeQuestion = publicQuestion;
    }
  }

  return {
    players,
    questions,
    runtime: {
      activeQuestionId: runtime.activeQuestionId,
      buzzOpen: runtime.buzzOpen,
      buzzWinnerSeat: runtime.buzzWinnerSeat,
      disabledBuzzSeats: Array.from(runtime.disabledBuzzSeats),
      timerEndsAt: runtime.timerEndsAt,
      timerRemainingMs: getTimerRemainingMs(),
      timerPaused: runtime.timerPaused,
      sfxEnabled: runtime.sfxEnabled,
      screenCoverEnabled: runtime.screenCoverEnabled,
      waitingForRevealQuestionId: runtime.waitingForRevealQuestionId,
    },
    activeQuestion,
  };
}

async function emitState(ioInstance) {
  const state = await buildPublicState();
  ioInstance.to(ROOM_CODE).emit("state:update", state);

  if (runtime.hostSocketId) {
    if (runtime.activeQuestionId) {
      const fullQuestion = await prisma.question.findUnique({
        where: { id: runtime.activeQuestionId },
      });
      ioInstance
        .to(runtime.hostSocketId)
        .emit("host:activeQuestion", fullQuestion);
    } else {
      ioInstance.to(runtime.hostSocketId).emit("host:activeQuestion", null);
    }
  }
}

async function handleQuestionTimeout() {
  if (!runtime.activeQuestionId) return;
  if (runtime.sfxEnabled) {
    io.to(ROOM_CODE).emit("sfx:badAnswer");
  }
  await prisma.question.update({
    where: { id: runtime.activeQuestionId },
    data: { isVisible: false },
  });
  resetQuestionState();
  await emitState(io);
}

let timerTickInFlight = false;
setInterval(async () => {
  if (timerTickInFlight) return;
  if (!runtime.activeQuestionId) return;
  if (runtime.timerPaused || runtime.timerEndsAt == null) return;
  if (Date.now() < runtime.timerEndsAt) return;
  timerTickInFlight = true;
  try {
    await handleQuestionTimeout();
  } finally {
    timerTickInFlight = false;
  }
}, TIMER_TICK_MS);

io.on("connection", (socket) => {
  socket.on("room:join", async ({ role, seat }) => {
    socket.data.role = role;
    socket.data.seat = seat;

    socket.join(ROOM_CODE);

    if (role === "host") {
      runtime.hostSocketId = socket.id;
    }

    await emitState(io);
  });

  socket.on("question:select", async ({ questionId }) => {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question || !question.isVisible) return;

    const [totalCount, visibleCount] = await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { isVisible: true } }),
    ]);
    const needsIntro =
      totalCount > 0 &&
      (visibleCount === totalCount || visibleCount === 1) &&
      runtime.sfxEnabled;

    runtime.activeQuestionId = questionId;
    runtime.buzzOpen = true;
    runtime.buzzWinnerSeat = null;
    runtime.disabledBuzzSeats = new Set();
    runtime.waitingForRevealQuestionId = needsIntro ? questionId : null;
    if (needsIntro) {
      runtime.timerRemainingMs = QUESTION_DURATION_MS;
      runtime.timerEndsAt = null;
      runtime.timerPaused = true;
    } else {
      startTimer();
    }

    await emitState(io);
  });

  socket.on("question:reveal", async ({ questionId }) => {
    if (socket.data.role !== "screen") return;
    if (runtime.activeQuestionId !== questionId) return;
    if (runtime.waitingForRevealQuestionId !== questionId) return;

    runtime.waitingForRevealQuestionId = null;
    if (runtime.timerPaused) {
      resumeTimer();
    } else if (runtime.timerEndsAt == null) {
      startTimer();
    }

    await emitState(io);
  });

  socket.on("buzz:hit", async ({ seat }) => {
    if (!runtime.activeQuestionId) return;
    if (!runtime.buzzOpen) return;
    if (runtime.buzzWinnerSeat !== null) return;
    if (runtime.disabledBuzzSeats.has(seat)) return;

    runtime.buzzWinnerSeat = seat;
    runtime.buzzOpen = false;
    pauseTimer();

    await emitState(io);
  });

  socket.on("answer:resolve", async ({ isCorrect }) => {
    if (!runtime.activeQuestionId) return;
    if (runtime.buzzWinnerSeat == null) return;

    const question = await prisma.question.findUnique({
      where: { id: runtime.activeQuestionId },
    });
    if (!question) return;

    await prisma.attempt.create({
      data: {
        questionId: question.id,
        playerSeat: runtime.buzzWinnerSeat,
        isCorrect: !!isCorrect,
      },
    });

    if (isCorrect) {
      await prisma.player.update({
        where: { seat: runtime.buzzWinnerSeat },
        data: { score: { increment: question.point } },
      });
      await prisma.question.update({
        where: { id: question.id },
        data: { isVisible: false },
      });
      resetQuestionState();
      io.to(ROOM_CODE).emit("sfx:goodAnswer");
      await emitState(io);
      return;
    }

    runtime.disabledBuzzSeats.add(runtime.buzzWinnerSeat);
    runtime.buzzWinnerSeat = null;

    const players = await prisma.player.findMany({
      select: { seat: true },
    });
    const remainingSeats = players.filter(
      (player) => !runtime.disabledBuzzSeats.has(player.seat)
    );

    const remainingMs = getTimerRemainingMs();
    if (remainingSeats.length === 0 || (remainingMs != null && remainingMs <= 0)) {
      if (remainingMs != null && remainingMs <= 0 && runtime.sfxEnabled) {
        io.to(ROOM_CODE).emit("sfx:badAnswer");
      }
      await prisma.question.update({
        where: { id: question.id },
        data: { isVisible: false },
      });
      resetQuestionState();
      await emitState(io);
      return;
    }

    runtime.buzzOpen = true;
    resumeTimer();

    await emitState(io);
  });

  socket.on("game:reset", async () => {
    if (socket.data.role !== "host") return;

    await prisma.player.updateMany({
      data: { score: 0 },
    });

    await prisma.question.updateMany({
      data: { isVisible: true },
    });

    resetQuestionState();

    await emitState(io);
  });

  socket.on("game:seed", async () => {
    if (socket.data.role !== "host") return;

    const seedPath = path.resolve(__dirname, "prisma", "seed.js");

    try {
      await exec(`node "${seedPath}"`, { cwd: __dirname });
    } catch (error) {
      console.error("Seed failed:", error);
    }

    resetQuestionState();

    await emitState(io);
  });

  socket.on("sfx:toggle", async ({ enabled }) => {
    if (socket.data.role !== "host") return;

    runtime.sfxEnabled = !!enabled;
    await emitState(io);
  });

  socket.on("screen:cover", async ({ enabled }) => {
    if (socket.data.role !== "host") return;

    runtime.screenCoverEnabled = !!enabled;
    await emitState(io);
  });

  socket.on("disconnect", () => {
    if (runtime.hostSocketId === socket.id) {
      runtime.hostSocketId = null;
    }
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const clientDistPath = path.resolve(__dirname, "../client/dist");

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA fallback: Vue Router route-okhoz is index.html kell
  //   app.get("*", (req, res) => {
  //     res.sendFile(path.join(clientDistPath, "index.html"));
  //   });
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });

  console.log("Serving client from:", clientDistPath);
} else {
  console.log(
    "client/dist not found, skipping static serving:",
    clientDistPath
  );
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
