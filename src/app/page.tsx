const categories = [
  { emoji: "🏠", label: "입주청소" },
  { emoji: "📦", label: "이사청소" },
  { emoji: "🧹", label: "거주청소" },
  { emoji: "🏢", label: "사무실청소" },
  { emoji: "🍽️", label: "식당청소" },
  { emoji: "🏬", label: "상가청소" },
  { emoji: "❄️", label: "에어컨청소" },
  { emoji: "🧺", label: "세탁기청소" },
  { emoji: "✨", label: "기타청소" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <section className="mb-6">
        <h1 className="text-lg font-bold">어떤 청소가 필요하세요?</h1>
        <p className="mt-1 text-sm text-neutral-500">
          청소 종류를 선택하면 화성시 업체를 보여드려요
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {categories.map((c) => (
          <button
            key={c.label}
            type="button"
            className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white py-5 text-sm font-medium shadow-sm active:scale-95"
          >
            <span className="text-2xl" aria-hidden>
              {c.emoji}
            </span>
            {c.label}
          </button>
        ))}
      </section>
    </main>
  );
}
