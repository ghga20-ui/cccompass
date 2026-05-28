import { describe, expect, it, vi } from "vitest";

const validCurriculum = {
  schoolName: "테스트고등학교",
  sourceYear: "2026",
  cohorts: [
    {
      entranceYear: "2026",
      label: "2026 입학생",
      grades: [
        {
          grade: 2,
          semesters: [
            {
              semester: 1,
              requiredSubjects: [
                {
                  name: "문학",
                  credits: 4,
                },
              ],
              choiceGroups: [
                {
                  id: "g2-s1-choice-a",
                  label: "선택 A",
                  choose: 1,
                  subjects: [
                    {
                      name: "물리학",
                      credits: 3,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const createDraftMock = vi.fn(async ({ data }) => ({
  id: "draft_test_123",
  ...data,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    curriculumDraft: {
      create: createDraftMock,
    },
  },
}));

vi.mock("@/lib/parser", () => ({
  getParserProvider: () => ({
    parse: vi.fn(async () => ({
      text: "테스트고등학교 2026 교육과정",
      tables: [["학교명", "과목"], ["테스트고등학교", "문학"]],
      metadata: {
        parser: "test",
        fileName: "curriculum.xlsx",
      },
    })),
  }),
}));

vi.mock("@/lib/llm", () => ({
  getStructurerProvider: () => ({
    structure: vi.fn(async () => ({
      curriculum: validCurriculum,
      warnings: [],
      sourceSnippets: ["테스트고등학교 2026 교육과정"],
    })),
  }),
}));

vi.mock("@/lib/tokens", () => ({
  createShareToken: () => "edit-token-test",
}));

describe("POST /api/curricula/upload", () => {
  it("returns a draft review response for a valid uploaded curriculum file", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");
    const formData = new FormData();
    const uploadFile = new File(["sample"], "curriculum.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const uploadBuffer = Buffer.from("sample");

    Object.defineProperty(uploadFile, "arrayBuffer", {
      value: async () =>
        uploadBuffer.buffer.slice(
          uploadBuffer.byteOffset,
          uploadBuffer.byteOffset + uploadBuffer.byteLength,
        ),
    });

    formData.set("file", uploadFile);

    const response = await POST({
      formData: async () => formData,
    } as Request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      draftId: "draft_test_123",
      reviewUrl: "/review/draft_test_123",
      schoolName: "테스트고등학교",
      warnings: [],
    });
    expect(body.draftId).toEqual(expect.any(String));
    expect(body.reviewUrl).toContain("/review/");
    expect(createDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolName: "테스트고등학교",
          curriculumJson: validCurriculum,
          parsedText: "테스트고등학교 2026 교육과정",
          warnings: [],
          sourceSnippets: ["테스트고등학교 2026 교육과정"],
          editToken: "edit-token-test",
        }),
      }),
    );
  });
});
