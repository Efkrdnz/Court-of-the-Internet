"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, type FormEvent } from "react";
import { callAction } from "./callAction";
import type { ActionResult } from "@/app/actions/_util";

/**
 * Wraps a server action for a <form>.
 *
 * React 19 resets uncontrolled fields after every form action, even failed ones, which
 * would wipe what the player typed when validation fails. With JavaScript we intercept
 * submit and dispatch the action ourselves (no reset); without JavaScript the plain
 * `action` attribute still works (progressive enhancement).
 */
export function useFormAction<T = undefined>(
  serverAction: (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>,
) {
  // Without JavaScript the form posts to the server action itself (progressive enhancement)…
  const [plainState, plainDispatch] = useActionState<ActionResult<T> | null, FormData>(serverAction, null);
  // …with it, a request that fails in transit becomes an inline error rather than the error page.
  const safeAction = useCallback(
    async (prev: ActionResult<T> | null, fd: FormData) => (await callAction(() => serverAction(prev, fd))) as ActionResult<T>,
    [serverAction],
  );
  const [jsState, dispatch, pending] = useActionState<ActionResult<T> | null, FormData>(safeAction, null);
  const state = jsState ?? plainState;
  const ref = useRef<HTMLFormElement>(null);
  // After a rejected submit, bring the problem into view: on phones the error banner is
  // usually scrolled off-screen above the submit button.
  useEffect(() => {
    if (!state || state.ok || !ref.current) return;
    // First invalid control in document order. Radio groups mark themselves with data-invalid,
    // since aria-invalid isn't allowed on radios.
    const target =
      ref.current.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]') ?? ref.current.querySelector<HTMLElement>('[role="alert"]');
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  }, [state]);
  const formProps = {
    ref,
    action: plainDispatch,
    onSubmit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      if (pending) return;
      const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
      startTransition(() => dispatch(fd));
    },
  };
  return [state, formProps, pending] as const;
}
