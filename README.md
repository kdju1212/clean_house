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

## 프로젝트 구조 (Phase 2 보완 기준: 관리자 승인 + R2)

```
prisma/schema.prisma        DB 스키마 (User/Account/Session, Company/CompanyService/
                             CompanyPhoto/CompanyRegion, Category/Region)
prisma/seed.ts               카테고리·지역 시드 데이터
src/lib/prisma.ts            Prisma Client 싱글턴
src/lib/auth.ts              Auth.js 설정 (OAuth 3사, JWT 세션, ADMIN_EMAILS 부트스트랩)
src/lib/admin.ts             관리자 권한 검증 헬퍼
src/lib/r2.ts                Cloudflare R2 presigned URL 발급/삭제 (서버 전용)
src/lib/image.ts             업로드 허용 타입/용량 등 공통 검증
src/lib/storage.ts           R2 이전 로컬 이미지 삭제 호환 코드
src/lib/region.ts            쿠키 기반 선택 지역 조회
src/app/page.tsx             홈 (지역 표시 + 카테고리 목록, DB 연동)
src/app/regions/             지역 선택 화면 + 선택 저장 액션
src/app/categories/[slug]/   카테고리별 업체 목록 (정렬/가격 필터, ACTIVE만 노출)
src/app/companies/[id]/      업체 상세페이지 (ACTIVE만 노출)
src/app/reservations/new/    예약 준비 중 안내(Phase 4에서 실제 구현 예정)
src/app/login/page.tsx       로그인 (OAuth 버튼)
src/app/mypage/page.tsx      마이페이지 (로그인 필요, 연락처 등록)
src/app/company/register/    업체 최초 등록
src/app/company/page.tsx     업체 관리 대시보드 (프로필/서비스·가격/지역/사진)
src/app/company/photo-upload-form.tsx  R2 direct upload 클라이언트 컴포넌트
src/app/admin/companies/     관리자 업체 승인/비활성화/재활성화 (ADMIN 전용)
proxy.ts                     보호된 라우트 접근 제어 (/mypage, /company, /admin)
```

고객 탐색 화면은 업체 `status`가 `ACTIVE`인 경우에만 노출됩니다. 신규 등록
업체는 `PENDING`으로 시작하고, `/admin/companies`에서 ADMIN이 승인해야
`ACTIVE`가 되어 고객에게 보입니다.

기능은 기획서의 Phase 순서(업체 시스템 → 고객 탐색 → 예약 → 채팅 → 리뷰 → QA)대로
단계적으로 추가됩니다.
