"use client";
import { useEffect, useState } from "react";

export default function QuizPage() {
  const [qs, setQs] = useState<any[]>([]);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [userName, setUserName] = useState("Guest");
  const q = qs[i];

  useEffect(() => {
    fetch("/api/questions")
      .then((r) => r.json())
      .then((d) => setQs(d.questions));
  }, []);

  function pick(k: string) {
    if (!q) return;
    if (k === q.answer) setCorrect((c) => c + 1);
    if (i + 1 < qs.length) setI(i + 1);
    else submit();
  }

  async function submit() {
    await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, correct, total: qs.length }),
    });
    alert(`Finished! Score: ${correct}/${qs.length}`);
  }

  if (!q) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm">hello</label>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="border px-2 py-1 rounded"
        />
      </div>
      <div className="p-4 border rounded bg-white">
        <div className="text-sm text-gray-500">
          Question {i + 1} / {qs.length}
        </div>
        <div className="font-semibold mt-1">{q.q}</div>
        <div className="grid sm:grid-cols-2 gap-2 mt-4">
          {q.options.map((o: any) => (
            <button
              key={o.k}
              onClick={() => pick(o.k)}
              className="border rounded px-3 py-2 text-left hover:bg-gray-50"
            >
              <span className="font-bold mr-2">{o.k}.</span>
              {o.v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
