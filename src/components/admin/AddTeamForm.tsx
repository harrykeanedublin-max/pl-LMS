"use client";

import { useActionState } from "react";
import { addTeamAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function AddTeamForm() {
  const [state, formAction, pending] = useActionState(addTeamAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border border-line p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Full name</span>
        <input name="name" required className="rounded-md border border-line px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Short code</span>
        <input name="shortName" required maxLength={4} className="w-20 rounded-md border border-line px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Aliases (optional)</span>
        <input
          name="aliases"
          placeholder="Spurs, Tottenham"
          className="w-48 rounded-md border border-line px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-forest text-cream px-4 py-2 text-sm font-medium hover:bg-forest-dark disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add team"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
