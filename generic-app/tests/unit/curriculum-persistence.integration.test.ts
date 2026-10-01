import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createE2eJsonPrisma } from "@/lib/e2e-json-prisma";
import { schoolCurriculumSchema } from "@/lib/curriculum/schema";

const state = vi.hoisted(() => ({ path: "" }));
vi.mock("@/lib/db", async () => {
  const { createE2eJsonPrisma } = await import("@/lib/e2e-json-prisma");
  const { randomUUID } = await import("node:crypto");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  state.path = join(tmpdir(), `curriculum-persistence-${randomUUID()}.json`);
  return { prisma: createE2eJsonPrisma(state.path) };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { GET, PUT } from "@/app/api/curricula/[draftId]/route";
import { POST } from "@/app/api/curricula/[draftId]/publish/route";
import { prisma } from "@/lib/db";

const curriculum = schoolCurriculumSchema.parse({
  schoolName: "감사 테스트 학교", cohorts: [{ entranceYear: "2028", label: "2028 입학생", grades: [{
    grade: 2, semesters: [{ semester: 1, requiredSubjects: [{ name: "문학", credits: 4 }],
      choiceGroups: [{ id: "science", label: "과학 선택", choose: 1, creditsEach: 3,
        subjects: [{ name: "물리학", credits: 3 }, { name: "생명과학", credits: 3 }] }],
    }],
  }] }],
});
const context = () => ({ params: Promise.resolve({ draftId: "audit-draft" }) });
function request(method: string, token = "audit-edit-token", data?: unknown) {
  return new Request("http://test.local/api/curricula/audit-draft", {
    method, headers: { "x-edit-token": token, "Content-Type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify({ curriculum: data }) }),
  });
}
afterAll(() => {
  // Only the uniquely created disposable test store is removed.
  if (state.path.startsWith(join(tmpdir(), "curriculum-persistence-")) && existsSync(state.path)) unlinkSync(state.path);
});

beforeEach(async () => {
  if (existsSync(state.path)) unlinkSync(state.path);
    await prisma.curriculumDraft.create({ data: {
      id: "audit-draft", schoolName: curriculum.schoolName, curriculumJson: curriculum,
      parsedText: "synthetic fixture", warnings: [], sourceSnippets: [], editToken: "audit-edit-token",
    } });
});

describe("curriculum routes with isolated persistent JSON store", () => {
  it("saves, reloads, publishes, and republishes the latest draft while retaining the share link", async () => {
    const edited = structuredClone(curriculum);
    edited.schoolName = "수정한 테스트 학교";
    edited.cohorts[0].grades[0].semesters[0].requiredSubjects[0].credits = 5;
    expect((await PUT(request("PUT", undefined, edited), context())).status).toBe(200);
    const loaded = await (await GET(request("GET"), context())).json();
    expect(loaded.curriculumJson).toEqual(edited);
    expect(loaded).not.toHaveProperty("editToken");
    // A fresh store instance reads disk, not a cached response or mocked update.
    const reloadedStore = createE2eJsonPrisma(state.path);
    expect((await reloadedStore.curriculumDraft.findUnique({ where: { id: "audit-draft" } }))?.curriculumJson).toEqual(edited);

    const published = await (await POST(request("POST"), context())).json();
    expect(published.shareUrl).toMatch(/^\/s\//);
    const shareToken = published.shareUrl.slice(3);
    expect((await reloadedStore.curriculumPublication.findUnique({ where: { shareToken } }))?.curriculumJson).toEqual(edited);
    edited.schoolName = "재게시 테스트 학교";
    expect((await PUT(request("PUT", undefined, edited), context())).status).toBe(200);
    expect((await reloadedStore.curriculumPublication.findUnique({ where: { shareToken } }))?.schoolName).toBe("수정한 테스트 학교");
    const republished = await (await POST(request("POST"), context())).json();
    expect(republished.shareUrl).toBe(published.shareUrl);
    expect((await reloadedStore.curriculumPublication.findUnique({ where: { shareToken } }))?.curriculumJson).toEqual(edited);
  });

  it("rejects unauthorized and invalid updates without altering stored curriculum", async () => {
    const before = await prisma.curriculumDraft.findUnique({ where: { id: "audit-draft" } });
    expect((await GET(request("GET", "wrong-token"), context())).status).toBe(404);
    expect((await PUT(request("PUT", "wrong-token", curriculum), context())).status).toBe(404);
    expect((await POST(request("POST", "wrong-token"), context())).status).toBe(404);
    const invalid = structuredClone(curriculum);
    invalid.cohorts[0].grades[0].semesters[0].requiredSubjects[0].credits = 0;
    expect((await PUT(request("PUT", undefined, invalid), context())).status).toBe(422);
    expect((await prisma.curriculumDraft.findUnique({ where: { id: "audit-draft" } }))?.curriculumJson).toEqual(before?.curriculumJson);
  });
});
