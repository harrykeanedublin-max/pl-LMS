"use client";

import { useActionState } from "react";
import { updateResultsBulkAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function BulkResultsForm({ gameweekId }: { gameweekId: string }) {
  const boundAction = updateResultsBulkAction.bind(null, gameweekId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <details className="rounded-md border border-line p-4">
      <summary className="cursor-pointer text-sm font-medium text-ink">
        Enter a whole week&apos;s results at once
      </summary>
      <form action={formAction} className="flex flex-col gap-3 mt-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-sub">
            One result per line, as <code>Home 2-0 Away</code> — team names, short codes, or
            aliases, case doesn&apos;t matter. The fixture has to already be added above; this
            only fills in the score and marks it played.
          </span>
          <textarea
            name="results"
            rows={6}
            placeholder={"Arsenal 2-0 Chelsea\nSpurs 1-1 Man City\nWOL 0-3 EVE"}
            className="rounded-md border border-line px-3 py-2 font-mono text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-forest text-cream px-4 py-2 text-sm font-medium hover:bg-forest-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save results"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-forest">{state.success}</p>}
      </form>
    </details>
  );
}
