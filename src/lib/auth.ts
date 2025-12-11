import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// スコープの定義
export const SCOPES = {
  PUBLIC: "read:user user:email",
  PRIVATE: "read:user user:email repo",
} as const;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      // デフォルトはPublicスコープ
      authorization: {
        params: {
          scope: SCOPES.PUBLIC,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // 初回ログイン時にアクセストークン、スコープ、ユーザー名を保存
      if (account) {
        token.accessToken = account.access_token;
        token.scope = account.scope;
      }
      if (profile) {
        token.login = (profile as { login?: string }).login;
      }
      return token;
    },
    async session({ session, token }) {
      // セッションにアクセストークン、スコープ、ユーザー名を追加
      session.accessToken = token.accessToken as string;
      session.scope = token.scope as string;
      session.login = token.login as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
