/**
 * career-mapping.json 패치 스크립트
 * - track 레벨에서 잘못 추가된 과목 제거
 * - 각 학과(department) 레벨에 직접 추가
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, "../src/data/json/career-mapping.json");

const data = JSON.parse(readFileSync(filePath, "utf-8"));

// ========== 편성 계획 ==========
// track id → 추가할 과목 { 카테고리: [과목명] }
const trackLevelAdditions = {
  // 프로그래밍 (진로선택)
  it_software:              { 진로선택: ["프로그래밍", "정보과학"] },
  mechanical_electrical:    { 진로선택: ["프로그래밍", "정보과학"] },
  architecture_environment: { 진로선택: ["프로그래밍"] },
  chemical_bio:             { 진로선택: ["프로그래밍", "정보과학"] },
  natural_science:          { 진로선택: ["프로그래밍", "정보과학"] },

  // 현대 세계의 변화 (융합선택)
  language_literature:  { 융합선택: ["현대 세계의 변화", "관광 일본어", "관광 중국어"] },
  humanities_science:   { 융합선택: ["현대 세계의 변화"] },
  social_science:       { 융합선택: ["현대 세계의 변화"] },
  law_administration:   { 융합선택: ["현대 세계의 변화"] },
  media_communication:  { 융합선택: ["현대 세계의 변화"] },
  education:            { 융합선택: ["현대 세계의 변화"] },

  // 관광 일본어·중국어 (융합선택)
  business_economics:   { 융합선택: ["관광 일본어", "관광 중국어"] },

  // 식품과 영양 (진로선택)
  life_science_track:   { 진로선택: ["식품과 영양"] },
};

let trackPatched = 0;
let deptPatched = 0;

for (const field of data.fields) {
  for (const track of field.tracks) {
    const plan = trackLevelAdditions[track.id];
    if (!plan) continue;

    // 1. track 레벨 추가분 제거 (이전에 잘못 추가했던 것)
    if (track.recommendedSubjects) {
      for (const [cat, subjects] of Object.entries(plan)) {
        const arr = track.recommendedSubjects[cat];
        if (!arr) continue;
        const before = arr.length;
        track.recommendedSubjects[cat] = arr.filter(
          (s) => !subjects.includes(s)
        );
        if (track.recommendedSubjects[cat].length !== before) {
          console.log(`  [track 레벨 제거] ${track.id} > ${cat}: ${subjects.join(", ")}`);
          trackPatched++;
        }
      }
    }

    // 2. 각 학과(department)에 추가
    for (const dept of track.departments || []) {
      for (const [cat, subjects] of Object.entries(plan)) {
        if (!dept.recommendedSubjects) continue;
        const arr = dept.recommendedSubjects[cat];
        if (!Array.isArray(arr)) continue;

        let added = false;
        for (const subj of subjects) {
          if (!arr.includes(subj)) {
            arr.push(subj);
            added = true;
          }
        }
        if (added) {
          console.log(`  [학과 추가] ${track.id} > ${dept.name} > ${cat}: ${subjects.join(", ")}`);
          deptPatched++;
        }
      }
    }
  }
}

writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
console.log(`\n완료: track 제거 ${trackPatched}건, 학과 추가 ${deptPatched}건`);
