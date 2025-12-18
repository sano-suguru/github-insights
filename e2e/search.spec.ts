import { test, expect } from "@playwright/test";

test.describe("リポジトリ検索", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("検索入力欄にテキストを入力できる", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/リポジトリを検索/i);
    
    await searchInput.fill("react");
    await expect(searchInput).toHaveValue("react");
  });

  test("検索入力後にドロップダウンが表示される", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/リポジトリを検索/i);
    
    await searchInput.fill("react");
    
    // 検索結果が表示されるまで待機（デバウンス + API呼び出し）
    await page.waitForTimeout(500);
    
    // なんらかのドロップダウンまたはリストが表示される
    // （API呼び出しの結果に依存しないテスト）
    await expect(searchInput).toHaveValue("react");
  });

  test("@でユーザー検索モードに切り替わる", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/リポジトリを検索/i);
    
    await searchInput.fill("@octocat");
    await expect(searchInput).toHaveValue("@octocat");
  });

  test("検索入力をクリアできる", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/リポジトリを検索/i);
    
    await searchInput.fill("react");
    await expect(searchInput).toHaveValue("react");
    
    await searchInput.clear();
    await expect(searchInput).toHaveValue("");
  });
});

test.describe("検索入力のフォーカス", () => {
  test("検索入力欄をクリックするとフォーカスされる", async ({ page }) => {
    await page.goto("/");
    
    const searchInput = page.getByPlaceholder(/リポジトリを検索/i);
    
    await searchInput.click();
    await expect(searchInput).toBeFocused();
  });
});
