"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

export type CohortYear = string;

export interface CohortOption {
  entranceYear: string;
  label: string;
}

interface CohortContextType {
  cohort: CohortYear;
  setCohort: (year: CohortYear) => void;
  cohortLabel: string;
  cohortOptions: CohortOption[];
}

const CohortContext = createContext<CohortContextType | undefined>(undefined);

function firstCohort(cohorts: CohortOption[]) {
  return cohorts[0]?.entranceYear ?? "";
}

export function CohortProvider({
  children,
  cohorts = [],
  initialCohort,
}: {
  children: ReactNode;
  cohorts?: CohortOption[];
  initialCohort?: string;
}) {
  const initial = useMemo(() => {
    if (initialCohort && cohorts.some((cohort) => cohort.entranceYear === initialCohort)) {
      return initialCohort;
    }
    return firstCohort(cohorts);
  }, [cohorts, initialCohort]);
  const [cohort, setCohort] = useState<CohortYear>(initial);
  const cohortLabel =
    cohorts.find((option) => option.entranceYear === cohort)?.label ?? cohort;

  return (
    <CohortContext.Provider
      value={{
        cohort,
        setCohort,
        cohortLabel,
        cohortOptions: cohorts,
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
