import "dotenv/config";
import { WebSocketServer } from "ws";
import crypto from "crypto";
import Question from "./models/Question.js";
import Match from "./models/Match.js";
import User from "./models/User.js";
import { connectDB } from "./db.js";

await connectDB();
const wss = new WebSocketServer({ port: 5000, path: "/realtime" });

/* =========================
   State
========================= */
const clients = new Map(); // userId -> ws (last seen)
const activeConnection = new Map(); // userId -> ws (newest tab wins)
const userRoom = new Map(); // userId -> roomId
const rooms = new Map(); // roomId -> room

const queue = {
  N5: [],
  N4: [],
  N3: [],
  N2: [],
  N1: [],
};

const matchingInProgress = {
  N5: false,
  N4: false,
  N3: false,
  N2: false,
  N1: false,
};

/* =========================
   Helpers
========================= */
function send(ws, type, payload = {}) {
  if (ws?.readyState === 1) ws.send(JSON.stringify({ type, ...payload }));
}

function broadcast(room, type, payload = {}) {
  for (const p of room.players) send(p.ws, type, payload);
}

function buildScores(room) {
  return Object.fromEntries(room.players.map((p) => [p.userId, p.score]));
}

function removeFromQueue(userId) {
  for (const level of Object.keys(queue)) {
    queue[level] = queue[level].filter((u) => u !== userId);
  }
}

/**
 * Try to start matches for a level.
 * Locked per level so we never create two matches concurrently.
 */
async function tryMatchmake(level) {
  if (matchingInProgress[level]) return;

  if (queue[level].length < 2) return;

  matchingInProgress[level] = true;

  const ok = await createMatch(level);

  if (!ok) {
    matchingInProgress[level] = false;
  }
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

      // newest tab wins
      const prev = activeConnection.get(data.userId);
      if (prev && prev !== ws) send(prev, "passive");

      activeConnection.set(data.userId, ws);
      send(ws, "active");

      // rejoin if in room
      if (userRoom.has(data.userId)) {
        const roomId = userRoom.get(data.userId);
        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.find((p) => p.userId === data.userId);
        if (!player) return;

        player.ws = ws;

        if (room.status === "ended") {
          send(ws, "quizEnd", {
            roomId: room.roomId,
            scores: buildScores(room),
            questions: room.questions.map((q) => ({
              questionParts: q.questionParts,
              options: q.options,
              correctAnswer: q.answer,
            })),
            playerAnswers: Object.fromEntries(
              room.players.map((p) => [p.userId, p.answers])
            ),
          });
          return;
        }

        if (player.finished) {
          send(ws, "waitingOpponent", { roomId: room.roomId });
          return;
        }

        if (room.status === "starting") {
          // push countdown state
          send(ws, "matchFound", {
            roomId: room.roomId,
            totalQuestions: room.questions.length,
          });
          send(ws, "matchStarting", { startCountdown: room.startCountdown });
          return;
        }

        if (room.status === "playing") {
          send(ws, "nextQuestion", {
            roomId: room.roomId,
            questionIndex: player.progress,
            question: room.questions[player.progress],
            totalQuestions: room.questions.length,
          });
          send(ws, "scoreUpdate", { scores: buildScores(room) });
          send(ws, "tick", { remainingTime: room.remainingTime });
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

      const level = data.level || "N5";

      // prevent duplicate queue entries
      if (!queue[level].includes(data.userId)) queue[level].push(data.userId);

      // run matchmaking safely
      tryMatchmake(level);
      return;
    }

    /* ---------- LEAVE QUEUE ---------- */
    if (data.type === "leaveQueue") {
      removeFromQueue(data.userId);
      return;
    }

    /* ---------- ANSWER ---------- */
    if (data.type === "answer") {
      const room = rooms.get(data.roomId);
      if (!room || room.status !== "playing") return;

      const player = room.players.find((p) => p.userId === data.userId);
      if (!player || player.finished) return;

      const qIndex = player.progress;
      const q = room.questions[qIndex];

      player.answers[qIndex] = data.answerIndex;
      if (q.answer === data.answerIndex) player.score++;

      player.progress++;

      broadcast(room, "scoreUpdate", { scores: buildScores(room) });

      if (player.progress >= room.questions.length) {
        player.finished = true;
        player.finishedAt = Date.now();
        send(player.ws, "waitingOpponent", { roomId: room.roomId });

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
    const userId = ws.userId;
    if (!userId) return;

    if (activeConnection.get(userId) === ws) activeConnection.delete(userId);
    clients.delete(userId);

    removeFromQueue(userId);

    const roomId = userRoom.get(userId);
    if (roomId) {
      const room = rooms.get(roomId);
      // You can pick your policy here:
      // - end immediately
      // - give grace time to reconnect
      if (room && room.status !== "ended") {
        endMatch(roomId);
      }
    }
  });
});

/* =========================
   Match Flow
========================= */

/**
 * Returns true if a match was created and countdown started.
 * Returns false if it couldn't create a match (missing sockets etc).
 */
async function createMatch(level) {
  if (queue[level].length < 2) return false;

  const u1 = queue[level].shift();
  const u2 = queue[level].shift();

  const ws1 = activeConnection.get(u1);
  const ws2 = activeConnection.get(u2);

  // If one disconnected or not active, requeue the other and abort
  if (!ws1 || !ws2) {
    if (ws1) queue[level].unshift(u1);
    if (ws2) queue[level].unshift(u2);
    return false;
  }

  const rawQuestions = await Question.aggregate([
    { $match: { level } },
    { $sample: { size: 5 } },
  ]);

  const questions = rawQuestions.map((q) => {
    const correctIndex = q.choices.findIndex((c) => c.correct);
    return {
      questionParts: q.questionParts,
      options: q.choices.map((c) => c.text),
      answer: correctIndex,
    };
  });

  const roomId = crypto.randomUUID().slice(0, 8);

  const room = {
    roomId,
    level,
    questions,
    status: "starting",
    remainingTime: 30,
    startCountdown: 3,
    questionIndex: 0,
    startTimer: null,
    timer: null,
    players: [
      {
        userId: u1,
        ws: ws1,
        score: 0,
        progress: 0,
        finished: false,
        answers: [],
        finishedAt: null,
      },
      {
        userId: u2,
        ws: ws2,
        score: 0,
        progress: 0,
        finished: false,
        answers: [],
        finishedAt: null,
      },
    ],
  };

  rooms.set(roomId, room);
  userRoom.set(u1, roomId);
  userRoom.set(u2, roomId);
  broadcast(room, "matchFound", {
    roomId,
    totalQuestions: questions.length,
  });

  broadcast(room, "matchStarting", {
    startCountdown: room.startCountdown,
  });

  // ✅ Only one countdown interval per room
  if (!room.startTimer) {
    room.startTimer = setInterval(() => {
      if (room.status !== "starting") {
        clearInterval(room.startTimer);
        room.startTimer = null;
        return;
      }

      room.startCountdown--;

      broadcast(room, "matchStarting", {
        startCountdown: room.startCountdown,
      });

      if (room.startCountdown <= 0) {
        clearInterval(room.startTimer);
        room.startTimer = null;
        startMatch(room);
      }
    }, 1000);
  }

  // IMPORTANT: DO NOT unlock here.
  // Keep matchingInProgress[level] true while countdown is running.
  return true;
}

function startMatch(room) {
  if (!room || room.status !== "starting") return;

  room.status = "playing";
  room.questionIndex = 0;
  room.remainingTime = 30;

  // ✅ Unlock matchmaking for this level now
  matchingInProgress[room.level] = false;

  // If more players are waiting, immediately try to match them
  tryMatchmake(room.level);

  broadcast(room, "matchStart", {});
  broadcast(room, "nextQuestion", {
    roomId: room.roomId,
    questionIndex: room.questionIndex,
    question: room.questions[room.questionIndex],
    totalQuestions: room.questions.length,
  });

  room.timer = setInterval(() => {
    if (room.status !== "playing") {
      clearInterval(room.timer);
      room.timer = null;
      return;
    }

    room.remainingTime--;
    broadcast(room, "tick", { remainingTime: room.remainingTime });

    if (room.remainingTime <= 0) endMatch(room.roomId);
  }, 1000);
}

async function endMatch(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.status === "ended") return;

  room.status = "ended";

  if (room.startTimer) {
    clearInterval(room.startTimer);
    room.startTimer = null;
  }
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  const scores = buildScores(room);

  broadcast(room, "quizEnd", {
    scores,
    questions: room.questions.map((q) => ({
      questionParts: q.questionParts,
      options: q.options,
      correctAnswer: q.answer,
    })),
    playerAnswers: Object.fromEntries(
      room.players.map((p) => [p.userId, p.answers])
    ),
  });

  for (const p of room.players) userRoom.delete(p.userId);

  // Unlock matchmaking for this level (in case we ended during countdown)
  matchingInProgress[room.level] = false;
  tryMatchmake(room.level);

  // --- Persist match results ---
  const players = room.players.map((p) => ({
    userId: p.userId,
    score: p.score,
    correct: p.score,
    wrong: room.questions.length - p.score,
  }));

  let winnerId = null;
  let isDraw = false;

  const maxScore = Math.max(...players.map((p) => p.score));
  const topPlayers = players.filter((p) => p.score === maxScore);

  if (topPlayers.length === 1) {
    winnerId = topPlayers[0].userId;
  } else {
    // score tie
    if (maxScore > 0) {
      // speed tiebreaker
      const [p1, p2] = topPlayers;

      if (p1.finishedAt && p2.finishedAt) {
        winnerId = p1.finishedAt < p2.finishedAt ? p1.userId : p2.userId;
      } else {
        isDraw = true;
      }
    } else {
      // both scored 0 → draw
      isDraw = true;
    }
  }

  await Match.create({
    roomId,
    mode: "multi",
    totalQuestions: room.questions.length,
    players,
    winnerId,
    isDraw,
  });

  async function updateRatings(players, winnerId, isDraw, level) {
    const K = 32;

    const userA = await User.findById(players[0].userId);
    const userB = await User.findById(players[1].userId);
    if (!userA || !userB) return;

    const Ra = userA.ranks[level].rating;
    const Rb = userB.ranks[level].rating;

    const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
    const Eb = 1 / (1 + Math.pow(10, (Ra - Rb) / 400));

    let Sa, Sb;

    if (isDraw) {
      Sa = 0.5;
      Sb = 0.5;
      userA.ranks[level].draws++;
      userB.ranks[level].draws++;
    } else if (winnerId === userA._id.toString()) {
      Sa = 1;
      Sb = 0;
      userA.ranks[level].wins++;
      userB.ranks[level].losses++;
    } else {
      Sa = 0;
      Sb = 1;
      userA.ranks[level].losses++;
      userB.ranks[level].wins++;
    }

    userA.ranks[level].rating = Math.round(Ra + K * (Sa - Ea));
    userB.ranks[level].rating = Math.round(Rb + K * (Sb - Eb));

    await userA.save();
    await userB.save();
  }

  await updateRatings(players, winnerId, isDraw, room.level);

  rooms.delete(roomId);
}
