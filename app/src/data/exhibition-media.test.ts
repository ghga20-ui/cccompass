import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const {
  getExhibitionMedia,
  getPosterImageSrc,
  getVideoEmbedUrl,
  hasExhibitionPoster,
  hasExhibitionVideo,
  normalizeYouTubeVideoUrl,
  exhibitionMediaBySubjectId,
} = await import(new URL("./exhibition-media.ts", import.meta.url).href);

const subjectsPayload = JSON.parse(
  readFileSync(new URL("./json/subjects.json", import.meta.url), "utf8")
);
const subjectIds = new Set(subjectsPayload.subjects.map((subject: { id: string }) => subject.id));

test("handles unknown subject ids with a safe empty media state", () => {
  const media = getExhibitionMedia("non-existent-subject");

  assert.equal(media.posterImageSrc, null);
  assert.equal(media.videoUrl, null);
  assert.equal(media.studentPosterPriority, false);
  assert.deepEqual(media.notes, []);
  assert.equal(hasExhibitionPoster("non-existent-subject"), false);
  assert.equal(hasExhibitionVideo("non-existent-subject"), false);
  assert.equal(getPosterImageSrc("non-existent-subject"), null);
  assert.equal(getVideoEmbedUrl("non-existent-subject"), null);
});

test("includes Japanese and technology links as YouTube embeds", () => {
  const japanese = getExhibitionMedia("japanese");
  const tech = getExhibitionMedia("technology_and_home_economics");

  assert.equal(
    getVideoEmbedUrl("japanese"),
    "https://www.youtube.com/embed/NpG5wNY7314"
  );
  assert.equal(
    getVideoEmbedUrl("technology_and_home_economics"),
    "https://www.youtube.com/embed/KkZU175MDT0"
  );
  assert.equal(japanese.videoUrl, "https://youtu.be/NpG5wNY7314");
  assert.equal(tech.videoUrl, "https://youtu.be/KkZU175MDT0");
  assert.equal(hasExhibitionVideo("japanese"), true);
  assert.equal(hasExhibitionVideo("technology_and_home_economics"), true);
});

test("uses normalized URLs for short and watch formats", () => {
  assert.equal(
    normalizeYouTubeVideoUrl("https://youtu.be/NpG5wNY7314"),
    "https://www.youtube.com/embed/NpG5wNY7314"
  );
  assert.equal(
    normalizeYouTubeVideoUrl("https://www.youtube.com/watch?v=KkZU175MDT0"),
    "https://www.youtube.com/embed/KkZU175MDT0"
  );
  assert.equal(
    normalizeYouTubeVideoUrl("https://www.youtube.com/shorts/KkZU175MDT0"),
    "https://www.youtube.com/embed/KkZU175MDT0"
  );
  assert.equal(
    normalizeYouTubeVideoUrl("https://www.youtube.com/embed/KkZU175MDT0"),
    "https://www.youtube.com/embed/KkZU175MDT0"
  );
});

test("keeps language_life_and_hanja metadata with student poster priority", () => {
  const mediaId = "language_life_and_hanja";
  const media = getExhibitionMedia(mediaId);

  assert.ok(subjectIds.has(mediaId));
  assert.equal(
    Object.prototype.hasOwnProperty.call(exhibitionMediaBySubjectId, mediaId),
    true
  );
  assert.equal(media.studentPosterPriority, true);
  assert.equal(
    media.studentPosterImageSrc,
    "/exhibition/student-posters/language_life_and_hanja.png"
  );
  assert.equal(hasExhibitionPoster(mediaId), true);
  assert.equal(media.videoUrl, "https://www.youtube.com/embed/efn9r3EtigI");
  assert.equal(media.notes.includes("Student-made poster should be used when available."), true);
});
