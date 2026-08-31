import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.active) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.active = true;
      } else if (token.id) {
        // Re-check the DB on every session lookup so a deactivated/role-changed
        // user is booted out without waiting for the JWT to expire.
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        token.active = Boolean(dbUser && dbUser.active);
        if (dbUser?.active) {
          token.role = dbUser.role;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.active) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER";
      } else {
        // Deactivated or otherwise invalid token: strip the user so callers
        // treat this the same as "not signed in".
        session.user = undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
