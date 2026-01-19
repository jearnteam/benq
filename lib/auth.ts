// lib/auth.ts
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { connectDB } from "@/lib/db";
import UserModel from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      await connectDB();

      // googleId = user.id coming from Google
      const existing = await UserModel.findOne({ googleId: user.id });

      if (!existing) {
        await UserModel.create({
          googleId: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          lastLogin: new Date(),
        });
      } else {
        existing.lastLogin = new Date();
        await existing.save();
      }

      return true;
    },

    async session({ session, token }) {
      // token.sub is the user _id from DB by default
      if (token.sub && session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
};
