import CalendarHeatmap from "@/components/CalendarHeatmap";

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-bold text-xl">Effort Calendar</h1>
      <CalendarHeatmap />
    </div>
  );
}
