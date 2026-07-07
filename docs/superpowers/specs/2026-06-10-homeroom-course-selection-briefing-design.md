# Homeroom Course Selection Briefing Design

## Goal

Create a short staff-meeting briefing deck for grade 1 and grade 2 homeroom teachers who are guiding students through the 2026 course-selection process.

The deck should support a 2-3 minute announcement and make one message clear: students should choose courses from their intended career and university pathway, not only from perceived workload or grade advantage.

## Output

- 3 editable PowerPoint slides.
- Speaker notes for each slide.
- Korean staff-meeting tone: concise, direct, and usable by homeroom teachers.

## Audience

- Grade 1 homeroom teachers: guide current grade 1 students to choose both grade 2 and grade 3 courses as one roadmap.
- Grade 2 homeroom teachers: guide current grade 2 students to connect already chosen grade 2 courses with grade 3 choices.

## Slide Structure

### Slide 1. 수강신청 상담의 기준

Core message:

> 편한 과목이 아니라, 희망 진로와 학과에 맞는 과목 흐름을 보게 해 주세요.

Teacher action flow:

1. 희망 진로/학과를 먼저 묻는다.
2. 필요한 교과 계열과 과목 흐름을 확인한다.
3. 학생 선택표가 그 흐름과 맞는지 점검한다.

### Slide 2. 1학년 담임 안내

Current grade 1 students must not choose only the immediate grade 2 subjects. They should check the grade 3 course path at the same time.

Key guidance:

- Natural science, engineering, and medical-health pathways should check science continuity and math choices.
- Humanities and social-science pathways should secure enough social-studies choices and connect them with career-related subjects.
- At least a broad pathway should be settled before final course selection.

### Slide 3. 2학년 담임 안내

Current grade 2 students should connect grade 3 choices to what they already selected or studied in grade 2.

Key guidance:

- Science subjects have sequence logic:
  - 물리학 -> 역학과 에너지 -> 전자기와 양자
  - 화학 -> 물질과 에너지 -> 화학 반응의 세계
  - 생명과학 -> 세포와 물질대사 -> 생물의 유전
  - 지구과학 -> 지구시스템과학 -> 행성우주과학
- Students who did not take science in grade 2 should be cautious about choosing grade 3 science subjects.
- Students who already took 식품과 영양 in grade 2 should not repeat it.

## Source Materials

- `2026학년도 교육과정박람회 담임교사 안내자료(1학년).hwpx`
- `2026학년도 교육과정박람회 담임교사 안내자료(2학년).hwpx`
- `data/school.json`
- `data/university-requirements.json`
- Hyoja course recommendation helper: `https://hyoja-curriculum.vercel.app/`

## Verification

- The full speaker script should be readable in 2-3 minutes.
- Slide 2 and slide 3 should receive roughly equal weight.
- The career/pathway-first message should appear at the beginning and again in the closing note.
- The output PPTX should be editable and non-empty.
