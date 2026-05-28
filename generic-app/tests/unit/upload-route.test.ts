import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(),
  parse: vi.fn(),
  structure: vi.fn(),
}));

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

vi.mock("@/lib/db", () => ({
  prisma: {
    curriculumDraft: {
      create: mocks.createDraft,
    },
  },
}));

vi.mock("@/lib/parser", () => ({
  getParserProvider: () => ({
    parse: mocks.parse,
  }),
}));

vi.mock("@/lib/llm", () => ({
  getStructurerProvider: () => ({
    structure: mocks.structure,
  }),
}));

vi.mock("@/lib/tokens", () => ({
  createShareToken: () => "edit-token-test",
}));

function createRequest(file?: File) {
  const formData = new FormData();

  if (file) {
    formData.set("file", file);
  }

  return {
    formData: async () => formData,
  } as Request;
}

function createUploadFile({
  name = "curriculum.xlsx",
  type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  content = "sample",
  size,
  arrayBufferReject,
}: {
  name?: string;
  type?: string;
  content?: string;
  size?: number;
  arrayBufferReject?: Error;
} = {}) {
  const file = new File([content], name, { type });
  const buffer = Buffer.from(content);

  Object.defineProperty(file, "arrayBuffer", {
    value: async () => {
      if (arrayBufferReject) {
        throw arrayBufferReject;
      }

      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },
  });

  if (size !== undefined) {
    Object.defineProperty(file, "size", {
      value: size,
    });
  }

  return file;
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("POST /api/curricula/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    mocks.parse.mockResolvedValue({
      text: "테스트고등학교 2026 교육과정",
      tables: [["학교명", "과목"], ["테스트고등학교", "문학"]],
      metadata: {
        parser: "test",
        fileName: "curriculum.xlsx",
      },
    });
    mocks.structure.mockResolvedValue({
      curriculum: validCurriculum,
      warnings: [],
      sourceSnippets: ["테스트고등학교 2026 교육과정"],
    });
    mocks.createDraft.mockResolvedValue({
      id: "draft_test_123",
      schoolName: "테스트고등학교",
    });
  });

  it("returns 400 when form data cannot be read", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");

    const response = await POST({
      formData: async () => {
        throw new Error("bad request");
      },
    } as Request);

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: "업로드 요청을 읽지 못했습니다." });
  });

  it("returns 400 when the file field is missing", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");

    const response = await POST(createRequest());

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: "편제표 파일을 업로드해주세요." });
  });

  it("returns 400 when the file type is unsupported", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");

    const response = await POST(
      createRequest(createUploadFile({ name: "curriculum.txt", type: "text/plain" })),
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: "지원하지 않는 파일 형식입니다." });
  });

  it("returns 400 when the file exceeds 15MB", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");

    const response = await POST(
      createRequest(createUploadFile({ size: 15 * 1024 * 1024 + 1 })),
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: "파일은 15MB 이하만 업로드할 수 있습니다.",
    });
  });

  it("returns 400 when uploaded file bytes cannot be read", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");

    const response = await POST(
      createRequest(createUploadFile({ arrayBufferReject: new Error("read failed") })),
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: "업로드한 파일을 읽지 못했습니다." });
  });

  it("returns 422 when extraction finds no curriculum content", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");
    mocks.parse.mockResolvedValueOnce({
      text: "   ",
      tables: [],
      metadata: {
        parser: "test",
        fileName: "curriculum.xlsx",
      },
    });

    const response = await POST(createRequest(createUploadFile()));

    expect(response.status).toBe(422);
    expect(await readJson(response)).toEqual({
      error: "문서에서 편제표 내용을 찾지 못했습니다.",
    });
  });

  it("returns a handled error when the parser provider throws", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");
    mocks.parse.mockRejectedValueOnce(new Error("parser failed"));

    const response = await POST(createRequest(createUploadFile()));

    expect(response.status).toBe(502);
    expect(await readJson(response)).toEqual({ error: "문서 분석 중 오류가 발생했습니다." });
  });

  it("returns a handled error when the structurer provider throws", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");
    mocks.structure.mockRejectedValueOnce(new Error("structurer failed"));

    const response = await POST(createRequest(createUploadFile()));

    expect(response.status).toBe(502);
    expect(await readJson(response)).toEqual({
      error: "편제표 구조화 중 오류가 발생했습니다.",
    });
  });

  it("returns 422 when the structured curriculum is invalid", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");
    mocks.structure.mockResolvedValueOnce({
      curriculum: {
        ...validCurriculum,
        schoolName: "",
      },
      warnings: [],
      sourceSnippets: ["테스트고등학교 2026 교육과정"],
    });

    const response = await POST(createRequest(createUploadFile()));
    const body = await readJson(response);

    expect(response.status).toBe(422);
    expect(body.error).toBe("편제표를 표준 구조로 변환하지 못했습니다.");
    expect(body.issues).toEqual(expect.any(Array));
  });

  it("returns a draft review response and creates a draft for a valid upload", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");

    const response = await POST(createRequest(createUploadFile()));
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      draftId: "draft_test_123",
      reviewUrl: "/review/draft_test_123",
      schoolName: "테스트고등학교",
      warnings: [],
    });
    expect(body.draftId).toEqual(expect.any(String));
    expect(String(body.reviewUrl)).toContain("/review/");
    expect(mocks.parse).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "curriculum.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: expect.any(Buffer),
      }),
    );
    expect(mocks.createDraft).toHaveBeenCalledWith(
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

  it("accepts HWPX uploads by extension when MIME type is blank", async () => {
    const { POST } = await import("@/app/api/curricula/upload/route");

    const response = await POST(createRequest(createUploadFile({ name: "curriculum.hwpx", type: "" })));

    expect(response.status).toBe(200);
  });
});
