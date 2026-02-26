export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/db";
import User from "@/models/User";
import LeaderboardTabs from "@/components/LeaderboardTabs";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
type Level = (typeof LEVELS)[number];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const params = await searchParams;

  const level: Level = LEVELS.includes(params?.level as Level)
    ? (params.level as Level)
    : "N5";

  await connectDB();

  const top = await User.find()
    .sort({ [`ranks.${level}.rating`]: -1 })
    .limit(50)
    .lean();

  return (
    <div className="max-w-2xl space-y-8 mt-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-gray-500">Top players for JLPT {level}</p>
      </div>

      {/* Tabs */}
      <LeaderboardTabs />

      {/* Leaderboard List */}
      <div className="bg-white border border-black rounded-2xl shadow-sm divide-y text-black">
        {top.map((u: any, idx: number) => {
          const rankData = u.ranks?.[level] ?? {
            rating: 0,
            wins: 0,
            losses: 0,
            draws: 0,
          };

          const isTop3 = idx < 3;

          const topStyles = [
            "bg-gradient-to-r from-yellow-50 to-white border-l-4 border-yellow-400 rounded-t-2xl", // 🥇
            "bg-gradient-to-r from-gray-50 to-white border-l-4 border-[#C4C4C4]", // 🥈
            "bg-gradient-to-r from-orange-50 to-white border-l-4 border-orange-400", // 🥉
          ];

          const medals = ["🥇", "🥈", "🥉"];

          return (
            <div
              key={u._id.toString()}
              className={`flex items-center justify-between px-5 py-4 transition ${
                isTop3 ? topStyles[idx] : ""
              }`}
            >
              {/* Left */}
              <div className="flex items-center gap-4">
                <div className="text-sm font-semibold text-gray-500 w-10">
                  {isTop3 ? medals[idx] : `#${idx + 1}`}
                </div>

                <div>
                  <div
                    className={`text-sm font-semibold ${
                      isTop3 ? "text-gray-800" : "text-gray-700"
                    }`}
                  >
                    {u.username ?? "guest"}
                  </div>
                  <div className="text-xs text-gray-500">
                    W: {rankData.wins} • L: {rankData.losses} • D:{" "}
                    {rankData.draws}
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div
                className={`text-base font-bold ${
                  idx === 0
                    ? "text-yellow-600"
                    : idx === 1
                    ? "text-[#C4C4C4]"
                    : idx === 2
                    ? "text-orange-500"
                    : "text-black"
                }`}
              >
                {rankData.rating}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
