/** Coupang-style "상품정보" table — bordered rows instead of a filled box. */
export function InfoRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-neutral-200">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={`flex justify-between px-3 py-2.5 text-sm ${
            i > 0 ? "border-t border-neutral-100" : ""
          }`}
        >
          <span className="text-neutral-500">{row.label}</span>
          <span className="text-right font-medium">{row.value}</span>
        </div>
      ))}
    </section>
  );
}
