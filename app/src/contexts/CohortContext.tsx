"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type CohortYear = "2025" | "2026";

interface CohortContextType {
  cohort: CohortYear;
  setCohort: (year: CohortYear) => void;
  cohortLabel: string;
}

const CohortContext = createContext<CohortContextType | undefined>(undefined);

const cohortLabels: Record<CohortYear, string> = {
  "2025": "고2 (2025학번)",
  "2026": "고1 (2026학번)",
};

export function CohortProvider({ children }: { children: ReactNode }) {
  const [cohort, setCohort] = useState<CohortYear>("2026");

  return (
    <CohortContext.Provider
      value={{
        cohort,
        setCohort,
        cohortLabel: cohortLabels[cohort],
      }}
    >
      {children}
    </CohortContext.Provider>
  );
}

export function useCohort(): CohortContextType {
  const context = useContext(CohortContext);
  if (!context) {
    throw new Error("useCohort must be used within a CohortProvider");
  }
  return context;
}
