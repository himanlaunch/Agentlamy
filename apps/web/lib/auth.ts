import Credentials from "next-auth/providers/credentials";
import Nodemailer from "next-auth/providers/nodemailer";
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "./db";
import { hasDatabaseConfig, hasEmailConfig, env } from "./env";
import { accounts, sessions, users, verificationTokens } from "./schema";

const providers = hasEmailConfig()
  ? [
      Nodemailer({
        server: {
          host: env.EMAIL_SERVER_HOST,
          port: Number(env.EMAIL_SERVER_PORT),
          auth: {
            user: env.EMAIL_SERVER_USER,
            pass: env.EMAIL_SERVER_PASSWORD,
          },
        },
        from: env.EMAIL_FROM,
      }),
    ]
  : [
      Credentials({
        name: "Demo Login",
        credentials: {
          email: { label: "Email", type: "email" },
        },
        async authorize(credentials) {
          const email =
            typeof credentials?.email === "string" && credentials.email.length > 0
              ? credentials.email
              : "demo@local.aeo";
          return {
            id: `demo:${email}`,
            email,
            name: email.split("@")[0],
          };
        },
      }),
    ];

const adapter = hasDatabaseConfig()
  ? DrizzleAdapter(getDb(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    })
  : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  secret: env.AUTH_SECRET,
  session: {
    strategy: adapter ? "database" : "jwt",
  },
  providers,
  pages: {
    signIn: "/",
  },
  callbacks: {
    session({ session, user, token }) {
      if (session.user) {
        session.user.id = (user?.id as string) || (token.sub as string);
      }
      return session;
    },
  },
});
