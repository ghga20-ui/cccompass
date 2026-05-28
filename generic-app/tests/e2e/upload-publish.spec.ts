import { expect, test } from "@playwright/test";

test("starts the upload-to-publish flow from the home page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "새 도우미 만들기" }).click();
  await expect(page.getByRole("heading", { name: "학교 편제표 업로드" })).toBeVisible();
  await expect(page.getByLabel("편제표 파일")).toBeVisible();
});
