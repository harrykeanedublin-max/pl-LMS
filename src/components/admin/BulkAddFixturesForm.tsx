"use client";

import { useActionState } from "react";
import { addFixturesBulkAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function BulkAddFixturesForm({ gameweekId }: { gameweekId: string }) {
  const boundAction = addFixturesBulkAction.bind(null, gameweekId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <details className="rounded-md border border-zinc-200 p-4">
      <summary className="cursor-pointer text-sm font-medium text-zinc-700">
        Add a whole week&apos;s fixtures at once
      </summary>
      <form action={formAction} className="flex flex-col gap-3 mt-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">
            One fixture per line, as <code>Home vs Away</code> — team names or short codes,
            case doesn&apos;t matter.
          </span>
          <textarea
            name="fixtures"
            rows={6}
            placeholder={"Arsenal vs Chelsea\nLiverpool vs Manchester City\nWOL vs EVE"}
            className="rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-emerald-800 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add fixtures"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </form>
    </details>
  );
}
