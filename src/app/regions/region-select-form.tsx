"use client";

import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { selectRegion } from "./actions";

type LeafRegion = { id: string; name: string };
type SearchHit = { id: string; name: string; label: string };

const normalize = (text: string) => text.trim().replace(/\s+/g, "");

export function RegionSelectForm({
  legacyRegions,
  selectedId,
  selectedName,
}: {
  legacyRegions: LeafRegion[];
  selectedId?: string;
  selectedName?: string;
}) {
  const [state, formAction] = useActionState(selectRegion, undefined);
  const [query, setQuery] = useState("");
  // Controlled (not defaultChecked) so the pick survives switching between
  // the search-results view and the browse view, which mount different
  // <input> elements for the same region.
  const [picked, setPicked] = useState(selectedId);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  const normalizedQuery = normalize(query);

  // Debounced server-side search — the region tree is ~5,000 rows, too much
  // to ship to the client on page load just to filter locally (see
  // searchRegions() in src/lib/region.ts for why that was slow). A GPS pick
  // below sets searchResults directly instead of going through this.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!normalizedQuery) {
        setSearchResults(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      fetch(`/api/mobile/regions/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((json) => setSearchResults(json.results ?? []))
        .catch((err) => {
          if (err?.name !== "AbortError") setSearchResults([]);
        })
        .finally(() => setSearching(false));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, normalizedQuery]);

  function handleLocate() {
    setLocateError(null);
    if (!("geolocation" in navigator)) {
      setLocateError("이 브라우저는 위치 정보를 지원하지 않아요.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(
            `/api/mobile/regions/reverse-geocode?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
          );
          const json = await res.json();
          if (!res.ok) {
            const detail = json?.detail ? ` (${json.detail})` : "";
            throw new Error((json?.error ?? "위치로 지역을 찾지 못했어요.") + detail);
          }
          setQuery(json.path);
          setSearchResults([{ id: json.id, name: json.name, label: json.path }]);
          setPicked(json.id);
        } catch (err) {
          setLocateError(err instanceof Error ? err.message : "위치로 지역을 찾지 못했어요.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocateError("위치 권한을 허용해주세요.");
        setLocating(false);
      }
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="동네 이름으로 검색 (예: 영통동)"
          className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"
        />
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          className="shrink-0 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium disabled:opacity-50"
        >
          {locating ? "찾는 중..." : "내 위치로 찾기"}
        </button>
      </div>
      {locateError && <p className="text-xs text-red-600">{locateError}</p>}

      {normalizedQuery ? (
        <div className="flex flex-col gap-2">
          {searching && <p className="text-sm text-neutral-400">검색 중...</p>}
          {!searching && searchResults?.length === 0 && (
            <p className="text-sm text-neutral-400">검색 결과가 없어요.</p>
          )}
          {searchResults?.map((region) => (
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
        <div className="flex flex-col gap-2">
          {selectedName && (
            <p className="text-xs text-neutral-400">현재 선택된 지역: {selectedName}</p>
          )}
          {legacyRegions.length > 0 && (
            <>
              <p className="mb-1 text-xs font-semibold text-neutral-400">기타</p>
              {legacyRegions.map((region) => (
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
            </>
          )}
          <p className="text-sm text-neutral-400">동네 이름을 검색해서 찾아보세요.</p>
        </div>
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
