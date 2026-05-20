import { NextResponse } from "next/server";
import schoolData from "@/data/json/school.json";
import careerData from "@/data/json/career-mapping.json";
import { retrieveChatContext } from "@/lib/chat-retrieval";

/** cohort별 시스템 프롬프트 생성 */
function buildSystemPrompt(cohortYear?: string, question = ""): string {
  const retrievedContext = retrieveChatContext({
    question,
    cohortYear,
    careerData,
    schoolData,
  });

  return `당신은 효자고등학교 학생들을 위한 선택과목 상담 AI입니다.

## 학교 정보
- 학교명: 효자고등학교
- 적용 교육과정: 2022 개정 교육과정

## 검색된 상담 근거
아래 근거는 학생 질문과 현재 학번을 기준으로 career-mapping.json과 school.json에서 검색·필터링한 내용입니다.
전체 데이터가 아니라 질문과 관련된 학과/계열, 효자고 현재 선택 가능 과목, 권장 과목의 개설 여부만 포함합니다.

${retrievedContext.promptText}

## 2028 수능 출제 과목
- 국어: 화법과 언어, 독서와 작문, 문학
- 수학: 대수, 미적분I, 확률과 통계
- 영어: 영어I, 영어II
- 한국사: 필수
- 사회/과학탐구: 선택

## 대입 핵심 정보
- 자연/공학/의약학 계열: 미적분II + 기하 권장 (서울대, 고려대 등 상위권 필수)
- 인문 계열: 서울대는 제2외국어/한문 1개 이상 권장
- 과학 진로선택은 계열에 맞게 2-3개 권장
- 학생부 교과: 내신 등급이 가장 중요 → 자신 있는 과목 선택도 전략
- 학생부 종합: 진로 관련 과목 이수가 평가에 반영됨

## 상담 원칙
1. 학생의 진로와 적성을 먼저 파악
2. 검색된 상담 근거의 "효자고 개설/선택 가능" 과목을 우선 추천
3. "효자고 미개설 또는 현재 선택대상 아님" 과목은 확정 추천하지 말고, 필요하면 자료상 권장 과목이지만 현재 선택 가능 여부가 확인되지 않는다고 말하기
4. 대학 입시 반영 정보를 함께 제공
5. 수능과 내신 모두 고려
6. 친근하고 이해하기 쉬운 반말 사용
7. 구체적인 과목 조합 예시 제공
8. 답변은 간결하게 (3~5문장, 필요시 목록 활용)
9. 모르는 내용은 솔직히 말하기

## 출력 형식 (중요!)
- 마크다운 문법(**, ##, -, * 등)을 절대 사용하지 마.
- 볼드, 헤딩, 불릿 리스트 대신 일반 텍스트로 작성해.
- 목록이 필요하면 "1. 2. 3." 또는 "· " 같은 일반 텍스트 기호만 사용해.
- 줄바꿈은 자유롭게 써도 돼.`;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages, cohort } = (await request.json()) as {
      messages: ChatMessage[];
      cohort?: string;
    };

    const latestQuestion = messages[messages.length - 1]?.content ?? "";
    const systemPrompt = buildSystemPrompt(cohort, latestQuestion);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback: API 키가 없을 때 기본 응답
      return NextResponse.json({
        reply: getLocalResponse(
          messages[messages.length - 1]?.content ?? "",
          cohort
        ),
      });
    }

    const geminiMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8000,
          },
        }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error("Gemini API error:", error);
      return NextResponse.json({
        reply: getLocalResponse(
          messages[messages.length - 1]?.content ?? "",
          cohort
        ),
      });
    }

    const data = await res.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      "미안, 지금은 답변이 어려워. 다시 질문해줘!";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { reply: "서버에 문제가 생겼어. 잠시 후 다시 시도해줘!" },
      { status: 500 }
    );
  }
}

// API 키 없을 때 로컬 응답
function getLocalResponse(question: string, cohort?: string): string {
  const q = question.toLowerCase();
  const cohortLabel =
    cohort === "2025" ? "고2 (2025학번)" : "고1 (2026학번)";

  if (q.includes("의사") || q.includes("의학") || q.includes("의대") || q.includes("보건") || q.includes("간호")) {
    return `의학/보건 계열을 희망한다면 생명과학, 화학은 필수야! 고3에서 세포와 물질대사, 생물의 유전도 꼭 들어봐. 수학은 미적분II까지 해두는 게 좋고, 확률과 통계도 연구 분야에서 많이 쓰여. 상위권 대학은 미적분II + 기하 조합을 선호해!`;
  }
  if (q.includes("공학") || q.includes("엔지니어") || q.includes("기계") || q.includes("전자") || q.includes("건축")) {
    return "공학 계열이면 물리학은 거의 필수야! 역학과 에너지, 전자기와 양자도 강력 추천해. 수학은 미적분II랑 기하가 중요하고, 정보나 프로그래밍도 요즘 공학에서 많이 써. 상위권 대학 목표라면 미적분II + 기하는 꼭 들어!";
  }
  if (q.includes("코딩") || q.includes("개발") || q.includes("프로그래밍") || q.includes("it") || q.includes("ai") || q.includes("인공지능") || q.includes("컴퓨터") || q.includes("소프트웨어")) {
    return "IT/AI 쪽에 관심 있구나! 정보 과목은 필수로 듣고, 프로그래밍이랑 정보과학도 추천해. 인공지능 기초, 인공지능 수학도 있으니 확인해봐! 수학은 미적분I, 확률과 통계가 AI에서 핵심이야.";
  }
  if (q.includes("법") || q.includes("변호사") || q.includes("검사") || q.includes("판사")) {
    return "법학 쪽이면 정치, 법과 사회 과목이 핵심이야. 윤리와 사상, 현대사회와 윤리도 같이 들으면 좋고, 논술도 추천해. 서울대 법학 계열은 제2외국어/한문도 권장하니까 참고해!";
  }
  if (q.includes("경제") || q.includes("경영") || q.includes("금융") || q.includes("회계") || q.includes("무역")) {
    return "경영/경제 쪽이면 경제 과목은 필수! 확률과 통계, 경제 수학도 같이 들어봐. 사회와 문화, 금융과 경제생활도 도움이 돼. 수학을 잘하면 미적분II도 경쟁력이 될 수 있어!";
  }
  if (q.includes("교사") || q.includes("교육") || q.includes("선생")) {
    return "교육 쪽에 관심 있구나! 교육의 이해는 꼭 들어봐. 인간과 심리도 도움이 되고, 가르치고 싶은 과목의 전공 관련 과목도 중요해. 예를 들어 수학 교사면 미적분II, 기하 같은 심화 수학을!";
  }
  if (q.includes("수능") || q.includes("수능 과목") || q.includes("수능 출제")) {
    return "2028 수능은 국어(화법과 언어, 독서와 작문, 문학), 수학(대수, 미적분I, 확률과 통계), 영어(영어I, 영어II)가 공통이야. 한국사는 필수! 탐구는 사회/과학에서 선택이야. 우리 학교에서 이 과목들은 다 지정과목으로 배우게 돼!";
  }
  if (q.includes("문과") || q.includes("인문") || q.includes("어문") || q.includes("사회계열")) {
    return "인문/사회 계열이면 세계사, 사회와 문화, 윤리와 사상 중에서 골라봐. 진로선택으로 정치, 법과 사회, 현대사회와 윤리도 좋아. 서울대 인문은 제2외국어/한문을 권장하니까 일본어, 중국어, 한문 중 하나도 고려해봐!";
  }
  if (q.includes("이과") || q.includes("자연") || q.includes("과학")) {
    return "자연계열이면 물리학, 화학, 생명과학, 지구과학 중에서 희망 전공에 맞게 2~3개 골라. 진로선택으로 역학과 에너지, 세포와 물질대사 같은 심화 과학도 중요해. 수학은 미적분II + 기하 추천!";
  }
  if (q.includes("3학년") || q.includes("고3") || q.includes("3학년 과목")) {
    const is2025 = cohort === "2025";
    if (is2025) {
      return "고3(2025학번) 선택 과목이 궁금하구나! 1학기에는 교과간선택 4개 + 기가정/정보/외국어 1개, 2학기에는 교과간선택 5개 + 기가정/정보/외국어 1개를 골라야 해. 진로에 맞는 과목 조합이 중요한데, 관심 분야를 알려주면 구체적으로 추천해줄게!";
    }
    return "고3(2026학번) 선택 과목이 궁금하구나! 1학기에는 교과간선택 3개 + 기가정/정보/외국어 2개, 2학기에는 교과간선택 6개 + 기가정/정보/외국어 2개를 골라야 해. 진로에 맞는 과목 조합이 중요한데, 관심 분야를 알려주면 구체적으로 추천해줄게!";
  }
  if (q.includes("추천") || q.includes("뭐 들") || q.includes("어떤 과목") || q.includes("골라")) {
    return `좋은 질문이야! 맞춤 추천을 해주려면 네 진로나 관심 분야를 알아야 해. 예를 들어 '의대 가고 싶어', 'IT 쪽에 관심 있어', '문과야' 같이 말해주면 ${cohortLabel} 기준으로 딱 맞는 과목을 추천해줄게!`;
  }

  return `좋은 질문이야! 네 관심 분야나 희망 진로를 좀 더 자세히 알려주면 ${cohortLabel} 기준으로 맞춤 과목을 추천해줄 수 있어. 예를 들어 '의대 가려면?', 'IT 관심 있어', '문과인데 추천해줘' 같이 말해줘!`;
}
