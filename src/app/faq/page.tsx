import Link from "next/link";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-neutral-500">{title}</h2>
      <div className="mt-2 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold">Q. {q}</p>
      <div className="mt-1 flex flex-col gap-1 text-sm leading-relaxed text-neutral-600">
        {children}
      </div>
    </div>
  );
}

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-lg font-bold">자주 묻는 질문</h1>
      <p className="mt-1 text-sm text-neutral-500">
        찾으시는 답이 없다면{" "}
        <Link href="/support" className="underline">
          고객센터
        </Link>
        로 문의해주세요.
      </p>

      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
        결제 방식 등 [대괄호]로 표시된 부분은 실제 운영 정책에 맞게 사장님이
        확인·수정해야 하는 초안이에요.
      </p>

      <Section title="예약 · 이용">
        <QA q="예약은 어떻게 하나요?">
          <p>
            원하는 업체의 상세 페이지에서 서비스를 선택하고 날짜·시간과
            요청사항을 입력하면 예약이 신청돼요. 업체가 수락하면 예약이
            확정되고, 거절하면 취소돼요.
          </p>
        </QA>
        <QA q="예약을 취소하고 싶어요.">
          <p>
            예약일 하루 전(당일 포함)까지는 예약 목록에서 직접 취소할 수
            있어요. 그보다 임박했다면 업체에 직접 연락해주세요. 예약을
            신청할 때 이 취소 정책에 동의해야 예약할 수 있어요.
          </p>
        </QA>
        <QA q="노쇼가 뭔가요?">
          <p>
            예약 시간에 연락 없이 방문하지 않으면 업체가 노쇼로 처리할 수
            있어요. 부득이한 사정이 있다면 채팅으로 미리 알려주세요.
          </p>
        </QA>
        <QA q="결제는 어떻게 하나요?">
          <p>
            예약 시 보이는 금액은 업체가 등록한 견적이고, 업체가 예약을
            수락하면서 실제 견적으로 조정할 수 있어요. 결제는 [현장 결제 /
            계좌이체 등] 업체와 직접 진행하며, 서비스 내에서 별도로 결제가
            이루어지지는 않아요.
          </p>
        </QA>
      </Section>

      <Section title="리뷰">
        <QA q="리뷰는 언제 쓸 수 있나요?">
          <p>
            업체가 예약을 &ldquo;완료&rdquo;로 처리한 뒤에 리뷰를 작성할 수
            있어요. 예약 1건당 리뷰는 1개만 남길 수 있어요.
          </p>
        </QA>
        <QA q="작성한 리뷰를 수정하거나 지울 수 있나요?">
          <p>
            아니요, 현재는 작성 후 직접 수정·삭제할 수 없어요. 잘못
            작성했다면 고객센터로 문의해주세요.
          </p>
        </QA>
        <QA q="업체가 제 리뷰에 답글을 달았어요.">
          <p>업체 사장님은 리뷰에 답글을 남길 수 있고, 답글이 달리면 알림으로 알려드려요.</p>
        </QA>
      </Section>

      <Section title="회원 · 계정">
        <QA q="로그인은 어떻게 하나요?">
          <p>구글, 카카오, 네이버 계정으로 간편하게 로그인할 수 있어요. 별도의 비밀번호는 없어요.</p>
        </QA>
        <QA q="회원 탈퇴하면 어떻게 되나요?">
          <p>
            탈퇴하면 이름·이메일 등 개인정보는 삭제되고 같은 계정으로 다시
            로그인할 수 없어요. 진행 중인 예약은 자동으로 취소되고, 업체를
            운영 중이었다면 업체도 더 이상 예약을 받지 않도록 비활성화돼요.
            이미 완료된 예약이나 작성한 리뷰는 상대방의 기록 보존을 위해
            남지만, 작성자는 &ldquo;탈퇴한 회원&rdquo;으로만 표시돼요.
          </p>
        </QA>
      </Section>

      <Section title="업체(사장님)">
        <QA q="업체는 어떻게 등록하나요?">
          <p>업체 정보를 등록하면 바로 노출되는 게 아니라, 검토(승인) 후 고객에게 노출돼요.</p>
        </QA>
        <QA q="광고는 어떻게 신청하나요?">
          <p>업체 관리 화면에서 원하는 슬롯과 기간을 선택해 신청할 수 있어요. 자세한 가격과 조건은 광고 신청 화면에서 확인해주세요.</p>
        </QA>
      </Section>

      <Section title="문의 · 신고">
        <QA q="이용 중 문제가 생겼어요.">
          <p>
            <Link href="/support" className="underline">
              마이페이지 &gt; 고객센터
            </Link>
            에서 1:1로 문의를 남겨주시면 확인 후 답변드려요.
          </p>
        </QA>
        <QA q="부적절한 리뷰나 업체를 신고하고 싶어요.">
          <p>리뷰나 업체 상세 페이지의 신고 기능을 이용해주세요. 신고는 접수 즉시 관리자에게 전달되고 검토 후 처리돼요.</p>
        </QA>
      </Section>
    </main>
  );
}
