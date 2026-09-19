// Shared by the web reservation form (client component), the mobile app's
// own copy of the same list, and the server-side validation in
// reservation-service.ts — plain data/logic, no server-only APIs, so it's
// safe to import from client code too.

export type ReservationQuestion = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  placeholder?: string;
  required: boolean;
};

const AREA_QUESTIONS: ReservationQuestion[] = [
  { key: "area", label: "평수", type: "number", placeholder: "예: 24", required: true },
  { key: "rooms", label: "방 개수", type: "number", placeholder: "예: 3", required: false },
];

/** Keyed by Category.slug — see prisma/seed.ts for the current category list. */
export const CATEGORY_QUESTIONS: Record<string, ReservationQuestion[]> = {
  "move-in": AREA_QUESTIONS,
  moving: AREA_QUESTIONS,
  residential: AREA_QUESTIONS,
  office: [{ key: "area", label: "평수", type: "number", placeholder: "예: 30", required: true }],
  restaurant: [{ key: "area", label: "평수", type: "number", placeholder: "예: 20", required: true }],
  store: [{ key: "area", label: "평수", type: "number", placeholder: "예: 20", required: true }],
  aircon: [
    { key: "brand", label: "브랜드", type: "text", placeholder: "예: LG, 삼성", required: false },
    {
      key: "type",
      label: "형태",
      type: "select",
      options: ["벽걸이형", "스탠드형", "시스템에어컨", "창문형"],
      required: true,
    },
    { key: "count", label: "대수", type: "number", placeholder: "예: 2", required: true },
  ],
  washer: [
    { key: "brand", label: "브랜드", type: "text", placeholder: "예: LG, 삼성", required: false },
    {
      key: "type",
      label: "타입",
      type: "select",
      options: ["통돌이", "드럼", "트윈워시"],
      required: true,
    },
    { key: "capacity", label: "용량 (kg)", type: "number", placeholder: "예: 15", required: false },
  ],
};

export function getReservationQuestions(categorySlug: string): ReservationQuestion[] {
  return CATEGORY_QUESTIONS[categorySlug] ?? [];
}

/** 은/는 조사 선택 — 마지막 글자에 받침이 있으면 "은", 없으면 "는". */
function withEunNeun(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}은(는)`;
  return code % 28 === 0 ? `${word}는` : `${word}은`;
}

/**
 * Validates raw answer values against a category's question set and
 * returns a plain {key: value} object to store as
 * Reservation.categoryAnswers, or null when the category has no extra
 * questions (or every optional one was left blank). Throws a Korean,
 * user-facing message on a missing required field or a non-numeric value
 * for a number question.
 */
export function parseCategoryAnswers(
  categorySlug: string,
  raw: Record<string, unknown>
): Record<string, string> | null {
  const questions = getReservationQuestions(categorySlug);
  if (questions.length === 0) return null;

  const answers: Record<string, string> = {};
  for (const q of questions) {
    const value = raw[q.key];
    const trimmed = typeof value === "string" ? value.trim() : "";

    if (trimmed.length === 0) {
      if (q.required) {
        throw new Error(`${q.label} 항목을 입력해주세요.`);
      }
      continue;
    }

    if (q.type === "number" && Number.isNaN(Number(trimmed))) {
      throw new Error(`${withEunNeun(q.label)} 숫자로 입력해주세요.`);
    }
    if (q.type === "select" && q.options && !q.options.includes(trimmed)) {
      throw new Error(`${q.label} 값이 올바르지 않습니다.`);
    }

    answers[q.key] = trimmed;
  }

  return Object.keys(answers).length > 0 ? answers : null;
}
