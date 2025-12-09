async function getTop() {
  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_VERCEL_URL
        ? "https://" + process.env.NEXT_PUBLIC_VERCEL_URL
        : ""
    }/api/leaderboard`,
    { cache: "no-store" }
  );
  return res.json();
}

export default async function LeaderboardPage() {
  const data = await getTop();
  return (
    <div className="space-y-4">
      <h1 className="font-bold text-xl">Leaderboard</h1>
      <ul className="space-y-2">
        {data.top?.map((u: any, idx: number) => (
          <li
            key={u.name}
            className="flex items-center justify-between border rounded px-3 py-2 bg-white"
          >
            <span className="text-sm">
              #{idx + 1} {u.name}
            </span>
            <span className="text-xs text-gray-500">Streak: {u.streak}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
