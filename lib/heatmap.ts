// lib/heatmap.ts
import { Types } from "mongoose";
import Attempt from "@/models/Attempt";
import { addDays, formatISO, parseISO } from "date-fns";

export type HeatmapMode = "all" | "normal" | "rank";

export type HeatmapItem = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export async function getHeatmapData(
  userId: string,
  mode: HeatmapMode
): Promise<HeatmapItem[]> {
  const uid = new Types.ObjectId(userId);
  return getAttemptsHeatmap(uid, mode);
}

/* ----------------------------------------
   Attempts heatmap (normal/rank/all)
----------------------------------------- */

async function getAttemptsHeatmap(
  userId: Types.ObjectId,
  mode: HeatmapMode
): Promise<HeatmapItem[]> {
  const match: any = { userId };
  if (mode !== "all") {
    match.mode = mode; // only filter when normal or rank
  }

  const rows = await Attempt.aggregate<{ _id: string; count: number }>([
    { $match: match },
    {
      $group: {
        _id: "$day", // "YYYY-MM-DD"
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  if (rows.length === 0) return [];

  const start = parseISO(rows[0]._id);
  const end = new Date(); // today

  const map = new Map<string, number>();
  rows.forEach((r) => map.set(r._id, r.count));

  const days: HeatmapItem[] = [];

  for (let d = start; d <= end; d = addDays(d, 1)) {
    const key = formatISO(d, { representation: "date" });
    const count = map.get(key) ?? 0;

    days.push({
      date: key,
      count,
      level: levelFromCount(count),
    });
  }

  return days;
}

/* ----------------------------------------
   Level mapping
----------------------------------------- */

function levelFromCount(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}