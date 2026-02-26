// app/api/attempts/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Attempt from "@/models/Attempt";
import User from "@/models/User";
import { todayKey } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    // ✅ Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // ✅ Body
    const {
      correct,
      total,
      mode = "normal",
      day = todayKey(),
    } = (await req.json()) as {
      correct: number;
      total: number;
      mode?: "normal" | "rank";
      day?: string;
    };

    // ✅ Validation
    if (
      typeof correct !== "number" ||
      typeof total !== "number" ||
      correct < 0 ||
      total <= 0 ||
      correct > total
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid score data" },
        { status: 400 }
      );
    }

    if (!["normal", "rank"].includes(mode)) {
      return NextResponse.json(
        { ok: false, error: "Invalid mode" },
        { status: 400 }
      );
    }

    // ✅ Save attempt (THIS is what heatmap uses)
    await Attempt.create({
      userId: session.user.id,
      correct,
      total,
      day,
      mode,
    });

    // ✅ Streak logic
    const user = await User.findById(session.user.id);
    if (user) {
      const today = todayKey();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = todayKey(yesterday);

      let newStreak = user.streak ?? 0;

      if (day === today) {
        if (user.lastStudyDate && todayKey(user.lastStudyDate) === yKey) {
          newStreak += 1;
        } else if (
          !user.lastStudyDate ||
          todayKey(user.lastStudyDate) !== today
        ) {
          newStreak = Math.max(newStreak, 1);
        }

        user.streak = newStreak;
        user.lastStudyDate = new Date();
        await user.save();
      }
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (err) {
    console.error("❌ /api/attempts error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
