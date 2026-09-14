"use client";

import { useActionState } from "react";
import { createGameweekAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function CreateGameweekForm() {
  const [state, formAction, pending] = useActionState(createGameweekAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Gameweek #</span>
        <input
          name="number"
          type="number"
          min={1}
          required
          className="w-24 rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Pick deadline</span>
        <input
          name="deadline"
          type="datetime-local"
          required
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create gameweek"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}
