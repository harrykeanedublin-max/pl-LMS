"use client";

import { useActionState } from "react";
import { createGameweekAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function CreateGameweekForm() {
  const [state, formAction, pending] = useActionState(createGameweekAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border border-line p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Gameweek #</span>
        <input
          name="number"
          type="number"
          min={1}
          required
          className="w-24 rounded-md border border-line px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Pick deadline</span>
        <input
          name="deadline"
          type="datetime-local"
          required
          className="rounded-md border border-line px-3 py-2"
        />
        <span className="text-xs text-sub">Always Ireland/UK time, whatever timezone you&apos;re in.</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-forest text-cream px-4 py-2 text-sm font-medium hover:bg-forest-dark disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create gameweek"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-forest">{state.success}</p>}
    </form>
  );
}
