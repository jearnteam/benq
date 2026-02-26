import CalendarHeatmap from "@/components/CalendarHeatmap";

export default function CalendarPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 mt-5">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Effort Calendar
        </h1>
        <p className="text-sm text-gray-500">
          Track your daily quiz activity.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8">
        <CalendarHeatmap />
      </div>
    </div>
  );
}