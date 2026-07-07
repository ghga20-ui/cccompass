# Generic Curriculum Assistant Design

## Goal

Build a separate web app that lets a teacher upload a school's curriculum table and publish a school-specific elective-subject assistant. The current Hyoja High School app remains unchanged. The new app reuses its product ideas: subject list, career and department recommendations, and a three-year roadmap.

## MVP Scope

The MVP serves two users.

Teachers upload a curriculum document, review the parsed result, fix mistakes, and publish the school assistant. After publication, the app issues two links: a public student link and a private teacher edit link.

Students open the public link without logging in. They see the assistant configured for their school, not for Hyoja High School.

The MVP includes:

- Document upload for curriculum tables.
- Server-side document parsing for PDF, HWP, HWPX, XLSX, and DOCX when a parser is available.
- LLM conversion from parsed text or tables into a standard curriculum JSON shape.
- Teacher review and correction before publication.
- DB-backed published school versions.
- Public student links and private teacher edit links.
- Student pages for subject list, career or department recommendation, and three-year roadmap.

The MVP excludes:

- Student accounts.
- Teacher email login.
- Billing.
- Chatbot counseling.
- Multi-school admin dashboards.
- Perfect automatic parsing without teacher review.

## Recommended Approach

Create a new Next.js full-stack project instead of modifying the current Hyoja app in place. The existing app imports static JSON and contains Hyoja-specific labels, cohort assumptions, and assets. A new project can treat school curriculum data as runtime data from the start.

Implementation should still proceed in milestones:

1. Build upload, parsing, LLM structuring, and teacher review.
2. Add DB storage, publication, and share links.
3. Add the student subject list, recommendation, and roadmap screens.

This keeps the highest-risk part, curriculum extraction, visible early.

## Architecture

The app has five bounded parts.

The teacher creation flow starts at `/create`. It accepts a file upload, shows parsing progress, opens a review screen, and ends with published links.

The document parser runs on the server. The browser uploads the file to the app; the server saves it temporarily and calls a parser such as kordoc or an equivalent service. The parser returns Markdown, tables, or extracted text. The browser never calls MCP tools directly.

The LLM structuring service converts parsed content into `SchoolCurriculum`. It also reports low-confidence fields, unresolved rows, and source snippets for review.

The database stores draft curricula, published versions, public share tokens, private edit tokens, parse status, and normalized school data. Original uploaded files are deleted after parsing and structuring.

The student runtime serves `/s/[shareToken]`. It loads the published curriculum from the DB and renders the assistant against that school data.

## Data Model

Use a stricter version of the current `school.json` concept. Keep the distinction between required subjects and choice groups, but model grades, semesters, confidence, and raw evidence explicitly.

```ts
type SchoolCurriculum = {
  schoolName: string;
  sourceYear?: string;
  cohorts: CurriculumCohort[];
};

type CurriculumCohort = {
  entranceYear: string;
  label: string;
  grades: CurriculumGrade[];
};

type CurriculumGrade = {
  grade: 1 | 2 | 3;
  semesters: CurriculumSemester[];
};

type CurriculumSemester = {
  semester: 1 | 2;
  requiredSubjects: CurriculumSubject[];
  choiceGroups: ChoiceGroup[];
};

type CurriculumSubject = {
  name: string;
  area?: string;
  category?: "공통" | "일반선택" | "진로선택" | "융합선택" | "전문교과" | "기타";
  credits: number;
  rawText?: string;
  confidence?: number;
};

type ChoiceGroup = {
  id: string;
  label: string;
  choose: number;
  minChoose?: number;
  maxChoose?: number;
  creditsEach?: number;
  subjects: CurriculumSubject[];
  notes?: string[];
  confidence?: number;
};
```

The model uses these rules:

- Required subjects and elective choice groups stay separate.
- "Choose N" rules map to `choose`, `minChoose`, and `maxChoose`.
- Ambiguous grade, semester, credit, or choice rules keep their raw text and receive low confidence.
- Subject names are matched against a common subject dataset when possible.
- Unmatched subjects remain available school subjects.
- Special programs such as joint curriculum or online courses are preserved in `notes` and categorized as `기타` when the app cannot classify them safely.

## Parsing And LLM Flow

The upload pipeline is semi-automatic.

1. The teacher uploads a curriculum file.
2. The server stores the file in temporary storage.
3. The parser detects the document type and extracts Markdown, text, and tables.
4. The server deletes the original upload after extraction and structuring.
5. The LLM receives the extracted content plus a schema and examples.
6. The LLM returns structured JSON, confidence scores, unresolved items, and source snippets.
7. The server validates the JSON shape.
8. The teacher reviews the result before publication.

The LLM must not silently guess critical fields. It should mark uncertainty when it cannot determine:

- School name.
- Entrance year or cohort.
- Grade.
- Semester.
- Credit count.
- Required versus elective status.
- Choice-group rule.
- Whether two labels refer to one combined subject or two separate subjects.

## Teacher Review UI

The review screen is the safety layer.

It shows a grade-by-semester grid. Each semester contains required subjects and choice groups. Teachers can edit school name, cohort label, subject name, credit, area, category, group label, and choose count.

Low-confidence items appear with warning indicators and source snippets. The teacher can accept, edit, move, split, merge, or delete items. The UI should make the common fixes fast: changing a group from `택1` to `택2`, moving a subject to another semester, and renaming a subject to match the common dataset.

The app blocks publication until required fields are valid:

- School name exists.
- At least one cohort exists.
- Each subject has a name.
- Each subject has a positive credit value.
- Each choice group has at least one subject.
- Each choice group has a valid choose rule.

## Student Experience

The student link opens a school-branded assistant based on the published data.

The subject list shows all subjects available at the school, with filters for grade, semester, area, category, and available status. When a subject matches the common dataset, the page shows the common description, related careers, related departments, and assessment information.

The recommendation page combines common career or department recommendation data with the school curriculum. It prioritizes subjects actually offered by the uploaded school. It separates unavailable recommended subjects so students do not mistake national guidance for school availability.

The roadmap page lets students build a three-year course plan. Required subjects are fixed. Choice groups enforce their choose rules. The page warns about missing choices, over-selection, credit issues, and unavailable subjects.

## Privacy And Retention

Original uploaded files are temporary processing inputs. The app deletes them after parsing and LLM structuring. The database keeps only extracted text needed for review, structured curriculum data, parse logs, and publication metadata.

The edit link is a long random token. Anyone with the edit link can change the draft or published school data. This is acceptable for the MVP because it avoids account infrastructure, but the UI should warn teachers to keep the edit link private.

## Error Handling

The upload flow handles these failure classes:

- Unsupported file type: reject before parsing.
- Parser failure: show a clear message and allow re-upload.
- Empty extraction: ask the teacher to try another file or upload an Excel version.
- LLM schema failure: retry once with the validation error, then show a failure state.
- Low-confidence extraction: allow review but require teacher confirmation.
- Publication validation failure: highlight fields that block publication.

The app should never publish a raw LLM result without teacher confirmation.

## Testing And Verification

The parsing pipeline needs fixture tests with representative files:

- A clean Excel curriculum table.
- A PDF with table extraction.
- An HWPX file with merged cells.
- A malformed or unsupported file.

Schema validation tests should reject missing school names, invalid credit values, empty choice groups, and invalid choose counts.

Student-page tests should cover:

- Offered recommended subjects appear first.
- Unavailable recommended subjects are separated.
- Roadmap choice groups enforce `choose`.
- Public links load only published versions.
- Edit links can reopen the teacher review flow.

Before release, run lint and build checks for the new app, plus at least one end-to-end upload-to-publish smoke test.

## Open Implementation Decisions

These decisions can wait for the implementation plan:

- Which hosted DB to use.
- Whether the parser runs as an in-process server dependency, a sidecar service, or a private API.
- Which LLM model handles structuring.
- Whether extracted review text is retained after publication or deleted with the source file.

The design assumes the app can call a server-side parser with behavior similar to kordoc. If kordoc is not deployable as a server dependency, the same interface can wrap another parser or a private parser service.
