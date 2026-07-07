# 선택과목 홍보 데이터 설계

## 목표

우리 학교 선택과목 홍보에 재사용할 수 있는 데이터 층을 만든다. 이 데이터는 과목별 포스터, 영역별 묶음 포스터, 웹앱 카드, 카드뉴스, 짧은 영상 대본의 공통 원천으로 쓸 수 있어야 한다.

## 확정한 방향

- `data/school-selected-subjects.json`을 사실 데이터의 기준으로 둔다.
- 원천 사실 파일에는 홍보 문구를 섞지 않는다.
- 홍보용 데이터는 `data/school-subject-promo.json`으로 따로 생성한다.
- 웹앱에서 바로 읽을 수 있도록 같은 파일을 `app/src/data/json/school-subject-promo.json`에도 복사한다.
- 과목별 카드를 가장 작은 재사용 단위로 삼는다.
- 영역별·학년별 포스터는 과목별 카드를 조합해서 만든다.
- 문구는 학생이 읽기 쉬운 친근한 톤으로 쓴다.
- 슬로건, 비유, 시각 무드, 이미지 프롬프트 같은 창작 요소를 허용한다.
- 검증 가능한 사실과 창작 문구는 JSON 안에서 분리한다.

## 파일 역할

`data/school-selected-subjects.json`은 파싱·보충된 과목 사실의 원천이다.

`data/school-subject-promo.json`은 홍보 데이터의 기준 파일이다. 기본적으로 생성 스크립트가 만들며, 수동 수정은 별도 검토 흐름이 생기기 전까지 피한다.

`app/src/data/json/school-subject-promo.json`은 웹앱용 복사본이다. Next.js 앱은 루트의 `data/` 디렉터리를 직접 읽지 않고 이 파일을 읽는다.

`build_school_subject_promo.py`는 `data/school-selected-subjects.json`에서 두 홍보 JSON 파일을 생성한다.

## JSON 구조

과목별 레코드는 다음 구조를 사용한다.

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

## 필드 규칙

`factsRef`에는 사실 정보만 넣는다. 출처 상태, 교과 영역, 선택 유형, 학점, 평가 방식, 출처, 학교 개설 정보를 담는다.

`studentCopy`에는 학생용 문구를 넣는다. 짧고 구체적으로 쓰며, 행정 문서 같은 표현은 피한다.

`careerBridge`에는 학과, 직업, 키워드 연결을 넣는다. 원천 데이터의 관련 학과와 관련 직업을 우선 사용하되, 너무 긴 목록은 줄인다.

`posterAssets`에는 포스터 제작에 필요한 창작 요소를 넣는다. 슬로건 후보, 시각 무드, 이미지 프롬프트, 카드형 문구가 여기에 들어간다.

`webView`에는 앱에서 쓰기 좋은 요약과 검색 태그를 넣는다.

`quality`에는 신뢰도와 검토 필요 여부를 남긴다. `sourceStatus`가 `supplemented_partial`인 과목은 반드시 `needsHumanReview: true`로 표시한다.

## 생성 방식

첫 구현은 결정적 규칙과 원천 필드만 사용한다. 외부 AI API는 호출하지 않는다. 다만 영역별 문장 틀, 짧은 동사, 학생 친화형 표현을 써서 문구가 딱딱해지지 않게 만든다.

생성 스크립트는 다음 값을 만든다.

- `hook`: 교과 영역, 선택 유형, 내용 요소, 설명에서 추출
- `oneLiner`: 과목 설명을 학생용 한 문장으로 축약
- `recommendedFor`: 내용 범주, 핵심 아이디어, 교과 영역에서 도출
- `activityExamples`: 내용 요소를 활동형 문장으로 변환
- `careerBridge.keywords`: 교과 영역, 관련 직업, 관련 학과에서 추출
- `posterAssets.slogans`: 과목명과 능동형 표현을 조합해 3개 생성
- `posterAssets.visualMood`: 교과 영역과 키워드에서 도출
- `posterAssets.imagePrompt`: 학교에서 쓸 수 있는 안전한 이미지 콘셉트로 생성
- `webView.searchTags`: 과목명, 영역, 선택 유형, 학과, 직업, 내용 키워드에서 추출

## 품질 기준

모든 레코드는 `subjectId`와 `factsRef.sourceStatus`로 원천 과목을 추적할 수 있어야 한다.

`studentCopy.hook`은 포스터 카드에 들어갈 수 있도록 가능하면 한글 40자 안팎으로 유지한다.

`posterAssets.slogans`는 서로 다른 느낌의 슬로건 3개를 담는다.

`posterAssets.imagePrompt`는 학교에서 쓸 수 있는 비브랜드 이미지 콘셉트여야 한다. 실제 학생, 실제 교사, 저작권 캐릭터는 언급하지 않는다.

`webView.searchTags`는 중복을 제거하고, 알파벳순이 아니라 검색에 유용한 순서로 정렬한다.

`비판적 질문과 창의적 해결`, `인공지능 윤리`는 세부 내용 체계 출처가 부분 보충 상태이므로 검토 메모를 남긴다.

## 범위 밖

이번 설계는 포스터 이미지를 만들지 않는다.

이번 설계는 `subjects.json`을 대체하지 않는다.

이번 설계는 기존 추천 로직을 바꾸지 않는다.

이번 설계는 새 웹페이지를 만들지 않는다. 앱 연동은 이후 구현에서 별도로 다룬다.

## 초기 기본값

- 첫 생성기는 결정적 규칙 기반으로 만든다.
- 첫 생성기는 외부 AI API를 호출하지 않는다.
- 묶음 데이터는 교과 영역과 개설 학년 기준을 우선 지원한다.
- 학생 관심 태그 기준 묶음은 포스터나 웹 화면에서 필요해질 때 추가한다.
- 이번 단계에서는 웹앱이 `subjects.json`에서 바로 갈아타지 않는다.
- AI 보조 문구 개선은 별도 검토 흐름을 만든 뒤 진행한다.

