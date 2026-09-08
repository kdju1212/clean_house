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

### 4. 업체 사진 업로드 (Cloudflare R2)

업체 사진은 브라우저가 presigned URL로 R2에 직접 업로드하는 방식입니다
(`src/lib/r2.ts`, `src/app/company/photo-upload-form.tsx`). Cloudflare
대시보드에서 R2 버킷을 만들고 `.env`에 아래 값을 채워주세요.

```
R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PUBLIC_URL
```

`R2_PUBLIC_URL`은 버킷의 Public Development URL 또는 연결한 커스텀 도메인입니다.
값이 비어 있어도 앱과 빌드는 정상 동작하며, 사진 업로드를 시도할 때만
"이미지 저장소가 아직 설정되지 않았어요" 같은 안내 메시지가 표시됩니다.

**기존 로컬 이미지(`public/uploads/`)와의 호환**: R2 도입 이전에 로컬 디스크에
저장된 사진이 있다면 계속 정상적으로 보여집니다(파일을 지우지 않았고, 정적
서빙 경로도 그대로 유지). 새 업로드만 R2를 사용하고, 삭제 시에도 URL 형태를
보고 로컬/R2 중 알맞은 방식으로 삭제합니다. 기존 로컬 이미지를 R2로 옮기는
별도 마이그레이션 스크립트는 없으므로, 필요하면 업체가 사진을 다시
업로드하거나 직접 R2로 옮긴 뒤 DB의 URL을 갱신해야 합니다.

## 프로젝트 구조 (Phase 6 기준)

```
prisma/schema.prisma        DB 스키마 (User/Account/Session, Company/CompanyService/
                             CompanyPhoto/CompanyRegion, Category/Region, Reservation,
                             ChatRoom/ChatMessage, Review, Report)
prisma/seed.ts               카테고리·지역 시드 데이터
src/lib/prisma.ts            Prisma Client 싱글턴
src/lib/auth.ts              Auth.js 설정 (OAuth 3사, JWT 세션, ADMIN_EMAILS 부트스트랩)
src/lib/admin.ts             관리자 권한 검증 헬퍼
src/lib/company-auth.ts      업체 소유권 검증 헬퍼 (세션 기준으로만 회사를 조회)
src/lib/chat.ts              채팅방 접근 검증 (예약 당사자만 허용)
src/lib/review.ts            리뷰 작성 가능 여부 검증 (완료된 본인 예약, 중복 방지)
src/lib/r2.ts                Cloudflare R2 presigned URL 발급/삭제 (서버 전용)
src/lib/image.ts             업로드 허용 타입/용량 등 공통 검증
src/lib/storage.ts           R2 이전 로컬 이미지 삭제 호환 코드
src/lib/region.ts            쿠키 기반 선택 지역 조회
src/lib/reservation.ts       예약 시간대/상태 라벨 공통 상수
src/app/page.tsx             홈 (지역 표시 + 카테고리 목록, DB 연동)
src/app/regions/             지역 선택 화면 + 선택 저장 액션
src/app/categories/[slug]/   카테고리별 업체 목록 (정렬/가격 필터/평점순, ACTIVE만 노출)
src/app/companies/[id]/      업체 상세페이지 (평점/리뷰 목록 포함, ACTIVE만 노출)
src/app/reservations/new/    예약 신청 폼 (로그인 필요)
src/app/reservations/        내 예약 목록 + 취소
src/app/reservations/[id]/chat/    예약별 1:1 채팅 (폴링 기반)
src/app/reservations/[id]/review/  완료된 예약에 대한 리뷰 작성 (평점/내용/사진)
src/app/reviews/[id]/report/  리뷰 신고
src/app/api/reservations/[id]/messages/  채팅 메시지 조회/전송 API (폴링용)
src/app/login/page.tsx       로그인 (OAuth 버튼)
src/app/mypage/page.tsx      마이페이지 (로그인 필요, 연락처 등록, 내 예약 링크)
src/app/company/register/    업체 최초 등록
src/app/company/page.tsx     업체 관리 대시보드 (프로필/서비스·가격/지역/사진)
src/app/company/photo-upload-form.tsx  R2 direct upload 클라이언트 컴포넌트
src/app/company/reservations/  업체 예약 관리 (승인/거절/완료 처리)
src/app/admin/companies/     관리자 업체 승인/비활성화/재활성화 (ADMIN 전용)
proxy.ts                     보호된 라우트 접근 제어 (/mypage, /company, /admin, /reservations, /reviews)
```

고객 탐색 화면은 업체 `status`가 `ACTIVE`인 경우에만 노출됩니다. 신규 등록
업체는 `PENDING`으로 시작하고, `/admin/companies`에서 ADMIN이 승인해야
`ACTIVE`가 되어 고객에게 보입니다.

예약 상태는 `REQUESTED → ACCEPTED/REJECTED → COMPLETED` (또는 고객이 언제든
`CANCELLED`)로 흐릅니다. 업체는 자신의 예약만, 고객은 자신이 신청한 예약만
볼 수 있고, 상태 전환도 항상 예상되는 현재 상태에서만 서버가 허용합니다
(예: 이미 거절된 예약은 승인할 수 없음).

채팅은 예약 1건당 채팅방 1개(`Reservation 1:1 ChatRoom 1:N ChatMessage`)이고,
예약 생성 시 자동으로 만들어집니다. 실시간 소켓 대신 4초 간격 폴링(REST)으로
동작하며, 해당 예약의 고객·업체만 조회/전송할 수 있습니다. 사진 전송은 아직
지원하지 않지만 `ChatMessage.imageUrl` 필드를 미리 만들어둬서 나중에 이미지
업로드만 얹으면 확장 가능하게 설계했습니다.

리뷰는 예약 1건당 1개(`Reservation 1:1 Review`)만 작성할 수 있고, 예약
상태가 `COMPLETED`인 경우에만 본인이 작성할 수 있습니다. 평점은 업체별
리뷰 평균으로 계산되어 업체 상세페이지와 목록 카드에 실시간으로 반영됩니다.
사진은 선택 사항이며 업체 사진과 동일하게 R2 presigned URL로 업로드됩니다.
신고(`Report`)는 우선 리뷰 대상만 지원하고, 관리자가 신고 내역을 확인·처리
하는 화면은 아직 없습니다(향후 관리자 기능 확장 시 추가 예정).

기능은 기획서의 Phase 순서(업체 시스템 → 고객 탐색 → 예약 → 채팅 → 리뷰 → QA)대로
단계적으로 추가됩니다.

## QA (Phase 7)

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
