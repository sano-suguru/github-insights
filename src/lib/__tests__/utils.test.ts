import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("単一のクラス名をそのまま返す", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("複数のクラス名を結合する", () => {
    expect(cn("text-red-500", "bg-white")).toBe("text-red-500 bg-white");
  });

  it("条件付きクラスを処理する", () => {
    expect(cn("base", true && "active")).toBe("base active");
    expect(cn("base", false && "active")).toBe("base");
  });

  it("オブジェクト形式のクラスを処理する", () => {
    expect(cn({ "text-red-500": true, "bg-white": false })).toBe("text-red-500");
  });

  it("配列形式のクラスを処理する", () => {
    expect(cn(["text-red-500", "bg-white"])).toBe("text-red-500 bg-white");
  });

  it("Tailwind の重複クラスをマージする", () => {
    // 後のクラスが優先される
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("undefined や null を無視する", () => {
    expect(cn("base", undefined, null, "active")).toBe("base active");
  });

  it("空文字を無視する", () => {
    expect(cn("base", "", "active")).toBe("base active");
  });

  it("複雑な組み合わせを処理する", () => {
    const isActive = true;
    const isDisabled = false;
    expect(
      cn(
        "btn",
        { active: isActive, disabled: isDisabled },
        isActive && "font-bold",
        ["rounded", "shadow"]
      )
    ).toBe("btn active font-bold rounded shadow");
  });
});
