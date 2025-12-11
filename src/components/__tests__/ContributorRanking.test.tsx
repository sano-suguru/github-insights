import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ContributorRanking from "@/components/ContributorRanking";
import { ContributorDetailStat } from "@/lib/github";

// モックデータ
const createContributor = (
  login: string,
  rank: number,
  overrides: Partial<ContributorDetailStat> = {}
): ContributorDetailStat => ({
  login,
  name: `User ${login}`,
  avatarUrl: `https://avatars.githubusercontent.com/${login}`,
  commits: 100 - rank * 10,
  additions: 1000 - rank * 100,
  deletions: 500 - rank * 50,
  pullRequests: 20 - rank * 2,
  reviews: 15 - rank,
  score: 1000 - rank * 100,
  rank,
  ...overrides,
});

const mockContributors: ContributorDetailStat[] = Array.from({ length: 15 }, (_, i) =>
  createContributor(`user${i + 1}`, i + 1)
);

describe("ContributorRanking", () => {
  it("コントリビューターがいない場合、メッセージを表示する", () => {
    render(<ContributorRanking contributors={[]} />);

    expect(screen.getByText("コントリビューターデータがありません")).toBeInTheDocument();
  });

  it("Top10のコントリビューターを表示する", () => {
    render(<ContributorRanking contributors={mockContributors} />);

    // Top10が表示される（nameで表示される）
    expect(screen.getByText("User user1")).toBeInTheDocument();
    expect(screen.getByText("User user10")).toBeInTheDocument();

    // 11位以降は表示されない
    expect(screen.queryByText("User user11")).not.toBeInTheDocument();
  });

  it("現在のユーザーがTop10内の場合、ハイライトされる", () => {
    render(
      <ContributorRanking
        contributors={mockContributors}
        currentUserLogin="user5"
      />
    );

    // user5の行が存在し、ハイライトされている
    expect(screen.getByText("User user5")).toBeInTheDocument();
  });

  it("現在のユーザーがTop10外の場合、別セクションに表示される", () => {
    render(
      <ContributorRanking
        contributors={mockContributors}
        currentUserLogin="user12"
      />
    );

    // 「あなたの順位」セクションが表示される
    expect(screen.getByText("あなたの順位")).toBeInTheDocument();
    // user12が表示される
    expect(screen.getByText("User user12")).toBeInTheDocument();
  });

  it("コントリビューターのアバターが表示される", () => {
    render(<ContributorRanking contributors={mockContributors} />);

    // altテキストでアバター画像を確認
    expect(screen.getByAltText("User user1")).toBeInTheDocument();
  });

  it("コントリビューター数が10未満の場合も正しく表示する", () => {
    const fewContributors = mockContributors.slice(0, 3);
    render(<ContributorRanking contributors={fewContributors} />);

    expect(screen.getByText("User user1")).toBeInTheDocument();
    expect(screen.getByText("User user2")).toBeInTheDocument();
    expect(screen.getByText("User user3")).toBeInTheDocument();
  });

  it("currentUserLoginが大文字小文字を区別せずマッチする", () => {
    render(
      <ContributorRanking
        contributors={mockContributors}
        currentUserLogin="USER5" // 大文字
      />
    );

    // user5（小文字）が現在のユーザーとして認識される
    expect(screen.getByText("User user5")).toBeInTheDocument();
  });
});
