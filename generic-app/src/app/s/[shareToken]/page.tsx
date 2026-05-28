import { notFound } from "next/navigation";
import {
  schoolCurriculumSchema,
  type CurriculumGrade,
  type CurriculumSemester,
  type SchoolCurriculum,
} from "@/lib/curriculum/schema";
import { prisma } from "@/lib/db";

type SharePageProps = {
  params: Promise<{
    shareToken: string;
  }>;
};

type SemesterSummary = {
  key: string;
  cohortLabel: string;
  grade: number;
  semester: number;
  requiredCount: number;
  choiceCount: number;
  totalCount: number;
};

function countChoiceSubjects(semester: CurriculumSemester) {
  return semester.choiceGroups.reduce((total, group) => total + group.subjects.length, 0);
}

function summarizeSemester(
  cohortLabel: string,
  grade: CurriculumGrade,
  semester: CurriculumSemester,
): SemesterSummary {
  const requiredCount = semester.requiredSubjects.length;
  const choiceCount = countChoiceSubjects(semester);

  return {
    key: `${cohortLabel}-${grade.grade}-${semester.semester}`,
    cohortLabel,
    grade: grade.grade,
    semester: semester.semester,
    requiredCount,
    choiceCount,
    totalCount: requiredCount + choiceCount,
  };
}

function buildSemesterSummaries(curriculum: SchoolCurriculum) {
  return curriculum.cohorts.flatMap((cohort) =>
    cohort.grades.flatMap((grade) =>
      grade.semesters.map((semester) => summarizeSemester(cohort.label, grade, semester)),
    ),
  );
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareToken } = await params;
  const publication = await prisma.curriculumPublication.findUnique({
    where: {
      shareToken,
    },
    select: {
      curriculumJson: true,
    },
  });

  if (!publication) {
    notFound();
  }

  const validation = schoolCurriculumSchema.safeParse(publication.curriculumJson);

  if (!validation.success) {
    notFound();
  }

  const curriculum = validation.data;
  const semesterSummaries = buildSemesterSummaries(curriculum);
  const totalSubjects = semesterSummaries.reduce((total, summary) => total + summary.totalCount, 0);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto w-full max-w-5xl px-6 py-14 sm:px-10">
        <p className="text-sm font-semibold text-[var(--primary)]">학생 교육과정 안내</p>
        <h1 className="mt-4 text-4xl font-bold tracking-normal sm:text-5xl">
          {curriculum.schoolName} 선택 과목 안내
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700">
          입학 연도와 학년, 학기별로 필수 과목과 선택 과목 수를 정리했습니다. 실제 수강
          신청 전에는 학교의 최신 안내와 담임 선생님 안내를 함께 확인해 주세요.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-[var(--border)] bg-white p-5">
            <p className="text-sm font-semibold text-slate-600">입학 연도 묶음</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{curriculum.cohorts.length}</p>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-white p-5">
            <p className="text-sm font-semibold text-slate-600">학기 수</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{semesterSummaries.length}</p>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-white p-5">
            <p className="text-sm font-semibold text-slate-600">전체 과목 수</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{totalSubjects}</p>
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-md border border-[var(--border)] bg-white">
          <div className="grid grid-cols-5 gap-3 border-b border-[var(--border)] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <span>입학 연도</span>
            <span>학년</span>
            <span>학기</span>
            <span>필수</span>
            <span>선택</span>
          </div>
          {semesterSummaries.map((summary) => (
            <div
              key={summary.key}
              className="grid grid-cols-5 gap-3 border-b border-slate-200 px-4 py-4 text-sm last:border-b-0"
            >
              <span className="font-medium text-slate-900">{summary.cohortLabel}</span>
              <span>{summary.grade}학년</span>
              <span>{summary.semester}학기</span>
              <span>{summary.requiredCount}개</span>
              <span>{summary.choiceCount}개</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
