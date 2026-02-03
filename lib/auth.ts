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

  // ✅ IMPORTANT: force JWT session
  session: {
    strategy: "jwt",
  },

  callbacks: {
    /* ----------------------------------------
     * SIGN IN (CREATE / UPDATE USER)
     * -------------------------------------- */
    async signIn({ user }) {
      if (!user.id || !user.email) return false;

      await connectDB();

      const existing = await UserModel.findOne({ googleId: user.id });

      if (!existing) {
        await UserModel.create({
          googleId: user.id,
          email: user.email,
          name: user.name ?? "",
          image: user.image ?? null,
          lastLogin: new Date(),
        });
      } else {
        existing.lastLogin = new Date();
        await existing.save();
      }

      return true;
    },

    /* ----------------------------------------
     * JWT (SERVER SINGLE SOURCE OF TRUTH)
     * -------------------------------------- */
    async jwt({ token }) {
      // token.email is stable
      if (!token.email) return token;

      await connectDB();
      const user = await UserModel.findOne({ email: token.email });

      if (!user) return token;

      // 🔐 enrich JWT
      token.uid = user._id.toString();
      
      token.googleId = user.googleId;

      return token;
    },

    /* ----------------------------------------
     * SESSION (CLIENT SAFE COPY)
     * -------------------------------------- */
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
