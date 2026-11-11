"use client";

import Link from "next/link";
import { loginAction, signupAction } from "@/app/actions/auth";
import { useFormAction } from "@/components/ui/useFormAction";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError, FormAlert } from "@/components/ui/FormAlert";
import { LIMITS } from "@/lib/limits";

export function LoginForm({ next }: { next: string }) {
  const [state, formProps, pending] = useFormAction(loginAction);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form {...formProps} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state && !state.ok && !fe?.username && !fe?.password ? <FormAlert className="!text-crimson">{state.error}</FormAlert> : null}
      <div>
        <label htmlFor="login-username" className="field-label">
          Username
        </label>
        <input id="login-username" name="username" autoComplete="username" className="input" required aria-invalid={!!fe?.username} />
        <FieldError errors={fe?.username} />
      </div>
      <div>
        <label htmlFor="login-password" className="field-label">
          Password
        </label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" className="input" required aria-invalid={!!fe?.password} />
        <FieldError errors={fe?.password} />
      </div>
      <SubmitButton pending={pending} className="btn-burgundy w-full" pendingLabel="Checking your credentials…">
        Enter the courtroom
      </SubmitButton>
      <p className="text-center text-sm text-sepia">
        New to the court?{" "}
        <Link href={`/signup${next !== "/court" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-burgundy underline">
          Get sworn in
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, formProps, pending] = useFormAction(signupAction);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form {...formProps} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {/* Honeypot for bots: hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state && !state.ok && !fe ? <FormAlert className="!text-crimson">{state.error}</FormAlert> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="su-username" className="field-label">
            Username
          </label>
          <input
            id="su-username"
            name="username"
            autoComplete="username"
            className="input"
            minLength={LIMITS.username.min}
            maxLength={LIMITS.username.max}
            pattern="[A-Za-z0-9_]+"
            required
            aria-invalid={!!fe?.username}
            aria-describedby="su-username-hint"
          />
          <p id="su-username-hint" className="mt-1 text-xs text-sepia">
            Letters, numbers, underscores. Public.
          </p>
          <FieldError errors={fe?.username} />
        </div>
        <div>
          <label htmlFor="su-display" className="field-label">
            Display name
          </label>
          <input id="su-display" name="displayName" className="input" maxLength={LIMITS.displayName.max * 4} required aria-invalid={!!fe?.displayName} />
          <FieldError errors={fe?.displayName} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="su-password" className="field-label">
            Password
          </label>
          <input id="su-password" name="password" type="password" autoComplete="new-password" className="input" minLength={LIMITS.password.min} required aria-invalid={!!fe?.password} />
          <FieldError errors={fe?.password} />
        </div>
        <div>
          <label htmlFor="su-confirm" className="field-label">
            Confirm password
          </label>
          <input id="su-confirm" name="confirmPassword" type="password" autoComplete="new-password" className="input" required aria-invalid={!!fe?.confirmPassword} />
          <FieldError errors={fe?.confirmPassword} />
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="acceptRules" className="mt-1 h-4 w-4 shrink-0 accent-burgundy" required />
        <span>
          I solemnly swear to confess only harmless, petty, or fictional crimes, and to follow the{" "}
          <Link href="/rules" target="_blank" className="py-3 font-bold text-burgundy underline">
            community rules
          </Link>
          .
        </span>
      </label>
      <FieldError errors={fe?.acceptRules} />
      <SubmitButton pending={pending} className="btn-burgundy w-full" pendingLabel="Swearing you in…">
        Swear me in
      </SubmitButton>
      <p className="text-center text-sm text-sepia">
        Already a member of the bar?{" "}
        <Link href={`/login${next !== "/court" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-burgundy underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
