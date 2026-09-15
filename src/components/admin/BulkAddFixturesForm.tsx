"use client";

import { useActionState } from "react";
import { addFixturesBulkAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function BulkAddFixturesForm({ gameweekId }: { gameweekId: string }) {
  const boundAction = addFixturesBulkAction.bind(null, gameweekId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <details className="rounded-md border border-line p-4">
      <summary className="cursor-pointer text-sm font-medium text-ink">
        Add a whole week&apos;s fixtures at once
      </summary>
      <form action={formAction} className="flex flex-col gap-3 mt-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-sub">
            One fixture per line, as <code>Home vs Away</code> — team names or short codes, case
            doesn&apos;t matter. Add a kickoff time (always Ireland/UK time) with a comma:{" "}
            <code>Home vs Away, DD/MM/YYYY HH:mm</code>. Pasting the same fixture again just
            updates its kickoff.
          </span>
          <textarea
            name="fixtures"
            rows={6}
            placeholder={
              "Arsenal vs Chelsea, 20/09/2026 15:00\nLiverpool vs Manchester City, 20/09/2026 17:30\nWOL vs EVE"
            }
            className="rounded-md border border-line px-3 py-2 font-mono text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-forest text-cream px-4 py-2 text-sm font-medium hover:bg-forest-dark disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add fixtures"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-forest">{state.success}</p>}
      </form>
    </details>
  );
}
