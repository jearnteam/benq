// app/api/heatmap/[mode]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHeatmapData } from "@/lib/heatmap";

// NOTE: Next.js 16 + typed routes:
// context.params is a *Promise*<{ mode: string }>
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ mode: string }> }
) {
  const { mode } = await context.params;

  if (!["single", "multi"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  const data = await getHeatmapData(userId, mode as "single" | "multi");

  return NextResponse.json({ data });
}
