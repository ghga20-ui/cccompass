#!/usr/bin/env python3
"""Inspect the curriculum HWPX tables and compare them with data/school.json."""

from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


REPO_ROOT = Path(__file__).resolve().parent
HWPX_PATH = REPO_ROOT / "2025학년도, 2026학년도 입학생 교육과정 편제표(최종).hwpx"
SCHOOL_JSON = REPO_ROOT / "data" / "school.json"

NS = {
    "hp": "http://www.hancom.co.kr/hwpml/2011/paragraph",
}

SEMESTERS = [(1, 1), (1, 2), (2, 1), (2, 2), (3, 1), (3, 2)]
SKIP_TEXT = {"", "계", "개별 학생 선택"}


def cell_text(cell: ET.Element) -> str:
    texts = ["".join(t.itertext()) for t in cell.findall(".//hp:t", NS)]
    return re.sub(r"\s+", " ", "".join(texts)).strip()


def table_grid(table: ET.Element) -> list[list[str]]:
    grid: list[list[str]] = []

    for tr in table.findall("hp:tr", NS):
        row: list[str] = []
        for tc in tr.findall("hp:tc", NS):
            text = cell_text(tc)
            addr_el = tc.find("hp:cellAddr", NS)
            col = int(addr_el.attrib.get("colAddr", str(len(row)))) if addr_el is not None else len(row)
            span_el = tc.find("hp:cellSpan", NS)
            col_span = int(span_el.attrib.get("colSpan", "1")) if span_el is not None else 1

            while len(row) < col:
                row.append("")
            for offset in range(col_span):
                target_col = col + offset
                while len(row) <= target_col:
                    row.append("")
                row[target_col] = text

        grid.append(row)

    width = max((len(row) for row in grid), default=0)
    return [row + [""] * (width - len(row)) for row in grid]


def extract_tables() -> list[list[list[str]]]:
    with zipfile.ZipFile(HWPX_PATH) as archive:
        xml = archive.read("Contents/section0.xml")
    root = ET.fromstring(xml)
    return [table_grid(tbl) for tbl in root.findall(".//hp:tbl", NS)]


def normalize_subject(text: str) -> str:
    replacements = {
        "창의공학설계": "창의 공학 설계",
        "매체와 의사소통": "매체 의사소통",
        "기후변호와 생태환경": "기후변화와 환경생태",
        "기후변호와 환경생태": "기후변화와 환경생태",
    }
    text = text.replace("․", "·").strip()
    return replacements.get(text, text)


def extract_hwpx_model() -> dict[str, dict[str, object]]:
    tables = extract_tables()
    result: dict[str, dict[str, object]] = {}

    for year, grid in zip(("2025", "2026"), tables):
        designated: list[dict[str, object]] = []
        selections: dict[tuple[int, int], list[str]] = {sem: [] for sem in SEMESTERS}
        in_selection = False

        for row in grid[2:]:
            if any("개별 학생 선택" in cell for cell in row):
                in_selection = True
                continue
            if row[:2] == ["계", "0"]:
                break

            for idx, (grade, semester) in enumerate(SEMESTERS):
                subject = normalize_subject(row[idx * 2] if idx * 2 < len(row) else "")
                credit = row[idx * 2 + 1] if idx * 2 + 1 < len(row) else ""
                if subject in SKIP_TEXT:
                    continue
                if in_selection:
                    selections[(grade, semester)].append(subject)
                elif credit and not credit.startswith("["):
                    designated.append(
                        {
                            "subject": subject,
                            "grade": grade,
                            "semester": semester,
                            "credits": int(credit) if credit.isdigit() else credit,
                        }
                    )

        result[year] = {"designated": designated, "selections": selections}

    return result


def extract_hwpx_choose_markers() -> dict[str, dict[tuple[int, int], list[int]]]:
    tables = extract_tables()
    result: dict[str, dict[tuple[int, int], list[int]]] = {}
    marker_re = re.compile(r"\[택(\d+)\]")

    for year, grid in zip(("2025", "2026"), tables):
        markers: dict[tuple[int, int], list[int]] = {sem: [] for sem in SEMESTERS}
        in_selection = False
        for row in grid[2:]:
            if any("개별 학생 선택" in cell for cell in row):
                in_selection = True
                continue
            if row[:2] == ["계", "0"]:
                break
            if not in_selection:
                continue

            for idx, sem in enumerate(SEMESTERS):
                credit = row[idx * 2 + 1] if idx * 2 + 1 < len(row) else ""
                match = marker_re.fullmatch(credit.strip())
                if match:
                    markers[sem].append(int(match.group(1)))
        result[year] = markers

    return result


def json_selection_sets(school: dict) -> dict[str, dict[tuple[int, int], set[str]]]:
    result: dict[str, dict[tuple[int, int], set[str]]] = {}
    for year, cohort in school["cohorts"].items():
        by_semester: dict[tuple[int, int], set[str]] = {}
        for group in cohort["selections"]:
            key = (group["grade"], group["semester"])
            by_semester.setdefault(key, set()).update(normalize_subject(s) for s in group["options"])
        result[year] = by_semester
    return result


def main() -> int:
    school = json.loads(SCHOOL_JSON.read_text(encoding="utf-8"))
    hwpx = extract_hwpx_model()
    hwpx_choose = extract_hwpx_choose_markers()
    json_sets = json_selection_sets(school)

    for year in ("2025", "2026"):
        print(f"[{year}]")
        hwpx_designated = {
            (item["grade"], item["semester"], item["subject"], item["credits"])
            for item in hwpx[year]["designated"]
        }
        json_designated = {
            (item["grade"], item["semester"], normalize_subject(item["subject"]), item["credits"])
            for item in school["cohorts"][year]["designated"]
        }
        designated_added = sorted(hwpx_designated - json_designated)
        designated_removed = sorted(json_designated - hwpx_designated)
        if designated_added or designated_removed:
            print("  designated")
            if designated_added:
                print(f"    HWPX only: {designated_added}")
            if designated_removed:
                print(f"    JSON only: {designated_removed}")
        for sem in SEMESTERS:
            hwpx_set = set(hwpx[year]["selections"][sem])
            json_set = json_sets[year].get(sem, set())
            json_choose = sorted(
                group["choose"]
                for group in school["cohorts"][year]["selections"]
                if (group["grade"], group["semester"]) == sem
            )
            marker_choose = sorted(hwpx_choose[year][sem])
            added = sorted(hwpx_set - json_set)
            removed = sorted(json_set - hwpx_set)
            if added or removed or marker_choose != json_choose:
                print(f"  G{sem[0]}-S{sem[1]}")
                if marker_choose != json_choose:
                    print(f"    choose differs: HWPX {marker_choose} / JSON {json_choose}")
                if added:
                    print(f"    HWPX only: {', '.join(added)}")
                if removed:
                    print(f"    JSON only: {', '.join(removed)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
