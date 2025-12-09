import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/lib/db";
import UserModel from "@/models/User"; // ✅ Renamed import to match usage below
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { User as NextAuthUser } from "next-auth"; // ✅ renamed to avoid conflict

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }: { user: NextAuthUser }) {
      await connectDB();

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

    async session({ session, token }: { session: Session; token: JWT }) {
      if (token.sub && session.user) {
        // ✅ add id to user object at runtime
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
