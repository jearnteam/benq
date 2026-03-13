"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Trophy,
  Skull,
  Handshake,
  TrendingUp,
  TrendingDown,
  LoaderCircle,
} from "lucide-react";

const WS_URL = "wss://wsbenq.jearn.site/realtime";

type QuestionPart = {
  text: string;
  underline: boolean;
  blank: boolean;
};

type Question = {
  questionParts: QuestionPart[];
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
  const [level, setLevel] = useState<"N5" | "N4" | "N3" | "N2" | "N1">("N5");
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  type EndQuestion = {
    questionParts: QuestionPart[];
    options: string[];
    correctAnswer: number;
  };

  const [endQuestions, setEndQuestions] = useState<EndQuestion[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [endAnswers, setEndAnswers] = useState<Record<string, number[]>>({});
  const [rankSaved, setRankSaved] = useState(false);
  const [ratingChanges, setRatingChanges] = useState<Record<string, number>>(
    {}
  );
  const [myAnswers, setMyAnswers] = useState<number[]>([]);
  const [opponentAnswers, setOpponentAnswers] = useState<number[]>([]);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<MatchStatus>("idle");
  const [answered, setAnswered] = useState(false);

  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);

  const [isPassive, setIsPassive] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (wsRef.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "register", userId }));
      setStatus("idle");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "active") {
        setIsPassive(false);
      }

      if (data.type === "passive") {
        setIsPassive(true);
      }

      if (data.type === "matchFound") {
        setRoomId(data.roomId);
        setTotalQuestions(data.totalQuestions);
        setStartCountdown(null);
        setStatus("starting");
        setRankSaved(false);
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

      if (data.type === "answerReveal") {
        setOpponentAnswers((prev) => {
          const next = [...prev];
          next[data.questionIndex] = data.answerIndex;
          return next;
        });
      }

      if (data.type === "quizEnd") {
        setScores(data.scores || {});
        setWinnerId(data.winnerId ?? null);
        setIsDraw(data.isDraw ?? false);
        setRatingChanges(data.ratingChanges || {});

        setRemainingTime(null);
        setStartCountdown(null);
        setQuestion(null);

        setEndQuestions(data.questions || []);
        setEndAnswers(data.playerAnswers || {});

        setStatus("ended");

        // Save rank attempt safely
        if (!rankSaved && userId) {
          const finalScore = data.scores?.[userId] ?? 0;
          const total = data.questions?.length ?? totalQuestions;

          fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              correct: finalScore,
              total,
              mode: "rank",
            }),
          }).catch(() => {});

          setRankSaved(true);
        }

        wsRef.current?.send(
          JSON.stringify({
            type: "leaveRoom",
            roomId,
            userId,
          })
        );

        setRoomId("");
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [userId]);

  useEffect(() => {
    const handleUnload = () => {
      if (status === "matching" && wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "leaveQueue",
            userId,
          })
        );
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [status, userId]);

  const sendAnswer = (idx: number) => {
    if (!wsRef.current || isPassive) return;
    if (status !== "playing" || answered) return;

    setAnswered(true);

    setMyAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = idx;
      return next;
    });

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
  const myRatingDelta = ratingChanges[userId] ?? 0;

  const result = isDraw ? "draw" : winnerId === userId ? "win" : "lose";

  return (
    <div className="max-w-xl mx-auto space-y-6 text-black">
      {/* Passive warning */}
      {isPassive && (
        <div className="p-4 border border-yellow-300 bg-yellow-50 text-sm">
          ⚠ This match is active in another tab.
        </div>
      )}

      {/* Idle */}
      {status === "idle" && (
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </select>

          <button
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium transition"
            onClick={() => {
              // 🔥 FULL RESET
              setQuestion(null);
              setQuestionIndex(0);
              setTotalQuestions(0);
              setScores({});
              setMyAnswers([]);
              setOpponentAnswers([]);
              setEndQuestions([]);
              setEndAnswers({});
              setAnswered(false);
              setRemainingTime(null);
              setStartCountdown(null);
              setRoomId("");

              setStatus("matching");

              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: "joinQueue",
                    userId,
                    level,
                  })
                );
              }
            }}
          >
            Start Match
          </button>
        </div>
      )}

      {/* Matching */}
      {status === "matching" && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <LoaderCircle className="animate-spin" size={20} />
            <span>Finding opponent...</span>
          </div>

          <button
            onClick={() => {
              wsRef.current?.send(
                JSON.stringify({
                  type: "leaveQueue",
                  userId,
                })
              );
              setStatus("idle");
            }}
            className="px-4 py-2 border rounded-md hover:bg-gray-100 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Countdown */}
      {status === "starting" && startCountdown !== null && (
        <div className="text-center text-5xl font-bold text-emerald-600">
          {startCountdown}
        </div>
      )}

      {/* Playing */}
      {status === "playing" && (
        <div className="space-y-6">
          {/* Scoreboard */}
          <div className="flex justify-between items-center bg-gray-50 border rounded-lg px-4 py-3 text-sm">
            <span className="font-medium">
              You: <span className="text-emerald-600">{myScore}</span>
            </span>
            <span>
              Opponent: <span className="text-blue-600">{opponentScore}</span>
            </span>
          </div>

          {/* Top bar */}
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>
              Question {questionIndex + 1} / {totalQuestions}
            </span>

            {remainingTime !== null && (
              <span className="font-semibold text-red-500">
                ⏱ {remainingTime}s
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all"
              style={{
                width: `${(questionIndex / totalQuestions) * 100}%`,
              }}
            />
          </div>

          {/* Question */}
          <div className="text-xl font-semibold text-center">
            {question?.questionParts.map((part, idx) => {
              if (part.blank) {
                return (
                  <span
                    key={idx}
                    className="inline-block border-b-2 border-black mx-1 w-16"
                  >
                    &nbsp;
                  </span>
                );
              }

              if (part.underline) {
                return (
                  <span key={idx} className="underline">
                    {part.text}
                  </span>
                );
              }

              return <span key={idx}>{part.text}</span>;
            })}
          </div>

          {/* Options */}
          <div className="grid gap-3">
            {question?.options.map((opt, i) => (
              <button
                key={opt}
                disabled={answered || isPassive}
                onClick={() => sendAnswer(i)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 transition disabled:opacity-50 font-medium"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Waiting */}
      {status === "waitingOpponent" && (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <LoaderCircle className="animate-spin" size={20} />
            <span>Waiting for opponent...</span>
          </div>
          <div className="text-sm text-gray-600">
            You: {myScore} — Opponent: {opponentScore}
          </div>
        </div>
      )}

      {/* Ended */}
      {status === "ended" && (
        <div className="space-y-6">
          <div className="rounded-xl border p-6 text-center space-y-4 bg-white">
            {result === "win" && (
              <>
                <Trophy className="mx-auto text-yellow-500" size={48} />
                <div className="text-3xl font-bold text-yellow-600">
                  VICTORY
                </div>
              </>
            )}

            {result === "lose" && (
              <>
                <Skull className="mx-auto text-red-500" size={48} />
                <div className="text-3xl font-bold text-red-600">DEFEAT</div>
              </>
            )}

            {result === "draw" && (
              <>
                <Handshake className="mx-auto text-gray-500" size={48} />
                <div className="text-3xl font-bold text-gray-600">DRAW</div>
              </>
            )}

            {/* rating change */}
            <div className="flex items-center justify-center gap-2 text-lg font-semibold">
              {myRatingDelta >= 0 ? (
                <>
                  <TrendingUp className="text-emerald-600" size={20} />
                  <span className="text-emerald-600">
                    +{myRatingDelta} rating
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="text-red-500" size={20} />
                  <span className="text-red-500">{myRatingDelta} rating</span>
                </>
              )}
            </div>

            {/* final score */}
            <div className="text-lg font-medium text-gray-700">
              You {myScore} - {opponentScore} Opponent
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setStatus("idle");
                setLevel("N5");
              }}
              className="px-5 py-2 border rounded-md hover:bg-gray-100"
            >
              Change Level
            </button>

            <button
              onClick={() => {
                // cancel previous queue first
                wsRef.current?.send(
                  JSON.stringify({
                    type: "leaveQueue",
                    userId,
                  })
                );

                // then join new queue
                wsRef.current?.send(
                  JSON.stringify({
                    type: "joinQueue",
                    userId,
                    level,
                  })
                );

                setStatus("matching");
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
            >
              Match Again
            </button>
          </div>

          {/* Answer review */}
          <div className="space-y-4">
            {endQuestions.map((q, idx) => {
              const myAns = endAnswers[userId]?.[idx];
              const opponentId = Object.keys(endAnswers).find(
                (id) => id !== userId
              );
              const oppAns = opponentId
                ? endAnswers[opponentId]?.[idx]
                : undefined;

              return (
                <div
                  key={idx}
                  className="border rounded-xl p-4 bg-white space-y-3"
                >
                  <div className="font-semibold">
                    Q{idx + 1}.{" "}
                    {q.questionParts.map((part, pIdx) => {
                      if (part.blank) {
                        return (
                          <span
                            key={pIdx}
                            className="inline-block border-b-2 border-black mx-1 w-16"
                          >
                            &nbsp;
                          </span>
                        );
                      }

                      if (part.underline) {
                        return (
                          <span key={pIdx} className="underline">
                            {part.text}
                          </span>
                        );
                      }

                      return <span key={pIdx}>{part.text}</span>;
                    })}
                  </div>

                  <div className="space-y-2 text-sm">
                    {q.options.map((opt, i) => {
                      const isCorrect = i === q.correctAnswer;
                      const isMine = i === myAns;
                      const isOpp = i === oppAns;

                      return (
                        <div
                          key={i}
                          className={`px-3 py-2 rounded-md border
                  ${
                    isCorrect
                      ? "bg-emerald-50 border-emerald-300"
                      : isMine
                      ? "bg-red-50 border-red-300"
                      : "bg-gray-50"
                  }
                `}
                        >
                          <div className="flex justify-between">
                            <span>{opt}</span>

                            <div className="flex gap-2 text-xs">
                              {isMine && (
                                <span className="text-blue-600">You</span>
                              )}
                              {isOpp && (
                                <span className="text-purple-600">
                                  Opponent
                                </span>
                              )}
                              {isCorrect && (
                                <span className="text-emerald-600">
                                  ✓ Correct
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setStatus("idle");
                setLevel("N5");
              }}
              className="px-5 py-2 border rounded-md hover:bg-gray-100"
            >
              Change Level
            </button>

            <button
              onClick={() => {
                setStatus("matching");
                wsRef.current?.send(
                  JSON.stringify({
                    type: "joinQueue",
                    userId,
                    level,
                  })
                );
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
            >
              Match Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
