import { prisma } from "@/lib/db";
import {
  hyojaGradeFilterCurriculum,
  task11DraftId,
  task11EditToken,
  task11ShareToken,
} from "../fixtures/hyoja-grade-filter-curriculum";

export async function resetTestDatabase(): Promise<void> {
  await prisma.curriculumPublication.deleteMany();
  await prisma.curriculumDraft.deleteMany();
}

export async function seedPublicCurriculum(): Promise<void> {
  await resetTestDatabase();

  await prisma.curriculumDraft.create({
    data: {
      id: task11DraftId,
      schoolName: hyojaGradeFilterCurriculum.schoolName,
      status: "published",
      curriculumJson: hyojaGradeFilterCurriculum,
      parsedText: "E2E seeded curriculum",
      warnings: [],
      sourceSnippets: ["E2E seeded curriculum"],
      editToken: task11EditToken,
      publication: {
        create: {
          schoolName: hyojaGradeFilterCurriculum.schoolName,
          curriculumJson: hyojaGradeFilterCurriculum,
          shareToken: task11ShareToken,
          editToken: task11EditToken,
        },
      },
    },
  });
}

export async function closeTestDatabase(): Promise<void> {
  return Promise.resolve();
}
