import { expect, test } from "@playwright/test";

test("starts the upload-to-publish flow from the home page", async ({ page }) => {
  await page.goto("/");

  const newAssistantLink = page.getByRole("link", { name: "새 도우미 만들기" });
  const currentUploadLink = page.getByRole("link", { name: "편제표 업로드 시작" });

  if ((await newAssistantLink.count()) > 0) {
    await newAssistantLink.click();
  } else {
    await currentUploadLink.click();
  }

  const plannedUploadHeading = page.getByRole("heading", { name: "학교 편제표 업로드" });

  if ((await plannedUploadHeading.count()) > 0) {
    await expect(plannedUploadHeading).toBeVisible();
  } else {
    await expect(page.getByText("학교 편제표 업로드")).toBeVisible();
  }

  await expect(page.getByLabel("편제표 파일")).toBeVisible();
});
