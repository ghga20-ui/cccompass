import Image from "next/image";
import Link from "next/link";
import { ExternalLink, FileImage } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPosterImageSrc } from "@/lib/hyoja/exhibition-media";

interface ExhibitionMediaPanelProps {
  readonly subjectId: string;
  readonly subjectName: string;
}

/**
 * 과목 상세에 표시되는 '선택과목 전시 포스터' 패널.
 * 포스터가 있는 과목에서만 렌더링(없으면 null) — 전시관에서 넘어온 과목의
 * 전시 자료를 과목 페이지에서도 그대로 볼 수 있게 한다(효자고 원본 동작 복원).
 */
export function ExhibitionMediaPanel({
  subjectId,
  subjectName,
}: ExhibitionMediaPanelProps) {
  const posterImageSrc = getPosterImageSrc(subjectId);
  if (!posterImageSrc) return null;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileImage className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="text-sm font-semibold text-foreground">
              선택과목 전시 포스터
            </h3>
          </div>
          <Link
            href={posterImageSrc}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
          >
            크게 보기
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Link href={posterImageSrc} target="_blank" rel="noreferrer" className="block">
          <div className="relative mx-auto aspect-[3/4] max-h-[440px] overflow-hidden rounded-lg border border-border/60 bg-white">
            <Image
              src={posterImageSrc}
              alt={`${subjectName} 전시 포스터`}
              fill
              sizes="(max-width: 768px) 90vw, 440px"
              className="object-cover object-top"
            />
          </div>
        </Link>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          학생들이 만든 과목 소개 포스터예요.
        </p>
      </CardContent>
    </Card>
  );
}
