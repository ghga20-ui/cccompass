"use client";

import Link from "next/link";
import { GraduationCap, Upload } from "lucide-react";
import { BrandLogo } from "@/components/Logo";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TutorialPlayer } from "@/components/tutorial/TutorialPlayer";
import { teacherTutorial } from "@/components/tutorial/data/teacher";
import { studentTutorial } from "@/components/tutorial/data/student";

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-6">
        <Link href="/" className="inline-flex">
          <BrandLogo size="md" />
        </Link>
        <Link
          href="/create"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--cta)] px-3.5 py-2 text-sm font-semibold text-[var(--cta-foreground)] shadow-sm transition hover:brightness-95"
        >
          <Upload className="h-4 w-4" />
          편제표 올리고 시작하기
        </Link>
      </header>

      <section className="mx-auto w-full max-w-3xl px-6 pt-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          커리컴퍼스 사용법
        </h1>
        <p className="mt-2.5 text-sm leading-6 text-slate-600 sm:text-base">
          편제표를 올리는 선생님도, 로드맵을 짜는 학생도 직접 따라 해볼 수
          있습니다. 강조된 곳을 눌러 한 단계씩 진행하세요.
        </p>
      </section>

      <Tabs
        defaultValue="teacher"
        className="mx-auto mt-8 w-full max-w-3xl items-center px-6 pb-4"
      >
        <TabsList className="mx-auto">
          <TabsTrigger value="teacher" className="gap-1.5 px-4">
            <Upload className="h-4 w-4" />
            선생님용
          </TabsTrigger>
          <TabsTrigger value="student" className="gap-1.5 px-4">
            <GraduationCap className="h-4 w-4" />
            학생용
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teacher" keepMounted className="mt-6 w-full">
          <p className="mb-4 text-center text-sm text-slate-600">
            {teacherTutorial.intro}
          </p>
          <TutorialPlayer def={teacherTutorial} />
        </TabsContent>

        <TabsContent value="student" keepMounted className="mt-6 w-full">
          <p className="mb-1 text-center text-sm text-slate-600">
            {studentTutorial.intro}
          </p>
          <p className="mb-4 text-center text-xs text-muted-foreground">
            효자고등학교 예시 화면입니다.
          </p>
          <TutorialPlayer def={studentTutorial} />
        </TabsContent>
      </Tabs>

      <Footer />
    </main>
  );
}
