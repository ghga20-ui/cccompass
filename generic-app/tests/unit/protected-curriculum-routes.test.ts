import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findDraft: vi.fn(),
  updateDraft: vi.fn(),
  upsertPublication: vi.fn(),
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
      findUnique: mocks.findDraft,
      update: mocks.updateDraft,
    },
    curriculumPublication: {
      upsert: mocks.upsertPublication,
    },
  },
}));

vi.mock("@/lib/tokens", () => ({
  createShareToken: () => "share-token-test",
}));

function createContext(draftId = "draft_test_123") {
  return {
    params: Promise.resolve({
      draftId,
    }),
  };
}

function createPutRequest(editToken?: string) {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (editToken) {
    headers.set("x-edit-token", editToken);
  }

  return new Request("http://test.local/api/curricula/draft_test_123", {
    method: "PUT",
    headers,
    body: JSON.stringify({ curriculum: validCurriculum }),
  });
}

function createPublishRequest(editToken?: string) {
  const headers = new Headers();

  if (editToken) {
    headers.set("x-edit-token", editToken);
  }

  return new Request("http://test.local/api/curricula/draft_test_123/publish", {
    method: "POST",
    headers,
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("protected curriculum draft routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("rejects draft updates when the edit token is missing", async () => {
    const { PUT } = await import("@/app/api/curricula/[draftId]/route");
    mocks.findDraft.mockResolvedValueOnce({
      id: "draft_test_123",
      editToken: "edit-token-test",
    });

    const response = await PUT(createPutRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await readJson(response)).toHaveProperty("error");
    expect(mocks.updateDraft).not.toHaveBeenCalled();
  });

  it("rejects draft updates when the edit token is invalid", async () => {
    const { PUT } = await import("@/app/api/curricula/[draftId]/route");
    mocks.findDraft.mockResolvedValueOnce({
      id: "draft_test_123",
      editToken: "edit-token-test",
    });

    const response = await PUT(createPutRequest("wrong-token"), createContext());

    expect(response.status).toBe(404);
    expect(mocks.updateDraft).not.toHaveBeenCalled();
  });

  it("updates a draft when the edit token matches", async () => {
    const { PUT } = await import("@/app/api/curricula/[draftId]/route");
    const updatedDraft = {
      id: "draft_test_123",
      schoolName: validCurriculum.schoolName,
      status: "draft",
      curriculumJson: validCurriculum,
      warnings: [],
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
    };
    mocks.findDraft.mockResolvedValueOnce({
      id: "draft_test_123",
      editToken: "edit-token-test",
    });
    mocks.updateDraft.mockResolvedValueOnce(updatedDraft);

    const response = await PUT(createPutRequest("edit-token-test"), createContext());

    expect(response.status).toBe(200);
    expect(mocks.updateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          schoolName: validCurriculum.schoolName,
          curriculumJson: validCurriculum,
        },
      }),
    );
  });

  it("rejects publishing when the edit token is missing", async () => {
    const { POST } = await import("@/app/api/curricula/[draftId]/publish/route");
    mocks.findDraft.mockResolvedValueOnce({
      id: "draft_test_123",
      editToken: "edit-token-test",
      curriculumJson: validCurriculum,
    });

    const response = await POST(createPublishRequest(), createContext());

    expect(response.status).toBe(404);
    expect(await readJson(response)).toHaveProperty("error");
    expect(mocks.upsertPublication).not.toHaveBeenCalled();
    expect(mocks.updateDraft).not.toHaveBeenCalled();
  });

  it("rejects publishing when the edit token is invalid", async () => {
    const { POST } = await import("@/app/api/curricula/[draftId]/publish/route");
    mocks.findDraft.mockResolvedValueOnce({
      id: "draft_test_123",
      editToken: "edit-token-test",
      curriculumJson: validCurriculum,
    });

    const response = await POST(createPublishRequest("wrong-token"), createContext());

    expect(response.status).toBe(404);
    expect(mocks.upsertPublication).not.toHaveBeenCalled();
    expect(mocks.updateDraft).not.toHaveBeenCalled();
  });

  it("publishes a draft when the edit token matches", async () => {
    const { POST } = await import("@/app/api/curricula/[draftId]/publish/route");
    mocks.findDraft.mockResolvedValueOnce({
      id: "draft_test_123",
      editToken: "edit-token-test",
      curriculumJson: validCurriculum,
    });
    mocks.upsertPublication.mockResolvedValueOnce({
      shareToken: "share-token-test",
      editToken: "edit-token-test",
    });
    mocks.updateDraft.mockResolvedValueOnce({
      id: "draft_test_123",
      status: "published",
    });

    const response = await POST(createPublishRequest("edit-token-test"), createContext());

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      shareUrl: "/s/share-token-test",
      editUrl: "/edit/edit-token-test",
      manageUrl: "/published/draft_test_123?editToken=edit-token-test",
    });
    expect(mocks.upsertPublication).toHaveBeenCalled();
    expect(mocks.updateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "published",
        },
      }),
    );
  });
});
