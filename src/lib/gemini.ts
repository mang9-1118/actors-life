import { authHeaders } from '@/lib/appApi'

export class GeminiError extends Error {}

export interface GeminiPart {
  text?: string
  fileData?: { fileUri: string }
}

export interface GeminiTurn {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

/** Calls the `/api/gemini` Vercel function so the Gemini API key never ships to the client. */
export async function generateContent(contents: GeminiTurn[]): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ contents }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new GeminiError(data?.error ?? `Gemini API 요청이 실패했습니다 (${res.status}).`)
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: GeminiPart) => p.text ?? '')
    .join('')
    .trim()

  if (!text) {
    throw new GeminiError('Gemini 응답에서 텍스트를 찾을 수 없습니다.')
  }
  return text
}

function userTurn(parts: GeminiPart[]): GeminiTurn[] {
  return [{ role: 'user', parts }]
}

const CONCEPT_TUTOR_RULES =
  '학생의 설명에서 이해가 안 되거나 불충분하게 설명된 부분이 있으면 그 부분에 대해서만 ' +
  '짧고 간결하게 질문해줘. 칭찬이나 인정 같은 미사여구는 쓰지 말고, ' +
  '관련 추가 정보나 보충 설명도 제공하지 마. 오직 부족한 부분에 대한 질문만 해. ' +
  '질문할 부분이 처음부터 없거나, 이미 질문과 답변을 충분히 주고받아서 더 이상 짚을 부분이 없다면 ' +
  '새로운 질문을 계속 만들어내지 말고, "여기까지 하면 충분히 이해하신 것 같아요"처럼 짧은 마무리 말만 건네줘.'

export function analyzeConceptTranscript(
  transcript: string,
  customInstruction?: string,
): Promise<string> {
  const instruction = customInstruction?.trim()
  return generateContent(
    userTurn([
      {
        text:
          '너는 배우 훈련생을 지도하는 연기/보컬 트레이닝 튜터야. ' +
          '다음은 학생이 음성으로 말한 개념 정리 내용(전사문)이야.\n\n' +
          `${transcript}\n\n` +
          `${CONCEPT_TUTOR_RULES}` +
          (instruction
            ? `\n\n답변을 작성할 때 다음 사용자 지정 기준을 반드시 참고해줘:\n${instruction}`
            : ''),
      },
    ]),
  )
}

export function continueConceptChat(
  history: { role: 'user' | 'model'; text: string }[],
  answer: string,
): Promise<string> {
  const contents: GeminiTurn[] = [
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: `${answer}\n\n(${CONCEPT_TUTOR_RULES})` }] },
  ]
  return generateContent(contents)
}

const LECTURE_QUESTION_MARKER = '[이해도 확인 질문]'

export function analyzeYoutubeLecture(youtubeUrl: string, customInstruction?: string): Promise<string> {
  const instruction = customInstruction?.trim()
  return generateContent(
    userTurn([
      { fileData: { fileUri: youtubeUrl } },
      {
        text:
          '이 강의 영상의 핵심 내용을 한국어로 설명해줘. ' +
          '연기/보컬 훈련생이 이 영상을 보고 흔히 오해하기 쉬운 개념이 있다면 짚어서 교정해줘. ' +
          '내용을 주제별 문단으로 나누고, 문단 사이는 반드시 빈 줄로 구분해줘. ' +
          `마지막 문단은 반드시 "${LECTURE_QUESTION_MARKER}"로 시작해서, 이해도를 확인할 수 있는 질문을 1~2개 제시해줘. ` +
          '이 질문 문단이 항상 응답의 가장 마지막에 오도록 해줘.' +
          (instruction
            ? `\n\n분석할 때 다음 사용자 지정 기준을 반드시 참고해줘:\n${instruction}`
            : ''),
      },
    ]),
  )
}

export function splitLectureAnalysisIntoMessages(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const questionIndex = paragraphs.findIndex((p) => p.startsWith(LECTURE_QUESTION_MARKER))
  if (questionIndex === -1) return paragraphs
  const [question] = paragraphs.splice(questionIndex, 1)
  paragraphs.push(question)
  return paragraphs
}

export async function continueLectureChat(
  youtubeUrl: string,
  history: { role: 'user' | 'model'; text: string }[],
  question: string,
): Promise<string> {
  const contents: GeminiTurn[] = [
    { role: 'user', parts: [{ fileData: { fileUri: youtubeUrl } }] },
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: question }] },
  ]
  return generateContent(contents)
}

export function generateWeeklyComment(summary: {
  weekLabel: string
  totalHours: number
  byCategory: { label: string; hours: number; previousHours: number; goalHours: number }[]
  goalAchievedDays: number
  totalDays: number
  upcomingAuditions: { title: string; deadline: string }[]
  customInstruction?: string
}): Promise<string> {
  const hasGoals = summary.byCategory.some((c) => c.goalHours > 0)
  const breakdown = summary.byCategory
    .map((c) => {
      const delta = Math.round((c.hours - c.previousHours) * 10) / 10
      const deltaText =
        delta === 0 ? '지난주와 동일' : `지난주 대비 ${delta > 0 ? '+' : ''}${delta.toFixed(1)}시간`
      const goalText =
        c.goalHours > 0
          ? c.hours >= c.goalHours
            ? `, 목표 ${c.goalHours.toFixed(1)}시간 달성`
            : `, 목표 ${c.goalHours.toFixed(1)}시간 대비 ${(c.goalHours - c.hours).toFixed(1)}시간 부족`
          : ''
      return `- ${c.label}: ${c.hours.toFixed(1)}시간 (${deltaText}, 지난주 ${c.previousHours.toFixed(1)}시간${goalText})`
    })
    .join('\n')
  const auditionsText = summary.upcomingAuditions.length
    ? summary.upcomingAuditions.map((a) => `- ${a.title} (마감 ${a.deadline})`).join('\n')
    : '없음'
  const customInstruction = summary.customInstruction?.trim()
  return generateContent(
    userTurn([
      {
        text:
          `배우 훈련생의 주간(${summary.weekLabel}) 훈련 기록입니다.\n` +
          `총 훈련 시간: ${summary.totalHours.toFixed(1)}시간\n` +
          `카테고리별 시간 및 지난주 대비 변화:\n${breakdown}\n\n` +
          `이번 주 8시간 목표 달성 일수: ${summary.goalAchievedDays}/${summary.totalDays}일\n\n` +
          `다가오는 오디션 일정:\n${auditionsText}\n\n` +
          '이 데이터를 분석해서 배우 훈련생에게 실질적으로 도움이 되는 한국어 피드백을 작성해줘. 다음 구조를 지켜줘:\n' +
          '1) 전반적인 총평 1~2문장\n' +
          '2) 데이터에 근거한 구체적인 실행 조언 2~3가지 (예: "발성이 지난주보다 2시간 줄었으니 다음 주엔 하루 30분씩 더 투자해보세요"처럼 구체적인 시간·수치를 포함)\n' +
          '다가오는 오디션이 있다면 그 일정에 맞춰 어떤 훈련에 우선순위를 둘지도 조언에 포함해줘. ' +
          '이모지는 쓰지 말고, 격려하는 톤을 유지하되 추상적인 말 대신 구체적인 수치와 행동을 제시해줘.' +
          (hasGoals
            ? ' 카테고리별로 목표 시간이 설정되어 있으니, 목표를 채운 카테고리보다 목표에 못 미친 카테고리를 우선적으로 짚어주고, ' +
              '부족한 시간을 채우려면 남은 요일에 하루 몇 분씩 더 투자해야 하는지 구체적으로 제안해줘. 목표가 설정되지 않은 카테고리는 지난주 대비 변화만 언급해줘.'
            : '') +
          (customInstruction
            ? `\n\n코멘트를 작성할 때 다음 사용자 지정 기준을 반드시 참고해줘:\n${customInstruction}`
            : ''),
      },
    ]),
  )
}
