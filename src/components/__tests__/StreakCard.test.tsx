import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakCard } from "../StreakCard";

describe("StreakCard", () => {
  it("現在のストリークと最長ストリークを表示する", () => {
    render(<StreakCard currentStreak={7} longestStreak={30} />);

    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Longest")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("ストリークが0の場合も正常に表示する", () => {
    render(<StreakCard currentStreak={0} longestStreak={0} />);

    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("自己ベスト更新中のバッジを表示する", () => {
    render(<StreakCard currentStreak={10} longestStreak={10} />);

    expect(screen.getByText("Personal Best")).toBeInTheDocument();
  });

  it("自己ベスト未更新時はバッジを表示しない", () => {
    render(<StreakCard currentStreak={5} longestStreak={10} />);

    expect(screen.queryByText("Personal Best")).not.toBeInTheDocument();
  });

  it("currentStreak が 0 の場合は Personal Best バッジを表示しない", () => {
    render(<StreakCard currentStreak={0} longestStreak={0} />);

    expect(screen.queryByText("Personal Best")).not.toBeInTheDocument();
  });

  it("タイトルと説明を表示する", () => {
    render(<StreakCard currentStreak={1} longestStreak={1} />);

    expect(screen.getByText("Contribution Streak")).toBeInTheDocument();
    expect(screen.getByText("Consecutive days of activity")).toBeInTheDocument();
  });

  it("days単位で表示する", () => {
    render(<StreakCard currentStreak={5} longestStreak={10} />);

    expect(screen.getAllByText("days")).toHaveLength(2);
  });
});
