# Homeroom Course Selection Briefing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3-slide Korean staff-meeting PPTX with speaker notes for grade 1 and grade 2 homeroom course-selection guidance.

**Architecture:** Create a single editable PPTX deliverable plus a short Markdown speaker-note handout. Use the already reviewed HWPX guidance and repository JSON data as source facts.

**Tech Stack:** Local PowerPoint-compatible PPTX generation, Markdown documentation, git.

---

## File Structure

- Create: `decks/homeroom-course-selection-briefing-2026/hyoja-course-selection-briefing-2026.pptx`
- Create: `decks/homeroom-course-selection-briefing-2026/발표자_메모.md`
- Create: `docs/superpowers/specs/2026-06-10-homeroom-course-selection-briefing-design.md`
- Create: `docs/superpowers/plans/2026-06-10-homeroom-course-selection-briefing.md`

### Task 1: Create Deck Content

**Files:**
- Create: `decks/homeroom-course-selection-briefing-2026/hyoja-course-selection-briefing-2026.pptx`
- Create: `decks/homeroom-course-selection-briefing-2026/발표자_메모.md`

- [ ] **Step 1: Make the output directory**

Run: `New-Item -ItemType Directory -Force -Path '.\decks\homeroom-course-selection-briefing-2026'`
Expected: directory exists.

- [ ] **Step 2: Build the PPTX**

Create three slides:

1. `수강신청 상담의 기준`
2. `1학년 담임 안내`
3. `2학년 담임 안내`

Expected: PPTX has exactly 3 slides and all slide text is editable.

- [ ] **Step 3: Write speaker notes**

Write the full 2-3 minute Korean announcement script in `발표자_메모.md`.

Expected: script has one section per slide and can be read aloud in roughly 2-3 minutes.

### Task 2: Verify And Commit

**Files:**
- Verify: `decks/homeroom-course-selection-briefing-2026/hyoja-course-selection-briefing-2026.pptx`
- Verify: `decks/homeroom-course-selection-briefing-2026/발표자_메모.md`

- [ ] **Step 1: Verify PPTX package**

Run: inspect the PPTX ZIP package and count `ppt/slides/slide*.xml`.
Expected: count is `3`.

- [ ] **Step 2: Verify notes**

Run: read `발표자_메모.md`.
Expected: no placeholders, balanced grade 1 and grade 2 guidance, and career/pathway-first message appears at the beginning and end.

- [ ] **Step 3: Commit only task files**

Run:

```powershell
git add docs/superpowers/specs/2026-06-10-homeroom-course-selection-briefing-design.md docs/superpowers/plans/2026-06-10-homeroom-course-selection-briefing.md decks/homeroom-course-selection-briefing-2026
git commit -m "docs: 담임 수강신청 회의 안내자료 추가"
```

Expected: commit includes only the new spec, plan, deck, and notes.
