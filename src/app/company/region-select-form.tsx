"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { setRegions } from "./actions";

type LeafRegion = { id: string; name: string };
type SigunguGroup = { id: string; name: string; children: LeafRegion[] };

const normalize = (text: string) => text.trim().replace(/\s+/g, "");

/**
 * Lets a company pick many 동 without a wall of checkboxes: each 시/군/구
 * group has its own "전체" toggle that fans out to (or clears) all of its
 * 동 checkboxes, plus a tri-state label ("전체" / "일부 지역") reflecting
 * how many of its children are currently checked. Selections are always
 * submitted as explicit leaf (동) region ids — checking "전체" checks every
 * child rather than storing the parent's own id — so setRegions itself
 * needs no changes; it already just syncs whatever regionIds come through.
 */
export function RegionSelectForm({
  sigunguGroups,
  legacyRegions,
  initialSelectedIds,
}: {
  sigunguGroups: SigunguGroup[];
  legacyRegions: LeafRegion[];
  initialSelectedIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedIds));
  const [query, setQuery] = useState("");

  const normalizedQuery = normalize(query);

  const fullChildrenById = useMemo(
    () => new Map(sigunguGroups.map((g) => [g.id, g.children])),
    [sigunguGroups]
  );

  // A group whose own name matches keeps every child visible (so "전체"
  // still fans out to all of them); otherwise it's narrowed to just the
  // matching children, and dropped entirely once that's empty too. Counts
  // and the "전체" toggle always look children up via fullChildrenById
  // instead of group.children here, so they stay correct against the
  // group's true full 동 list even when this narrows what's displayed.
  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return sigunguGroups;
    return sigunguGroups
      .map((group) => {
        if (normalize(group.name).includes(normalizedQuery)) return group;
        const children = group.children.filter((c) => normalize(c.name).includes(normalizedQuery));
        return { ...group, children };
      })
      .filter((group) => group.children.length > 0);
  }, [sigunguGroups, normalizedQuery]);

  const visibleLegacyRegions = useMemo(() => {
    if (!normalizedQuery) return legacyRegions;
    return legacyRegions.filter((r) => normalize(r.name).includes(normalizedQuery));
  }, [legacyRegions, normalizedQuery]);

  function toggleLeaf(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(childIds: string[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of childIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  return (
    <form action={setRegions} className="mt-3 flex flex-col gap-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="지역 이름으로 검색 (예: 영통구)"
        className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"
      />

      {query && visibleGroups.length === 0 && visibleLegacyRegions.length === 0 && (
        <p className="text-sm text-neutral-400">검색 결과가 없어요.</p>
      )}

      {visibleGroups.map((group) => {
        // Counts and the "전체" toggle always act on the group's full 동
        // list, not just what search narrowed the chips down to.
        const fullChildIds = (fullChildrenById.get(group.id) ?? group.children).map((c) => c.id);
        const checkedCount = fullChildIds.filter((id) => selected.has(id)).length;
        const allChecked = fullChildIds.length > 0 && checkedCount === fullChildIds.length;
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
                onChange={(e) => toggleGroup(fullChildIds, e.target.checked)}
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
                    name="regionIds"
                    value={child.id}
                    checked={selected.has(child.id)}
                    onChange={() => toggleLeaf(child.id)}
                  />
                  {child.name}
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {visibleLegacyRegions.length > 0 && (
        <div>
          <p className="text-sm font-semibold">기타</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {visibleLegacyRegions.map((region) => (
              <label key={region.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="regionIds"
                  value={region.id}
                  checked={selected.has(region.id)}
                  onChange={() => toggleLeaf(region.id)}
                />
                {region.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <SubmitButton
        className="self-start rounded-lg border border-neutral-900 px-4 py-2 text-sm font-medium"
        pendingText="저장 중..."
      >
        저장
      </SubmitButton>
    </form>
  );
}
