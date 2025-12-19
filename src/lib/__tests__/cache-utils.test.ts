import { describe, it, expect } from "vitest";
import { buildPublicCacheControl } from "@/lib/cache-utils";

describe("buildPublicCacheControl", () => {
  it("s-maxage と stale-while-revalidate を指定して生成できる", () => {
    expect(buildPublicCacheControl(60, 120)).toBe(
      "public, s-maxage=60, stale-while-revalidate=120"
    );
  });

  it("stale-while-revalidate を明示的に上書きできる", () => {
    expect(buildPublicCacheControl(60, 600)).toBe(
      "public, s-maxage=60, stale-while-revalidate=600"
    );
  });
});
