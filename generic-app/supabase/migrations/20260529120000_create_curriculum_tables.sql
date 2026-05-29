-- Initial schema for the generic curriculum assistant.

CREATE TABLE IF NOT EXISTS "CurriculumDraft" (
  "id" TEXT NOT NULL,
  "schoolName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "curriculumJson" JSONB NOT NULL,
  "parsedText" TEXT NOT NULL,
  "warnings" JSONB NOT NULL,
  "sourceSnippets" JSONB NOT NULL,
  "editToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CurriculumPublication" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "schoolName" TEXT NOT NULL,
  "curriculumJson" JSONB NOT NULL,
  "shareToken" TEXT NOT NULL,
  "editToken" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CurriculumDraft_editToken_key"
  ON "CurriculumDraft"("editToken");

CREATE UNIQUE INDEX IF NOT EXISTS "CurriculumPublication_draftId_key"
  ON "CurriculumPublication"("draftId");

CREATE UNIQUE INDEX IF NOT EXISTS "CurriculumPublication_shareToken_key"
  ON "CurriculumPublication"("shareToken");

CREATE UNIQUE INDEX IF NOT EXISTS "CurriculumPublication_editToken_key"
  ON "CurriculumPublication"("editToken");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CurriculumPublication_draftId_fkey'
  ) THEN
    ALTER TABLE "CurriculumPublication"
      ADD CONSTRAINT "CurriculumPublication_draftId_fkey"
      FOREIGN KEY ("draftId")
      REFERENCES "CurriculumDraft"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;
