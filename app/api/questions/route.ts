import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Question from "@/models/Question";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level");
    const limit = Number(searchParams.get("limit") || 10);

    if (!level) {
      return NextResponse.json(
        { ok: false, error: "Level is required" },
        { status: 400 }
      );
    }

    // 🔥 Random 10 questions from that level
    const questions = await Question.aggregate([
      { $match: { level } },
      { $sample: { size: limit } },
    ]);

    // Shape for frontend
    const formatted = questions.map((q) => ({
      id: q._id.toString(),
      q: q.text,
      options: q.options.map((v: string, i: number) => ({
        k: String.fromCharCode(65 + i), // A B C D
        v,
      })),
      answer: String.fromCharCode(65 + q.answer),
    }));

    return NextResponse.json({ questions: formatted });
  } catch (err) {
    console.error("❌ /api/questions error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
