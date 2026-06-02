import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type {
  ExhibitionAudience,
  ExhibitionOffering,
} from "@/data/exhibition-placement";
import { getPosterImageSrc, hasExhibitionVideo } from "@/data/exhibition-media";
import {
  getExhibitionDisplayArea,
  type ExhibitionSubject,
} from "@/data/exhibition-subjects";
import { buildSubjectDetailHref } from "@/lib/subject-navigation";

interface ExhibitionSubjectCardProps {
  readonly subject: ExhibitionSubject;
  readonly audience: ExhibitionAudience;
  readonly offerings: readonly ExhibitionOffering[];
}

function offeringLabel(offerings: readonly ExhibitionOffering[]): string {
  if (offerings.length === 0) return "편제 확인 필요";
  return offerings
    .map((offering) => `${offering.grade}학년 ${offering.semester}학기`)
    .join(", ");
}

export function ExhibitionSubjectCard({
  subject,
  audience,
  offerings,
}: ExhibitionSubjectCardProps) {
  const posterImageSrc = getPosterImageSrc(subject.id);
  const detailHref = buildSubjectDetailHref(subject.id, "/exhibition");
  const visibleDescription =
    subject.description || "과목 상세에서 소개 자료를 확인해 보세요.";
  const displayArea = getExhibitionDisplayArea(subject);

  return (
    <Link
      href={detailHref}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:shadow-md active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] bg-muted/40">
        {posterImageSrc ? (
          <Image
            src={posterImageSrc}
            alt={`${subject.name} 포스터 미리보기`}
            fill
            sizes="(max-width: 768px) 90vw, 360px"
            className="object-cover object-top"
          />
        ) : (
          <div className="flex h-full flex-col justify-center p-5">
            <p className="text-xs font-semibold text-[var(--primary)]">
              {displayArea}
            </p>
            <p className="mt-2 text-xl font-black text-foreground">
              {subject.name}
            </p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {visibleDescription}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] font-normal">
            {displayArea}
          </Badge>
          <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] text-[10px]">
            {subject.category}
          </Badge>
          {hasExhibitionVideo(subject.id) ? (
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
              영상
            </Badge>
          ) : null}
        </div>

        <h3 className="mt-3 text-base font-bold text-foreground">
          {subject.name}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {visibleDescription}
        </p>
        <p className="mt-auto pt-4 text-xs font-semibold text-[var(--primary)]">
          {audience === "grade1" ? "1학년 기준" : "2학년 기준"} ·{" "}
          {offeringLabel(offerings)}
        </p>
      </div>
    </Link>
  );
}
