export const AD_SLOTS = [1, 2, 3] as const;

export const AD_SLOT_PRICE: Record<number, number> = {
  1: 5000,
  2: 4000,
  3: 3000,
};

export type AdStatus = "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED";

export const AD_STATUS_LABEL: Record<AdStatus, string> = {
  SCHEDULED: "예정",
  ACTIVE: "진행중",
  ENDED: "종료",
  CANCELLED: "취소됨",
};

export const AD_STATUS_BADGE_CLASS: Record<AdStatus, string> = {
  SCHEDULED: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-green-100 text-green-700",
  ENDED: "bg-neutral-200 text-neutral-600",
  CANCELLED: "bg-neutral-200 text-neutral-600",
};

/** No stored status column, no batch job to keep it fresh — always derived
 * from cancelled + today vs. [startDate, endDate]. */
export function getAdStatus(ad: {
  cancelled: boolean;
  startDate: Date;
  endDate: Date;
}): AdStatus {
  if (ad.cancelled) return "CANCELLED";
  const today = startOfToday();
  if (today < ad.startDate) return "SCHEDULED";
  if (today > ad.endDate) return "ENDED";
  return "ACTIVE";
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
