"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { socialSignIn } from "./actions";

const PROVIDERS: { id: "google" | "kakao" | "naver"; label: string }[] = [
  { id: "kakao", label: "카카오로 계속하기" },
  { id: "naver", label: "네이버로 계속하기" },
  { id: "google", label: "Google로 계속하기" },
];

const CONSENTS = [
  { key: "agreeAge", label: "만 14세 이상입니다" },
  { key: "agreeTerms", label: "이용약관 동의", href: "/terms" },
  { key: "agreePrivacy", label: "개인정보 수집·이용 동의", href: "/privacy" },
] as const;

type ConsentKey = (typeof CONSENTS)[number]["key"];

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [checked, setChecked] = useState<Record<ConsentKey, boolean>>({
    agreeAge: false,
    agreeTerms: false,
    agreePrivacy: false,
  });
  const [state, formAction] = useActionState(socialSignIn, undefined);
  const allChecked = CONSENTS.every((c) => checked[c.key]);

  function setAll(value: boolean) {
    setChecked({ agreeAge: value, agreeTerms: value, agreePrivacy: value });
  }

  return (
    <>
      <div className="mb-2 rounded-xl border border-neutral-200 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={allChecked} onChange={(e) => setAll(e.target.checked)} />
          전체 동의
        </label>
        <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-3">
          {CONSENTS.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked[c.key]}
                  onChange={(e) => setChecked((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                />
                <span>
                  <span className="text-[#ff6f0f]">[필수]</span> {c.label}
                </span>
              </label>
              {"href" in c && (
                <Link href={c.href} className="shrink-0 text-xs text-neutral-400 underline">
                  보기
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {PROVIDERS.map((p) => (
        <form key={p.id} action={formAction}>
          <input type="hidden" name="provider" value={p.id} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          {CONSENTS.map((c) =>
            checked[c.key] ? <input key={c.key} type="hidden" name={c.key} value="on" /> : null
          )}
          <SubmitButton
            disabled={!allChecked}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50 disabled:opacity-40"
            pendingText="이동 중..."
          >
            {p.label}
          </SubmitButton>
        </form>
      ))}

      {state?.error && !allChecked && (
        <p className="text-center text-xs text-red-600">{state.error}</p>
      )}
    </>
  );
}
