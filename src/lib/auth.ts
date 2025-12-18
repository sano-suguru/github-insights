import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// GitHub Appでは権限はアプリ設定で管理されるため、スコープは最小限に
export const SCOPES = {
  USER: "read:user user:email",
} as const;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_APP_CLIENT_ID!,
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: SCOPES.USER,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // 初回ログイン時にアクセストークン、ユーザー名を保存
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      if (profile) {
        token.login = (profile as { login?: string }).login;
      }
      return token;
    },
    async session({ session, token }) {
      // セッションにアクセストークン、ユーザー名を追加
      session.accessToken = token.accessToken as string;
      session.login = token.login as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
