import { stat } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { closeTestDatabase, resetTestDatabase } from "./support/test-db";

const uploadFixturePath = path.resolve("tests/e2e/fixtures/sample-curriculum.pdf");
const uploadEvidencePath = "evidence/task-11-upload-publish.png";

async function expectEvidenceFile(path: string) {
  const file = await stat(path);

  expect(file.size).toBeGreaterThan(0);
}

test.beforeEach(async () => {
  await resetTestDatabase();
});

test.afterAll(async () => {
  await closeTestDatabase();
});

test("upload review publish public handoff works in real Chrome", async ({ page }) => {
  await page.goto("/create");
  await page.locator("#school-name").fill("Upload Sample High School");
  await page.locator("#entrance-years").fill("2028");
  await page.setInputFiles('input[type="file"]', uploadFixturePath);
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/review\/.*editToken=/, { timeout: 15000 });
  await expect(page.locator("#school-name")).toHaveValue("Upload Sample High School");
  await expect(page.getByText("Grade 1 Hidden")).toHaveCount(0);
  await page.locator('form button[type="button"]').last().click();

  await expect(page).toHaveURL(/\/published\/.*editToken=/, { timeout: 15000 });
  const publicLink = page.locator('a[href^="/s/"]').first();
  await expect(publicLink).toBeVisible();
  const publicHref = await publicLink.getAttribute("href");

  if (!publicHref?.startsWith("/s/")) {
    throw new Error(`Expected an internal public share link, received ${publicHref ?? "null"}`);
  }

  await publicLink.click();

  await expect(page).toHaveURL(new RegExp(`${publicHref}$`));
  await expect(page.getByText("Upload Sample High School", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /선택과목|Subject/ })).toBeVisible();
  await expect(page.getByText(/1학년|Grade 1 Hidden/)).toHaveCount(0);
  await page.screenshot({ path: uploadEvidencePath, fullPage: true });
  await expectEvidenceFile(uploadEvidencePath);
});
