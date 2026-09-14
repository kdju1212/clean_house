import { NextResponse } from "next/server";
import { findRegionByAddressPath } from "@/lib/region";

type KakaoRegionDocument = {
  region_type: "H" | "B";
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
};

type KakaoCoord2RegionResponse = {
  documents: KakaoRegionDocument[];
};

/**
 * Turns a GPS coordinate into one of our seeded 읍/면/동 rows, for the "내
 * 위치로 찾기" button on the region picker. Delegates the actual
 * coordinate -> 법정동 lookup to Kakao's Local API (coord2regioncode) since
 * we don't hold region boundary/geometry data ourselves — only names — so a
 * hand-rolled point-in-polygon lookup isn't an option here. No auth: same
 * "public utility" trust level as GET /api/mobile/regions.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");
  // Number(null) coerces to 0, so an absent param would otherwise silently
  // resolve to (0, 0) instead of failing — check presence before coercing.
  const lat = latParam ? Number(latParam) : NaN;
  const lng = lngParam ? Number(lngParam) : NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat, lng가 필요합니다." }, { status: 400 });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "위치로 지역 찾기가 아직 설정되지 않았어요." },
      { status: 503 }
    );
  }

  const kakaoRes = await fetch(
    `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
    { headers: { Authorization: `KakaoAK ${apiKey}` } }
  );
  if (!kakaoRes.ok) {
    // Kakao's error body (errorType/message) is safe to log and to surface —
    // it never echoes the key back — and is the only way to tell "REST API
    // 키가 틀림" apart from "카카오맵 제품이 비활성화" apart from IP block, etc.
    const detail = await kakaoRes.text().catch(() => "");
    console.error(`Kakao coord2regioncode failed: ${kakaoRes.status} ${detail}`);
    return NextResponse.json(
      { error: "위치 조회에 실패했어요.", detail: detail || undefined },
      { status: 502 }
    );
  }

  const data: KakaoCoord2RegionResponse = await kakaoRes.json();
  const legal = data.documents.find((doc) => doc.region_type === "B");
  if (!legal) {
    return NextResponse.json({ error: "현재 위치의 지역 정보를 찾을 수 없어요." }, { status: 404 });
  }

  const region = await findRegionByAddressPath(
    legal.region_1depth_name,
    legal.region_2depth_name,
    legal.region_3depth_name
  );
  if (!region) {
    return NextResponse.json({ error: "아직 서비스하지 않는 지역이에요." }, { status: 404 });
  }

  return NextResponse.json({
    id: region.id,
    name: region.name,
    // Full "시도 시군구 동" path, in the exact `${group.label} ${region.name}`
    // shape the region-picker search views already build — lets a caller
    // drop this straight into its search box to land on this one result.
    path: `${legal.region_1depth_name} ${legal.region_2depth_name || legal.region_1depth_name} ${legal.region_3depth_name}`,
  });
}
