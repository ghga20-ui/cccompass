import Link from "next/link";
import { BookOpen, Compass, Map } from "lucide-react";

const portalActions = [
  {
    href: "/exhibition",
    title: "과목 둘러보기",
    description: "영상과 포스터로 선택과목을 한눈에 확인해요.",
    icon: BookOpen,
  },
  {
    href: "/recommend",
    title: "추천받기",
    description: "관심 분야와 진로에 맞는 과목을 찾아요.",
    icon: Compass,
  },
  {
    href: "/roadmap",
    title: "로드맵 보기",
    description: "학년별 선택 흐름과 조합을 살펴봐요.",
    icon: Map,
  },
] as const;

export function PortalActionCards() {
  return (
    <section className="px-5 pb-5">
      <div className="mx-auto grid max-w-lg gap-2.5 sm:grid-cols-3">
        {portalActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-[var(--primary)]/40 hover:shadow-md active:scale-[0.98]"
          >
            <action.icon className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="mt-3 text-sm font-bold text-foreground">
              {action.title}
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              {action.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
