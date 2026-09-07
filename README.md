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

### 4. 업체 사진 업로드

현재는 로컬 디스크(`public/uploads/`)에 저장하도록 구현되어 있습니다
(`src/lib/storage.ts`). **개발/테스트 전용**이며, Railway/Render 같은 호스팅은
컨테이너 파일시스템이 재배포 시 초기화되므로 실제 운영 배포 전에는 반드시
Cloudflare R2 등 영속 오브젝트 스토리지로 교체해야 합니다.

## 프로젝트 구조 (Phase 3 기준)

```
prisma/schema.prisma        DB 스키마 (User/Account/Session, Company/CompanyService/
                             CompanyPhoto/CompanyRegion, Category/Region)
prisma/seed.ts               카테고리·지역 시드 데이터
src/lib/prisma.ts            Prisma Client 싱글턴
src/lib/auth.ts              Auth.js 설정 (OAuth 3사, JWT 세션)
src/lib/storage.ts           업체 사진 저장 (dev: 로컬 디스크)
src/lib/region.ts            쿠키 기반 선택 지역 조회
src/app/page.tsx             홈 (지역 표시 + 카테고리 목록, DB 연동)
src/app/regions/             지역 선택 화면 + 선택 저장 액션
src/app/categories/[slug]/   카테고리별 업체 목록 (정렬/가격 필터)
src/app/companies/[id]/      업체 상세페이지
src/app/reservations/new/    예약 준비 중 안내(Phase 4에서 실제 구현 예정)
src/app/login/page.tsx       로그인 (OAuth 버튼)
src/app/mypage/page.tsx      마이페이지 (로그인 필요, 연락처 등록)
src/app/company/register/    업체 최초 등록
src/app/company/page.tsx     업체 관리 대시보드 (프로필/서비스·가격/지역/사진)
proxy.ts                     보호된 라우트 접근 제어 (/mypage, /company)
```

고객 탐색 화면은 업체 `status`가 `ACTIVE`인 경우에만 노출됩니다. 업체 승인
기능(관리자)은 아직 Phase 10에서 구현 예정이라, 로컬에서 확인하려면 DB에서
직접 `status`를 `ACTIVE`로 바꿔야 합니다.

기능은 기획서의 Phase 순서(업체 시스템 → 고객 탐색 → 예약 → 채팅 → 리뷰 → QA)대로
단계적으로 추가됩니다.
