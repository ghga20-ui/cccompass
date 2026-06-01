"use client";

import { useHyojaRuntime } from "@/contexts/HyojaRuntimeContext";

export default function ShareHomePage() {
  const { schoolData } = useHyojaRuntime();

  return (
    <section className="mx-auto max-w-lg px-5 py-6">
      <div className="flex items-center gap-3">
        <img
          src="/school-logo.png"
          alt=""
          className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
        />
        <div>
          <p className="text-sm font-medium text-primary">{schoolData.schoolName}</p>
          <h1 className="text-2xl font-bold tracking-normal text-foreground">
            나에게 맞는 선택과목을 찾아보자
          </h1>
        </div>
      </div>
    </section>
  );
}
