import "dotenv/config";
import { WebSocketServer } from "ws";
import crypto from "crypto";
import Question from "./models/Question.js";
import Match from "./models/Match.js";
import { connectDB } from "./db.js";

await connectDB();
console.log("📡 MongoDB connected");

const wss = new WebSocketServer({ port: 5000, path: "/realtime" });
console.log("⚡ WS running :5000");

/* =========================
   State
========================= */
const clients = new Map(); // userId -> ws
const activeConnection = new Map(); // userId -> ws (newest wins)
const queue = [];
const rooms = new Map();
const userRoom = new Map();

/* =========================
   Helpers
========================= */
function send(ws, type, payload = {}) {
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify({ type, ...payload }));
  }
}

function broadcast(room, type, payload = {}) {
  room.players.forEach((p) => send(p.ws, type, payload));
}

function buildScores(room) {
  return Object.fromEntries(room.players.map((p) => [p.userId, p.score]));
}

/* =========================
   Connection
========================= */
wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    /* ---------- REGISTER ---------- */
    if (data.type === "register") {
      ws.userId = data.userId;
      clients.set(data.userId, ws);

      // 🔥 NEWEST TAB WINS
      const prev = activeConnection.get(data.userId);
      if (prev && prev !== ws) {
        send(prev, "passive");
      }
      activeConnection.set(data.userId, ws);
      send(ws, "active");

      // 🔁 REJOIN (CRITICAL FIX)
      if (userRoom.has(data.userId)) {
        const roomId = userRoom.get(data.userId);
        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.find((p) => p.userId === data.userId);
        if (!player) return;

        // 🔥 REBIND SOCKET
        player.ws = ws;

        // 🔥 PUSH AUTHORITATIVE STATE
        if (room.status === "ended") {
          send(ws, "quizEnd", {
            roomId: room.roomId,
            scores: buildScores(room),
          });
          return;
        }

        if (player.finished) {
          send(ws, "waitingOpponent", {
            roomId: room.roomId,
          });
          return;
        }

        if (room.status === "playing") {
          send(ws, "nextQuestion", {
            roomId: room.roomId, // ✅ FIX
            questionIndex: player.progress,
            question: room.questions[player.progress],
            totalQuestions: room.questions.length,
          });
          send(ws, "scoreUpdate", {
            roomId: room.roomId, // optional but consistent
            scores: buildScores(room),
          });
          send(ws, "tick", {
            roomId: room.roomId, // optional
            remainingTime: room.remainingTime,
          });
          return;
        }
      }

      return;
    }

    /* ---------- JOIN QUEUE ---------- */
    if (data.type === "joinQueue") {
      if (activeConnection.get(data.userId) !== ws) {
        send(ws, "passive");
        return;
      }
      if (userRoom.has(data.userId)) return;

      if (!queue.includes(data.userId)) queue.push(data.userId);
      if (queue.length >= 2) createMatch();
      return;
    }

    /* ---------- ANSWER ---------- */
    if (data.type === "answer") {
      const room = rooms.get(data.roomId);
      if (!room || room.status !== "playing") return;

      const player = room.players.find((p) => p.userId === data.userId);
      if (!player || player.finished) return;

      const q = room.questions[player.progress];
      if (q.answer === data.answerIndex) player.score++;

      player.progress++;

      broadcast(room, "scoreUpdate", { scores: buildScores(room) });

      if (player.progress >= room.questions.length) {
        player.finished = true;
        send(player.ws, "waitingOpponent");

        if (room.players.every((p) => p.finished)) {
          endMatch(room.roomId);
        }
        return;
      }

      send(player.ws, "nextQuestion", {
        roomId: room.roomId,
        questionIndex: player.progress,
        question: room.questions[player.progress],
        totalQuestions: room.questions.length,
      });
      
    }
  });

  ws.on("close", () => {
    if (activeConnection.get(ws.userId) === ws) {
      activeConnection.delete(ws.userId);
    }
    clients.delete(ws.userId);
  });
});

/* =========================
   Match Flow
========================= */
async function createMatch() {
  const u1 = queue.shift();
  const u2 = queue.shift();

  const ws1 = clients.get(u1);
  const ws2 = clients.get(u2);
  if (!ws1 || !ws2) return;

  const questions = await Question.aggregate([
    { $match: { level: "N5" } },
    { $sample: { size: 5 } },
  ]);

  const roomId = crypto.randomUUID().slice(0, 8);

  const room = {
    roomId,
    questions,
    status: "starting",
    remainingTime: 30,
    startCountdown: 3,
    players: [
      { userId: u1, ws: ws1, score: 0, progress: 0, finished: false },
      { userId: u2, ws: ws2, score: 0, progress: 0, finished: false },
    ],
  };

  rooms.set(roomId, room);
  userRoom.set(u1, roomId);
  userRoom.set(u2, roomId);

  broadcast(room, "matchFound", {
    roomId,
    totalQuestions: questions.length,
    startCountdown: 3,
  });

  const startTimer = setInterval(() => {
    room.startCountdown--;
    broadcast(room, "matchStarting", { startCountdown: room.startCountdown });

    if (room.startCountdown <= 0) {
      clearInterval(startTimer);
      startMatch(room);
    }
  }, 1000);
}

function startMatch(room) {
  room.status = "playing";

  broadcast(room, "matchStart", {});
  broadcast(room, "nextQuestion", {
    roomId: room.roomId,
    questionIndex: 0,
    question: room.questions[0],
    totalQuestions: room.questions.length,
  });
  

  room.timer = setInterval(() => {
    room.remainingTime--;
    broadcast(room, "tick", { remainingTime: room.remainingTime });
    if (room.remainingTime <= 0) endMatch(room.roomId);
  }, 1000);
}

async function endMatch(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.status === "ended") return;

  room.status = "ended";
  clearInterval(room.timer);

  const scores = buildScores(room);
  broadcast(room, "quizEnd", { scores });

  for (const p of room.players) {
    userRoom.delete(p.userId);
  }

  const players = room.players.map((p) => ({
    userId: p.userId,
    score: p.score,
    correct: p.score,
    wrong: room.questions.length - p.score,
  }));

  let winnerId = null;
  let isDraw = false;

  const maxScore = Math.max(...players.map((p) => p.score));
  const winners = players.filter((p) => p.score === maxScore);

  if (winners.length === 1) {
    winnerId = winners[0].userId;
  } else {
    isDraw = true;
  }

  await Match.create({
    roomId,
    mode: "multi",
    totalQuestions: room.questions.length,
    players,
    winnerId,
    isDraw,
  });

  rooms.delete(roomId);
}
