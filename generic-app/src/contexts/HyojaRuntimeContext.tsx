"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { StudentSchoolData } from "@/lib/hyoja/school-adapter";
import type { SubjectCatalog } from "@/lib/hyoja/subject-catalog";
import { normalizeShareBasePath } from "@/lib/hyoja/share-routes";

interface HyojaRuntimeContextType {
  shareToken: string;
  basePath: string;
  schoolData: StudentSchoolData;
  subjectCatalog: SubjectCatalog;
}

const HyojaRuntimeContext = createContext<HyojaRuntimeContextType | undefined>(
  undefined,
);

export function HyojaRuntimeProvider({
  children,
  shareToken,
  schoolData,
  subjectCatalog,
  basePath,
}: {
  children: ReactNode;
  shareToken: string;
  schoolData: StudentSchoolData;
  subjectCatalog: SubjectCatalog;
  basePath?: string;
}) {
  const runtime = useMemo<HyojaRuntimeContextType>(
    () => ({
      shareToken,
      basePath: normalizeShareBasePath(
        basePath ?? `/s/${encodeURIComponent(shareToken)}`,
      ),
      schoolData,
      subjectCatalog,
    }),
    [basePath, schoolData, shareToken, subjectCatalog],
  );

  return (
    <HyojaRuntimeContext.Provider value={runtime}>
      {children}
    </HyojaRuntimeContext.Provider>
  );
}

export function useHyojaRuntime(): HyojaRuntimeContextType {
  const context = useContext(HyojaRuntimeContext);
  if (!context) {
    throw new Error("useHyojaRuntime must be used within a HyojaRuntimeProvider");
  }
  return context;
}
