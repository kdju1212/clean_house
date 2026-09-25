import { getReservationQuestions } from "@/lib/reservation-questions";

type Item = {
  id: string;
  categoryAnswers: unknown;
  category: { name: string; slug: string };
};

/** The "견적 정보" block of a reservation's detail page — each booked
 * service's answers, under its own name when more than one was booked.
 * Shared by the customer's and the company's reservation detail pages. */
export function ReservationEstimateDetails({ items }: { items: Item[] }) {
  const sections = items
    .map((item) => {
      const answers =
        item.categoryAnswers && typeof item.categoryAnswers === "object"
          ? (item.categoryAnswers as Record<string, string>)
          : {};
      const rows = getReservationQuestions(item.category.slug)
        .filter((q) => answers[q.key])
        .map((q) => ({ key: q.key, label: q.label, value: answers[q.key].split(",").join(", ") }));
      return { item, rows };
    })
    .filter((s) => s.rows.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 border-t border-neutral-100 pt-3">
      <span className="text-neutral-500">견적 정보</span>
      {sections.map(({ item, rows }) => (
        <div key={item.id} className="flex flex-col gap-1.5">
          {items.length > 1 && (
            <span className="mt-1 text-xs font-semibold text-neutral-700">{item.category.name}</span>
          )}
          {rows.map((row) => (
            <div key={row.key} className="flex justify-between gap-3">
              <span className="text-neutral-500">{row.label}</span>
              <span className="text-right font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
