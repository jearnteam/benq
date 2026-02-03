"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

const WS_URL = "wss://wsbenq.jearn.site/realtime";

type Question = {
  text: string;
  options: string[];
  answer: number;
};

type MatchStatus =
  | "idle"
  | "matching"
  | "starting"
  | "playing"
  | "waitingOpponent"
  | "ended";

export default function MatchClient() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const wsRef = useRef<WebSocket | null>(null);

  const [roomId, setRoomId] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<MatchStatus>("idle");
  const [answered, setAnswered] = useState(false);

  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);

  const [isPassive, setIsPassive] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "register", userId }));
      setStatus("matching");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "active") {
        setIsPassive(false);
      
        // ❗ Only queue if we are NOT already in a match
        if (!roomId) {
          wsRef.current?.send(JSON.stringify({ type: "joinQueue", userId }));
        }
      }
      

      if (data.type === "passive") {
        setIsPassive(true);
      }

      if (data.type === "matchFound") {
        setRoomId(data.roomId);
        setTotalQuestions(data.totalQuestions);
        setStartCountdown(data.startCountdown ?? 3);
        setStatus("starting");
      }

      if (data.type === "nextQuestion" && data.totalQuestions) {
        setTotalQuestions(data.totalQuestions); // optional safety
      }

      if (data.type === "matchStarting") {
        setStartCountdown(data.startCountdown);
        setStatus("starting");
      }

      if (data.type === "matchStart") {
        setStartCountdown(null);
      }

      if (data.type === "tick") {
        setRemainingTime(data.remainingTime);
      }

      if (data.type === "nextQuestion") {
        if (data.roomId) setRoomId(data.roomId);
        setQuestionIndex(data.questionIndex);
        setQuestion(data.question);
        setAnswered(false);
        setStatus("playing");
      }

      if (data.type === "waitingOpponent") {
        if (data.roomId) setRoomId(data.roomId);
        setQuestion(null);
        setStatus("waitingOpponent");
      }

      if (data.type === "scoreUpdate") {
        setScores(data.scores || {});
      }

      if (data.type === "quizEnd") {
        if (data.roomId) setRoomId(data.roomId);
        setScores(data.scores || {});
        setRemainingTime(null);
        setStartCountdown(null);
        setQuestion(null);
        setStatus("ended");
      }
    };

    return () => ws.close();
  }, [userId]);

  const sendAnswer = (idx: number) => {
    if (!wsRef.current || isPassive) return;
    if (status !== "playing" || answered) return;

    setAnswered(true);

    wsRef.current.send(
      JSON.stringify({
        type: "answer",
        roomId,
        userId,
        answerIndex: idx,
      })
    );
  };

  if (!userId) return <p>🔒 Please login first</p>;

  const opponentId = Object.keys(scores).find((id) => id !== userId);
  const myScore = scores[userId] || 0;
  const opponentScore = opponentId ? scores[opponentId] || 0 : 0;

  return (
    <div className="p-5 text-center max-w-lg mx-auto text-lg">
      <h1 className="font-bold text-2xl mb-4">Real-time Match</h1>

      {isPassive && (
        <div className="mb-4 p-3 border rounded-lg bg-yellow-50">
          ⚠ This match is active in a newer tab.
          Use the new-opened page or just reload the current page.
        </div>
      )}

      {status === "matching" && <p>⏳ Matching…</p>}

      {status === "starting" && (
        <div className="mt-6 text-4xl font-bold">{startCountdown}</div>
      )}

      {status === "playing" && (
        <>
          <p className="text-sm text-gray-400">
            Question {questionIndex + 1}/{totalQuestions}
          </p>

          {remainingTime !== null && (
            <p className="text-sm text-red-500">⏱ {remainingTime}s</p>
          )}

          <p className="mt-4 text-2xl font-bold">{question?.text}</p>

          <div className="grid gap-2 mt-4">
            {question?.options.map((opt, i) => (
              <button
                key={opt}
                disabled={answered || isPassive}
                onClick={() => sendAnswer(i)}
                className="p-3 rounded-lg bg-blue-500 text-white disabled:bg-gray-400"
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      {status === "waitingOpponent" && (
        <div className="mt-6">
          <p className="text-xl">⏳ Waiting for opponent…</p>
          <p className="text-sm mt-2">
            You: {myScore} — Opponent: {opponentScore}
          </p>
        </div>
      )}

      {status === "ended" && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold">🏁 Match Over</h2>
          <p>You: {myScore}</p>
          <p>Opponent: {opponentScore}</p>
        </div>
      )}
    </div>
  );
}
