"use client";

import { useState } from "react";

export default function QuestionAdminPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"underline" | "blank">("underline");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const before = (formData.get("before") as string)?.trim();
    const center = (formData.get("center") as string)?.trim();
    const after = (formData.get("after") as string)?.trim();

    const questionParts = [
      before && { text: before, underline: false, blank: false },
      {
        text: mode === "blank" ? "" : center,
        underline: mode === "underline",
        blank: mode === "blank",
      },
      after && { text: after, underline: false, blank: false },
    ].filter(Boolean);

    const rawChoices = [
      formData.get("c1"),
      formData.get("c2"),
      formData.get("c3"),
      formData.get("c4"),
    ];

    const correctIndex = formData.get("correct");

    const choices = rawChoices
      .map((text, index) => ({
        text: (text as string)?.trim(),
        correct: correctIndex === String(index),
      }))
      .filter((c) => c.text);

    if (!questionParts.length) {
      setError("Question required.");
      setLoading(false);
      return;
    }

    if (choices.length < 2) {
      setError("At least 2 choices required.");
      setLoading(false);
      return;
    }

    if (choices.filter((c) => c.correct).length !== 1) {
      setError("Select exactly one correct answer.");
      setLoading(false);
      return;
    }

    const data = {
      type: formData.get("type"),
      level: formData.get("level"),
      questionParts,
      choices,
      explanation: formData.get("explanation"),
    };

    try {
      const res = await fetch("/api/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!json.ok) {
        setError(json.error);
        setLoading(false);
        return;
      }

      alert("Question added!");
      form.reset();
    } catch {
      setError("Network error.");
    }

    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">Add Question</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <select name="type" className="border p-2 w-full">
          <option value="vocabulary">Vocabulary</option>
          <option value="grammar">Grammar</option>
        </select>

        <select name="level" className="border p-2 w-full">
          <option>N5</option>
          <option>N4</option>
          <option>N3</option>
          <option>N2</option>
          <option>N1</option>
        </select>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          className="border p-2 w-full"
        >
          <option value="underline">Underline Type</option>
          <option value="blank">Blank Type</option>
        </select>

        <input
          name="before"
          placeholder="Text before"
          className="border p-2 w-full"
        />
        <input
          name="center"
          placeholder="Underline / Blank word"
          className="border p-2 w-full"
        />
        <input
          name="after"
          placeholder="Text after"
          className="border p-2 w-full"
        />

        <input
          name="c1"
          placeholder="Choice 1"
          required
          className="border p-2 w-full"
        />
        <input
          name="c2"
          placeholder="Choice 2"
          required
          className="border p-2 w-full"
        />
        <input name="c3" placeholder="Choice 3" className="border p-2 w-full" />
        <input name="c4" placeholder="Choice 4" className="border p-2 w-full" />

        <select name="correct" className="border p-2 w-full">
          <option value="0">Choice 1 correct</option>
          <option value="1">Choice 2 correct</option>
          <option value="2">Choice 3 correct</option>
          <option value="3">Choice 4 correct</option>
        </select>

        <textarea
          name="explanation"
          placeholder="Explanation"
          className="border p-2 w-full"
        />

        <button
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Saving..." : "Save Question"}
        </button>
      </form>
    </div>
  );
}
