import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PeriodSelector } from "@/components/PeriodSelector";

describe("PeriodSelector", () => {
  const mockOnPeriodChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("すべての期間オプションを表示する", () => {
    render(
      <PeriodSelector
        selectedDays={30}
        onPeriodChange={mockOnPeriodChange}
      />
    );

    expect(screen.getByText("7日")).toBeInTheDocument();
    expect(screen.getByText("30日")).toBeInTheDocument();
    expect(screen.getByText("90日")).toBeInTheDocument();
    expect(screen.getByText("1年")).toBeInTheDocument();
    expect(screen.getByText("全期間")).toBeInTheDocument();
  });

  it("選択された期間がハイライトされる", () => {
    render(
      <PeriodSelector
        selectedDays={30}
        onPeriodChange={mockOnPeriodChange}
      />
    );

    const selectedButton = screen.getByText("30日");
    expect(selectedButton).toHaveClass("bg-purple-600");
  });

  it("期間をクリックするとonPeriodChangeが呼ばれる", () => {
    render(
      <PeriodSelector
        selectedDays={30}
        onPeriodChange={mockOnPeriodChange}
      />
    );

    fireEvent.click(screen.getByText("90日"));
    expect(mockOnPeriodChange).toHaveBeenCalledWith(90);

    fireEvent.click(screen.getByText("全期間"));
    expect(mockOnPeriodChange).toHaveBeenCalledWith(null);
  });

  it("未認証時は30日より長い期間が無効化される", () => {
    render(
      <PeriodSelector
        selectedDays={30}
        onPeriodChange={mockOnPeriodChange}
        isAuthenticated={false}
      />
    );

    // 30日以下は有効
    expect(screen.getByText("7日")).not.toBeDisabled();
    expect(screen.getByText("30日")).not.toBeDisabled();

    // 30日より長い期間と全期間は無効
    expect(screen.getByText("90日")).toBeDisabled();
    expect(screen.getByText("1年")).toBeDisabled();
    expect(screen.getByText("全期間")).toBeDisabled();
  });

  it("未認証時に無効化されたボタンをクリックしてもonPeriodChangeは呼ばれない", () => {
    render(
      <PeriodSelector
        selectedDays={30}
        onPeriodChange={mockOnPeriodChange}
        isAuthenticated={false}
      />
    );

    fireEvent.click(screen.getByText("90日"));
    expect(mockOnPeriodChange).not.toHaveBeenCalled();
  });

  it("isLoading=trueの場合、ローディングスピナーが表示される", () => {
    render(
      <PeriodSelector
        selectedDays={30}
        onPeriodChange={mockOnPeriodChange}
        isLoading={true}
      />
    );

    // Loader2アイコンのanimate-spinクラスを確認
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("isLoading=trueの場合、ボタンが無効化される", () => {
    render(
      <PeriodSelector
        selectedDays={30}
        onPeriodChange={mockOnPeriodChange}
        isLoading={true}
      />
    );

    // すべてのボタンがdisabledになる
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("認証済みの場合、すべての期間が有効", () => {
    render(
      <PeriodSelector
        selectedDays={30}
        onPeriodChange={mockOnPeriodChange}
        isAuthenticated={true}
      />
    );

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).not.toBeDisabled();
    });
  });

  it("days=nullが選択されている場合、全期間がハイライトされる", () => {
    render(
      <PeriodSelector
        selectedDays={null}
        onPeriodChange={mockOnPeriodChange}
      />
    );

    const allPeriodButton = screen.getByText("全期間");
    expect(allPeriodButton).toHaveClass("bg-purple-600");
  });
});
