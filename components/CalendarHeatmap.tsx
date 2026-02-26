"use client";

import { useEffect, useMemo, useState } from "react";
import {
  format,
  parseISO,
  getDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
} from "date-fns";

type HeatmapMode = "all" | "normal" | "rank";

type HeatmapDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

function currentMonthKey() {
  return format(new Date(), "yyyy-MM");
}

export default function CalendarHeatmap() {
  const [mode, setMode] = useState<HeatmapMode>("all");
  const [days, setDays] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HeatmapDay | null>(null);

  // ✅ NEVER allow empty string
  const [month, setMonth] = useState<string>(currentMonthKey);

  useEffect(() => {
    setLoading(true);

    fetch(`/api/heatmap/${mode}`)
      .then((r) => r.json())
      .then((d) => {
        setDays(Array.isArray(d.data) ? d.data : []);
        setSelected(null); // reset selected when switching
        setLoading(false);
      })
      .catch(() => {
        setDays([]);
        setLoading(false);
      });
  }, [mode]);

  /* ----------------------------------------
     Build month-only calendar
  ----------------------------------------- */

  const weeks = useMemo(() => {
    // ✅ Guard against invalid month
    if (!month) return [];

    const base = parseISO(`${month}-01`);
    if (isNaN(base.getTime())) return [];

    const start = startOfMonth(base);
    const end = endOfMonth(base);

    const monthDays = eachDayOfInterval({ start, end });

    const map = new Map<string, HeatmapDay>();
    days.forEach((d) => map.set(d.date, d));

    const result: (HeatmapDay | null)[][] = [];
    let week: (HeatmapDay | null)[] = new Array(7).fill(null);

    monthDays.forEach((date, idx) => {
      const weekday = getDay(date); // 0 = Sun
      const key = format(date, "yyyy-MM-dd");

      week[weekday] = map.get(key) ?? {
        date: key,
        count: 0,
        level: 0,
      };

      if (weekday === 6 || idx === monthDays.length - 1) {
        result.push(week);
        week = new Array(7).fill(null);
      }
    });

    return result;
  }, [month, days]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading heatmap…</div>;
  }

  const monthDate = parseISO(`${month}-01`);

  return (
    <div className="space-y-6 flex flex-col items-center text-black">
      {/* -------- Header -------- */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMonth(format(addMonths(monthDate, -1), "yyyy-MM"))}
          className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-100 transition"
        >
          ←
        </button>

        <h2 className="font-semibold text-lg min-w-40 text-center">
          {format(monthDate, "MMMM yyyy")}
        </h2>

        <button
          onClick={() => setMonth(format(addMonths(monthDate, 1), "yyyy-MM"))}
          className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-100 transition"
        >
          →
        </button>
      </div>

      {/* Month picker */}
      <input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value || currentMonthKey())}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
      />

      {/* -------- Mode Toggle -------- */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
        {(["all", "normal", "rank"] as HeatmapMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`
        px-4 py-1.5 rounded-md text-sm font-medium transition
        ${
          mode === m
            ? "bg-white shadow text-emerald-600"
            : "text-gray-500 hover:text-gray-700"
        }
      `}
          >
            {m === "all" && "All"}
            {m === "normal" && "Normal"}
            {m === "rank" && "Rank"}
          </button>
        ))}
      </div>

      {/* -------- Heatmap -------- */}
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {/* Weekday header */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="text-xs text-gray-500 text-center font-medium"
            >
              {d}
            </div>
          ))}

          {/* Calendar cells */}
          {weeks.flat().map((d, i) =>
            d ? (
              <div
                key={i}
                onClick={() => setSelected(d)}
                className={`
    w-full aspect-square
    rounded-md
    flex items-center justify-center
    text-xs font-semibold
    cursor-pointer
    transition
    ${colorByLevel(d.level)}
    ${selected?.date === d.date ? "ring-2 ring-black" : ""}
  `}
              >
                {format(parseISO(d.date), "d")}
              </div>
            ) : (
              <div key={i} className="w-full aspect-square" />
            )
          )}
        </div>
      </div>
      <div className="w-full max-w-md bg-white border rounded-lg p-4 text-sm shadow-sm">
        {!selected && (
          <>
            <div className="font-semibold mb-1">
              Select the date to show the number of attempts
            </div>
            <div className="text-gray-600">
              Attempts: <span className="font-medium">??</span>
            </div>
          </>
        )}
        {selected && (
          <>
            <div className="font-semibold mb-1">
              {format(parseISO(selected.date), "MMMM d, yyyy")}
            </div>
            <div className="text-gray-600">
              Attempts: <span className="font-medium">{selected.count}</span>
            </div>
          </>
        )}
      </div>

      {/* -------- Legend -------- */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div
            key={l}
            className={`h-4 w-4 rounded-sm ${colorByLevel(l as any)}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/* ----------------------------------------
   Color scale
----------------------------------------- */

function colorByLevel(level: 0 | 1 | 2 | 3 | 4) {
  switch (level) {
    case 0:
      return "bg-gray-100 text-gray-400";
    case 1:
      return "bg-emerald-200 text-emerald-900";
    case 2:
      return "bg-emerald-400 text-white";
    case 3:
      return "bg-emerald-600 text-white";
    case 4:
      return "bg-emerald-800 text-white";
  }
}
