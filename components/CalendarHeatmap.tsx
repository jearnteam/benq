"use client";
import { addDays, subDays, format } from "date-fns";
import { useEffect, useState } from "react";

export default function CalendarHeatmap() {
  const [days, setDays] = useState<{ date: Date; studied: boolean }[]>([]);
  const [userName, setUserName] = useState("Guest");

  useEffect(() => {
    // MVP: consider last 56 days; fetch attempts and mark days; here we mock
    const today = new Date();
    const arr = Array.from({ length: 56 }).map((_, idx) => {
      const d = subDays(today, 55 - idx);
      // mock: every 3rd day studied
      const studied = idx % 3 === 0;
      return { date: d, studied };
    });
    setDays(arr);
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="text-sm">Name</label>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="border px-2 py-1 rounded"
        />
      </div>
      <div className="grid grid-cols-8 gap-1">
        {days.map((d, i) => (
          <div
            key={i}
            title={format(d.date, "yyyy-MM-dd")}
            className={`h-6 w-6 rounded ${
              d.studied ? "bg-green-500" : "bg-gray-200"
            }`}
          ></div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        (MVP mocks data; wire to /api/attempts later)
      </p>
    </div>
  );
}
