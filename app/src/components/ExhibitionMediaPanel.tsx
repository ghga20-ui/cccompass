import Image from "next/image";
import Link from "next/link";
import { ExternalLink, FileImage, PlayCircle } from "lucide-react";
import {
  getExhibitionMedia,
  getPosterImageSrc,
  getVideoEmbedUrl,
} from "@/data/exhibition-media";

interface ExhibitionMediaPanelProps {
  readonly subjectId: string;
  readonly subjectName: string;
}

export function ExhibitionMediaPanel({
  subjectId,
  subjectName,
}: ExhibitionMediaPanelProps) {
  const media = getExhibitionMedia(subjectId);
  const posterImageSrc = getPosterImageSrc(subjectId);
  const videoEmbedUrl = getVideoEmbedUrl(subjectId);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <PlayCircle className="h-4 w-4 text-[var(--primary)]" />
        <h3 className="text-sm font-semibold text-foreground">온라인 전시 자료</h3>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {media.videoUrl ? (
          <Link
            href={media.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-sm font-bold text-white"
          >
            영상 보기
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="min-h-11 rounded-xl bg-muted px-3 text-sm font-bold text-muted-foreground"
          >
            영상 준비 중
          </button>
        )}

        {posterImageSrc ? (
          <Link
            href={posterImageSrc}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--primary)] bg-white px-3 text-sm font-bold text-[var(--primary)]"
          >
            포스터 보기
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="min-h-11 rounded-xl border border-border bg-muted px-3 text-sm font-bold text-muted-foreground"
          >
            포스터 준비 중
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/30">
          {videoEmbedUrl ? (
            <iframe
              className="aspect-video w-full"
              src={videoEmbedUrl}
              title={`${subjectName} 과목 소개 영상`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="flex aspect-video items-center justify-center px-5 text-center text-sm font-medium text-muted-foreground">
              영상 준비 중입니다.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          {posterImageSrc ? (
            <Link
              href={posterImageSrc}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <div className="relative mx-auto aspect-[3/4] max-h-[420px] overflow-hidden rounded-lg border border-border/60 bg-white">
                <Image
                  src={posterImageSrc}
                  alt={`${subjectName} 포스터`}
                  fill
                  sizes="(max-width: 768px) 90vw, 420px"
                  className="object-cover object-top"
                />
              </div>
              <span className="mt-3 block text-center text-sm font-semibold text-[var(--primary)]">
                포스터 크게 보기
              </span>
            </Link>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-lg bg-card px-5 text-center">
              <FileImage className="h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-semibold text-foreground">
                포스터 준비 중입니다.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                현재는 과목 상세 정보를 먼저 확인해 주세요.
              </p>
            </div>
          )}

          {media.studentPosterPriority ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              학생 제작 포스터를 우선 게시했습니다.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
