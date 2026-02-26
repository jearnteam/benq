"use client";

import { useRouter, useSearchParams } from "next/navigation";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"];

export default function LeaderboardTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("level") || "N5";

  return (
    <div className="flex justify-center gap-2 text-black">
      {LEVELS.map((lvl) => (
        <button
          key={lvl}
          onClick={() => router.push(`/leaderboard?level=${lvl}`)}
          className={`px-3 py-1 rounded border text-sm ${
            lvl === current
              ? "bg-black text-white"
              : "bg-white hover:bg-gray-100"
          }`}
        >
          {lvl}
        </button>
      ))}
    </div>
  );
}