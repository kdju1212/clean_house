const LAST_UPDATED = "2026년 9월 12일";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-neutral-600">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">개인정보처리방침</h1>
      <p className="mt-1 text-sm text-neutral-500">시행일: {LAST_UPDATED}</p>

      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
        이 문서는 서비스에서 실제로 수집·이용하는 항목을 기준으로 작성한
        초안이에요. [회사명], [대표자], [사업자등록번호], [주소], [연락처],
        [개인정보 보호책임자] 등 대괄호로 표시된 부분은 실제 정보로
        채워 넣어야 하고, 정식 게시 전에 변호사 등 전문가 검토를 받는 걸
        권장해요.
      </p>

      <Section title="1. 총칙">
        <p>
          [회사명](이하 &ldquo;회사&rdquo;)는 &ldquo;우리동네 청소업체&rdquo;
          서비스(이하 &ldquo;서비스&rdquo;)를 운영하면서 이용자의 개인정보를
          중요하게 생각하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
          회사는 이 개인정보처리방침을 통해 이용자가 제공하는 개인정보가
          어떤 목적과 방식으로 이용되고 있으며, 개인정보 보호를 위해 어떤
          조치가 취해지고 있는지 알려드립니다.
        </p>
      </Section>

      <Section title="2. 수집하는 개인정보 항목 및 수집 방법">
        <p className="font-medium text-neutral-700">가. 회원가입 (소셜 로그인)</p>
        <p>
          구글, 카카오, 네이버 계정으로 로그인할 때 각 제공자로부터
          이름, 이메일 주소, 프로필 이미지를 제공받아요.
        </p>
        <p className="font-medium text-neutral-700">나. 서비스 이용 과정에서 추가로 수집하는 정보</p>
        <ul className="list-disc pl-5">
          <li>연락처: 마이페이지에서 직접 등록하는 휴대전화번호</li>
          <li>
            예약 시: 예약자 이름, 연락처, 서비스 주소(상세주소 포함), 희망
            날짜/시간, 요청사항
          </li>
          <li>
            업체 등록 시(사장님 회원): 업체명, 업체 연락처, 업체 소개,
            영업시간, 서비스·가격 정보, 업체 사진
          </li>
          <li>리뷰 작성 시: 평점, 리뷰 내용, 첨부 사진(선택)</li>
          <li>신고 접수 시: 신고 사유</li>
          <li>채팅 이용 시: 예약 상대방과 주고받는 채팅 메시지 내용</li>
        </ul>
        <p className="font-medium text-neutral-700">다. 자동으로 수집되는 정보</p>
        <p>
          서비스 이용 과정에서 로그인 세션 유지 및 선택한 지역 저장을 위한
          쿠키가 자동으로 생성·저장돼요. 접속 로그, 기기 정보 등은 서비스
          운영·보안 목적으로 서버에 기록될 수 있어요.
        </p>
      </Section>

      <Section title="3. 개인정보의 수집 및 이용 목적">
        <ul className="list-disc pl-5">
          <li>회원 식별 및 로그인 유지, 부정 이용 방지</li>
          <li>
            청소업체 탐색·예약 서비스 제공 (고객과 업체 간 예약 정보 연결,
            채팅 연결)
          </li>
          <li>예약·채팅·리뷰·신고 등 서비스 이용 내역 관리</li>
          <li>고객센터 문의 응대, 공지사항 전달</li>
          <li>부정 이용, 어뷰징 방지 및 서비스 안정성 확보</li>
          <li>업체 광고 노출 등 부가 서비스 운영</li>
        </ul>
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        <p>
          회사는 이용자의 개인정보를 원칙적으로 제1항의 목적 범위 내에서만
          이용하며, 다음의 경우를 제외하고는 외부에 제공하지 않아요.
        </p>
        <ul className="list-disc pl-5">
          <li>
            <span className="font-medium text-neutral-700">
              예약 상대방에게 제공:
            </span>{" "}
            예약을 신청하면 예약자 이름, 연락처, 서비스 주소, 요청사항이
            예약을 받는 청소업체(사장님 회원)에게 전달돼요. 이는 서비스
            제공을 위해 필수적인 정보 전달이에요.
          </li>
          <li>이용자가 사전에 별도로 동의한 경우</li>
          <li>법령에 특별한 규정이 있거나 수사기관이 법령에 정한 절차에 따라 요청하는 경우</li>
        </ul>
      </Section>

      <Section title="5. 개인정보 처리의 위탁">
        <p>
          회사는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를
          외부에 위탁하고 있으며, 위탁계약 시 개인정보가 안전하게 관리되도록
          필요한 사항을 규정하고 있어요.
        </p>
        <ul className="list-disc pl-5">
          <li>Vercel: 서비스 서버 호스팅 및 배포</li>
          <li>Neon (PostgreSQL): 데이터베이스 호스팅</li>
          <li>Cloudflare R2: 업체·리뷰 사진 등 이미지 파일 저장</li>
          <li>Google, Kakao, Naver: 소셜 로그인 인증</li>
        </ul>
      </Section>

      <Section title="6. 개인정보의 보유 및 이용 기간">
        <p>
          이용자가 회원 탈퇴를 요청하면 회사는 지체 없이 개인정보를
          파기해요. 다만 다음의 경우에는 명시한 기간 동안 보존해요.
        </p>
        <ul className="list-disc pl-5">
          <li>관계 법령에 따라 보존이 필요한 거래·소비자 관련 기록</li>
          <li>
            부정 이용, 분쟁 처리를 위해 필요한 범위에서 관련 기록을 일정
            기간 보관할 수 있어요.
          </li>
        </ul>
      </Section>

      <Section title="7. 이용자의 권리와 행사 방법">
        <p>
          이용자는 언제든지 마이페이지에서 본인의 연락처 등 정보를 조회·수정할
          수 있고, 로그아웃 및 회원 탈퇴를 통해 개인정보 이용 중지를 요청할
          수 있어요. 열람·정정·삭제·처리정지 등을 원하시면 아래 문의처로
          연락해 주세요.
        </p>
      </Section>

      <Section title="8. 쿠키의 설치·운영 및 거부">
        <p>
          서비스는 로그인 상태 유지와 선택한 지역 정보를 기억하기 위해
          쿠키를 사용해요. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할
          수 있지만, 이 경우 로그인이 유지되지 않거나 지역 선택이 매번
          초기화되는 등 서비스 일부 이용에 제한이 있을 수 있어요.
        </p>
      </Section>

      <Section title="9. 개인정보의 안전성 확보 조치">
        <ul className="list-disc pl-5">
          <li>비밀번호 없이 소셜 로그인만 사용해 비밀번호 유출 위험을 배제</li>
          <li>서버 접근 권한을 필요한 범위로 제한하고, 관리자 기능은 별도 권한 검증을 거침</li>
          <li>업로드되는 이미지는 형식·용량을 검증한 뒤 저장</li>
          <li>통신 구간 암호화(HTTPS) 적용</li>
        </ul>
      </Section>

      <Section title="10. 개인정보 보호책임자">
        <p>
          회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고 이용자의
          불만 처리 및 피해 구제 등을 위해 아래와 같이 개인정보 보호책임자를
          지정하고 있어요.
        </p>
        <ul className="list-disc pl-5">
          <li>성명: [담당자명]</li>
          <li>이메일: [문의 이메일 주소]</li>
        </ul>
      </Section>

      <Section title="11. 개정 전 고지 의무">
        <p>
          이 개인정보처리방침이 변경되는 경우 회사는 변경 사항을 서비스 내
          공지사항 등을 통해 시행 전에 안내해요.
        </p>
      </Section>
    </main>
  );
}
