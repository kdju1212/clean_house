"use client";

import { useEffect, useState } from "react";
import { setCompanyRegionIds } from "./actions";

type LeafRegion = { id: string; name: string };
type RegionGroupHit = { id: string; name: string; children: LeafRegion[] };
type SelectedRegion = { id: string; label: string };

/**
 * Lets a company pick many 동 without a wall of checkboxes: search finds a
 * 시/군/구 (its full 동 list comes back, not just the matching one — see
 * /api/mobile/regions/search-groups) which can then be bulk-toggled with
 * "전체", or picked 동-by-동. Selections persist across searches in
 * `selected` (a Map, so we always have a label to show even once the group
 * that produced it has scrolled out of view) and are always visible up top
 * as removable chips — with ~5,000 동 nationwide now, "what's currently
 * checked" isn't otherwise answerable by glancing at the page.
 */
export function RegionSelectForm({
  legacyRegions,
  initialSelectedRegions,
}: {
  legacyRegions: LeafRegion[];
  initialSelectedRegions: SelectedRegion[];
}) {
  const [selected, setSelected] = useState<Map<string, string>>(
    () => new Map(initialSelectedRegions.map((r) => [r.id, r.label]))
  );
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<RegionGroupHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedQuery = query.trim();

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!normalizedQuery) {
        setGroups(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      fetch(`/api/mobile/regions/search-groups?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((json) => setGroups(json.groups ?? []))
        .catch((err) => {
          if (err?.name !== "AbortError") setGroups([]);
        })
        .finally(() => setSearching(false));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, normalizedQuery]);

  function toggleLeaf(id: string, label: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, label);
      return next;
    });
  }

  function toggleGroup(group: RegionGroupHit, checked: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const child of group.children) {
        if (checked) next.set(child.id, `${group.name} ${child.name}`);
        else next.delete(child.id);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await setCompanyRegionIds([...selected.keys()]);
    setSaving(false);
    if ("error" in result) setError(result.error);
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      {selected.size > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-neutral-400">
            선택된 지역 ({selected.size})
          </p>
          <div className="flex flex-wrap gap-2">
            {[...selected.entries()].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleLeaf(id, label)}
                className="flex items-center gap-1 rounded-full border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                {label}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="지역 이름으로 검색 (예: 영통구)"
        className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"
      />

      {normalizedQuery ? (
        <div className="flex flex-col gap-4">
          {searching && <p className="text-sm text-neutral-400">검색 중...</p>}
          {!searching && groups?.length === 0 && (
            <p className="text-sm text-neutral-400">검색 결과가 없어요.</p>
          )}
          {groups?.map((group) => {
            const childIds = group.children.map((c) => c.id);
            const checkedCount = childIds.filter((id) => selected.has(id)).length;
            const allChecked = childIds.length > 0 && checkedCount === childIds.length;
            const someChecked = !allChecked && checkedCount > 0;

            return (
              <div key={group.id}>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    onChange={(e) => toggleGroup(group, e.target.checked)}
                  />
                  {group.name}
                  {allChecked && (
                    <span className="text-xs font-normal text-neutral-400">(전체)</span>
                  )}
                  {someChecked && (
                    <span className="text-xs font-normal text-neutral-400">(일부 지역)</span>
                  )}
                </label>
                <div className="mt-2 ml-6 grid grid-cols-2 gap-2">
                  {group.children.map((child) => (
                    <label key={child.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.has(child.id)}
                        onChange={() => toggleLeaf(child.id, `${group.name} ${child.name}`)}
                      />
                      {child.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        legacyRegions.length > 0 && (
          <div>
            <p className="text-sm font-semibold">기타</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {legacyRegions.map((region) => (
                <label key={region.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(region.id)}
                    onChange={() => toggleLeaf(region.id, region.name)}
                  />
                  {region.name}
                </label>
              ))}
            </div>
          </div>
        )
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded-lg border border-neutral-900 px-4 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-60"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
