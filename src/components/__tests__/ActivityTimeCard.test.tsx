import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityTimeCard } from "../ActivityTimeCard";
import { HOURS_IN_DAY } from "@/lib/github/types";
import type { ActivityTimeAnalysis } from "@/lib/github/types";

describe("ActivityTimeCard", () => {
  const mockActivityTime: ActivityTimeAnalysis = {
    type: "night-owl",
    label: "Night Owl",
    peakHour: 23,
    distribution: Array(HOURS_IN_DAY).fill(0),
  };

  it("アクティビティタイプとラベルを表示する", () => {
    render(<ActivityTimeCard activityTime={mockActivityTime} />);

    expect(screen.getByText("Night Owl")).toBeInTheDocument();
    expect(screen.getByText("Coding Pattern")).toBeInTheDocument();
    expect(screen.getByText("When you're most active")).toBeInTheDocument();
  });

  it("ピーク時間を表示する", () => {
    render(<ActivityTimeCard activityTime={mockActivityTime} />);

    expect(screen.getByText(/Peak activity at 11:00 PM UTC/)).toBeInTheDocument();
  });

  it("early-bird タイプを正しく表示する", () => {
    const earlyBird: ActivityTimeAnalysis = {
      type: "early-bird",
      label: "Early Bird",
      peakHour: 6,
      distribution: Array(HOURS_IN_DAY).fill(0),
    };
    render(<ActivityTimeCard activityTime={earlyBird} />);

    expect(screen.getByText("Early Bird")).toBeInTheDocument();
    expect(screen.getByText(/Peak activity at 6:00 AM UTC/)).toBeInTheDocument();
  });

  it("business-hours タイプを正しく表示する", () => {
    const businessHours: ActivityTimeAnalysis = {
      type: "business-hours",
      label: "Business Hours",
      peakHour: 14,
      distribution: Array(HOURS_IN_DAY).fill(0),
    };
    render(<ActivityTimeCard activityTime={businessHours} />);

    expect(screen.getByText("Business Hours")).toBeInTheDocument();
    expect(screen.getByText(/Peak activity at 2:00 PM UTC/)).toBeInTheDocument();
  });

  it("evening-coder タイプを正しく表示する", () => {
    const eveningCoder: ActivityTimeAnalysis = {
      type: "evening-coder",
      label: "Evening Coder",
      peakHour: 20,
      distribution: Array(HOURS_IN_DAY).fill(0),
    };
    render(<ActivityTimeCard activityTime={eveningCoder} />);

    expect(screen.getByText("Evening Coder")).toBeInTheDocument();
    expect(screen.getByText(/Peak activity at 8:00 PM UTC/)).toBeInTheDocument();
  });

  it("balanced タイプを正しく表示する", () => {
    const balanced: ActivityTimeAnalysis = {
      type: "balanced",
      label: "Balanced",
      peakHour: 12,
      distribution: Array(HOURS_IN_DAY).fill(0),
    };
    render(<ActivityTimeCard activityTime={balanced} />);

    expect(screen.getByText("Balanced")).toBeInTheDocument();
    expect(screen.getByText(/Peak activity at 12:00 PM UTC/)).toBeInTheDocument();
  });

  it("午前0時を正しくフォーマットする", () => {
    const midnight: ActivityTimeAnalysis = {
      type: "night-owl",
      label: "Night Owl",
      peakHour: 0,
      distribution: Array(HOURS_IN_DAY).fill(0),
    };
    render(<ActivityTimeCard activityTime={midnight} />);

    expect(screen.getByText(/Peak activity at 12:00 AM UTC/)).toBeInTheDocument();
  });
});
