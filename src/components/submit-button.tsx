"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

/**
 * Drop-in replacement for a plain <button type="submit"> inside a
 * <form action={serverAction}>. Server Actions give no visual feedback on
 * their own — without this, a click looks like it did nothing until the
 * round trip finishes. useFormStatus() scopes to the nearest ancestor
 * <form>, so this can be reused across many forms on the same page.
 */
export function SubmitButton({
  className = "",
  children,
  pendingText,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
      {...props}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
