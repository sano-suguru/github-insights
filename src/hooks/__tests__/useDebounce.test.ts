import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初期値をすぐに返す", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("遅延時間が経過するまで値が更新されない", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } }
    );

    // 値を変更
    rerender({ value: "updated", delay: 300 });

    // まだ遅延時間が経過していないので、古い値のまま
    expect(result.current).toBe("initial");

    // 100ms 経過
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("initial");

    // 300ms 経過（合計）
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("updated");
  });

  it("遅延時間内に値が変更されるとタイマーがリセットされる", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } }
    );

    // 最初の変更
    rerender({ value: "first", delay: 300 });

    // 200ms 経過
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("initial");

    // 2回目の変更（タイマーがリセットされる）
    rerender({ value: "second", delay: 300 });

    // さらに200ms経過（最初の変更から400ms）
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // まだ2回目の変更から300ms経っていないので更新されない
    expect(result.current).toBe("initial");

    // さらに100ms経過（2回目の変更から300ms）
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("second");
  });

  it("デフォルトの遅延時間は300ms", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: "initial" } }
    );

    rerender({ value: "updated" });

    // 299ms では更新されない
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("initial");

    // 300ms で更新される
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("updated");
  });

  it("異なる型の値でも動作する（number）", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 300 } }
    );

    rerender({ value: 42, delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(42);
  });

  it("異なる型の値でも動作する（object）", () => {
    const initialObj = { name: "initial" };
    const updatedObj = { name: "updated" };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initialObj, delay: 300 } }
    );

    rerender({ value: updatedObj, delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toEqual(updatedObj);
  });

  it("遅延時間を変更できる", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    rerender({ value: "updated", delay: 500 });

    // 300ms では更新されない
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("initial");

    // 500ms で更新される
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("updated");
  });

  it("コンポーネントがアンマウントされるとタイマーがクリアされる", () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } }
    );

    rerender({ value: "updated", delay: 300 });
    
    // アンマウント
    unmount();

    // タイマーが進んでもエラーが発生しないことを確認
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // アンマウント後は最後の状態のまま
    expect(result.current).toBe("initial");
  });
});
