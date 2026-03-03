export const dynamic = "force-dynamic";

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

  // 🔥 API Route を呼び出す
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/leaderboard?level=${level}`,
    { cache: "no-store" }
  );

  const data = await res.json();
  const top = data.top;

  return (
    <div className="max-w-2xl mx-auto space-y-8 mt-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-gray-500">Top players for JLPT {level}</p>
      </div>

      <LeaderboardTabs />

      {/* Leaderboard List */}
      <div className="bg-white border border-black rounded-2xl shadow-sm divide-y text-black">
        {top.map((u: any, idx: number) => {
          const isTop3 = idx < 3;

          const topStyles = [
            "bg-gradient-to-r from-yellow-50 to-white border-l-4 border-yellow-400 rounded-t-2xl",
            "bg-gradient-to-r from-gray-50 to-white border-l-4 border-[#C4C4C4]",
            "bg-gradient-to-r from-orange-50 to-white border-l-4 border-orange-400",
          ];

          const medals = ["🥇", "🥈", "🥉"];

          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-5 py-4 ${
                isTop3 ? topStyles[idx] : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-sm font-semibold text-gray-500 w-10">
                  {isTop3 ? medals[idx] : `#${idx + 1}`}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {u.name ?? "guest"}
                  </div>
                  <div className="text-xs text-gray-500">
                    W: {u.wins} • L: {u.losses} • D: {u.draws}
                  </div>
                </div>
              </div>

              <div className="text-base font-bold text-black">{u.rating}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
