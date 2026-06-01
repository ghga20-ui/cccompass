import { stat } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  hyojaGradeFilterCurriculum,
  task11GradeOneChoice,
  task11GradeOneRequired,
  task11GradeThreeChoiceSubject,
  task11GradeThreeSubject,
  task11GradeTwoChoiceSubject,
  task11GradeTwoSubject,
  task11PromptInjectionText,
  task11ShareToken,
  task11UploadedOnlyUnknownSubject,
} from "./fixtures/hyoja-grade-filter-curriculum";
import { closeTestDatabase, seedPublicCurriculum } from "./support/test-db";

const evidencePaths = {
  home: "evidence/task-11-public-home.png",
  recommend: "evidence/task-11-public-recommend.png",
  roadmap: "evidence/task-11-public-roadmap.png",
  subjects: "evidence/task-11-public-subjects.png",
  subjectDetail: "evidence/task-11-public-subject-detail.png",
  gradeOneAbsent: "evidence/task-11-grade-one-absent.png",
} as const;

const gradeOneOnlySubjectNames = [task11GradeOneRequired, task11GradeOneChoice] as const;

async function expectScreenshotFile(path: string): Promise<void> {
  const file = await stat(path);

  expect(file.size).toBeGreaterThan(0);
}

async function captureEvidence(page: Page, path: string): Promise<void> {
  await page.screenshot({ path, fullPage: true });
  await expectScreenshotFile(path);
}

async function expectGradeOneOnlySubjectAbsent(page: Page): Promise<void> {
  for (const subjectName of gradeOneOnlySubjectNames) {
    await expect(page.getByText(subjectName, { exact: true })).toHaveCount(0);
  }

  await expect(page.getByText(task11PromptInjectionText)).toHaveCount(0);
}

test.describe("Hyoja seeded public curriculum flow", () => {
  test.beforeEach(async () => {
    await seedPublicCurriculum();
  });

  test.afterAll(async () => {
    await closeTestDatabase();
  });

  test("keeps grade-one-only data out of every public page", async ({ page }) => {
    await page.goto(`/s/${task11ShareToken}`);
    await expect(page).toHaveURL(new RegExp(`/s/${task11ShareToken}$`));
    await expect(
      page.getByText(hyojaGradeFilterCurriculum.schoolName, { exact: true }),
    ).toBeVisible();
    await expectGradeOneOnlySubjectAbsent(page);
    await captureEvidence(page, evidencePaths.home);

    await page.goto(`/s/${task11ShareToken}/recommend?interests=health-medical`);
    await expect(page).toHaveURL(new RegExp(`/s/${task11ShareToken}/recommend`));
    await expect(page.getByText(task11GradeTwoSubject, { exact: true })).toBeVisible();
    await expectGradeOneOnlySubjectAbsent(page);
    await captureEvidence(page, evidencePaths.recommend);

    await page.goto(`/s/${task11ShareToken}/roadmap`);
    await expect(page).toHaveURL(new RegExp(`/s/${task11ShareToken}/roadmap$`));
    await expect(page.getByText(task11GradeTwoSubject, { exact: true })).toBeVisible();
    await expect(page.getByText(task11GradeThreeSubject, { exact: true })).toBeVisible();
    await expectGradeOneOnlySubjectAbsent(page);
    await captureEvidence(page, evidencePaths.roadmap);

    await page.goto(`/s/${task11ShareToken}/subjects`);
    await expect(page).toHaveURL(new RegExp(`/s/${task11ShareToken}/subjects$`));
    await expect(page.getByText(task11GradeTwoSubject, { exact: true })).toBeVisible();
    await expect(page.getByText(task11GradeTwoChoiceSubject, { exact: true })).toBeVisible();
    await expect(page.getByText(task11GradeThreeSubject, { exact: true })).toBeVisible();
    await expect(page.getByText(task11GradeThreeChoiceSubject, { exact: true })).toBeVisible();
    await expect(page.getByText(task11UploadedOnlyUnknownSubject, { exact: true })).toHaveCount(0);
    await expectGradeOneOnlySubjectAbsent(page);
    await captureEvidence(page, evidencePaths.subjects);
    await captureEvidence(page, evidencePaths.gradeOneAbsent);

    await page.locator('a[href*="/subjects/"]').filter({
      hasText: task11GradeTwoSubject,
    }).first().click();
    await expect(page).toHaveURL(
      new RegExp(`/s/${task11ShareToken}/subjects/[^?]+`),
    );
    await expect(page.getByText(task11GradeTwoSubject, { exact: true })).toBeVisible();
    await expectGradeOneOnlySubjectAbsent(page);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: /upload|create|edit/i })).toHaveCount(0);
    await captureEvidence(page, evidencePaths.subjectDetail);
  });
});
