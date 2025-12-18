import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    login?: string; // GitHubユーザー名
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    login?: string;
  }
}
