"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction, type FormState } from "@/app/login/actions";

const initialState: FormState = {};

export default function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialState);
  const [registerState, registerFormAction, registerPending] = useActionState(
    registerAction,
    initialState
  );

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="font-display text-xl text-ink mb-1">Welcome back</h1>
      <p className="text-sub mb-6">Sign in, or set up your player if this is your first visit.</p>

      <div className="flex gap-2 mb-6 border-b border-line">
        <button
          onClick={() => setMode("login")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            mode === "login" ? "border-forest text-forest" : "border-transparent text-sub"
          }`}
        >
          Sign in
        </button>
        <button
          onClick={() => setMode("register")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            mode === "register" ? "border-forest text-forest" : "border-transparent text-sub"
          }`}
        >
          New player
        </button>
      </div>

      {mode === "login" ? (
        <form action={loginFormAction} className="flex flex-col gap-4">
          <Field label="Name" name="name" autoComplete="username" />
          <Field label="Passcode" name="passcode" type="password" autoComplete="current-password" />
          {loginState.error && <p className="text-sm text-red-600">{loginState.error}</p>}
          <button
            type="submit"
            disabled={loginPending}
            className="rounded-md bg-forest text-cream py-2 text-sm font-medium hover:bg-forest-dark disabled:opacity-50"
          >
            {loginPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form action={registerFormAction} className="flex flex-col gap-4">
          <Field label="Your name" name="name" autoComplete="username" />
          <Field label="Choose a passcode" name="passcode" type="password" autoComplete="new-password" />
          <Field
            label="Confirm passcode"
            name="confirmPasscode"
            type="password"
            autoComplete="new-password"
          />
          <Field
            label="Admin code (optional)"
            name="adminCode"
            type="password"
            autoComplete="off"
            hint="Only the pool organiser needs this."
          />
          {registerState.error && <p className="text-sm text-red-600">{registerState.error}</p>}
          <button
            type="submit"
            disabled={registerPending}
            className="rounded-md bg-forest text-cream py-2 text-sm font-medium hover:bg-forest-dark disabled:opacity-50"
          >
            {registerPending ? "Creating…" : "Create player"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={name !== "adminCode"}
        className="rounded-md border border-line px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-forest"
      />
      {hint && <span className="text-xs text-sub">{hint}</span>}
    </label>
  );
}
