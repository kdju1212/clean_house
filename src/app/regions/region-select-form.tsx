"use client";

import { useActionState, useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { selectRegion } from "./actions";

type Region = { id: string; name: string };
type Group = { label: string; regions: Region[] };

const normalize = (text: string) => text.trim().replace(/\s+/g, "");

export function RegionSelectForm({
  groupedRegions,
  selectedId,
}: {
  groupedRegions: Group[];
  selectedId?: string;
}) {
  const [state, formAction] = useActionState(selectRegion, undefined);
  const [query, setQuery] = useState("");
  // Controlled (not defaultChecked) so the pick survives switching between
  // the search-results view and the browse view, which mount different
  // <input> elements for the same region.
  const [picked, setPicked] = useState(selectedId);

  const normalizedQuery = normalize(query);
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return null;
    const results: { id: string; label: string }[] = [];
    for (const group of groupedRegions) {
      for (const region of group.regions) {
        const label = `${group.label} ${region.name}`;
        if (normalize(label).includes(normalizedQuery)) {
          results.push({ id: region.id, label });
        }
      }
    }
    return results;
  }, [groupedRegions, normalizedQuery]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="동네 이름으로 검색 (예: 영통동)"
        className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"
      />

      {searchResults ? (
        <div className="flex flex-col gap-2">
          {searchResults.length === 0 && (
            <p className="text-sm text-neutral-400">검색 결과가 없어요.</p>
          )}
          {searchResults.map((region) => (
            <label
              key={region.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm has-checked:border-neutral-900"
            >
              <input
                type="radio"
                name="regionId"
                value={region.id}
                checked={region.id === picked}
                onChange={() => setPicked(region.id)}
              />
              {region.label}
            </label>
          ))}
        </div>
      ) : (
        groupedRegions.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-semibold text-neutral-400">{group.label}</p>
            <div className="flex flex-col gap-2">
              {group.regions.map((region) => (
                <label
                  key={region.id}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm has-checked:border-neutral-900"
                >
                  <input
                    type="radio"
                    name="regionId"
                    value={region.id}
                    checked={region.id === picked}
                    onChange={() => setPicked(region.id)}
                  />
                  {region.name}
                </label>
              ))}
            </div>
          </div>
        ))
      )}
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <SubmitButton
        className="mt-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        pendingText="저장 중..."
      >
        선택 완료
      </SubmitButton>
    </form>
  );
}
