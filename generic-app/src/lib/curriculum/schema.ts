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

export const choiceGroupSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  choose: z.number().int().positive(),
  minChoose: z.number().int().positive().optional(),
  maxChoose: z.number().int().positive().optional(),
  creditsEach: z.number().positive().optional(),
  subjects: z.array(curriculumSubjectSchema).min(1),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const semesterSchema = z.object({
  semester: z.union([z.literal(1), z.literal(2)]),
  requiredSubjects: z.array(curriculumSubjectSchema),
  choiceGroups: z.array(choiceGroupSchema),
});

export const gradeSchema = z.object({
  grade: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  semesters: z.array(semesterSchema).min(1),
});

export const cohortSchema = z.object({
  entranceYear: z.number().int().min(4),
  label: z.string().trim().min(1),
  grades: z.array(gradeSchema).min(1),
});

export const curriculumSchoolSchema = z.object({
  schoolName: z.string().trim().min(1),
  sourceYear: z.number().int().optional(),
  cohorts: z.array(cohortSchema).min(1),
});

export type SubjectCategory = z.infer<typeof subjectCategorySchema>;
export type CurriculumSubject = z.infer<typeof curriculumSubjectSchema>;
export type ChoiceGroup = z.infer<typeof choiceGroupSchema>;
export type Semester = z.infer<typeof semesterSchema>;
export type Grade = z.infer<typeof gradeSchema>;
export type Cohort = z.infer<typeof cohortSchema>;
export type CurriculumSchool = z.infer<typeof curriculumSchoolSchema>;
