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
  // A "select" question with more than one answer allowed (e.g. 에어컨
  // 형태 — a customer might have both a 벽걸이형 and a 스탠드형 unit to
  // clean). Stored as the selected options joined with "," in the same
  // string value every other question uses.
  multiple?: boolean;
};

const AREA_QUESTIONS: ReservationQuestion[] = [
  { key: "area", label: "평수", type: "number", placeholder: "예: 24", required: true },
  { key: "rooms", label: "방 개수", type: "number", placeholder: "예: 3", required: false },
  { key: "toilets", label: "화장실 개수", type: "number", placeholder: "예: 2", required: false },
  {
    key: "condition",
    label: "오염도",
    type: "select",
    options: ["신축(입주 전)", "거주 중"],
    required: false,
  },
  {
    key: "balconyExtended",
    label: "베란다 확장 여부",
    type: "select",
    options: ["예", "아니오"],
    required: false,
  },
  {
    key: "builtInCloset",
    label: "붙박이장 개수",
    type: "number",
    placeholder: "예: 2",
    required: false,
  },
];

/** Keyed by Category.slug — see prisma/seed.ts for the current category list. */
export const CATEGORY_QUESTIONS: Record<string, ReservationQuestion[]> = {
  "move-in": AREA_QUESTIONS,
  moving: AREA_QUESTIONS,
  residential: AREA_QUESTIONS,
  office: [
    { key: "area", label: "평수", type: "number", placeholder: "예: 30", required: true },
    { key: "occupants", label: "상주 인원", type: "number", placeholder: "예: 15", required: false },
    { key: "toilets", label: "화장실 개수", type: "number", placeholder: "예: 2", required: false },
  ],
  restaurant: [
    { key: "area", label: "평수", type: "number", placeholder: "예: 20", required: true },
    {
      key: "hood",
      label: "주방 후드/기름때 청소",
      type: "select",
      options: ["필요", "필요없음"],
      required: false,
    },
    { key: "toilets", label: "화장실 개수", type: "number", placeholder: "예: 1", required: false },
  ],
  store: [
    { key: "area", label: "평수", type: "number", placeholder: "예: 20", required: true },
    { key: "toilets", label: "화장실 개수", type: "number", placeholder: "예: 1", required: false },
  ],
  aircon: [
    { key: "brand", label: "브랜드", type: "text", placeholder: "예: LG, 삼성", required: false },
    {
      key: "type",
      label: "형태",
      type: "select",
      options: ["벽걸이형", "스탠드형", "시스템에어컨", "창문형"],
      required: true,
      multiple: true,
    },
    { key: "count", label: "대수", type: "number", placeholder: "예: 2", required: true },
    {
      key: "systemDirection",
      label: "시스템에어컨 방향 수 (해당 시)",
      type: "select",
      options: ["1way", "2way", "4way", "매립덕트형"],
      required: false,
    },
  ],
  washer: [
    { key: "brand", label: "브랜드", type: "text", placeholder: "예: LG, 삼성", required: false },
    {
      key: "type",
      label: "타입",
      type: "select",
      options: ["통돌이", "드럼", "트윈워시"],
      required: true,
      multiple: true,
    },
    { key: "capacity", label: "용량 (kg)", type: "number", placeholder: "예: 15", required: false },
    { key: "count", label: "세탁기 대수", type: "number", placeholder: "예: 1", required: true },
    {
      key: "disassembly",
      label: "완전분해 청소",
      type: "select",
      options: ["필요", "필요없음"],
      required: false,
    },
  ],
};

export function getReservationQuestions(categorySlug: string): ReservationQuestion[] {
  return CATEGORY_QUESTIONS[categorySlug] ?? [];
}

/**
 * Which question key represents the "how many units" quantity a company
 * can price PER_UNIT against — 평수 for space categories, 대수 for
 * 에어컨청소. A category with no entry here (세탁기청소, 기타청소, ...) has
 * no natural per-unit multiplier, so it can only be priced FLAT.
 */
export const PRICING_QUANTITY_KEY: Record<string, string> = {
  "move-in": "area",
  moving: "area",
  residential: "area",
  office: "area",
  restaurant: "area",
  store: "area",
  aircon: "count",
};

export const PRICING_UNIT_LABEL: Record<string, string> = {
  area: "평",
  count: "대",
};

export function getPricingQuantityKey(categorySlug: string): string | undefined {
  return PRICING_QUANTITY_KEY[categorySlug];
}

export function supportsPerUnitPricing(categorySlug: string): boolean {
  return categorySlug in PRICING_QUANTITY_KEY;
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
 * ReservationItem.categoryAnswers, or null when the category has no extra
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
    if (q.type === "select" && q.options) {
      const selected = q.multiple ? trimmed.split(",").filter(Boolean) : [trimmed];
      if (selected.length === 0 || selected.some((v) => !q.options!.includes(v))) {
        throw new Error(`${q.label} 값이 올바르지 않습니다.`);
      }
    }

    answers[q.key] = trimmed;
  }

  return Object.keys(answers).length > 0 ? answers : null;
}
