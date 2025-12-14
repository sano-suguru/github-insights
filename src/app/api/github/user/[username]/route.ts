import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserProfile,
  getUserRepositories,
  calculateUserStats,
  UserProfile,
  UserStats,
  GitHubRateLimitError,
} from "@/lib/github";

interface Params {
  params: Promise<{
    username: string;
  }>;
}

// ユーザーデータを取得
// 注: クライアント側で React Query がキャッシュするため、サーバー側キャッシュは使用しない
async function fetchUserData(
  username: string,
  accessToken: string | null
): Promise<{
  profile: UserProfile | null;
  stats: UserStats | null;
}> {
  const profile = await getUserProfile(username, accessToken);

  if (!profile) {
    return { profile: null, stats: null };
  }

  const repositories = await getUserRepositories(username, accessToken);
  const stats = calculateUserStats(repositories);

  return { profile, stats };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { username } = await params;

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // セッションからアクセストークンを取得（あれば認証済み、なければ未認証）
    const session = await auth();
    const accessToken = session?.accessToken ?? null;

    const { profile, stats } = await fetchUserData(username, accessToken);

    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      profile,
      stats,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);

    if (error instanceof GitHubRateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
