import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "your@email.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        // Normalize email to lowercase for consistency
        const normalizedEmail = credentials.email.toLowerCase().trim();

        // Check if user exists (MUST be created by admin first)
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        // User must exist - no auto-creation
        if (!user) {
          throw new Error("User not found. Please contact your administrator to create your account.");
        }

        // User must have password set
        if (!user.password) {
          throw new Error("Password not set. Please contact administrator.");
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          throw new Error("Incorrect password");
        }

        // User must be active
        if (!user.isActive) {
          throw new Error("Your account has been deactivated");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        // CRITICAL: Verify user still exists and is active on each session
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
        });

        // If user doesn't exist or is deactivated, invalidate session
        if (!dbUser || !dbUser.isActive) {
          return null as any;
        }

        // Update session with current role (reflects any changes made by CEO)
        session.user.id = token.id as string;
        (session.user as any).role = dbUser.role;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};
