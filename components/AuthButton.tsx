"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className="flex gap-2 items-center">
        <img
          src={session.user?.image ?? ""}
          alt="avatar"
          className="w-8 h-8 rounded-full"
        />
        <span>{session.user?.name}</span>
        <button
          onClick={() => signOut()}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="bg-blue-600 text-white px-3 py-1 rounded"
    >
      Sign in with Google
    </button>
  );
}
