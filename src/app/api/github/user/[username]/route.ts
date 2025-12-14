import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
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

// キャッシュ付きでユーザーデータを取得
function createCachedUserData(username: string) {
  return unstable_cache(
    async (): Promise<{
      profile: UserProfile | null;
      stats: UserStats | null;
    }> => {
      const profile = await getUserProfile(username);
      
      if (!profile) {
        return { profile: null, stats: null };
      }

      const repositories = await getUserRepositories(username);
      const stats = calculateUserStats(repositories);

      return { profile, stats };
    },
    [`user-profile:${username}`],
    { revalidate: 3600, tags: [`user:${username}`] }
  );
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

    const { profile, stats } = await createCachedUserData(username)();

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
