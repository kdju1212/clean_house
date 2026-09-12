import Link from "next/link";
import { signIn } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";

const providers: { id: "google" | "kakao" | "naver"; label: string }[] = [
  { id: "kakao", label: "카카오로 계속하기" },
  { id: "naver", label: "네이버로 계속하기" },
  { id: "google", label: "Google로 계속하기" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl ?? "/";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="mt-2 text-sm text-neutral-500">
          예약, 채팅, 리뷰 작성을 하려면 로그인이 필요해요
        </p>
      </div>

      {providers.map((p) => (
        <form
          key={p.id}
          action={async () => {
            "use server";
            await signIn(p.id, { redirectTo });
          }}
        >
          <SubmitButton
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
            pendingText="이동 중..."
          >
            {p.label}
          </SubmitButton>
        </form>
      ))}

      <p className="mt-2 text-center text-xs text-neutral-400">
        계속하면{" "}
        <Link href="/terms" className="underline">
          이용약관
        </Link>{" "}
        및{" "}
        <Link href="/privacy" className="underline">
          개인정보처리방침
        </Link>
        에 동의하는 것으로 간주해요.
      </p>
    </main>
  );
}
