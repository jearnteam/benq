import mongoose from "mongoose";
import Match from "@/models/Match";
import { connectDB } from "@/lib/db";
import { startOfDay, endOfDay, subDays } from "date-fns";

export async function getHeatmapData(userId: string, mode: "single" | "multi") {
  await connectDB();

  const today = new Date();
  const start = subDays(today, 55);

  // Count matches per day
  const result = await Match.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        mode,
        createdAt: { $gte: startOfDay(start), $lte: endOfDay(today) },
      },
    },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id.day",
        count: 1,
      },
    },
  ]);

  return result;
}
