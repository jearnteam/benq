"use client";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";

type Level = "N5" | "N4" | "N3" | "N2" | "N1";

type QuestionPart = {
  text: string;
  underline: boolean;
  blank: boolean;
};

type Question = {
  id: string;
  questionParts: QuestionPart[];
  options: { k: string; v: string }[];
  answer: string;
};

export default function QuizPage() {
  // level / flow
  const [level, setLevel] = useState<Level | null>(null);
  const [finished, setFinished] = useState(false);

  // quiz data
  const [qs, setQs] = useState<Question[]>([]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [correct, setCorrect] = useState(0);

  const [submitted, setSubmitted] = useState(false);

  const q = qs[i];

  // fetch questions when level changes
  useEffect(() => {
    if (!level) return;

    fetch(`/api/questions?level=${level}&limit=10`)
      .then((r) => r.json())
      .then((d) => {
        setQs(d.questions);
        setI(0);
        setAnswers([]);
        setCorrect(0);
        setFinished(false);
      });
  }, [level]);

  function pick(k: string) {
    if (!q || finished) return;

    setAnswers((prev) => {
      const next = [...prev];
      next[i] = k;
      return next;
    });

    if (k === q.answer) setCorrect((c) => c + 1);

    if (i + 1 < qs.length) {
      setI(i + 1);
    } else {
      setFinished(true);
    }
  }

  async function submitAttempt() {
    if (submitted) return;

    try {
      await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correct,
          total: qs.length,
          mode: "normal",
        }),
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit attempt", err);
    }
  }
  useEffect(() => {
    if (finished && qs.length > 0 && !submitted) {
      submitAttempt();
    }
  }, [finished]);

  function resetQuiz() {
    setI(0);
    setAnswers([]);
    setCorrect(0);
    setFinished(false);
    setSubmitted(false);
  }

  function backToLevels() {
    setLevel(null);
    setQs([]);
    setFinished(false);
    setSubmitted(false);
  }

  // ==========================
  // UI
  // ==========================

  // Level selection
  if (!level) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 mt-5">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Choose JLPT Level</h1>
          <p className="text-sm text-gray-500">
            Select your level to start the quiz.
          </p>
        </div>

        <div className="grid grid-cols-1 mx-10 sm:grid-cols-5 gap-4 text-black">
          {(["N5", "N4", "N3", "N2", "N1"] as Level[]).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className="py-3 rounded-lg border border-gray-300 bg-white font-semibold hover:bg-gray-100 transition"
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Loading
  if (qs.length === 0) {
    return <div>Loading questions...</div>;
  }

  // Quiz in progress
  if (!finished && q) {
    const progress = (i / qs.length) * 100;

    return (
      <div className="max-w-2xl mx-auto space-y-6 mt-10">
        <div className="space-y-2 mx-5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Level {level}</span>
            <span>
              Question {i} / {qs.length}
            </span>
          </div>

          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-lg font-semibold text-black">
            {q.questionParts.map((part, idx) => {
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

          <div className="grid sm:grid-cols-2 gap-3">
            {q.options.map((o) => (
              <button
                key={o.k}
                onClick={() => pick(o.k)}
                className="border text-black border-gray-300 rounded-md px-4 py-3 text-left hover:bg-gray-100 transition"
              >
                <span className="font-semibold mr-">{o.k}.</span>
                {o.v}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Result + Review
  return (
    <div className="max-w-2xl mx-auto space-y-8 mt-10 text-black">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-2">
        <div className="text-xl font-semibold">Finished — Level {level}</div>
        <div className="text-sm text-gray-600">
          Score:{" "}
          <span className="font-bold text-emerald-700">
            {correct} / {qs.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={resetQuiz}
          className="flex-1 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
        >
          Retry level
        </button>

        <button
          onClick={backToLevels}
          className="flex-1 py-2 rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 transition"
        >
          Change level
        </button>
      </div>

      <div className="space-y-2">
        {qs.map((q, idx) => {
          const ua = answers[idx];

          return (
            <div
              key={q.id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3"
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
                {q.options.map((o) => {
                  const isCorrect = o.k === q.answer;
                  const isUser = o.k === ua;

                  return (
                    <div
                      key={o.k}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md
                        ${
                          isCorrect
                            ? "bg-emerald-100 text-emerald-800"
                            : isUser
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-50"
                        }`}
                    >
                      <span className="font-semibold">{o.k}.</span>
                      <span>{o.v}</span>

                      {isCorrect && <span className="ml-auto"><Check/></span>}
                      {!isCorrect && isUser && (
                        <span className="ml-auto"><X/></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <button
          onClick={resetQuiz}
          className="flex-1 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
        >
          Retry level
        </button>

        <button
          onClick={backToLevels}
          className="flex-1 py-2 rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 transition"
        >
          Change level
        </button>
      </div>
    </div>
  );
}
