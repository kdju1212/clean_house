// 3-4-4 grouping as digits arrive, matching how a Korean mobile number
// (010-XXXX-XXXX) is actually read — mirrors the mobile app's formatter so
// owners see the same behavior on both.
export function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
