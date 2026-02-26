import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  await connectDB();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid user id" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const rawName = body.userName;

  /* ─────────────────────────────
   * FETCH / ENSURE USERNAME
   * ───────────────────────────── */
  if (rawName === undefined) {
    const user = await User.findById(userId).select("username");
  
    return NextResponse.json({
      ok: true,
      user: { name: user?.username ?? null },
    });
  }

  /* ─────────────────────────────
   * UPDATE USERNAME
   * ───────────────────────────── */
  const name = String(rawName).trim().toLowerCase();

  if (!/^[a-z0-9_]{3,20}$/.test(name)) {
    return NextResponse.json(
      { ok: false, error: "Invalid username format" },
      { status: 400 }
    );
  }

  const exists = await User.exists({
    username: name,
    _id: { $ne: userId },
  });

  if (exists) {
    return NextResponse.json(
      { ok: false, error: "Name already taken" },
      { status: 409 }
    );
  }

  // 🔥 ATOMIC WRITE (this WILL persist)
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { username: name } },
    { new: true }
  );

  if (!updatedUser) {
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    user: { name: updatedUser.username },
  });
}
