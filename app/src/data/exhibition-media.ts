import exhibitionMediaManifest from "./json/exhibition-media-manifest.json" with { type: "json" };

export interface ExhibitionMedia {
  readonly subjectId: string;
  readonly videoUrl: string | null;
  readonly posterImageSrc: string | null;
  readonly studentPosterImageSrc: string | null;
  readonly studentPosterPriority: boolean;
  readonly notes: readonly string[];
}

export interface ExhibitionMediaManifest {
  readonly [subjectId: string]: ExhibitionMedia;
}

const safeYouTubeId = /^[A-Za-z0-9_-]{6,}$/;
const safeEmptyExhibitionMedia: Omit<ExhibitionMedia, "subjectId"> = {
  videoUrl: null,
  posterImageSrc: null,
  studentPosterImageSrc: null,
  studentPosterPriority: false,
  notes: [],
};

export const exhibitionMediaBySubjectId =
  exhibitionMediaManifest as ExhibitionMediaManifest;

export function normalizeYouTubeVideoUrl(
  rawVideoUrl: string | null
): string | null {
  if (!rawVideoUrl) return null;

  const trimmedUrl = rawVideoUrl.trim();
  if (!trimmedUrl) return null;

  if (safeYouTubeId.test(trimmedUrl)) {
    return `https://www.youtube.com/embed/${trimmedUrl}`;
  }

  try {
    const parsed = new URL(trimmedUrl);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      return safeYouTubeId.test(id) ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (parsed.pathname === "/watch") {
        const id = parsed.searchParams.get("v");
        return id && safeYouTubeId.test(id)
          ? `https://www.youtube.com/embed/${id}`
          : null;
      }

      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (
        pathParts.length > 0 &&
        (pathParts[0] === "embed" || pathParts[0] === "shorts")
      ) {
        const id = pathParts[1];
        return id && safeYouTubeId.test(id)
          ? `https://www.youtube.com/embed/${id}`
          : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getExhibitionMedia(subjectId: string): ExhibitionMedia {
  const media = exhibitionMediaBySubjectId[subjectId];

  if (!media) {
    return { ...safeEmptyExhibitionMedia, subjectId };
  }

  return media;
}

export function getPosterImageSrc(subjectId: string): string | null {
  const media = getExhibitionMedia(subjectId);
  return media.studentPosterImageSrc ?? media.posterImageSrc;
}

export function getVideoEmbedUrl(subjectId: string): string | null {
  const media = getExhibitionMedia(subjectId);
  return normalizeYouTubeVideoUrl(media.videoUrl);
}

export function hasExhibitionPoster(subjectId: string): boolean {
  return Boolean(getPosterImageSrc(subjectId));
}

export function hasExhibitionVideo(subjectId: string): boolean {
  return Boolean(getVideoEmbedUrl(subjectId));
}
