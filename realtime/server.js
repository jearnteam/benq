import "dotenv/config";
import mongoose from "mongoose";
import { Server } from "socket.io";
import http from "http";
import Question from "./models/Question.js";

const httpServer = http.createServer();

const io = new Server(httpServer, {
  path: "/socket.io",
  transports: ["websocket"],
  cors: { origin: "*" },
  pingInterval: 20000,
  pingTimeout: 60000,
});

await mongoose.connect(process.env.MONGODB_URI);
console.log("📡 MongoDB connected");

const queue = [];
const GAME_STATE = new Map();

io.on("connection", (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on("joinQueue", async ({ userId }) => {
    if (!userId) return;
    if (queue.find((s) => s.data?.userId === userId)) return;

    socket.data.userId = userId;
    queue.push(socket);
    console.log(`📥 Queued: ${userId}`);

    if (queue.length >= 2) createMatch();
  });

  socket.on("submitAnswer", ({ roomId, questionIndex, answer }) => {
    const match = GAME_STATE.get(roomId);
    if (!match) return;

    const userId = socket.data.userId;
    const correctAnswer = match.questions[questionIndex].answer;

    if (!match.scores[userId]) match.scores[userId] = 0;
    if (answer === correctAnswer) match.scores[userId]++;

    match.progress[userId]++;
    
    // realtime score update
    io.to(roomId).emit("scoreUpdate", { scores: match.scores });

    if (match.progress[userId] >= match.questions.length) {
      if (Object.values(match.progress).every(v => v >= match.questions.length)) {
        endMatch(roomId);
      }
      return;
    }

    // Request next question for that player
    socket.emit("nextQuestion", {
      roomId,
      questionIndex: match.progress[userId],
      question: match.questions[match.progress[userId]],
      scores: match.scores,
    });
  });

  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.data.userId}`);
  });
});

async function createMatch() {
  const p1 = queue.shift();
  const p2 = queue.shift();

  const roomId = Math.random().toString(36).substr(2, 6);
  const players = [p1.data.userId, p2.data.userId];

  const questions = await Question.aggregate([
    { $match: { level: "N5" } },
    { $sample: { size: 5 } },
  ]);

  GAME_STATE.set(roomId, {
    players,
    questions,
    scores: { [players[0]]: 0, [players[1]]: 0 },
    progress: { [players[0]]: 0, [players[1]]: 0 }
  });

  p1.join(roomId);
  p2.join(roomId);

  console.log("🎮 Match created:", roomId);

  // Broadcast room info → players move to waiting screen
  io.to(roomId).emit("match", {
    roomId,
    players,
    totalQuestions: questions.length,
  });

  startCountdown(roomId);
}

function startCountdown(roomId) {
  let countdown = 3;

  const countdownInterval = setInterval(() => {
    io.to(roomId).emit("countdown", countdown);
    countdown--;

    if (countdown < 0) {
      clearInterval(countdownInterval);
      startMatch(roomId);
    }
  }, 1000);
}

function startMatch(roomId) {
  const match = GAME_STATE.get(roomId);
  if (!match) return;

  let timer = 30;

  const timerInterval = setInterval(() => {
    io.to(roomId).emit("timer", timer);
    timer--;
    if (timer < 0) {
      clearInterval(timerInterval);
      endMatch(roomId);
    }
  }, 1000);

  match.timerInterval = timerInterval;

  io.to(roomId).emit("gameStart", {});

  match.players.forEach((userId) => {
    const socket = [...io.sockets.sockets.values()].find(
      (s) => s.data.userId === userId
    );
    if (socket)
      socket.emit("nextQuestion", {
        roomId,
        questionIndex: 0,
        question: match.questions[0],
        scores: match.scores,
      });
  });

  console.log(`🚀 Game started: ${roomId}`);
}

function endMatch(roomId) {
  const match = GAME_STATE.get(roomId);
  if (!match) return;

  clearInterval(match.timerInterval);

  io.to(roomId).emit("quizEnd", {
    scores: match.scores,
  });

  GAME_STATE.delete(roomId);
  console.log(`🏁 Match ended: ${roomId}`);
}

httpServer.listen(5000, () =>
  console.log("🚀 Realtime WS server running ws://0.0.0.0:5000")
);
