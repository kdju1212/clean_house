import { NextResponse } from "next/server";

type KakaoAddressDocument = {
  address: { address_name: string } | null;
  road_address: { address_name: string } | null;
};

type KakaoCoord2AddressResponse = {
  documents: KakaoAddressDocument[];
};

/**
 * Turns a GPS coordinate into an actual street address, for the "내 위치로
 * 찾기" button on the reservation form's 서비스 주소 field. This is a
 * different Kakao endpoint from /api/mobile/regions/reverse-geocode:
 * coord2address returns a real road/지번 address, while coord2regioncode
 * (used there) only resolves down to the 법정동 — too coarse for "where do
 * I send the cleaner." No auth: same "public utility" trust level as the
 * region lookup.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");
  const lat = latParam ? Number(latParam) : NaN;
  const lng = lngParam ? Number(lngParam) : NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat, lng가 필요합니다." }, { status: 400 });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "위치로 주소 찾기가 아직 설정되지 않았어요." },
      { status: 503 }
    );
  }

  const kakaoRes = await fetch(
    `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
    { headers: { Authorization: `KakaoAK ${apiKey}` } }
  );
  if (!kakaoRes.ok) {
    const detail = await kakaoRes.text().catch(() => "");
    console.error(`Kakao coord2address failed: ${kakaoRes.status} ${detail}`);
    return NextResponse.json(
      { error: "위치 조회에 실패했어요.", detail: detail || undefined },
      { status: 502 }
    );
  }

  const data: KakaoCoord2AddressResponse = await kakaoRes.json();
  const doc = data.documents[0];
  // 도로명 주소가 없는 지역(신주소 미부여 등)도 있어 지번 주소로 폴백.
  const address = doc?.road_address?.address_name ?? doc?.address?.address_name;
  if (!address) {
    return NextResponse.json({ error: "현재 위치의 주소를 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json({ address });
}
