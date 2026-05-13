# 선택과목 홍보 데이터 생성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `data/school-selected-subjects.json`에서 학생 친화형 홍보 데이터 `school-subject-promo.json`을 생성한다.

**Architecture:** 원천 사실 데이터는 그대로 두고, 별도 파이썬 생성기가 홍보용 JSON을 만든다. 생성기는 결정적 규칙만 사용하며, 같은 결과를 `data/`와 `app/src/data/json/`에 동시에 쓴다.

**Tech Stack:** Python 3 표준 라이브러리, `unittest`, JSON 파일, Next.js 앱용 정적 JSON 복사본.

---

## 파일 구조

- Create: `tests/test_build_school_subject_promo.py`
  - 생성기 헬퍼와 산출물 구조를 검증한다.
- Create: `build_school_subject_promo.py`
  - 원천 JSON을 읽고 홍보 JSON 두 개를 생성한다.
- Create: `data/school-subject-promo.json`
  - 홍보 데이터 기준 파일이다.
- Create: `app/src/data/json/school-subject-promo.json`
  - 웹앱용 복사본이다.
- Modify: 없음
  - 이번 단계에서는 `subjects.json`, 추천 로직, 웹페이지를 바꾸지 않는다.

---

### Task 1: 테스트 파일 추가

**Files:**
- Create: `tests/test_build_school_subject_promo.py`
- Read: `data/school-selected-subjects.json`

- [ ] **Step 1: 테스트 디렉터리 생성**

Run:

```powershell
New-Item -ItemType Directory -Force -Path tests
```

Expected: `tests` 디렉터리가 존재한다.

- [ ] **Step 2: 실패하는 테스트 작성**

Create `tests/test_build_school_subject_promo.py` with this content:

```python
import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "build_school_subject_promo.py"


def load_module():
    spec = importlib.util.spec_from_file_location("build_school_subject_promo", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class PromoBuilderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.builder = load_module()
        cls.source_payload = json.loads(
            (ROOT / "data" / "school-selected-subjects.json").read_text(encoding="utf-8")
        )
        cls.subjects = cls.source_payload["subjects"]

    def subject(self, name):
        return next(subject for subject in self.subjects if subject["name"] == name)

    def test_build_promo_record_has_required_sections(self):
        record = self.builder.build_promo_record(self.subject("경제"))

        self.assertEqual(record["subjectId"], "economics")
        self.assertEqual(record["name"], "경제")
        self.assertEqual(record["factsRef"]["sourceStatus"], "matched")
        self.assertIn("studentCopy", record)
        self.assertIn("careerBridge", record)
        self.assertIn("posterAssets", record)
        self.assertIn("webView", record)
        self.assertIn("quality", record)

    def test_creative_sections_are_populated(self):
        record = self.builder.build_promo_record(self.subject("경제"))

        self.assertTrue(record["studentCopy"]["hook"])
        self.assertLessEqual(len(record["studentCopy"]["hook"]), 45)
        self.assertTrue(record["studentCopy"]["oneLiner"])
        self.assertGreaterEqual(len(record["studentCopy"]["recommendedFor"]), 2)
        self.assertGreaterEqual(len(record["studentCopy"]["activityExamples"]), 2)
        self.assertEqual(len(record["posterAssets"]["slogans"]), 3)
        self.assertTrue(record["posterAssets"]["imagePrompt"])
        self.assertTrue(record["webView"]["searchTags"])

    def test_partial_supplement_subjects_need_human_review(self):
        record = self.builder.build_promo_record(self.subject("인공지능 윤리"))

        self.assertEqual(record["factsRef"]["sourceStatus"], "supplemented_partial")
        self.assertTrue(record["quality"]["needsHumanReview"])
        self.assertIn("부분 보충", " ".join(record["quality"]["notes"]))

    def test_payload_contains_groupings(self):
        payload = self.builder.build_payload(self.source_payload)

        self.assertEqual(payload["metadata"]["subjectCount"], 77)
        self.assertEqual(len(payload["subjects"]), 77)
        self.assertIn("byArea", payload["groupings"])
        self.assertIn("byOfferingGrade", payload["groupings"])
        self.assertIn("사회", payload["groupings"]["byArea"])
        self.assertIn("3", payload["groupings"]["byOfferingGrade"])

    def test_search_tags_are_unique(self):
        record = self.builder.build_promo_record(self.subject("프로그래밍"))
        tags = record["webView"]["searchTags"]

        self.assertEqual(len(tags), len(set(tags)))
        self.assertIn("프로그래밍", tags)
        self.assertTrue(any(tag in tags for tag in ["정보·통신", "정보"]))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run:

```powershell
py -3 -m unittest tests.test_build_school_subject_promo -v
```

Expected: FAIL 또는 ERROR. `build_school_subject_promo.py`가 아직 없어서 import 단계에서 실패한다.

- [ ] **Step 4: 커밋**

Run:

```powershell
git add tests/test_build_school_subject_promo.py
git commit -m "test: 홍보 데이터 생성기 검증 추가"
```

Expected: 테스트 파일만 커밋된다.

---

### Task 2: 생성기 기본 구조 구현

**Files:**
- Create: `build_school_subject_promo.py`
- Test: `tests/test_build_school_subject_promo.py`

- [ ] **Step 1: 생성기 파일 작성**

Create `build_school_subject_promo.py` with this structure:

```python
#!/usr/bin/env python3
"""Build student-friendly promotion data for school elective subjects."""

from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "data" / "school-selected-subjects.json"
OUT_DATA = ROOT / "data" / "school-subject-promo.json"
OUT_APP = ROOT / "app" / "src" / "data" / "json" / "school-subject-promo.json"


AREA_MOOD = {
    "국어": "따뜻한 종이 질감, 책과 말풍선, 차분한 교실 분위기",
    "수학": "깔끔한 격자, 그래프, 문제 해결 노트",
    "영어": "세계 지도, 대화 장면, 밝은 언어 학습 분위기",
    "사회": "도시, 뉴스, 토론 테이블, 탐구형 분위기",
    "사회(역사/도덕 포함)": "세계 지도, 역사 자료, 토론 테이블",
    "과학": "실험 도구, 관찰 노트, 선명한 탐구 분위기",
    "정보": "코드 화면, 데이터 흐름, 디지털 작업실",
    "정보·통신": "코드 화면, 네트워크 선, 디지털 작업실",
    "기술·가정": "생활 도구, 제작 장면, 실용적인 작업대",
    "제2외국어/한문": "여행 자료, 언어 카드, 문화 교류 장면",
    "관광·레저": "여행 안내 데스크, 지도, 친절한 서비스 장면",
    "식품·조리": "식재료, 영양 카드, 밝은 조리 실습대",
    "체육": "운동장, 움직임, 건강한 에너지",
    "예술": "스케치북, 악보, 전시 공간",
    "교양": "질문 카드, 생각 노트, 편안한 토론 공간",
}


AREA_VERBS = {
    "국어": ["읽고", "해석하고", "표현하는"],
    "수학": ["분석하고", "계산하고", "증명하는"],
    "영어": ["읽고", "말하고", "연결하는"],
    "사회": ["묻고", "비교하고", "해석하는"],
    "사회(역사/도덕 포함)": ["묻고", "비교하고", "해석하는"],
    "과학": ["관찰하고", "실험하고", "설명하는"],
    "정보": ["설계하고", "구현하고", "해결하는"],
    "정보·통신": ["설계하고", "구현하고", "해결하는"],
    "기술·가정": ["만들고", "적용하고", "개선하는"],
    "관광·레저": ["응대하고", "안내하고", "연결하는"],
    "식품·조리": ["살피고", "조리하고", "관리하는"],
    "교양": ["질문하고", "생각하고", "나누는"],
}


def compact_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def unique_nonempty(items: list[str], limit: int | None = None) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for item in items:
        value = compact_text(str(item))
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
        if limit is not None and len(result) >= limit:
            break
    return result
```

- [ ] **Step 2: 테스트 실행**

Run:

```powershell
py -3 -m unittest tests.test_build_school_subject_promo -v
```

Expected: FAIL. 이번에는 모듈은 import되지만 `build_promo_record` 등 함수가 없어 실패한다.

- [ ] **Step 3: 커밋**

Run:

```powershell
git add build_school_subject_promo.py
git commit -m "feat: 홍보 데이터 생성기 뼈대 추가"
```

Expected: 생성기 파일만 커밋된다.

---

### Task 3: 과목 레코드 생성 구현

**Files:**
- Modify: `build_school_subject_promo.py`
- Test: `tests/test_build_school_subject_promo.py`

- [ ] **Step 1: 사실 참조와 학생용 문구 함수 추가**

Append these functions to `build_school_subject_promo.py`:

```python
def first_items(subject: dict[str, Any], key: str, limit: int) -> list[str]:
    return unique_nonempty(subject.get(key, []), limit)


def credit_label(credits: dict[str, Any]) -> str | None:
    if not credits:
        return None
    if "creditRange" in credits:
        start, end = credits["creditRange"]
        return f"{start}~{end}학점"
    if "defaultCredits" in credits:
        return f"{credits['defaultCredits']}학점"
    if "sourceCreditText" in credits:
        return str(credits["sourceCreditText"])
    return None


def build_facts_ref(subject: dict[str, Any]) -> dict[str, Any]:
    return {
        "sourceStatus": subject.get("sourceStatus"),
        "area": subject.get("area"),
        "category": subject.get("category"),
        "credits": subject.get("credits", {}),
        "creditLabel": credit_label(subject.get("credits", {})),
        "assessment": subject.get("assessment", {}),
        "source": subject.get("source", {}),
        "supplementSources": subject.get("supplementSources", []),
        "offerings": subject.get("offerings", []),
    }


def derive_hook(subject: dict[str, Any]) -> str:
    name = subject["name"]
    area = subject.get("area") or "선택과목"
    categories = subject.get("contentCategories") or []
    elements = subject.get("contentElements") or []
    topic = categories[0] if categories else elements[0] if elements else area
    hook = f"{topic}을 내 언어로 풀어보는 {name}"
    if len(hook) <= 45:
        return hook
    return f"{name}, {topic}을 탐구하는 시간"[:45]


def derive_one_liner(subject: dict[str, Any]) -> str:
    description = compact_text(subject.get("description"))
    if not description:
        return f"{subject['name']}을 통해 진로와 연결되는 주제를 탐구합니다."
    description = description.replace("이다.", "입니다.")
    description = description.replace("과목이다.", "과목입니다.")
    return description[:95].rstrip()


def derive_recommended_for(subject: dict[str, Any]) -> list[str]:
    area = subject.get("area") or "선택과목"
    elements = first_items(subject, "contentElements", 3)
    categories = first_items(subject, "contentCategories", 2)
    values = [
        f"{area} 분야가 궁금한 학생",
        f"{subject['name']}을 진로와 연결해 보고 싶은 학생",
    ]
    values.extend(f"{item}에 관심 있는 학생" for item in categories)
    values.extend(f"{item}을 직접 탐구해 보고 싶은 학생" for item in elements[:1])
    return unique_nonempty(values, 4)


def derive_activity_examples(subject: dict[str, Any]) -> list[str]:
    elements = first_items(subject, "contentElements", 4)
    if not elements:
        return [
            f"{subject['name']}과 관련된 실제 사례 찾아보기",
            f"{subject['name']} 주제로 짧은 발표 만들기",
        ]
    activities = []
    for item in elements:
        activities.append(f"{item} 사례 찾아보기")
    return unique_nonempty(activities, 4)


def derive_choice_tip(subject: dict[str, Any]) -> str:
    area = subject.get("area") or "진로"
    careers = first_items(subject, "relatedCareers", 2)
    if careers:
        return f"{area} 분야와 {careers[0]} 같은 진로가 궁금하다면 잘 맞습니다."
    return f"{area} 분야를 내 진로와 연결해 보고 싶다면 선택해 볼 만합니다."
```

- [ ] **Step 2: 진로 연결과 포스터 요소 함수 추가**

Append these functions:

```python
def derive_keywords(subject: dict[str, Any]) -> list[str]:
    items = [
        subject["name"],
        subject.get("area", ""),
        subject.get("category", ""),
    ]
    items.extend(first_items(subject, "contentCategories", 4))
    items.extend(first_items(subject, "contentElements", 4))
    items.extend(first_items(subject, "relatedDepartments", 4))
    items.extend(first_items(subject, "relatedCareers", 4))
    return unique_nonempty(items, 12)


def derive_career_bridge(subject: dict[str, Any]) -> dict[str, Any]:
    departments = first_items(subject, "relatedDepartments", 6)
    careers = first_items(subject, "relatedCareers", 6)
    keywords = derive_keywords(subject)
    if careers and departments:
        sentence = f"{subject['name']}은 {departments[0]}, {careers[0]} 같은 진로와 연결해 볼 수 있습니다."
    elif careers:
        sentence = f"{subject['name']}은 {careers[0]} 같은 진로와 연결해 볼 수 있습니다."
    else:
        sentence = f"{subject['name']}은 관심 분야를 넓히고 진로 질문을 구체화하는 데 도움을 줍니다."
    return {
        "keywords": keywords,
        "departments": departments,
        "careers": careers,
        "careerSentence": sentence,
    }


def area_mood(area: str | None) -> str:
    if not area:
        return "밝은 교실, 탐구 노트, 학생 친화형 포스터 분위기"
    return AREA_MOOD.get(area, AREA_MOOD.get(area.split("/")[0], "밝은 교실, 탐구 노트, 학생 친화형 포스터 분위기"))


def area_verbs(area: str | None) -> list[str]:
    if not area:
        return ["묻고", "찾고", "표현하는"]
    return AREA_VERBS.get(area, AREA_VERBS.get(area.split("/")[0], ["묻고", "찾고", "표현하는"]))


def derive_slogans(subject: dict[str, Any]) -> list[str]:
    name = subject["name"]
    verbs = area_verbs(subject.get("area"))
    return [
        f"{name}, 세상을 보는 새 렌즈",
        f"{verbs[0]} {verbs[1]} 나만의 답을 만드는 시간",
        f"내 진로에 {name}을 더하다",
    ]


def derive_image_prompt(subject: dict[str, Any]) -> str:
    mood = area_mood(subject.get("area"))
    keywords = ", ".join(derive_keywords(subject)[:5])
    return (
        "학교 홍보 포스터용 일러스트 이미지. "
        f"주제는 {subject['name']}. "
        f"분위기는 {mood}. "
        f"핵심 키워드는 {keywords}. "
        "실제 인물, 학교명, 로고, 저작권 캐릭터 없이 밝고 안전한 교육 자료 스타일."
    )


def derive_poster_assets(subject: dict[str, Any], one_liner: str) -> dict[str, Any]:
    return {
        "slogans": derive_slogans(subject),
        "visualMood": area_mood(subject.get("area")),
        "imagePrompt": derive_image_prompt(subject),
        "cardCopy": {
            "title": subject["name"],
            "subtitle": derive_hook(subject),
            "body": one_liner,
            "cta": "내 진로와 연결해 보기",
        },
    }
```

- [ ] **Step 3: 웹뷰, 품질, 최종 레코드 함수 추가**

Append these functions:

```python
def derive_web_view(subject: dict[str, Any], one_liner: str, keywords: list[str]) -> dict[str, Any]:
    area = subject.get("area") or "선택과목"
    category = subject.get("category") or "선택"
    tags = unique_nonempty([subject["name"], area, category, *keywords], 16)
    return {
        "badge": f"{area} · {category}",
        "summary": one_liner,
        "searchTags": tags,
    }


def derive_quality(subject: dict[str, Any]) -> dict[str, Any]:
    status = subject.get("sourceStatus")
    partial = status == "supplemented_partial"
    notes = []
    if partial:
        notes.append("부분 보충 자료 기반 과목이므로 문구와 내용 검토가 필요합니다.")
    if not subject.get("description"):
        notes.append("원천 설명이 비어 있어 생성 문구의 검토가 필요합니다.")
    return {
        "factConfidence": "medium" if partial else "high",
        "creativeFreedom": "high",
        "needsHumanReview": partial or bool(notes),
        "notes": notes,
    }


def build_promo_record(subject: dict[str, Any]) -> dict[str, Any]:
    one_liner = derive_one_liner(subject)
    career_bridge = derive_career_bridge(subject)
    return {
        "subjectId": subject["id"],
        "name": subject["name"],
        "factsRef": build_facts_ref(subject),
        "studentCopy": {
            "hook": derive_hook(subject),
            "oneLiner": one_liner,
            "recommendedFor": derive_recommended_for(subject),
            "activityExamples": derive_activity_examples(subject),
            "choiceTip": derive_choice_tip(subject),
        },
        "careerBridge": career_bridge,
        "posterAssets": derive_poster_assets(subject, one_liner),
        "webView": derive_web_view(subject, one_liner, career_bridge["keywords"]),
        "quality": derive_quality(subject),
    }
```

- [ ] **Step 4: 테스트 실행**

Run:

```powershell
py -3 -m unittest tests.test_build_school_subject_promo -v
```

Expected: 일부 PASS, `build_payload`가 아직 없어 FAIL.

- [ ] **Step 5: 커밋**

Run:

```powershell
git add build_school_subject_promo.py
git commit -m "feat: 과목별 홍보 레코드 생성"
```

Expected: 생성기 함수 구현이 커밋된다.

---

### Task 4: 페이로드와 묶음 데이터 구현

**Files:**
- Modify: `build_school_subject_promo.py`
- Test: `tests/test_build_school_subject_promo.py`

- [ ] **Step 1: 묶음 생성 함수 추가**

Append these functions:

```python
def offering_grades(subject: dict[str, Any]) -> list[str]:
    grades = []
    for offering in subject.get("offerings", []):
        grade = offering.get("grade")
        if grade is not None:
            grades.append(str(grade))
    return unique_nonempty(grades)


def build_groupings(records: list[dict[str, Any]]) -> dict[str, Any]:
    by_area: dict[str, list[str]] = {}
    by_grade: dict[str, list[str]] = {}
    review_needed: list[str] = []

    for record in records:
        subject_id = record["subjectId"]
        area = record["factsRef"].get("area") or "기타"
        by_area.setdefault(area, []).append(subject_id)

        for offering in record["factsRef"].get("offerings", []):
            grade = offering.get("grade")
            if grade is not None:
                by_grade.setdefault(str(grade), []).append(subject_id)

        if record["quality"]["needsHumanReview"]:
            review_needed.append(subject_id)

    return {
        "byArea": {key: unique_nonempty(value) for key, value in sorted(by_area.items())},
        "byOfferingGrade": {key: unique_nonempty(value) for key, value in sorted(by_grade.items())},
        "needsHumanReview": unique_nonempty(review_needed),
    }


def build_payload(source_payload: dict[str, Any]) -> dict[str, Any]:
    subjects = source_payload["subjects"]
    records = [build_promo_record(subject) for subject in subjects]
    return {
        "metadata": {
            "generatedAt": date.today().isoformat(),
            "source": "data/school-selected-subjects.json",
            "subjectCount": len(records),
            "generator": "build_school_subject_promo.py",
            "copyTone": "student_friendly",
            "generationMode": "deterministic_rules",
        },
        "subjects": records,
        "groupings": build_groupings(records),
    }
```

- [ ] **Step 2: 테스트 실행**

Run:

```powershell
py -3 -m unittest tests.test_build_school_subject_promo -v
```

Expected: 모든 테스트 PASS 또는 `main` 관련 미구현 때문에 테스트 외 실행은 아직 불가.

- [ ] **Step 3: 커밋**

Run:

```powershell
git add build_school_subject_promo.py
git commit -m "feat: 홍보 데이터 묶음 생성"
```

Expected: 페이로드와 묶음 생성 구현이 커밋된다.

---

### Task 5: 파일 출력과 실행 검증

**Files:**
- Modify: `build_school_subject_promo.py`
- Create: `data/school-subject-promo.json`
- Create: `app/src/data/json/school-subject-promo.json`
- Test: `tests/test_build_school_subject_promo.py`

- [ ] **Step 1: 파일 출력 함수와 main 추가**

Append these functions:

```python
def load_source() -> dict[str, Any]:
    return json.loads(SOURCE.read_text(encoding="utf-8"))


def write_outputs(payload: dict[str, Any]) -> None:
    for path in (OUT_DATA, OUT_APP):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )


def main() -> None:
    payload = build_payload(load_source())
    write_outputs(payload)
    print(
        json.dumps(
            {
                "subjectCount": payload["metadata"]["subjectCount"],
                "needsHumanReview": len(payload["groupings"]["needsHumanReview"]),
                "outputs": [
                    str(OUT_DATA.relative_to(ROOT)).replace("\\", "/"),
                    str(OUT_APP.relative_to(ROOT)).replace("\\", "/"),
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 단위 테스트 실행**

Run:

```powershell
py -3 -m unittest tests.test_build_school_subject_promo -v
```

Expected: PASS.

- [ ] **Step 3: 생성기 실행**

Run:

```powershell
py -3 build_school_subject_promo.py
```

Expected output:

```json
{
  "subjectCount": 77,
  "needsHumanReview": 2,
  "outputs": [
    "data/school-subject-promo.json",
    "app/src/data/json/school-subject-promo.json"
  ]
}
```

- [ ] **Step 4: 생성된 JSON 핵심값 확인**

Run:

```powershell
@'
import json
from pathlib import Path

data = json.loads(Path("data/school-subject-promo.json").read_text(encoding="utf-8"))
print(data["metadata"])
for name in ["경제", "프로그래밍", "인공지능 윤리"]:
    record = next(item for item in data["subjects"] if item["name"] == name)
    print(name, record["studentCopy"]["hook"], record["quality"])
'@ | py -3 -
```

Expected: `subjectCount` is `77`, `인공지능 윤리` has `needsHumanReview: True`, and each printed hook is non-empty.

- [ ] **Step 5: 두 JSON 복사본이 같은지 확인**

Run:

```powershell
@'
from pathlib import Path

left = Path("data/school-subject-promo.json").read_text(encoding="utf-8")
right = Path("app/src/data/json/school-subject-promo.json").read_text(encoding="utf-8")
print(left == right)
'@ | py -3 -
```

Expected: `True`.

- [ ] **Step 6: 커밋**

Run:

```powershell
git add build_school_subject_promo.py tests/test_build_school_subject_promo.py data/school-subject-promo.json app/src/data/json/school-subject-promo.json
git commit -m "feat: 선택과목 홍보 JSON 생성"
```

Expected: 생성기, 테스트, 두 JSON 산출물이 커밋된다.

---

### Task 6: 앱 타입 연결 준비

**Files:**
- Create: `app/src/data/subject-promo.ts`
- Test: `app` TypeScript build

- [ ] **Step 1: 타입 파일 작성**

Create `app/src/data/subject-promo.ts`:

```typescript
import promoData from "./json/school-subject-promo.json";

export interface SubjectPromo {
  subjectId: string;
  name: string;
  factsRef: {
    sourceStatus: string;
    area?: string;
    category?: string;
    credits?: Record<string, unknown>;
    creditLabel?: string | null;
    assessment?: Record<string, unknown>;
    source?: Record<string, unknown>;
    supplementSources?: unknown[];
    offerings: unknown[];
  };
  studentCopy: {
    hook: string;
    oneLiner: string;
    recommendedFor: string[];
    activityExamples: string[];
    choiceTip: string;
  };
  careerBridge: {
    keywords: string[];
    departments: string[];
    careers: string[];
    careerSentence: string;
  };
  posterAssets: {
    slogans: string[];
    visualMood: string;
    imagePrompt: string;
    cardCopy: {
      title: string;
      subtitle: string;
      body: string;
      cta: string;
    };
  };
  webView: {
    badge: string;
    summary: string;
    searchTags: string[];
  };
  quality: {
    factConfidence: "high" | "medium" | "low";
    creativeFreedom: "high" | "medium" | "low";
    needsHumanReview: boolean;
    notes: string[];
  };
}

export const subjectPromos = promoData.subjects as SubjectPromo[];

const promoBySubjectId = new Map(subjectPromos.map((promo) => [promo.subjectId, promo]));
const promoByName = new Map(subjectPromos.map((promo) => [promo.name, promo]));

export function getSubjectPromoById(subjectId: string): SubjectPromo | undefined {
  return promoBySubjectId.get(subjectId);
}

export function getSubjectPromoByName(name: string): SubjectPromo | undefined {
  return promoByName.get(name);
}
```

- [ ] **Step 2: 앱 빌드 확인**

Run:

```powershell
Set-Location app
npm run build
Set-Location ..
```

Expected: Next.js build succeeds. If unrelated existing app errors appear, record the exact error and do not fix unrelated files in this task.

- [ ] **Step 3: 커밋**

Run:

```powershell
git add app/src/data/subject-promo.ts
git commit -m "feat: 홍보 데이터 앱 타입 추가"
```

Expected: 타입 연결 파일만 커밋된다.

---

### Task 7: 최종 검증과 푸시

**Files:**
- Verify only

- [ ] **Step 1: 파이썬 검증 전체 실행**

Run:

```powershell
py -3 -m unittest tests.test_build_school_subject_promo -v
py -3 build_school_subject_promo.py
```

Expected: tests PASS and generated output reports `subjectCount: 77`.

- [ ] **Step 2: JSON 동기화 확인**

Run:

```powershell
@'
from pathlib import Path

left = Path("data/school-subject-promo.json").read_text(encoding="utf-8")
right = Path("app/src/data/json/school-subject-promo.json").read_text(encoding="utf-8")
assert left == right
print("promo json synced")
'@ | py -3 -
```

Expected: `promo json synced`.

- [ ] **Step 3: 작업 범위 확인**

Run:

```powershell
git status --short
```

Expected: 이번 작업 파일만 staged or clean. 기존 unrelated local changes may still appear; do not stage them.

- [ ] **Step 4: 원격 푸시**

Run:

```powershell
git push origin codex/update-hwpx-curriculum
```

Expected: branch updates on `origin/codex/update-hwpx-curriculum`.

---

## 자체 검토

- 설계의 모든 산출물(`build_school_subject_promo.py`, 기준 JSON, 앱 JSON, 앱 타입 파일)을 작업에 포함했다.
- 원천 사실 파일과 기존 추천 로직은 수정하지 않는다.
- `supplemented_partial` 과목의 검토 표시 요구를 테스트에 포함했다.
- 외부 AI API 호출 금지를 생성 방식과 테스트 가능한 구현 범위에 반영했다.
- 포스터 이미지는 만들지 않는다.
- 웹페이지는 만들지 않는다.

