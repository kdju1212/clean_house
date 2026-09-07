"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};

const POLL_INTERVAL_MS = 4000;

export function ChatBox({
  reservationId,
  viewerId,
  initialMessages,
}: {
  reservationId: string;
  viewerId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/reservations/${reservationId}/messages`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setMessages(data.messages);
      } catch {
        // Silently retry on the next tick — a missed poll isn't worth
        // interrupting the user with an error.
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [reservationId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "메시지를 보내지 못했어요.");
      }
      setMessages((prev) => [...prev, data.message]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "메시지를 보내지 못했어요.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={listRef} className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-neutral-400">
            아직 대화가 없어요. 궁금한 점을 먼저 물어보세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => {
              const isMine = m.senderId === viewerId;
              return (
                <li
                  key={m.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-900"
                    }`}
                  >
                    {m.content}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 flex gap-2 border-t border-neutral-200 bg-white py-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="메시지를 입력하세요"
          maxLength={1000}
          className="flex-1 rounded-full border border-neutral-200 px-4 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          전송
        </button>
      </form>
      {error && <p className="pb-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
