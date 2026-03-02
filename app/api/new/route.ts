export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Question from "@/models/Question";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();

    const {
      type,
      level,
      questionParts,
      choices,
      explanation,
      passage = null,
      audioUrl = null,
    } = body;

    // ✅ Validate basic fields
    if (!type || !level) {
      return NextResponse.json(
        { ok: false, error: "Missing type or level" },
        { status: 400 }
      );
    }

    if (!Array.isArray(questionParts) || questionParts.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Question text required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(choices) || choices.length < 2) {
      return NextResponse.json(
        { ok: false, error: "At least 2 choices required" },
        { status: 400 }
      );
    }

    // ✅ Must have exactly 1 correct answer
    const correctCount = choices.filter((c: any) => c.correct).length;
    if (correctCount !== 1) {
      return NextResponse.json(
        { ok: false, error: "Exactly one correct answer required" },
        { status: 400 }
      );
    }

    // ✅ Ensure at least one part has underline OR blank
    const hasUnderlineOrBlank = questionParts.some(
      (p: any) => p.underline || p.blank
    );

    if (!hasUnderlineOrBlank) {
      return NextResponse.json(
        { ok: false, error: "Must include underline or blank part" },
        { status: 400 }
      );
    }

    const question = new Question({
      type,
      level,
      questionParts,
      choices,
      explanation,
      passage,
      audioUrl,
    });

    await question.validate();
    await question.save();

    return NextResponse.json({ ok: true, question });

  } catch (err: any) {
    console.error("❌ /api/questions error:", err);

    return NextResponse.json(
      { ok: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}