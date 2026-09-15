import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { isTestLoginEnabled } from "@/lib/test-login";

// Unlinked internal QA page — not shown anywhere in the nav. Entirely
// inert unless TEST_LOGIN_SECRET is set on the server, in which case it
// lets a developer sign in as a fixed CUSTOMER/COMPANY/ADMIN persona
// without a real Kakao/Google/Naver account.
export default async function DevLoginPage() {
  if (!isTestLoginEnabled()) {
    redirect("/login");
  }

  async function testLogin(formData: FormData) {
    "use server";
    const secret = String(formData.get("secret") ?? "");
    const role = String(formData.get("role") ?? "");
    await signIn("test-login", { secret, role, redirectTo: "/" });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-12">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold">테스트 로그인</h1>
        <p className="mt-2 text-sm text-neutral-500">
          내부 QA 전용 로그인이에요. 일반 이용자 화면에는 노출되지 않아요.
        </p>
      </div>

      <form action={testLogin} className="flex flex-col gap-3">
        <input
          type="password"
          name="secret"
          placeholder="TEST_LOGIN_SECRET"
          required
          autoComplete="off"
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm"
        />
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            name="role"
            value="CUSTOMER"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
          >
            고객으로 로그인
          </button>
          <button
            type="submit"
            name="role"
            value="COMPANY"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
          >
            업체로 로그인
          </button>
          <button
            type="submit"
            name="role"
            value="ADMIN"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
          >
            관리자로 로그인
          </button>
        </div>
      </form>
    </main>
  );
}
