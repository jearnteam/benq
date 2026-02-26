"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Status = "idle" | "saving" | "saved" | "error";

export default function AuthCard() {
  const { data: session, status, update } = useSession();
  const [username, setUsername] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  /* ----------------------------------------
     Init username from session OR API
  ----------------------------------------- */
  useEffect(() => {
    if (!session || loaded) return;

    const sessionUsername = (session.user as any)?.username;

    // ✅ If session already has username, use it
    if (sessionUsername) {
      setUsername(sessionUsername);
      setLoaded(true);
      return;
    }

    // ❌ Only call API if username missing
    fetch("/api/user/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.name) {
          setUsername(d.user.name);
          setLoaded(true);
        }
      })
      .catch(() => {});
  }, [session, loaded]);

  if (status === "loading") {
    return <div className="text-sm text-gray-500">Loading…</div>;
  }

  /* ----------------------------------------
     Logged out
  ----------------------------------------- */
  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium"
      >
        Sign in with Google
      </button>
    );
  }

  /* ----------------------------------------
     Save username
  ----------------------------------------- */
  async function saveUsername() {
    const value = username.trim().toLowerCase();
    if (!value) return;

    setState("saving");
    setError(null);

    const res = await fetch("/api/user/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName: value }),
    });

    const data = await res.json();

    if (!res.ok) {
      setState("error");
      setError(data?.error ?? "Name already taken");
      return;
    }

    setUsername(data.user.name);

    // ✅ refresh session correctly
    await update();

    setState("saved");
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <div className="space-y-4 text-left">
      {/* Profile */}
      <div className="flex items-center gap-3">
        <img
          src={session.user?.image ?? ""}
          alt="avatar"
          className="w-10 h-10 rounded-full"
        />
        <div>
          <div className="font-medium text-gray-800">{session.user?.name}</div>
          <div className="text-xs text-gray-500">Google account</div>
        </div>
      </div>

      {/* Username */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500">BenQ username (unique)</label>

        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setState("idle");
              setError(null);
            }}
            className="flex-1 bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm lowercase focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            placeholder="guest1234"
          />

          <button
            onClick={saveUsername}
            disabled={state === "saving"}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {state === "saving" ? "Saving…" : "Save"}
          </button>
        </div>

        {state === "saved" && (
          <div className="text-xs text-emerald-600">✓ Username updated</div>
        )}

        {state === "error" && error && (
          <div className="text-xs text-red-600">{error}</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href="/calendar"
          className="flex-1 text-center bg-white border border-gray-300 rounded-md py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 transition"
        >
          View Calendar
        </a>

        <button
          onClick={() => signOut()}
          className="px-3 py-2 rounded text-sm text-red-600 hover:bg-red-50"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
