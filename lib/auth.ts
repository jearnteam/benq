import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
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

  session: {
    strategy: "jwt",
  },

  callbacks: {
    /* ----------------------------------------
     * SIGN IN
     * -------------------------------------- */
    async signIn({ user }) {
      if (!user.id || !user.email) return false;
    
      await connectDB();
    
      const existing = await UserModel.findOne({
        googleId: user.id,
      });
    
      if (!existing) {
        await UserModel.create({
          googleId: user.id,
          email: user.email,
          displayName: user.name ?? "",
          username: null, // ✅ important
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
     * JWT
     * -------------------------------------- */
    async jwt({ token, trigger }) {
      if (!token.email) return token;
    
      await connectDB();
    
      const dbUser = await UserModel.findOne({
        email: token.email,
      }).select("_id googleId username");
    
      if (!dbUser) return token;
    
      token.uid = dbUser._id.toString();
      token.googleId = dbUser.googleId;
      token.username = dbUser.username ?? null;
    
      return token;
    },

    /* ----------------------------------------
     * SESSION
     * -------------------------------------- */
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid as string;
        (session.user as any).username = token.username ?? null;
      }
    
      return session;
    },
  },
};
