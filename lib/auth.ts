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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.email = user.email;
        token.name = user.name;
        token.isActive = true;
        token.lastChecked = Date.now();
      }
      
      // Refresh user data on token update (every 5 minutes) - catch errors gracefully
      if (trigger === 'update' || (token.lastChecked && typeof token.lastChecked === 'number' && Date.now() - token.lastChecked > 5 * 60 * 1000)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
          });
          
          if (!dbUser || !dbUser.isActive) {
            // User not found or inactive - return current token instead of null
            console.log('User not found or inactive, keeping current session');
            return token;
          }
          
          token.role = dbUser.role;
          token.isActive = dbUser.isActive;
          token.lastChecked = Date.now();
        } catch (error) {
          console.error('JWT callback error:', error);
          // Return current token instead of failing
          return token;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      try {
        if (session.user && token.id) {
          // Use cached data from token instead of DB query
          (session.user as any).id = token.id as string;
          (session.user as any).role = token.role;
          (session.user as any).name = token.name;
          (session.user as any).email = token.email;
        }
      } catch (error) {
        console.error('Session callback error:', error);
        // Return session even if there's an error
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
};
