// app/api/heatmap/[mode]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getHeatmapData, type HeatmapMode } from "@/lib/heatmap";

/**
 * GET /api/heatmap/[mode]
 * mode = "normal" | "rank" | "all"
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ mode: string }> }
) {
  try {
    // ✅ REQUIRED: params is a Promise in App Router
    const { mode } = await context.params;

    if (!["normal", "rank", "all"].includes(mode)) {
      return NextResponse.json(
        { ok: false, error: "Invalid mode", received: mode },
        { status: 400 }
      );
    }
    
    const safeMode = mode as HeatmapMode;

    // ✅ Session (NextAuth)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ DB
    await connectDB();

    // ✅ Fetch heatmap data
    const data = await getHeatmapData(
      session.user.id as string,
      safeMode
    );

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (err) {
    console.error("❌ /api/heatmap/[mode] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
