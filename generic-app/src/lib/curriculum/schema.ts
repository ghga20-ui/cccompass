import { z } from "zod";

export const subjectCategorySchema = z.enum([
  "공통",
  "일반선택",
  "진로선택",
  "융합선택",
  "전문교과",
  "기타",
]);

export const curriculumSubjectSchema = z.object({
  name: z.string().trim().min(1),
  area: z.string().trim().min(1).optional(),
  category: subjectCategorySchema.optional(),
  credits: z.number().positive(),
  rawText: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const choiceGroupSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    choose: z.number().int().positive(),
    minChoose: z.number().int().positive().optional(),
    maxChoose: z.number().int().positive().optional(),
    creditsEach: z.number().positive().optional(),
    subjects: z.array(curriculumSubjectSchema).min(1),
    notes: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .superRefine((group, ctx) => {
    if (group.choose > group.subjects.length) {
      ctx.addIssue({
        code: "custom",
        message: "choose cannot exceed the number of subjects",
        path: ["choose"],
      });
    }

    if (group.minChoose !== undefined && group.minChoose > group.choose) {
      ctx.addIssue({
        code: "custom",
        message: "minChoose cannot exceed choose",
        path: ["minChoose"],
      });
    }

    if (group.maxChoose !== undefined && group.choose > group.maxChoose) {
      ctx.addIssue({
        code: "custom",
        message: "choose cannot exceed maxChoose",
        path: ["choose"],
      });
    }

    if (
      group.minChoose !== undefined &&
      group.maxChoose !== undefined &&
      group.minChoose > group.maxChoose
    ) {
      ctx.addIssue({
        code: "custom",
        message: "minChoose cannot exceed maxChoose",
        path: ["minChoose"],
      });
    }

    if (group.maxChoose !== undefined && group.maxChoose > group.subjects.length) {
      ctx.addIssue({
        code: "custom",
        message: "maxChoose cannot exceed the number of subjects",
        path: ["maxChoose"],
      });
    }
  });

export const curriculumSemesterSchema = z.object({
  semester: z.union([z.literal(1), z.literal(2)]),
  // LLM이 빈 배열을 생략해도 파싱이 깨지지 않도록 기본값 부여(출력 타입은 그대로 배열).
  requiredSubjects: z.array(curriculumSubjectSchema).default([]),
  choiceGroups: z.array(choiceGroupSchema).default([]),
});

export const curriculumGradeSchema = z.object({
  grade: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  semesters: z.array(curriculumSemesterSchema).min(1),
});

export const curriculumCohortSchema = z.object({
  entranceYear: z.string().trim().min(4),
  label: z.string().trim().min(1),
  grades: z.array(curriculumGradeSchema).min(1),
});

export const schoolCurriculumSchema = z.object({
  schoolName: z.string().trim().min(1),
  sourceYear: z.string().trim().min(1).optional(),
  cohorts: z.array(curriculumCohortSchema).min(1),
});

export type SubjectCategory = z.infer<typeof subjectCategorySchema>;
export type CurriculumSubject = z.infer<typeof curriculumSubjectSchema>;
export type ChoiceGroup = z.infer<typeof choiceGroupSchema>;
export type CurriculumSemester = z.infer<typeof curriculumSemesterSchema>;
export type CurriculumGrade = z.infer<typeof curriculumGradeSchema>;
export type CurriculumCohort = z.infer<typeof curriculumCohortSchema>;
export type SchoolCurriculum = z.infer<typeof schoolCurriculumSchema>;
