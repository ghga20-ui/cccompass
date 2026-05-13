#!/usr/bin/env python3
"""Generate readable Markdown and HTML curriculum views from data/school.json."""

from __future__ import annotations

import html
import json
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SCHOOL_JSON = ROOT / "data" / "school.json"
OUT_MD = ROOT / "docs" / "school-curriculum.md"
OUT_HTML = ROOT / "docs" / "school-curriculum.html"

SEMESTERS = [(1, 1), (1, 2), (2, 1), (2, 2), (3, 1), (3, 2)]


def semester_label(grade: int, semester: int) -> str:
    return f"{grade}학년 {semester}학기"


def load_school() -> dict:
    return json.loads(SCHOOL_JSON.read_text(encoding="utf-8"))


def group_designated(cohort: dict) -> dict[tuple[int, int], list[dict]]:
    grouped: dict[tuple[int, int], list[dict]] = defaultdict(list)
    for item in cohort["designated"]:
        grouped[(item["grade"], item["semester"])].append(item)
    return grouped


def group_selections(cohort: dict) -> dict[tuple[int, int], list[dict]]:
    grouped: dict[tuple[int, int], list[dict]] = defaultdict(list)
    for item in cohort["selections"]:
        grouped[(item["grade"], item["semester"])].append(item)
    return grouped


def generate_markdown(school: dict) -> str:
    lines = [
        "# 효자고등학교 교육과정 편제표",
        "",
        "원본: `2025학년도, 2026학년도 입학생 교육과정 편제표(최종).hwpx`",
        "",
    ]

    for year, cohort in school["cohorts"].items():
        designated = group_designated(cohort)
        selections = group_selections(cohort)

        lines.extend([
            f"## {cohort['label']}",
            "",
            f"- 설명: {cohort['description']}",
            "",
            "### 학교 지정 과목",
            "",
            "| 학기 | 과목 | 학점 |",
            "|---|---|---:|",
        ])

        for grade, semester in SEMESTERS:
            items = designated.get((grade, semester), [])
            if not items:
                lines.append(f"| {semester_label(grade, semester)} | - | - |")
                continue
            names = "<br>".join(item["subject"] for item in items)
            credits = "<br>".join(str(item["credits"]) for item in items)
            lines.append(f"| {semester_label(grade, semester)} | {names} | {credits} |")

        lines.extend(["", "### 선택 과목", ""])

        for grade, semester in SEMESTERS:
            groups = selections.get((grade, semester), [])
            if not groups:
                continue
            lines.extend([f"#### {semester_label(grade, semester)}", ""])
            for group in groups:
                lines.append(
                    f"- **{group['label']}**: 택{group['choose']}, "
                    f"각 {group['creditsEach']}학점, 총 {group['totalCredits']}학점"
                )
                for option in group["options"]:
                    lines.append(f"  - {option}")
                lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def subject_chips(items: list[dict]) -> str:
    if not items:
        return '<span class="empty">없음</span>'
    return "".join(
        f'<span class="chip">{html.escape(item["subject"])} <b>{item["credits"]}</b></span>'
        for item in items
    )


def option_list(options: list[str]) -> str:
    return "".join(f"<li>{html.escape(option)}</li>" for option in options)


def generate_html(school: dict) -> str:
    sections: list[str] = []
    for year, cohort in school["cohorts"].items():
        designated = group_designated(cohort)
        selections = group_selections(cohort)

        designated_cards = []
        selection_cards = []
        for grade, semester in SEMESTERS:
            label = semester_label(grade, semester)
            designated_cards.append(
                f"""
                <section class="term-card">
                  <h3>{html.escape(label)}</h3>
                  <div class="chips">{subject_chips(designated.get((grade, semester), []))}</div>
                </section>
                """
            )

            groups = selections.get((grade, semester), [])
            if groups:
                group_html = []
                for group in groups:
                    group_html.append(
                        f"""
                        <article class="choice-group">
                          <header>
                            <strong>{html.escape(group["label"])}</strong>
                            <span>택{group["choose"]} · 각 {group["creditsEach"]}학점 · 총 {group["totalCredits"]}학점</span>
                          </header>
                          <ul>{option_list(group["options"])}</ul>
                        </article>
                        """
                    )
                selection_cards.append(
                    f"""
                    <section class="term-card wide">
                      <h3>{html.escape(label)}</h3>
                      {''.join(group_html)}
                    </section>
                    """
                )

        sections.append(
            f"""
            <section class="cohort" id="cohort-{html.escape(year)}">
              <div class="cohort-heading">
                <p>{html.escape(year)}학년도 입학생</p>
                <h2>{html.escape(cohort["label"])}</h2>
                <span>{html.escape(cohort["description"])}</span>
              </div>
              <h3 class="section-title">학교 지정 과목</h3>
              <div class="grid">{''.join(designated_cards)}</div>
              <h3 class="section-title">선택 과목</h3>
              <div class="grid choices">{''.join(selection_cards)}</div>
            </section>
            """
        )

    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>효자고등학교 교육과정 편제표</title>
  <style>
    :root {{
      color-scheme: light;
      --bg: #f7f8fb;
      --panel: #ffffff;
      --ink: #1f2937;
      --muted: #667085;
      --line: #d9e0ea;
      --primary: #2458d3;
      --soft: #eef4ff;
      --accent: #f26b2f;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif;
      line-height: 1.55;
    }}
    header.hero {{
      background: #123b7a;
      color: #fff;
      padding: 32px 20px 28px;
    }}
    .wrap {{ max-width: 1120px; margin: 0 auto; }}
    .hero h1 {{ margin: 0; font-size: clamp(26px, 4vw, 40px); }}
    .hero p {{ margin: 8px 0 0; color: #dbe7ff; }}
    nav {{
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(255,255,255,.92);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(10px);
    }}
    nav .wrap {{ display: flex; gap: 8px; padding: 10px 20px; overflow-x: auto; }}
    nav a {{
      white-space: nowrap;
      color: var(--primary);
      background: var(--soft);
      border: 1px solid #d6e3ff;
      border-radius: 999px;
      padding: 8px 12px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
    }}
    main {{ padding: 24px 20px 48px; }}
    .cohort {{ margin: 0 auto 32px; max-width: 1120px; }}
    .cohort-heading {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 18px;
    }}
    .cohort-heading p {{ margin: 0 0 4px; color: var(--primary); font-weight: 800; }}
    .cohort-heading h2 {{ margin: 0; font-size: 24px; }}
    .cohort-heading span {{ color: var(--muted); }}
    .section-title {{ margin: 22px 0 10px; font-size: 18px; }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }}
    .term-card {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px;
      min-width: 0;
    }}
    .term-card h3 {{
      margin: 0 0 10px;
      font-size: 15px;
      color: #111827;
    }}
    .chips {{ display: flex; flex-wrap: wrap; gap: 6px; }}
    .chip {{
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border-radius: 999px;
      background: #f3f6fa;
      border: 1px solid #e2e8f0;
      padding: 5px 8px;
      font-size: 13px;
    }}
    .chip b {{ color: var(--accent); }}
    .empty {{ color: var(--muted); font-size: 13px; }}
    .choices {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
    .choice-group {{
      border-top: 1px solid var(--line);
      padding-top: 11px;
      margin-top: 11px;
    }}
    .choice-group:first-of-type {{ border-top: 0; padding-top: 0; margin-top: 0; }}
    .choice-group header {{
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }}
    .choice-group header span {{
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
    }}
    ul {{
      columns: 2;
      margin: 0;
      padding-left: 18px;
      font-size: 13px;
    }}
    li {{ break-inside: avoid; margin: 2px 0; }}
    @media (max-width: 860px) {{
      .grid, .choices {{ grid-template-columns: 1fr; }}
      ul {{ columns: 1; }}
      .choice-group header {{ display: block; }}
    }}
  </style>
</head>
<body>
  <header class="hero">
    <div class="wrap">
      <h1>효자고등학교 교육과정 편제표</h1>
      <p>원본 HWPX 편제표를 바탕으로 학번별 지정 과목과 선택 과목을 정리했습니다.</p>
    </div>
  </header>
  <nav>
    <div class="wrap">
      <a href="#cohort-2025">2025학년도 입학생</a>
      <a href="#cohort-2026">2026학년도 입학생</a>
    </div>
  </nav>
  <main>
    {''.join(sections)}
  </main>
</body>
</html>
"""


def main() -> int:
    school = load_school()
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text(generate_markdown(school), encoding="utf-8")
    OUT_HTML.write_text(generate_html(school), encoding="utf-8")
    print(f"Wrote {OUT_MD}")
    print(f"Wrote {OUT_HTML}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
