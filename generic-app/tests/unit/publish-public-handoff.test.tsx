import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PublishedPage from "@/app/published/[draftId]/page";

const mocks = vi.hoisted(() => ({
  findDraft: vi.fn(),
  upsertPublication: vi.fn(),
  updateDraft: vi.fn(),
  transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
  findPublication: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
    curriculumDraft: {
      findUnique: mocks.findDraft,
      update: mocks.updateDraft,
    },
    curriculumPublication: {
      upsert: mocks.upsertPublication,
      findUnique: mocks.findPublication,
    },
  },
}));

vi.mock("@/lib/tokens", () => ({
  createShareToken: () => "student-share-token",
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

const validCurriculum = {
  schoolName: "Sample High School",
  cohorts: [
    {
      entranceYear: "2026",
      label: "2026 entrance",
      grades: [
        {
          grade: 1,
          semesters: [
            {
              semester: 1,
              requiredSubjects: [{ name: "Grade 1 Required", credits: 4 }],
              choiceGroups: [],
            },
          ],
        },
        {
          grade: 2,
          semesters: [
            {
              semester: 1,
              requiredSubjects: [{ name: "Literature", credits: 4 }],
              choiceGroups: [],
            },
          ],
        },
      ],
    },
  ],
};

function publishRequest() {
  return new Request("http://test.local/api/curricula/draft_test_123/publish", {
    method: "POST",
    headers: {
      "x-edit-token": "edit-token-test",
    },
  });
}

describe("publish to Hyoja public handoff", () => {
  it("publishes to share-token Hyoja public route", async () => {
    const { POST } = await import("@/app/api/curricula/[draftId]/publish/route");
    mocks.findDraft.mockResolvedValueOnce({
      id: "draft_test_123",
      editToken: "edit-token-test",
      curriculumJson: validCurriculum,
    });
    mocks.upsertPublication.mockResolvedValueOnce({
      shareToken: "student-share-token",
      editToken: "edit-token-test",
    });
    mocks.updateDraft.mockResolvedValueOnce({
      id: "draft_test_123",
      status: "published",
    });

    const response = await POST(publishRequest(), {
      params: Promise.resolve({ draftId: "draft_test_123" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      shareUrl: "/s/student-share-token",
      editUrl: "/edit/edit-token-test",
      manageUrl: "/published/draft_test_123?editToken=edit-token-test",
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction).toHaveBeenCalledWith([
      expect.any(Promise),
      expect.any(Promise),
    ]);
    expect(mocks.upsertPublication).toHaveBeenCalled();
    expect(mocks.updateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "published" },
      }),
    );
  });

  it("renders management links without leaking draft id into public URL", async () => {
    mocks.findPublication.mockResolvedValueOnce({
      schoolName: "Sample High School",
      shareToken: "student-share-token",
      editToken: "edit-token-test",
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });

    render(
      await PublishedPage({
        params: Promise.resolve({ draftId: "draft_test_123" }),
        searchParams: Promise.resolve({ editToken: "edit-token-test" }),
      }),
    );

    expect(screen.getByRole("link", { name: /\/s\/student-share-token/ })).toHaveAttribute(
      "href",
      "/s/student-share-token",
    );
    expect(screen.getByRole("link", { name: /\/edit\/edit-token-test/ })).toHaveAttribute(
      "href",
      "/edit/edit-token-test",
    );
    expect(screen.queryByText("/s/draft_test_123")).not.toBeInTheDocument();
  });
});
