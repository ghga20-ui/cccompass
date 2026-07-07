# -*- coding: utf-8 -*-
"""
career-mapping.json(효자고 안내서 기반 계열별 추천)과
university-recommendations.json(대교협 2028 권장과목)의 교차 검증.

관심태그별로:
  - A = career-mapping 추천 과목 (trackMapping 경유)
  - B = 대교협 합의 (명시적 핵심/권장 지정 대학 수, tagToUnitKeywords 매칭)
불일치 2종 리포트:
  [의심] A에 있는데 B 근거 0 — 대학 근거 없는 추천 (단, 대교협 자료는
         국·수·영·탐구 위주라 제2외국어·교양·예체능 실기는 근거 부재가 정상)
  [누락] B 핵심 N개교 이상인데 A에 없음 — 매핑이 놓친 대학 요구 과목
"""
import json
import re
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

BASE = r"C:\Users\admin\Desktop\2026_project\project2_curriculum"

# ===== career-mapping.ts의 매핑 테이블 (수기 복사) =====
TRACK_MAPPING = {
    "medical": ["medicine_pharmacy"], "nursing-health": ["health"],
    "cs-ai": ["it_software"], "mechanical-elec": ["mechanical_electrical"],
    "architecture": ["architecture_environment"], "biotech": ["chemical_bio"],
    "natural-science": ["natural_science"], "bio-earth": ["natural_science"],
    "business": ["business_economics"], "law-politics": ["law_administration"],
    "media-comm": ["media_communication"], "psychology-social": ["social_science"],
    "literature": ["language_literature"], "humanities": ["humanities_science"],
    "global": ["social_science", "language_literature"], "education": ["education"],
    "art-design": ["arts"], "music-perform": ["arts"], "sports": ["physical_education"],
    "environment": ["architecture_environment", "natural_science"],
    "food-nutrition": ["life_science_track", "agriculture"],
}

# ===== university-recommendations.ts의 매칭 테이블 (수기 복사) =====
TAG_KEYWORDS = {
    "medical": ["의예", "의학", "치의", "한의", "수의", "약학"],
    "nursing-health": ["간호", "보건", "물리치료", "치위생", "응급구조", "방사선", "임상"],
    "cs-ai": ["컴퓨터", "소프트웨어", "인공지능", "AI", "데이터", "정보보안", "게임"],
    "mechanical-elec": ["기계", "전기", "전자", "항공우주", "로봇", "자동차", "제어", "반도체", "정보통신"],
    "architecture": ["건축", "토목", "도시", "건설"],
    "biotech": ["생명공학", "바이오", "유전", "식품공학", "생물"],
    "natural-science": ["물리", "화학", "수학", "통계", "천문", "자연과학"],
    "bio-earth": ["생명과학", "지구", "대기", "해양", "지질", "환경과학"],
    "business": ["경영", "경제", "회계", "무역", "금융", "세무", "유통"],
    "law-politics": ["법", "정치", "행정", "경찰"],
    "media-comm": ["미디어", "언론", "신문방송", "커뮤니케이션", "콘텐츠", "광고"],
    "psychology-social": ["심리", "사회학", "사회복지", "아동", "가족", "상담"],
    "literature": ["국문", "문예창작", "어문", "문헌정보"],
    "humanities": ["철학", "사학", "역사", "고고", "인류", "종교"],
    "global": ["영어영문", "통번역", "국제", "글로벌", "외국어", "중어", "일어", "불어", "독어", "노어", "서어"],
    "education": ["교육"],
    "art-design": ["디자인", "미술", "회화", "조형", "공예", "패션"],
    "music-perform": ["음악", "성악", "기악", "작곡", "연극", "영화", "공연", "무용"],
    "sports": ["체육", "스포츠", "운동"],
    "environment": ["환경"],
    "food-nutrition": ["식품", "영양", "조리", "외식"],
}
TAG_EXCLUDES = {
    "business": ["공학", "산림", "농업", "해양"],
    "humanities": ["역사교육"],
    "natural-science": ["교육"],
    "literature": ["문헌정보"],
}
TAG_LABELS = {
    "medical": "의대/약대/치대", "nursing-health": "간호/보건", "cs-ai": "컴퓨터/AI",
    "mechanical-elec": "기계/전자/전기", "architecture": "건축/토목/환경",
    "biotech": "생명공학/화학공학", "natural-science": "자연과학", "bio-earth": "생명과학/지구과학",
    "business": "경영/경제/금융", "law-politics": "법학/정치/행정", "media-comm": "미디어/광고/언론",
    "psychology-social": "심리/사회/복지", "literature": "어문학/문학", "humanities": "철학/사학/문화",
    "global": "국제/외교/통상", "education": "교육/교직", "art-design": "미술/디자인",
    "music-perform": "음악/공연", "sports": "체육/스포츠", "environment": "환경/에너지",
    "food-nutrition": "식품/영양/농학",
}

# 대교협 자료가 원천적으로 다루지 않는 영역(근거 부재가 정상인 과목의 area)
KCUE_BLIND_AREAS = {"제2외국어", "한문", "교양", "예술", "체육", "기술·가정"}


def normalize(name):
    t = re.sub(r"\s+", "", name)
    t = t.replace("III", "Ⅲ").replace("II", "Ⅱ").replace("I", "Ⅰ")
    return t


def main():
    with open(f"{BASE}/app/src/data/json/career-mapping.json", encoding="utf-8") as f:
        career = json.load(f)
    with open(f"{BASE}/app/src/data/json/university-recommendations.json", encoding="utf-8") as f:
        kcue = json.load(f)
    with open(f"{BASE}/app/src/data/json/subjects.json", encoding="utf-8") as f:
        subjects_data = json.load(f)
    subjects = subjects_data if isinstance(subjects_data, list) else subjects_data.get("subjects", [])
    subj_area = {normalize(s["name"]): s.get("area", "") for s in subjects}
    subj_category = {normalize(s["name"]): s.get("category", "") for s in subjects}

    # track id → recommendedSubjects
    tracks = {}
    for field in career["fields"]:
        for tr in field["tracks"]:
            tracks[tr["id"]] = tr["recommendedSubjects"]

    def kcue_consensus(tag):
        """과목명(정규화) → (core대학수, rec대학수, 원본명)"""
        kws = TAG_KEYWORDS[tag]
        exc = TAG_EXCLUDES.get(tag, [])
        core = defaultdict(set)
        rec = defaultdict(set)
        orig = {}
        for e in kcue["entries"]:
            target = f"{e['unitGroup']} {e['unit']}"
            if any(k in target for k in exc):
                continue
            if not any(k in target for k in kws):
                continue
            for cell, bucket in ((e["core"], core), (e["recommended"], rec)):
                if not cell:
                    continue
                for name in cell["subjects"]:
                    key = normalize(name)
                    bucket[key].add(e["university"])
                    orig.setdefault(key, name)
        return core, rec, orig

    print("=" * 70)
    for tag, track_ids in TRACK_MAPPING.items():
        mapped = set()
        mapped_orig = {}
        for tid in track_ids:
            if tid not in tracks:
                print(f"!! {tag}: track '{tid}' 없음")
                continue
            for cat in ("일반선택", "진로선택", "융합선택"):
                for name in tracks[tid][cat]:
                    key = normalize(name)
                    mapped.add(key)
                    mapped_orig.setdefault(key, name)

        core, rec, orig = kcue_consensus(tag)

        # [의심] 매핑 추천인데 대교협 근거 0 (블라인드 영역 제외)
        suspects = []
        for key in sorted(mapped):
            if key in core or key in rec:
                continue
            area = subj_area.get(key, "?")
            if area in KCUE_BLIND_AREAS:
                continue
            suspects.append(f"{mapped_orig[key]}({area})")

        # [누락] 대교협 핵심 5개교↑인데 매핑에 없음 (공통과목 제외)
        missing = []
        for key, unis in sorted(core.items(), key=lambda x: -len(x[1])):
            if len(unis) < 5 or key in mapped:
                continue
            if subj_category.get(key, "") == "공통":
                continue
            missing.append(f"{orig[key]}({len(unis)}개교)")

        label = TAG_LABELS[tag]
        matched_unis = len({u for s in core.values() for u in s} | {u for s in rec.values() for u in s})
        print(f"\n### {label} [{tag}] — 매핑 {len(mapped)}과목, 대교협 매칭 대학 {matched_unis}곳")
        if suspects:
            print(f"  [의심] 대학 근거 0: {', '.join(suspects)}")
        if missing:
            print(f"  [누락] 핵심 5개교↑ 미포함: {', '.join(missing)}")
        if not suspects and not missing:
            print("  (불일치 없음)")


if __name__ == "__main__":
    main()
