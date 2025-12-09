"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const WS_URL = "wss://ws.jearn.site";

type Question = {
  text: string;
  options: string[];
  answer: string;
};

let socket: Socket | null = null;

export default function MatchClient() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [roomId, setRoomId] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("waiting"); // waiting | countdown | playing | ended
  const [countdown, setCountdown] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    if (!userId) return;

    socket = io(WS_URL, { transports: ["websocket"] });

    socket.emit("joinQueue", { userId });

    socket.on("match", ({ roomId, players, totalQuestions }) => {
      setRoomId(roomId);
      setTotalQuestions(totalQuestions);
      setStatus("countdown");
    });

    socket.on("countdown", (t) => setCountdown(t));
    socket.on("gameStart", () => setStatus("playing"));
    socket.on("timer", (t) => setTimeLeft(t));

    socket.on("nextQuestion", ({ questionIndex, question, scores }) => {
      setQuestionIndex(questionIndex);
      setQuestion(question);
      setScores(scores);
      setStatus("playing");
    });

    socket.on("scoreUpdate", ({ scores }) => setScores(scores));

    socket.on("quizEnd", ({ scores }) => {
      setScores(scores);
      setStatus("ended");
    });

    socket.on("disconnect", () => {
      console.warn("⚠️ WS Disconnected");
    });

    return () => {
      socket?.off();
      socket?.close();
    };
  }, [userId]);

  const sendAnswer = (answer: string) => {
    if (!socket || !roomId) return;
    socket.emit("submitAnswer", {
      roomId,
      userId,
      questionIndex,
      answer,
    });
    setQuestion(null);
  };

  if (!userId) return <p>🔒 Please login first</p>;

  // Opponent score logic
  const opponentId = Object.keys(scores).find((id) => id !== userId);
  const opponentScore = opponentId ? scores[opponentId] || 0 : 0;
  const myScore = scores[userId!] || 0;

  return (
    <div className="p-5 text-center max-w-lg mx-auto text-lg">
      <h1 className="font-bold text-2xl mb-4">Real-time Match</h1>

      {status === "waiting" && <p>⏳ Matching…</p>}

      {status === "countdown" && (
        <p className="text-3xl font-bold">⏱ Starting in {countdown}s…</p>
      )}

      {status === "playing" && (
        <>
          <p className="text-sm text-gray-400">
            Time Left ⏱ {timeLeft}s — Question {questionIndex + 1}/{totalQuestions}
          </p>

          <p className="mt-4 text-2xl font-bold">{question?.text}</p>

          <div className="grid gap-2 mt-4">
            {question?.options.map((opt) => (
              <button
                key={opt}
                className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                onClick={() => sendAnswer(opt)}
              >
                {opt}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm opacity-80">
            You: {myScore} — Opponent: {opponentScore}
          </p>

          {!question && <p className="mt-4">🔄 Loading next question…</p>}
        </>
      )}

      {status === "ended" && (
        <div>
          <h2 className="text-2xl font-bold mt-4">🏁 Match Over!</h2>

          <div className="mt-3 space-y-1 text-lg">
            <p>✨ <strong>You</strong>: {myScore} points</p>
            <p>👤 Opponent: {opponentScore} points</p>
          </div>

          <p className="mt-4 font-bold">
            {myScore > opponentScore
              ? "🎉 You Win!"
              : myScore < opponentScore
              ? "😢 You Lose!"
              : "🤝 Draw!"}
          </p>

          <button
            onClick={() => location.reload()}
            className="mt-6 p-3 bg-green-600 text-white rounded-lg"
          >
            🔁 Play Again
          </button>
        </div>
      )}
    </div>
  );
}
