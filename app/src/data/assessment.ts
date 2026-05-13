import type { Subject } from "./subjects";

type AssessmentSubject = Pick<Subject, "area" | "category" | "name">;

export interface AssessmentBadge {
  label: string;
  color: string;
}

function isSocialOrScienceArea(area: string): boolean {
  return area === "사회" || area === "사회(역사/도덕 포함)" || area === "과학";
}

export function getAssessmentBadge(subject: AssessmentSubject): AssessmentBadge {
  const { area, category, name } = subject;

  if (area === "교양") {
    return { label: "P/F", color: "bg-gray-100 text-gray-600" };
  }

  if (area === "체육" || area === "예술" || name.includes("과학탐구실험")) {
    return { label: "A·B·C", color: "bg-amber-50 text-amber-700" };
  }

  if (category === "융합선택" && isSocialOrScienceArea(area)) {
    return { label: "A·B·C·D·E", color: "bg-sky-50 text-sky-700" };
  }

  return { label: "5등급", color: "bg-rose-50 text-rose-700" };
}
