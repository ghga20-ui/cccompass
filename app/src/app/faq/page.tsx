"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  {
    q: "추천 과목은 어떤 자료를 근거로 하나요?",
    a: "두 가지 자료를 씁니다. ① 계열별 추천 과목의 뼈대는 서울진로진학정보센터의 「2022 개정 교육과정 선택 과목 안내서」입니다. ② 각 과목이 대학에서 얼마나 요구되는지는 한국대학교육협의회(대교협)가 발표한 「2028학년도 권역별 대학별 권장과목」(전국 47개 대학)과 대조해 확인합니다. 두 자료를 교차 검증해, 안내서가 추천하지만 대학 요구 근거가 없는 과목과 대학이 요구하지만 빠진 과목을 점검했습니다.",
  },
  {
    q: "과목에 붙은 「핵심 N개교」·「권장 M개교」는 무슨 뜻인가요?",
    a: "선택한 계열의 모집단위를 기준으로, 대교협 자료에서 그 과목을 '핵심과목'(필수적 이수 권장) 또는 '권장과목'으로 지정한 대학의 수입니다. 예를 들어 「핵심 15개교」는 그 계열에서 15개 대학이 해당 과목을 핵심과목으로 제시했다는 뜻입니다. 뱃지가 없는 과목은 대입 반영과목 목록에는 없지만, 탐구·역량 강화에 도움이 되는 추천 과목입니다.",
  },
  {
    q: "로드맵의 '대학 핵심과목 N%'는 어떻게 계산되나요?",
    a: "선택한 계열에서 여러 대학(3개교 이상)이 핵심과목으로 꼽은 과목 중, 우리 학교에서 들을 수 있는 과목을 기준(분모)으로, 현재 로드맵에 담은 과목의 비율입니다. 학교에 개설되지 않은 과목은 계산에서 빼되 따로 안내합니다.",
  },
  {
    q: "이 추천만 따르면 대학에 갈 수 있나요?",
    a: "아닙니다. 대교협 자료는 「필수 이수 기준」이 아니라 참고용 안내이며, 대교협도 이를 명시하고 있습니다. 실제 지원 대학·학과의 최신 모집요강을 반드시 함께 확인하세요. 이 서비스는 3년간의 과목 선택 로드맵을 설계하는 데 방향을 잡아주는 도구입니다.",
  },
  {
    q: "자료는 언제 기준이고 얼마나 자주 갱신되나요?",
    a: "현재 반영과목 자료는 대교협이 2026년 2월 발표한 「2028학년도 권역별 대학별 권장과목」 기준입니다. 이 자료는 확정본이 아니라 대학별 발표에 따라 수시로 갱신되므로, 대학 수·과목은 이후 변동될 수 있습니다.",
  },
  {
    q: "우리 학교에 없는 과목이 추천되면 어떻게 하나요?",
    a: "공동교육과정(다른 학교·거점센터에서 수강), 온라인학교, 소인수 과목 개설 요청 등을 학교 선생님과 상담해보세요. 로드맵의 커버리지에서도 '우리 학교 미개설' 과목을 따로 표시합니다.",
  },
  {
    q: "프로그래밍 같은 전문교과는 어떤 근거로 추천되나요?",
    a: "대교협 「2028학년도 권역별 대학별 권장과목」은 대입에 반영되는 보통교과(국어·수학·영어·탐구) 위주로 작성되어 전문교과를 다루지 않습니다. 자료에 없다는 것이 '권장하지 않는다'는 뜻은 아닙니다. 전문교과 추천은 두 가지 근거로 표시됩니다. 첫째, 우리 학교가 실제로 개설한 과목입니다. 둘째, 과목이 속한 전문교과 계열이 선택한 관심 계열과 일치합니다. 대학별 반영과목 근거가 아니므로 「핵심과목 지정 N개교」 배지가 붙지 않습니다.",
  },
];

function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-foreground">{faq.q}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-dvh pb-16">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link href="/" className="shrink-0 p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <h1 className="text-base font-semibold text-foreground">자주 묻는 질문</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          추천 과목의 근거와 자료 출처에 대한 안내입니다.
        </p>
        <div className="space-y-2.5">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} faq={faq} />
          ))}
        </div>
      </div>
    </div>
  );
}
