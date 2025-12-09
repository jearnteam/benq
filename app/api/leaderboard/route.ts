import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  await connectDB();
  const top = await User.find()
    .sort({ streak: -1, createdAt: 1 })
    .limit(50)
    .lean();
  return NextResponse.json({
    top: top.map((u) => ({ name: u.name, streak: u.streak })),
  });
}
