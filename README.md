# 우리동네 청소업체 — 지역 청소업체 마켓플레이스

지역 기반으로 청소업체를 찾고 비교해서, 전화 없이 직접 예약하는 웹 서비스입니다.

## 기술 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma 7 + PostgreSQL (`@prisma/adapter-pg` 드라이버 어댑터)
- Auth.js (next-auth v5) — Google / Kakao / Naver OAuth, JWT 세션

## 로컬 개발 환경 준비

### 1. 환경 변수

```bash
cp .env.example .env
```

`AUTH_SECRET`은 아래 명령으로 생성해서 채워주세요.

```bash
openssl rand -base64 32
```

`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, `AUTH_KAKAO_ID` / `AUTH_KAKAO_SECRET`,
`AUTH_NAVER_ID` / `AUTH_NAVER_SECRET`은 각 개발자 콘솔에서 OAuth 앱을 등록한 뒤
발급받은 값을 채워주세요. 콜백(Redirect) URL은 아래 형식입니다.

```
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/auth/callback/kakao
http://localhost:3000/api/auth/callback/naver
```

값이 비어 있어도 앱 자체는 정상적으로 실행되고, 해당 로그인 버튼을 눌렀을 때만
오류가 발생합니다 (개발 중 나머지 화면 작업에는 지장 없음).

**관리자 계정**: 별도 관리자 초대 기능은 아직 없습니다. `ADMIN_EMAILS`에
쉼표로 이메일을 나열해두면, 그 이메일로 로그인하는 순간 자동으로 ADMIN
권한이 부여됩니다.

### 2. 데이터베이스 (PostgreSQL)

`docker-compose.yml`로 로컬 Postgres를 띄웁니다.

```bash
docker compose up -d postgres
```

(Docker를 쓸 수 없는 환경이라면 로컬에 설치된 PostgreSQL을 사용해도 됩니다.
이 경우 `.env`의 `DATABASE_URL`을 실제 접속 정보에 맞게 수정하세요.)

### 3. 마이그레이션 + 시드 데이터 + 실행

```bash
npm install
npx prisma migrate dev
npx prisma db seed   # 청소 카테고리 9종 + 화성시 테스트 지역 5곳
npm run dev
```

<http://localhost:3000> 접속.

### 4. 업체 사진 업로드 (Cloudinary)

업체·리뷰 사진은 브라우저가 서명된 업로드 파라미터로 Cloudinary에 직접
업로드하는 방식입니다(`src/lib/cloudinary.ts`,
`src/app/company/photo-upload-form.tsx`). [cloudinary.com](https://cloudinary.com)
가입 후 Dashboard 첫 화면에서 아래 값을 확인해 `.env`에 채워주세요.

```
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
```

값이 비어 있어도 앱과 빌드는 정상 동작하며, 사진 업로드를 시도할 때만
"이미지 저장소가 아직 설정되지 않았어요" 같은 안내 메시지가 표시됩니다.
Cloudinary는 업로드 API가 기본적으로 모든 origin의 요청을 허용하므로,
R2와 달리 별도 CORS 설정이 필요 없습니다.

업로드 흐름: 클라이언트가 서명 요청 → Cloudinary에 원본 직접 업로드 →
서버가 Cloudinary Admin API로 실제 저장된 객체를 재검증하고 그 원본을
내려받아 서버에서 WebP로 리사이즈·재인코딩(`src/lib/image-process.ts`,
sharp 사용) → 처리된 WebP만 Cloudinary에 다시 업로드하고 원본은 삭제.
원본 바이트는 브라우저↔Cloudinary 사이에서만 오가고 우리 서버로 들어오는
요청 본문에는 절대 포함되지 않으므로, Vercel 서버리스 함수의 요청 크기
제한과 무관하게 동작합니다.

**기존 로컬 이미지(`public/uploads/`)와의 호환**: 로컬 디스크에 저장된
사진이 있다면 계속 정상적으로 보여집니다(파일을 지우지 않았고, 정적
서빙 경로도 그대로 유지). 삭제 시에도 URL 형태를 보고 로컬/Cloudinary 중
알맞은 방식으로 삭제합니다.

## 프로젝트 구조 (Phase 12 기준)

```
prisma/schema.prisma        DB 스키마 (User/Account/Session, Company/CompanyService/
                             CompanyPhoto/CompanyRegion, Category/Region, Reservation,
                             ChatRoom/ChatMessage, Review(hidden), Report, Notification,
                             Favorite, Advertisement)
src/lib/company.ts           업체 상태 라벨/배지 공통 상수
src/lib/ad.ts                 광고 슬롯 가격, 상태 계산(cancelled+날짜로 매번 파생) 헬퍼
prisma/seed.ts               카테고리·지역 시드 데이터
src/lib/prisma.ts            Prisma Client 싱글턴
src/lib/auth.ts              Auth.js 설정 (OAuth 3사, JWT 세션, ADMIN_EMAILS 부트스트랩)
src/lib/admin.ts             관리자 권한 검증 헬퍼
src/lib/company-auth.ts      업체 소유권 검증 헬퍼 (세션 기준으로만 회사를 조회)
src/lib/chat.ts              채팅방 접근 검증 (예약 당사자만 허용)
src/lib/review.ts            리뷰 작성 가능 여부 검증 (완료된 본인 예약, 중복 방지)
src/lib/cloudinary.ts        Cloudinary 서명 업로드/삭제/실제 객체 검증 (서버 전용)
src/lib/image.ts             업로드 허용 타입/용량 등 공통 검증
src/lib/image-process.ts     서버 측 EXIF 자동회전 + 리사이즈 + WebP 재인코딩 (sharp)
src/lib/storage.ts           Cloudinary 이전 로컬 이미지 삭제 호환 코드
src/lib/region.ts            쿠키 기반 선택 지역 조회
src/lib/reservation.ts       예약 시간대/상태 라벨 공통 상수
src/lib/notification.ts      알림 생성 헬퍼 (채팅 알림은 안 읽은 알림 1건으로 병합)
src/lib/action-state.ts      서버 액션 공통 에러 상태 타입(ActionState)과 변환 헬퍼(toActionError)
src/app/error.tsx            일반 라우트 에러 바운더리 (에러 화면 + 다시 시도/홈으로)
src/app/global-error.tsx     루트 레이아웃 자체가 실패했을 때의 최상위 에러 바운더리
src/app/not-found.tsx        404 화면
src/app/page.tsx             홈 (지역 표시 + 카테고리 목록, DB 연동)
src/app/regions/             지역 선택 화면 + 선택 저장 액션
src/app/categories/[slug]/   카테고리별 업체 목록 (정렬/가격 필터/평점순, ACTIVE만 노출)
src/app/companies/[id]/      업체 상세페이지 (평점/리뷰 목록, 찜 토글, ACTIVE만 노출)
src/components/company-list-card.tsx  업체 목록 카드 (광고/일반 공용, 광고는 "광고" 배지)
src/app/reservations/new/    예약 신청 폼 (요청사항 포함, 로그인 필요)
src/app/reservations/        내 예약 목록 (상태별 필터 탭, 가격 표시, 상세페이지 링크) + 취소
src/app/reservations/[id]/   예약 상세페이지 (업체/서비스/가격/주소/요청사항/상태)
src/app/reservations/[id]/chat/    예약별 1:1 채팅 (폴링 기반)
src/app/reservations/[id]/review/  완료된 예약에 대한 리뷰 작성 (평점/내용/사진)
src/app/reviews/[id]/report/  리뷰 신고
src/app/api/reservations/[id]/messages/  채팅 메시지 조회/전송 API (폴링용)
src/app/login/page.tsx       로그인 (OAuth 버튼)
src/app/mypage/page.tsx      마이페이지 (로그인 계정, 연락처 등록, 예약 요약, 내가 쓴 리뷰, 관심 업체)
src/app/company/register/    업체 최초 등록
src/app/company/page.tsx     업체 관리 대시보드 (프로필/서비스·가격/지역/사진/받은 리뷰/평균 평점)
src/app/company/photo-upload-form.tsx  Cloudinary direct upload 클라이언트 컴포넌트
src/app/company/reservations/  업체 예약 관리 (상태별 필터 탭, 승인/거절/완료 처리)
src/app/company/reservations/[id]/  업체용 예약 상세페이지 (승인/거절/완료 처리 포함)
src/app/company/ads/         업체 광고 신청/취소 (CPT 슬롯, 결제 미연동)
src/app/admin/layout.tsx     관리자 권한 검증(ADMIN 아니면 리다이렉트) + 관리자 서브 내비게이션
src/app/admin/page.tsx       관리자 대시보드 (승인 대기 업체/처리 대기 신고/신청 예약/전체 사용자 요약)
src/app/admin/companies/     업체 목록 (상태별 필터) + 승인/비활성화/재활성화
src/app/admin/companies/[id]/  업체 상세 (소유자/서비스/지역/사진/예약 현황/평점) + 상태 변경
src/app/admin/reports/       신고된 리뷰 목록 (처리 대기/완료), 리뷰 숨기기 또는 반려
src/app/admin/users/         전체 사용자 목록 (역할별 필터, 읽기 전용)
src/app/admin/reservations/  전체 예약 목록 (상태별 필터, 읽기 전용)
src/app/notifications/       알림 목록 (읽음 처리, 모두 읽음, 클릭 시 관련 페이지로 이동)
proxy.ts                     보호된 라우트 접근 제어 (/mypage, /company, /admin, /reservations, /reviews, /notifications)
```

고객 탐색 화면은 업체 `status`가 `ACTIVE`인 경우에만 노출됩니다. 신규 등록
업체는 `PENDING`으로 시작하고, `/admin/companies`에서 ADMIN이 승인해야
`ACTIVE`가 되어 고객에게 보입니다.

예약 상태는 `REQUESTED → ACCEPTED/REJECTED → COMPLETED` (또는 고객이 언제든
`CANCELLED`)로 흐릅니다. 업체는 자신의 예약만, 고객은 자신이 신청한 예약만
볼 수 있고, 상태 전환도 항상 예상되는 현재 상태에서만 서버가 허용합니다
(예: 이미 거절된 예약은 승인할 수 없음). 예약에는 선택 입력인 요청사항
(`requestNote`)과, 예약 시점 서비스 가격을 스냅샷으로 저장하는 `price`가
있습니다 — 이후 업체가 가격을 바꿔도 이미 잡힌 예약에는 예약 당시 가격이
그대로 표시됩니다.

채팅은 예약 1건당 채팅방 1개(`Reservation 1:1 ChatRoom 1:N ChatMessage`)이고,
예약 생성 시 자동으로 만들어집니다. 실시간 소켓 대신 4초 간격 폴링(REST)으로
동작하며, 해당 예약의 고객·업체만 조회/전송할 수 있습니다. 사진 전송은 아직
지원하지 않지만 `ChatMessage.imageUrl` 필드를 미리 만들어둬서 나중에 이미지
업로드만 얹으면 확장 가능하게 설계했습니다.

리뷰는 예약 1건당 1개(`Reservation 1:1 Review`)만 작성할 수 있고, 예약
상태가 `COMPLETED`인 경우에만 본인이 작성할 수 있습니다. 평점은 업체별
리뷰 평균으로 계산되어 업체 상세페이지와 목록 카드에 실시간으로 반영됩니다.
사진은 선택 사항이며 업체 사진과 동일하게 Cloudinary 서명 업로드로 처리됩니다.
신고(`Report`)는 우선 리뷰 대상만 지원하며, `/admin/reports`에서 관리자가
확인·처리합니다.

알림은 사이트 내부 알림만 지원합니다(이메일/SMS/카카오톡 알림은 이후 단계).
예약 신청/승인/거절/취소/완료, 새 채팅 메시지, 리뷰 작성 요청 시점에 상대방
에게 알림이 생성되고, 헤더의 🔔 아이콘에 읽지 않은 개수가 표시됩니다.
`/notifications`에서 목록을 확인하고, 항목을 클릭하면 읽음 처리와 함께
관련 예약/채팅/리뷰 페이지로 이동합니다. 같은 채팅방에서 메시지를 여러 개
보내도 안 읽은 알림 1건으로 병합되어 알림이 쌓이지 않습니다.

마이페이지는 역할별로 나뉩니다. 고객(`/mypage`)은 이름/이메일/로그인
계정(OAuth 제공자)을 보고, 예약을 상태별 개수(예약 예정/진행 중/완료)와
함께 요약해서 보여주며, 본인이 작성한 리뷰 목록과 찜한 업체 목록을
확인할 수 있습니다. 예약 목록(`/reservations`)에는 상태별 필터 탭이
추가되어 원하는 상태만 걸러볼 수 있습니다. 업체(`/company`)는 기존
대시보드에 평균 평점과 받은 리뷰 목록이 추가됩니다. 찜(`Favorite`)은
업체 상세페이지의 ♡ 버튼으로 토글하며, 본인 소유가 아닌 데이터는
서버에서 항상 세션 기준으로 재검증합니다.

관리자 기능(`/admin`)은 4개 섹션으로 나뉩니다. **업체**는 상태별
필터(승인 대기/활성/정지)로 목록을 보고, 개별 업체 상세페이지에서
소유자·서비스·지역·사진·예약 현황·평점을 확인하며 승인/비활성화/
재활성화를 처리합니다. **신고**는 리뷰 신고만 지원하며, 신고 사유와
원본 리뷰 내용을 함께 보고 "리뷰 숨기기"(해당 리뷰를 `hidden`
처리해 고객 화면·평점 계산에서 제외하고, 같은 리뷰에 걸린 다른
대기 중 신고도 함께 처리 완료로 전환) 또는 "반려"를 선택합니다.
**사용자**는 역할별(고객/업체/관리자) 필터로 전체 목록을 조회하는
읽기 전용 화면입니다. **예약**은 플랫폼 전체 예약을 상태별로
필터링해 조회하는 읽기 전용 화면입니다. `/admin/*` 하위 모든
라우트는 레이아웃 단에서 ADMIN 권한을 서버에서 검증하며, 그 외
권한 검증은 각 서버 액션에서 다시 한 번 확인합니다.

광고는 CPT(기간) 방식이며 실제 결제는 아직 연동하지 않고 데이터 구조와
노출 로직만 구현했습니다. 카테고리마다 1~3번 슬롯이 있고 슬롯별 일 단가는
`src/lib/ad.ts`에 고정값으로 정의되어 있습니다(1번 5,000원/일, 2번
4,000원/일, 3번 3,000원/일). `ACTIVE` 상태이고 서비스를 하나 이상 등록한
업체만 `/company/ads`에서 광고를 신청할 수 있고, 신청 시 서버가 해당
카테고리를 실제로 제공하는지와 같은 카테고리·슬롯·겹치는 기간의 광고가
이미 있는지를 재검증합니다(동일 슬롯은 기간이 겹치면 예약 불가, 슬롯이
다르면 기간이 겹쳐도 가능). 별도의 `status` 컬럼 없이 `cancelled` 플래그와
시작일/종료일을 오늘 날짜와 비교해서 예정/진행중/종료/취소 상태를 그때그때
계산합니다(상태를 최신으로 맞춰주는 배치 작업이 필요 없음). 고객이 보는
카테고리 목록(`/categories/[slug]`)에서는 현재 진행중이고 고객이 선택한
지역도 서비스하는 광고 업체가 상단에 "광고" 배지와 함께 먼저 노출되고,
같은 업체가 아래 일반 목록에는 중복으로 뜨지 않습니다.

기능은 Phase 1~12 계획(1 기본 구조 → 2 업체 시스템 → 3 고객 탐색 → 4 예약 →
5 채팅 → 6 리뷰 → 7 예약 고도화 → 8 알림 → 9 마이페이지 → 10 관리자 시스템 →
11 광고 → 12 최종 안정화) 순서대로 단계적으로 추가됩니다.

## Phase 12: 프로덕션 에러 메시지 노출 문제 수정

프로덕션 빌드(`next start`)로 실제 배포 환경을 재현해 테스트하는 과정에서,
Server Function에서 `throw new Error("한국어 메시지")`로 던진 에러가 Next.js
16의 프로덕션 빌드에서는 클라이언트에 전달되지 않고 일반적인 문구로
치환된다는 것을 발견했습니다(`<form action={fn}>` 방식과 클라이언트에서
직접 호출하는 방식 모두 동일). 개발 모드(`next dev`)에서는 실제 메시지가
그대로 보여서 이 문제가 드러나지 않았습니다. 그 결과 "전화번호 형식이
올바르지 않아요" 같은 안내 대신 알 수 없는 오류 문구만 뜨거나, 사진
업로드처럼 직접 호출하는 액션은 아예 React의 난독화된 에러(`Minified
error #...`)만 노출되는 상태였습니다.

Next.js 공식 문서(`node_modules/next/dist/docs/01-app/01-getting-started/
10-error-handling.md`)에서 권장하는 방식대로, "예상 가능한 에러는 throw
대신 반환값으로 모델링"하는 패턴으로 프로젝트 전체를 수정했습니다.

- `<form action={fn}>`으로 바인딩되는 액션(예: `updatePhone`,
  `createReservation`, `resolveReport`)은 `(prevState, formData) =>
  ActionState` 시그니처로 바꾸고, 함수 본문 전체를 `try/catch`로 감싼 뒤
  `catch`에서 `toActionError(err)`(`src/lib/action-state.ts`)를 반환하도록
  했습니다. 함수 내부의 개별 `throw new Error(...)` 검증 로직은 그대로
  두어 변경 범위를 최소화했습니다. 성공 시 페이지를 이동해야 하는 경우
  `redirect()` 호출은 `try/catch` 바깥으로 옮겼습니다(`redirect`도 내부적으로
  throw로 동작하기 때문에 catch에 잡히면 안 됨). 이 액션들은 원래 페이지에
  있던 `<form>`을 `useActionState`를 쓰는 별도의 클라이언트 컴포넌트로
  분리해야 했습니다(예: `mypage/phone-form.tsx`,
  `reservations/new/new-reservation-form.tsx`,
  `admin/reports/resolve-report-form.tsx` 등 10개 폼).
- 클라이언트 컴포넌트에서 직접 호출하는 액션(사진 업로드용
  `requestPhotoUploadUrl`/`confirmPhotoUpload`,
  `requestReviewPhotoUploadUrl`/`createReview`)은 `{ error: string } | T`
  형태의 값을 반환하도록 바꾸고, 호출하는 쪽에서 `"error" in result`로
  분기해 에러 메시지를 화면에 표시합니다.

이 외에도 Next.js 16 문서의 권장 방식대로 `error.tsx`(일반 에러 바운더리),
`global-error.tsx`(루트 레이아웃 실패 시 최상위 바운더리), `not-found.tsx`
(404 화면)를 추가했습니다.

수정 후 실제로 프로덕션 빌드(`next build && next start`)를 띄워, 이 문제를
처음 발견했던 두 시나리오(마이페이지에서 잘못된 전화번호 형식 입력, R2가
설정되지 않은 환경에서 사진 업로드 시도)를 Playwright로 재현해 올바른
한국어 에러 메시지가 화면에 뜨는지 확인했습니다. 이어서 고객/업체/관리자
세 역할로 프로덕션 빌드에서 회귀 테스트(업체 등록 → 서비스 추가 → 프로필
수정 → 지역 선택 → 연락처 저장 → 관리자 승인 → 광고 신청/취소)를 다시
실행해 리팩터링으로 인한 정상 동작 경로 손상이 없음을 확인했습니다.

## 배포 (Vercel)

Vercel 서버리스 함수의 리전은 지정하지 않으면 기본적으로 미국 동부
(iad1)로 배포됩니다. DB(Neon)를 싱가포르(ap-southeast-1)에 두고 있다면
매 요청마다 함수↔DB 왕복이 태평양을 건너게 되어 체감 속도가 크게
느려질 수 있습니다. `vercel.json`의 `regions`를 Neon과 같은 지역
(`sin1`, 싱가포르)으로 고정해 이 왕복 지연을 없앴습니다. DB 리전을
바꾸면 이 값도 함께 맞춰주세요.

## QA 노트

고객/업체/관리자 세 역할을 모두 실제 세션으로 재현해 전체 플로우
(업체 등록 → 관리자 승인 → 고객 탐색/예약 → 채팅 → 완료 처리 → 리뷰 → 신고 →
취소 → 업체 비활성화)와 권한 경계(비로그인 접근 차단, 타인의 예약/채팅/리뷰
접근 차단, 중복 리뷰 방지, 잘못된 상태 전이 방지)를 엔드투엔드로 검증했습니다.

이 과정에서 발견한 버그: 새로 등록된 업체의 `isAvailable`(예약 가능 여부)이
기본값 `false`로 생성되어, 관리자 승인을 받아도 사장님이 대시보드에서 직접
"현재 예약 가능"을 켜기 전까지는 고객이 예약을 넣을 수 없었습니다. 등록
화면 어디에도 이 토글을 켜야 한다는 안내가 없어 실사용자 기준으로는 사실상
예약이 막히는 버그였습니다. 기본값을 `true`로 변경해 등록 즉시 예약을 받을
수 있도록 수정했습니다 (`isAvailable`을 끄고 싶은 업체는 대시보드에서 직접
끌 수 있습니다).
