"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { setRegions } from "./actions";

type LeafRegion = { id: string; name: string };
type SigunguGroup = { id: string; name: string; children: LeafRegion[] };

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

  function toggleLeaf(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(group: SigunguGroup, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const child of group.children) {
        if (checked) next.add(child.id);
        else next.delete(child.id);
      }
      return next;
    });
  }

  return (
    <form action={setRegions} className="mt-3 flex flex-col gap-4">
      {sigunguGroups.map((group) => {
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

      {legacyRegions.length > 0 && (
        <div>
          <p className="text-sm font-semibold">기타</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {legacyRegions.map((region) => (
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
