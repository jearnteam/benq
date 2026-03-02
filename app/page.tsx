import AuthCard from "@/components/AuthCard";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
      <main className="w-full max-w-md px-4 sm:px-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Welcome to <span className="text-emerald-600">BenQ</span>
          </h1>

          <p className="text-sm text-gray-600">
            <span>Learn consistently. Track your effort.</span><br/>
            <span>Improve every day.</span>
          </p>

          <AuthCard />
        </div>
      </main>
    </div>
  );
}
