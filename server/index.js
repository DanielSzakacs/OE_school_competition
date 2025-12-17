import express from "express";
import http from "http";
import { Server } from "socket.io";
import { prisma } from "./prismaClient.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
  },
});

const ROOM_CODE = "ROOM1";

const runtime = {
  activeQuestionId: null,
  buzzOpen: false,
  buzzWinnerSeat: null,
  hostSocketId: null,
};

async function buildPublicState() {
  const [players, questions] = await Promise.all([
    prisma.player.findMany({
      orderBy: { seat: "asc" },
    }),
    prisma.question.findMany({
      where: { isVisible: true },
      select: {
        id: true,
        category: true,
        point: true,
      },
      orderBy: [
        { category: "asc" },
        { point: "asc" },
      ],
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
      ioInstance.to(runtime.hostSocketId).emit("host:activeQuestion", fullQuestion);
    } else {
      ioInstance.to(runtime.hostSocketId).emit("host:activeQuestion", null);
    }
  }
}

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

    runtime.activeQuestionId = questionId;
    runtime.buzzOpen = true;
    runtime.buzzWinnerSeat = null;

    await emitState(io);
  });

  socket.on("buzz:hit", async ({ seat }) => {
    if (!runtime.activeQuestionId) return;
    if (!runtime.buzzOpen) return;
    if (runtime.buzzWinnerSeat !== null) return;

    runtime.buzzWinnerSeat = seat;
    runtime.buzzOpen = false;

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
    }

    await prisma.question.update({
      where: { id: question.id },
      data: { isVisible: false },
    });

    runtime.activeQuestionId = null;
    runtime.buzzOpen = false;
    runtime.buzzWinnerSeat = null;

    await emitState(io);
  });

  socket.on("disconnect", () => {
    if (runtime.hostSocketId === socket.id) {
      runtime.hostSocketId = null;
    }
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
