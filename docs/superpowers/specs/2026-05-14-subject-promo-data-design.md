# Subject Promo Data Design

## Goal

Build a reusable promotion-data layer for school elective subjects. The data must support individual subject posters, grouped posters by area or grade, web app cards, and future media such as card news or short videos.

## Decisions

- Use `data/school-selected-subjects.json` as the factual source.
- Do not add promotional copy to the source facts file.
- Generate a separate promotion file at `data/school-subject-promo.json`.
- Copy the same promotion file to `app/src/data/json/school-subject-promo.json` for web app use.
- Treat each subject card as the smallest reusable unit.
- Build grouped posters from subject cards rather than writing separate poster-only data.
- Write copy in a student-friendly tone.
- Allow creative slogans, metaphors, visual moods, and image prompts.
- Keep factual fields and creative fields in separate JSON sections.

## Files

`data/school-selected-subjects.json` remains the source of truth for parsed and supplemented subject facts.

`data/school-subject-promo.json` will store the canonical promotion data. This file should be generated, not edited by hand unless a future workflow explicitly adds manual review patches.

`app/src/data/json/school-subject-promo.json` will mirror the canonical file so the Next.js app can consume it without reading from the root `data/` directory.

`build_school_subject_promo.py` will generate both JSON files from `data/school-selected-subjects.json`.

## JSON Shape

Each subject record should use this structure:

```json
{
  "subjectId": "economics",
  "name": "경제",
  "factsRef": {
    "sourceStatus": "matched",
    "area": "사회",
    "category": "진로 선택",
    "offerings": []
  },
  "studentCopy": {
    "hook": "돈과 선택의 원리를 내 삶에 연결해 보는 과목",
    "oneLiner": "시장, 정부, 환율처럼 뉴스에서 보던 경제 현상을 직접 해석해 봅니다.",
    "recommendedFor": [],
    "activityExamples": [],
    "choiceTip": ""
  },
  "careerBridge": {
    "keywords": [],
    "departments": [],
    "careers": [],
    "careerSentence": ""
  },
  "posterAssets": {
    "slogans": [],
    "visualMood": "",
    "imagePrompt": "",
    "cardCopy": {
      "title": "",
      "subtitle": "",
      "body": "",
      "cta": ""
    }
  },
  "webView": {
    "badge": "",
    "summary": "",
    "searchTags": []
  },
  "quality": {
    "factConfidence": "high",
    "creativeFreedom": "high",
    "needsHumanReview": false,
    "notes": []
  }
}
```

## Field Rules

`factsRef` contains only factual source data: source status, area, category, credits, assessment, source references, and school offerings.

`studentCopy` contains student-facing copy. It should be short, concrete, and friendly. It should avoid administrative phrasing.

`careerBridge` connects the subject to departments, careers, and broad keywords. It should use source fields first and shorten noisy lists.

`posterAssets` contains creative material for visual production: slogan candidates, visual mood, image prompt, and compact card copy.

`webView` contains app-facing text and tags for filtering or search.

`quality` records confidence and review needs. Subjects with `sourceStatus: supplemented_partial` must set `needsHumanReview: true`.

## Generation Strategy

The first implementation should use deterministic templates and source fields. It should not call an external AI API. The generated copy can still be lively by using rule-based phrasing, short templates, and curated verbs by subject area.

The script should derive:

- hook from subject area, category, content elements, and description
- one-line summary from description
- recommended students from content categories, key ideas, and area
- activity examples from content elements
- career keywords from area, related careers, and related departments
- slogans from subject name plus two or three active phrases
- visual mood and image prompt from area and keywords
- web tags from subject name, area, category, departments, careers, and content keywords

## Quality Rules

Every generated record must keep a trace back to `subjectId` and `factsRef.sourceStatus`.

Every `studentCopy.hook` should fit on a poster card and stay under 40 Korean characters when possible.

Every `posterAssets.slogans` array should contain three distinct slogans.

Every `posterAssets.imagePrompt` should describe a school-safe, non-branded image concept. It should not name real students, real teachers, or copyrighted characters.

Every `webView.searchTags` array should be deduplicated and sorted by usefulness, not alphabetically.

Records for `비판적 질문과 창의적 해결` and `인공지능 윤리` should carry review notes because their detailed content systems came from partial supplementary sources.

## Out Of Scope

This design does not create poster images.

This design does not replace `subjects.json`.

This design does not change existing recommendation logic.

This design does not add a new web page. A later implementation can consume the generated JSON in the app.

## Initial Defaults

- The first generator must be deterministic and must not call an AI API.
- Grouping data should support subject area and offering grade from the start.
- Student interest tag grouping can wait until a poster or web view needs it.
- The web app should not switch away from `subjects.json` in this phase.
- A future AI-assisted copy pass may edit the promotion JSON, but that should be a separate workflow with review notes.
