import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attempt from "@/models/Attempt";
import User from "@/models/User";
import { todayKey } from "@/lib/utils";

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const {
    userName,
    correct,
    total,
    day = todayKey(),
  } = body as {
    userName: string;
    correct: number;
    total: number;
    day?: string;
  };

  // simplistic user find-or-create by name
  let user = await User.findOne({ name: userName });
  if (!user) user = await User.create({ name: userName });

  await Attempt.create({ userId: user._id, correct, total, day });

  // update streak
  const today = todayKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = todayKey(yesterday);

  let newStreak = user.streak || 0;
  if (day === today) {
    if (user.lastStudyDate && todayKey(user.lastStudyDate) === yKey) {
      newStreak += 1;
    } else if (!user.lastStudyDate || todayKey(user.lastStudyDate) !== today) {
      newStreak = Math.max(newStreak, 1);
    }
    user.streak = newStreak;
    user.lastStudyDate = new Date();
    await user.save();
  }

  return NextResponse.json({ ok: true, streak: user.streak });
}
