import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
type Level = (typeof LEVELS)[number];

// レベルが有効かどうかを判定する型ガード関数
function isLevel(value: string | null): value is Level {
  return LEVELS.includes(value as Level);
}

// GET /api/leaderboard?level=N5
export async function GET(req: NextRequest) {
  const levelParam = req.nextUrl.searchParams.get("level");

  // 不正な値が来た場合はN5をデフォルトとする
  const level: Level = isLevel(levelParam) ? levelParam : "N5";

  // MongoDBへ接続
  await connectDB();

  // 指定レベルのratingを降順で取得
  const users = await User.find()
    .sort({ [`ranks.${level}.rating`]: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    level,
    top: users.map((u: any) => ({
      name: u.username,
      rating: u.ranks?.[level]?.rating ?? 0,
      wins: u.ranks?.[level]?.wins ?? 0,
      losses: u.ranks?.[level]?.losses ?? 0,
      draws: u.ranks?.[level]?.draws ?? 0,
    })),
  });
}