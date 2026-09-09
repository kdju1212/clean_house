"use client";

import { useActionState } from "react";
import { TIME_SLOTS } from "@/lib/reservation";
import { SubmitButton } from "@/components/submit-button";
import { createReservation } from "../actions";

export function NewReservationForm({
  companyId,
  services,
  defaultName,
  defaultPhone,
  todayStr,
}: {
  companyId: string;
  services: { categoryId: string; price: number; category: { name: string } }[];
  defaultName: string;
  defaultPhone: string;
  todayStr: string;
}) {
  const [state, formAction] = useActionState(createReservation, undefined);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="companyId" value={companyId} />

      <label className="flex flex-col gap-1 text-sm font-medium">
        청소 종류
        <select
          name="categoryId"
          required
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        >
          {services.map((s) => (
            <option key={s.categoryId} value={s.categoryId}>
              {s.category.name} ({s.price.toLocaleString()}원~)
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        서비스 주소
        <input
          name="address"
          required
          placeholder="도로명 주소"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        상세 주소 (선택)
        <input
          name="addressDetail"
          placeholder="동/호수 등"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          희망 날짜
          <input
            name="desiredDate"
            type="date"
            min={todayStr}
            defaultValue={todayStr}
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          희망 시간
          <select
            name="desiredTime"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
          >
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        이름
        <input
          name="name"
          defaultValue={defaultName}
          required
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        연락처
        <input
          name="phone"
          type="tel"
          defaultValue={defaultPhone}
          required
          placeholder="010-0000-0000"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        요청사항 (선택)
        <textarea
          name="requestNote"
          rows={3}
          placeholder="업체에 미리 전달하고 싶은 내용을 적어주세요"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal"
        />
      </label>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <SubmitButton
        className="mt-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        pendingText="신청 중..."
      >
        예약 신청하기
      </SubmitButton>
    </form>
  );
}
