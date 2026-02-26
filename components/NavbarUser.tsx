"use client";

import { useSession } from "next-auth/react";

export default function NavbarUser() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const username = (session.user as any)?.username;
  const display = username
    ? `@${username}`
    : session.user.name ?? null;

  if (!display) return null;

  return (
    <div className="hidden sm:block text-sm text-gray-700 font-medium">
      {display}
    </div>
  );
}