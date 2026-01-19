import "dotenv/config";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import Question from "./models/Question.js";
import Match from "./models/Match.js";
import { connectDB } from "./db.js";

await connectDB();
console.log("📡 MongoDB connected");

const httpServer = http.createServer();
const io = new Server(httpServer, {
  path: "/socket.io",
  transports: ["websocket"],
  cors: { origin: "*" },
  pingInterval: 20000,
  pingTimeout: 60000,
});

/* ---------------------------------------------
 * GLOBAL STATE
 * --------------------------------------------- */
const queue = []; // sockets waiting for match
const GAME_STATE = new Map(); // roomId → { players, questions, scores, progress }
const USER_SOCKETS = new Map(); // userId → Set(socketIds)

/* ---------------------------------------------
 * CONNECTION
 * --------------------------------------------- */
io.on("connection", (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  /* REGISTER USER */
  socket.on("registerUser", ({ userId }) => {
    if (!userId) return;
    socket.data.userId = userId;

    if (!USER_SOCKETS.has(userId)) USER_SOCKETS.set(userId, new Set());
    USER_SOCKETS.get(userId).add(socket.id);

    console.log(`🟢 Registered user ${userId} on socket ${socket.id}`);
  });

  /* JOIN QUEUE */
  socket.on("joinQueue", ({ userId }) => {
    if (!userId) return;

    socket.data.userId = userId;

    // Already queued? → Denied
    if (queue.some((s) => s.data.userId === userId)) {
      socket.emit("queueDenied", { reason: "alreadyQueued" });
      return;
    }

    // Already in match? → Denied + Sync
    for (const [roomId, match] of GAME_STATE.entries()) {
      if (match.players.includes(userId)) {
        socket.emit("queueDenied", {
          reason: "alreadyInMatch",
          roomId,
        });
        return;
      }
    }

    // Queue accepted
    queue.push(socket);
    socket.emit("queueAccepted");
    console.log(`📥 User queued: ${userId}`);

    if (queue.length >= 2) createMatch();
  });

  /* LEAVE QUEUE */
  socket.on("leaveQueue", () => {
    const userId = socket.data.userId;
    if (!userId) return;

    const index = queue.findIndex((s) => s.data.userId === userId);
    if (index !== -1) {
      queue.splice(index, 1);
      console.log(`🚪 User removed from queue: ${userId}`);
    }
  });

  /* MATCH SYNC FOR NEW TABS OR REFRESH */
  socket.on("requestMatchSync", ({ roomId }) => {
    const match = GAME_STATE.get(roomId);
    if (!match) return;

    const userId = socket.data.userId;
    const progress = match.progress[userId];

    socket.emit("nextQuestion", {
      roomId,
      questionIndex: progress,
      question: match.questions[progress],
      scores: match.scores,
    });
  });

  /* SUBMIT ANSWER */
  socket.on("submitAnswer", ({ roomId, questionIndex, answer }) => {
    const match = GAME_STATE.get(roomId);
    if (!match || match.isFinished) return;

    const userId = socket.data.userId;
    const isCorrect = match.questions[questionIndex].answer === answer;

    if (isCorrect) match.scores[userId]++;
    match.progress[userId]++;

    broadcastToPlayers(match.players, "scoreUpdate", { scores: match.scores });

    // Check if everyone finished
    const allDone = Object.values(match.progress).every(
      (v) => v >= match.questions.length
    );
    if (allDone) {
      endMatch(roomId);
      return;
    }

    // Send next question to THIS user
    const nextIndex = match.progress[userId];
    broadcastToSingleUser(userId, "nextQuestion", {
      roomId,
      questionIndex: nextIndex,
      question: match.questions[nextIndex],
      scores: match.scores,
    });
  });

  /* USER LEAVES MATCH PAGE INTENTIONALLY */
  socket.on("leaveMatch", ({ userId }) => {
    // INTENTIONAL quit — only case where match ends early
    for (const [roomId, match] of GAME_STATE.entries()) {
      if (match.players.includes(userId)) {
        console.log("🚪 User left match intentionally:", userId);
        endMatch(roomId, userId);
      }
    }
  });

  /* DISCONNECT — DOES NOT END MATCH ANYMORE */
  socket.on("disconnect", () => {
    const userId = socket.data.userId;
    console.log(`❌ Socket disconnected: ${userId}`);

    if (!userId) return;

    const sockets = USER_SOCKETS.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        USER_SOCKETS.delete(userId);

        // Remove from queue but DO NOT END MATCH
        const index = queue.findIndex((s) => s.data.userId === userId);
        if (index !== -1) queue.splice(index, 1);
      }
    }
  });
});

/* ---------------------------------------------
 * CREATE MATCH
 * --------------------------------------------- */
async function createMatch() {
  const s1 = queue.shift();
  const s2 = queue.shift();

  const p1 = s1.data.userId;
  const p2 = s2.data.userId;

  const roomId = Math.random().toString(36).slice(2, 8);
  const players = [p1, p2];

  const questions = await Question.aggregate([
    { $match: { level: "N5" } },
    { $sample: { size: 5 } },
  ]);

  GAME_STATE.set(roomId, {
    roomId,
    players,
    questions,
    scores: { [p1]: 0, [p2]: 0 },
    progress: { [p1]: 0, [p2]: 0 },
    isFinished: false,
    timerInterval: null,
  });

  s1.join(roomId);
  s2.join(roomId);

  broadcastToRoom(roomId, "match", {
    roomId,
    players,
    totalQuestions: questions.length,
  });

  startCountdown(roomId);
}

/* ---------------------------------------------
 * COUNTDOWN
 * --------------------------------------------- */
function startCountdown(roomId) {
  let sec = 3;
  const timer = setInterval(() => {
    broadcastToRoom(roomId, "countdown", sec);
    sec--;
    if (sec < 0) {
      clearInterval(timer);
      startMatch(roomId);
    }
  }, 1000);
}

/* ---------------------------------------------
 * START MATCH
 * --------------------------------------------- */
function startMatch(roomId) {
  const match = GAME_STATE.get(roomId);
  if (!match) return;

  let timer = 30;

  match.timerInterval = setInterval(() => {
    broadcastToRoom(roomId, "timer", timer);
    timer--;
    if (timer < 0) {
      clearInterval(match.timerInterval);
      endMatch(roomId);
    }
  }, 1000);

  broadcastToRoom(roomId, "gameStart", {});

  for (const userId of match.players) {
    broadcastToSingleUser(userId, "nextQuestion", {
      roomId,
      questionIndex: 0,
      question: match.questions[0],
      scores: match.scores,
    });
  }
}

/* ---------------------------------------------
 * END MATCH — ONLY VALID WHEN timer 0 OR BOTH FINISHED
 * --------------------------------------------- */
async function endMatch(roomId, quitter = null) {
  const match = GAME_STATE.get(roomId);
  if (!match || match.isFinished) return;

  match.isFinished = true;
  if (match.timerInterval) clearInterval(match.timerInterval);

  broadcastToRoom(roomId, "quizEnd", {
    scores: match.scores,
    quitter,
  });

  // Save match history
  await Promise.all(
    match.players.map((u) =>
      Match.create({ userId: u, mode: "multi", createdAt: new Date() })
    )
  );

  setTimeout(() => {
    GAME_STATE.delete(roomId);
    console.log(`🏁 Match ended: ${roomId}`);
  }, 200);
}

/* ---------------------------------------------
 * HELPERS
 * --------------------------------------------- */
function broadcastToRoom(roomId, event, payload) {
  io.to(roomId).emit(event, payload);
}
function broadcastToPlayers(players, event, payload) {
  for (const u of players) broadcastToSingleUser(u, event, payload);
}
function broadcastToSingleUser(userId, event, payload) {
  const sockIds = USER_SOCKETS.get(userId);
  if (!sockIds) return;

  for (const id of sockIds) {
    const s = io.sockets.sockets.get(id);
    if (s) s.emit(event, payload);
  }
}

httpServer.listen(5000, "0.0.0.0", () =>
  console.log("🚀 WS running at ws://0.0.0.0:5000")
);
