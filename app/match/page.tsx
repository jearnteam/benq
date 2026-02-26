import MatchClient from "@/components/MatchClient";

export default function MatchPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-5">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Real-time Match
        </h1>
        <p className="text-sm text-gray-500">
          Compete live against another player.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8">
        <MatchClient />
      </div>
    </div>
  );
}