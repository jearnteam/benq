import { NextResponse } from "next/server";

export async function GET() {
  // For MVP: serve static 20 questions. Replace with DB later.
  const questions = Array.from({ length: 20 }).map((_, i) => ({
    id: i + 1,
    q: `Q${i + 1}: What is ${i}+${i}?`,
    options: [
      { k: "A", v: `${i}` },
      { k: "B", v: `${i + i}` },
      { k: "C", v: `${i * 2 + 1}` },
      { k: "D", v: `${i - 1}` },
    ],
    answer: "B",
  }));
  return NextResponse.json({ questions });
}
