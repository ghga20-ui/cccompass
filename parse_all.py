#!/usr/bin/env python3
"""
Parse university requirements and school curriculum Excel files into JSON.
Task 1: 2028학년도 계열별 대표 모집단위별 반영과목.xlsx -> university-requirements.json
Task 2: 2025/2026 교육과정 편성표 -> school.json
"""

import sys
import io
import os
import json
import re
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import openpyxl

BASE_DIR = r"C:\Users\admin\Desktop\2026_project\project2_curriculum"
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)


# =============================================================================
# TASK 1: Parse university requirements
# =============================================================================
def parse_university_requirements():
    print("=== Task 1: Parsing university requirements ===")
    filepath = os.path.join(BASE_DIR, "2028학년도 계열별 대표 모집단위별 반영과목.xlsx")
    wb = openpyxl.load_workbook(filepath, data_only=True, read_only=True)
    ws = wb['반영과목']
    rows = list(ws.rows)

    title = rows[0][0].value.strip() if rows[0][0].value else ""
    note = rows[1][0].value.strip() if rows[1][0].value else ""

    # Column mapping (0-indexed):
    # 0: 계열, 1: 모집단위, 2: 국어
    # 3: 대수, 4: 확률과 통계, 5: 미적분Ⅰ, 6: 미적분Ⅱ, 7: 기하
    # 8: 영어
    # 9: 일반사회, 10: 역사, 11: 지리, 12: 윤리
    # 13: 물리학, 14: 화학, 15: 생명과학, 16: 지구과학
    # 17: 기타

    SUBJECT_COLS = {
        2: "국어",
        3: "대수",
        4: "확률과 통계",
        5: "미적분Ⅰ",
        6: "미적분Ⅱ",
        7: "기하",
        8: "영어",
        9: "일반사회",
        10: "역사",
        11: "지리",
        12: "윤리",
        13: "물리학",
        14: "화학",
        15: "생명과학",
        16: "지구과학",
    }

    def get_cell(row, idx):
        if idx < len(row):
            return row[idx].value
        return None

    def clean_name(val):
        """Clean university name from cell value. Returns None for '-' or empty."""
        if val is None:
            return None
        val = str(val).strip().replace('\xa0', '').strip()
        if val == '-' or val == '':
            return None
        return val

    def normalize_uni_name(name):
        """Normalize university name for comparison (strip annotations like '(역사/도덕 포함)')."""
        if name is None:
            return None
        # Remove annotation patterns like (역사/도덕 포함) but keep location like (춘천), (ERICA), (삼척), (글로컬), (천안)
        # Location patterns are short, known values
        known_locations = ['춘천', '천안', '삼척', 'ERICA', '글로컬']
        m = re.match(r'^(.+?)\((.+)\)([⁎*]?)$', name)
        if m:
            base = m.group(1)
            paren = m.group(2)
            marker = m.group(3)
            if paren in known_locations:
                return name  # Keep as-is
            else:
                # It's an annotation, return base name + location if any + marker
                return base.strip() + marker
        return name

    def extract_base_name(name):
        """Extract the core university name stripping * and ⁎ markers."""
        if name is None:
            return None
        return name.replace('⁎', '').replace('*', '').strip()

    def is_flexible(name):
        """Check if university name has flexibility marker."""
        if name is None:
            return False
        return '⁎' in name or '*' in name

    def parse_kita_cell(val):
        """Parse 기타 column which may have multiline values like '서울대\\n(제2외/한문)'."""
        if val is None:
            return None
        val = str(val).strip()
        if val == '-' or val == '':
            return None
        # Could have newline: "충북대\n(제2외)"
        lines = val.split('\n')
        name = lines[0].strip()
        detail = ""
        if len(lines) > 1:
            detail = lines[1].strip()
            # Remove surrounding parentheses
            if detail.startswith('(') and detail.endswith(')'):
                detail = detail[1:-1]
        return {"name": name, "detail": detail}

    # ---- Pre-process: merge continuation rows ----
    # Row 32 has "(춘천)" as a continuation of row 31 "강원대"
    # Detect this pattern: if col 2 value starts with '(' and previous row exists
    processed_rows = []
    skip_next = set()

    for row_idx in range(4, len(rows)):
        if row_idx in skip_next:
            continue
        row = rows[row_idx]

        # Check if next row is a continuation
        if row_idx + 1 < len(rows):
            next_row = rows[row_idx + 1]
            next_c2 = get_cell(next_row, 2)
            if next_c2 and str(next_c2).strip().startswith('(') and not str(next_c2).strip().startswith('('):
                pass  # won't happen
            if next_c2 and str(next_c2).strip().startswith('('):
                suffix = str(next_c2).strip()
                # Check if the next row's field/dept match (they should)
                next_field = get_cell(next_row, 0)
                next_dept = get_cell(next_row, 1)
                cur_field = get_cell(row, 0)
                cur_dept = get_cell(row, 1)

                if next_field and next_dept and str(next_field).strip() == str(cur_field).strip() and str(next_dept).strip() == str(cur_dept).strip():
                    # Merge: append suffix to all non-None, non-'-' values in current row
                    merged_values = {}
                    for col_idx in range(18):
                        cur_val = get_cell(row, col_idx)
                        next_val = get_cell(next_row, col_idx)
                        if col_idx >= 2 and col_idx <= 16:
                            cur_clean = clean_name(cur_val)
                            next_clean = clean_name(next_val)
                            if cur_clean and next_clean and next_clean.startswith('('):
                                merged_values[col_idx] = cur_clean + next_clean
                            elif cur_clean:
                                merged_values[col_idx] = cur_clean
                            else:
                                merged_values[col_idx] = None
                        else:
                            merged_values[col_idx] = cur_val

                    processed_rows.append((row_idx, merged_values))
                    skip_next.add(row_idx + 1)
                    continue

        # Normal row
        vals = {}
        for col_idx in range(18):
            vals[col_idx] = get_cell(row, col_idx)
        processed_rows.append((row_idx, vals))

    # ---- Parse processed rows ----
    dept_data = {}  # key: (field, dept), value: list of row data

    for row_idx, vals in processed_rows:
        field = vals.get(0)
        dept = vals.get(1)

        if field is None or dept is None:
            continue

        field = str(field).strip()
        dept = str(dept).strip()

        if not field or not dept:
            continue

        key = (field, dept)
        if key not in dept_data:
            dept_data[key] = []

        row_info = {"row_idx": row_idx}

        # Get cell values
        def rv(col_idx):
            v = vals.get(col_idx)
            if isinstance(v, str):
                return v
            return v

        # Check for "general math" pattern: col 3 has a name, cols 4-7 are None
        c3 = rv(3)
        c4 = rv(4)
        c5 = rv(5)
        c6 = rv(6)
        c7 = rv(7)

        c3_name = clean_name(c3)
        general_math = False
        if c3_name and clean_name(c4) is None and clean_name(c5) is None and clean_name(c6) is None and clean_name(c7) is None:
            general_math = True

        # Extract university names per subject
        subjects = {}
        for col_idx, subj_name in SUBJECT_COLS.items():
            val = rv(col_idx)
            name = clean_name(val)
            if name:
                subjects[subj_name] = name

        # Handle general math
        if general_math and "대수" in subjects:
            subjects["수학"] = subjects.pop("대수")

        # Parse 기타 column
        kita_val = rv(17)
        kita = parse_kita_cell(kita_val)
        if kita:
            subjects["기타"] = kita

        row_info["subjects"] = subjects
        row_info["general_math"] = general_math
        dept_data[key].append(row_info)

    # ---- Determine university name for each row ----
    # A row should represent one university. Find the most common name across columns.
    def determine_uni_name(subjs):
        """Determine the primary university name from subject values."""
        names = []
        for subj_key, subj_val in subjs.items():
            if subj_key == "기타":
                if isinstance(subj_val, dict):
                    names.append(subj_val["name"])
            elif isinstance(subj_val, str):
                # Normalize: strip annotations
                norm = normalize_uni_name(subj_val)
                names.append(norm)

        if not names:
            return None

        # Count base names (without * markers)
        base_counts = Counter()
        for n in names:
            base = extract_base_name(n)
            base_counts[base] += 1

        # Get the most common base name
        most_common_base = base_counts.most_common(1)[0][0]

        # Find the original name (with markers) that matches
        for n in names:
            if extract_base_name(n) == most_common_base:
                return n

        return names[0]

    # ---- Build output ----
    departments = []
    for (field, dept), row_list in dept_data.items():
        universities = []
        summary = {
            "국어": [],
            "수학": {"대수": [], "확률과 통계": [], "미적분Ⅰ": [], "미적분Ⅱ": [], "기하": []},
            "영어": [],
            "사회": {"일반사회": [], "역사": [], "지리": [], "윤리": []},
            "과학": {"물리학": [], "화학": [], "생명과학": [], "지구과학": []},
            "기타": [],
        }

        for row_info in row_list:
            subjs = row_info["subjects"]
            if not subjs:
                continue

            uni_name = determine_uni_name(subjs)
            if uni_name is None:
                continue

            flexible = is_flexible(uni_name)

            required_subjects = {}
            for subj_key, subj_val in subjs.items():
                if subj_key == "기타":
                    if isinstance(subj_val, dict) and subj_val["detail"]:
                        required_subjects["기타"] = subj_val["detail"]
                    else:
                        required_subjects["기타"] = True
                elif subj_key == "수학":
                    required_subjects["수학"] = True
                else:
                    required_subjects[subj_key] = True

            universities.append({
                "name": uni_name,
                "isFlexible": flexible,
                "requiredSubjects": required_subjects,
            })

            # Build summary
            for subj_key in subjs:
                if subj_key == "국어":
                    summary["국어"].append(uni_name)
                elif subj_key == "수학":
                    for mk in summary["수학"]:
                        summary["수학"][mk].append(uni_name)
                elif subj_key == "대수":
                    summary["수학"]["대수"].append(uni_name)
                elif subj_key == "확률과 통계":
                    summary["수학"]["확률과 통계"].append(uni_name)
                elif subj_key == "미적분Ⅰ":
                    summary["수학"]["미적분Ⅰ"].append(uni_name)
                elif subj_key == "미적분Ⅱ":
                    summary["수학"]["미적분Ⅱ"].append(uni_name)
                elif subj_key == "기하":
                    summary["수학"]["기하"].append(uni_name)
                elif subj_key == "영어":
                    summary["영어"].append(uni_name)
                elif subj_key == "일반사회":
                    summary["사회"]["일반사회"].append(uni_name)
                elif subj_key == "역사":
                    summary["사회"]["역사"].append(uni_name)
                elif subj_key == "지리":
                    summary["사회"]["지리"].append(uni_name)
                elif subj_key == "윤리":
                    summary["사회"]["윤리"].append(uni_name)
                elif subj_key == "물리학":
                    summary["과학"]["물리학"].append(uni_name)
                elif subj_key == "화학":
                    summary["과학"]["화학"].append(uni_name)
                elif subj_key == "생명과학":
                    summary["과학"]["생명과학"].append(uni_name)
                elif subj_key == "지구과학":
                    summary["과학"]["지구과학"].append(uni_name)
                elif subj_key == "기타":
                    val = subjs[subj_key]
                    detail = val["detail"] if isinstance(val, dict) else ""
                    summary["기타"].append({
                        "university": uni_name,
                        "detail": detail,
                    })

        # 동일 대학 중복 행 병합 — 원본 엑셀에 같은 대학이 여러 행에 실린 경우
        # (예: 컴퓨터공학에 전남대·충북대 등이 2회 등재되어 요구 대학 수가 부풀던 문제)
        merged_by_base = {}
        deduped_universities = []
        for u in universities:
            base = extract_base_name(u["name"])
            if base in merged_by_base:
                existing = merged_by_base[base]
                existing["requiredSubjects"].update(u["requiredSubjects"])
                existing["isFlexible"] = existing["isFlexible"] or u["isFlexible"]
            else:
                merged_by_base[base] = u
                deduped_universities.append(u)
        universities = deduped_universities

        def dedupe_names(lst):
            seen = set()
            out = []
            for item in lst:
                key = item["university"] if isinstance(item, dict) else item
                key = extract_base_name(key)
                if key in seen:
                    continue
                seen.add(key)
                out.append(item)
            return out

        for k, v in summary.items():
            if isinstance(v, list):
                summary[k] = dedupe_names(v)
            elif isinstance(v, dict):
                for sk in v:
                    v[sk] = dedupe_names(v[sk])

        departments.append({
            "field": field,
            "department": dept,
            "universities": universities,
            "summary": summary,
        })

    result = {
        "title": title,
        "note": note,
        "departments": departments,
    }

    wb.close()

    output_path = os.path.join(DATA_DIR, "university-requirements.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"  Total departments: {len(departments)}")
    total_unis = sum(len(d['universities']) for d in departments)
    print(f"  Total university entries: {total_unis}")
    print(f"  Output: {output_path}")

    # Validation
    if departments:
        d = departments[0]
        print(f"\n  Sample - {d['field']}/{d['department']}:")
        print(f"    Universities: {len(d['universities'])}")
        for u in d['universities'][:3]:
            print(f"      {u['name']} (flexible={u['isFlexible']}): {u['requiredSubjects']}")
        print(f"    Summary 국어: {d['summary']['국어'][:5]}...")
        print(f"    Summary 영어: {d['summary']['영어'][:5]}...")

    return result


# =============================================================================
# TASK 2: Parse school curriculum
# =============================================================================
def parse_school_curriculum():
    print("\n=== Task 2: Parsing school curriculum ===")

    cohorts = {}

    files = [
        {
            "path": os.path.join(BASE_DIR, "2025학년도 일반고 입학생 교육과정 편성표_효자고.xlsm"),
            "year": "2025",
            "label": "2025학년도 입학생 (현 고2)",
            "description": "고3 선택과목 수강 신청 대상",
            "designated_start": 6,
            "designated_end": 42,  # inclusive (row 42 is 교양 for 2025)
            "selection_start": 43,
            "selection_end": 51,   # inclusive
        },
        {
            "path": os.path.join(BASE_DIR, "2026학년도 일반고 입학생 교육과정 편성표_효자고_변경후.xlsm"),
            "year": "2026",
            "label": "2026학년도 입학생 (현 고1)",
            "description": "고2, 고3 선택과목 수강 신청 대상",
            "designated_start": 6,
            "designated_end": 39,  # inclusive (no 교양 row in 2026)
            "selection_start": 40,
            "selection_end": 48,   # inclusive
        },
    ]

    for finfo in files:
        year = finfo["year"]
        print(f"\n  Processing {year} cohort...")
        wb = openpyxl.load_workbook(finfo["path"], data_only=True, read_only=True)
        ws = wb['편성표']
        rows = list(ws.rows)

        def get_cell(row, idx):
            if idx < len(row):
                return row[idx].value
            return None

        # ----- Parse designated subjects -----
        designated = []
        current_area = None

        for row_idx in range(finfo["designated_start"], finfo["designated_end"] + 1):
            row = rows[row_idx]
            area = get_cell(row, 1)
            subject = get_cell(row, 2)
            credits_val = get_cell(row, 3)
            cat_common = get_cell(row, 4)
            cat_general = get_cell(row, 5)
            cat_career = get_cell(row, 6)
            cat_fusion = get_cell(row, 7)

            if area:
                current_area = str(area).strip()

            if not subject:
                continue

            subject = str(subject).strip()

            # Determine category
            has_common = cat_common and str(cat_common).strip() == 'O'
            has_general = cat_general and str(cat_general).strip() == 'O'
            has_career = cat_career and str(cat_career).strip() == 'O'
            has_fusion = cat_fusion and str(cat_fusion).strip() == 'O'

            if has_common:
                category = "공통"
            elif has_general and has_fusion:
                category = "일반/융합"
            elif has_general:
                category = "일반"
            elif has_career:
                category = "진로"
            elif has_fusion:
                category = "융합"
            else:
                category = "공통"

            # Credits
            credits = 0
            if credits_val is not None:
                try:
                    credits = int(credits_val)
                except (ValueError, TypeError):
                    credits = 0

            # Find which semester(s) have credits
            semester_cols = {
                (1, 1): 8,
                (1, 2): 9,
                (2, 1): 10,
                (2, 2): 11,
                (3, 1): 12,
                (3, 2): 13,
            }

            found_semesters = []
            for (g, s), col_idx in semester_cols.items():
                val = get_cell(row, col_idx)
                if val is not None:
                    try:
                        v = int(val)
                        if v > 0:
                            found_semesters.append((g, s, v))
                    except (ValueError, TypeError):
                        pass

            if len(found_semesters) > 1:
                for g, s, c in found_semesters:
                    designated.append({
                        "subject": subject,
                        "area": current_area,
                        "category": category,
                        "credits": c,
                        "grade": g,
                        "semester": s,
                    })
            elif len(found_semesters) == 1:
                g, s, c = found_semesters[0]
                designated.append({
                    "subject": subject,
                    "area": current_area,
                    "category": category,
                    "credits": c,
                    "grade": g,
                    "semester": s,
                })

        print(f"    Designated subjects: {len(designated)}")

        # ----- Parse selection subjects -----
        selections = []
        current_grade = None
        current_label = None

        for row_idx in range(finfo["selection_start"], finfo["selection_end"] + 1):
            row = rows[row_idx]
            section = get_cell(row, 0)
            area_label = get_cell(row, 1)
            subjects_str = get_cell(row, 2)
            choose_str = get_cell(row, 3)

            if section:
                section = str(section).strip()
                if '2학년' in section:
                    current_grade = 2
                elif '3학년' in section:
                    current_grade = 3

            if not subjects_str or not choose_str:
                continue

            subjects_str = str(subjects_str).strip()
            choose_str = str(choose_str).strip()

            m = re.match(r'택(\d+)', choose_str)
            if not m:
                continue
            choose = int(m.group(1))

            options = [opt.strip() for opt in subjects_str.split('/') if opt.strip()]

            if area_label:
                current_label = str(area_label).strip()

            # Determine semester from credit columns
            grade = current_grade
            semester = None
            total_credits = 0

            semester_cols = {
                (2, 1): 10,
                (2, 2): 11,
                (3, 1): 12,
                (3, 2): 13,
            }

            for (g, s), col_idx in semester_cols.items():
                val = get_cell(row, col_idx)
                if val is not None:
                    try:
                        v = int(val)
                        if v > 0:
                            grade = g
                            semester = s
                            total_credits = v
                            break
                    except (ValueError, TypeError):
                        pass

            if semester is None:
                continue

            credits_each = total_credits // choose if choose > 0 else 0

            # Generate ID with type suffix
            if current_label and '교과(군) 간' in current_label:
                type_suffix = "cross"
            elif current_label and '예술' in current_label:
                type_suffix = "art"
            else:
                type_suffix = "tech"

            sel_id = f"{year}_g{grade}_s{semester}_{type_suffix}"

            selections.append({
                "id": sel_id,
                "label": current_label or "",
                "grade": grade,
                "semester": semester,
                "choose": choose,
                "creditsEach": credits_each,
                "totalCredits": total_credits,
                "options": options,
            })

        print(f"    Selection groups: {len(selections)}")

        cohorts[year] = {
            "label": finfo["label"],
            "description": finfo["description"],
            "designated": designated,
            "selections": selections,
        }

        wb.close()

    result = {
        "schoolName": "효자고등학교",
        "cohorts": cohorts,
    }

    output_path = os.path.join(DATA_DIR, "school.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n  Output: {output_path}")

    # Validation
    for year, cohort in cohorts.items():
        print(f"\n  {year} cohort validation:")
        print(f"    Designated: {len(cohort['designated'])} subjects")
        for d in cohort['designated'][:3]:
            print(f"      {d['subject']} ({d['area']}/{d['category']}) - {d['credits']}학점 G{d['grade']}S{d['semester']}")
        print(f"    Selections: {len(cohort['selections'])} groups")
        for s in cohort['selections']:
            print(f"      {s['id']}: {s['label']} - 택{s['choose']}, {len(s['options'])} options, {s['totalCredits']}학점")

    return result


# =============================================================================
# MAIN
# =============================================================================
if __name__ == "__main__":
    print(f"Data directory: {DATA_DIR}")
    print()

    uni_result = parse_university_requirements()
    school_result = parse_school_curriculum()

    print("\n=== Done ===")
    print(f"  university-requirements.json: {len(uni_result['departments'])} departments")
    print(f"  school.json: {len(school_result['cohorts'])} cohorts")
