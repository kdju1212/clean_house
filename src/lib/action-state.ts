/**
 * Server Actions bound to <form action={fn}> can't just `throw` to show the
 * user a message — Next.js redacts thrown-error messages from Server
 * Functions in production and shows a generic "server error" screen
 * instead (confirmed by testing a production build). The fix the Next.js
 * docs recommend is to model expected failures as a returned value instead
 * of a thrown exception, paired with useActionState on the client.
 *
 * Every action in this app still validates with plain `throw new Error(...)`
 * internally (unchanged, so the logic stays readable) — only the outermost
 * call wraps that in a try/catch and converts anything caught into this
 * shape via toActionError. `redirect()` must be called outside that catch,
 * since it also works by throwing and would otherwise be caught here too.
 */
export type ActionState = { error?: string } | undefined;

export function toActionError(err: unknown): ActionState {
  return {
    error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.",
  };
}
