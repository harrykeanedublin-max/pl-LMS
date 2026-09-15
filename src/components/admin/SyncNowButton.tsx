"use client";

import { useActionState } from "react";
import { syncFixturesAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function SyncNowButton() {
  const [state, formAction, pending] = useActionState(syncFixturesAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-forest text-forest px-4 py-2 text-sm font-medium hover:bg-forest hover:text-cream disabled:opacity-50"
      >
        {pending ? "Syncing…" : "Sync fixtures & results now"}
      </button>
      <span className="text-xs text-sub">
        Creates upcoming gameweeks (deadline 2 hours before the first kickoff), pulls in kickoffs and results
        from football-data.org, and auto-assigns a (zero-point) pick to anyone who missed a deadline. Also runs
        automatically once a day.
      </span>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-forest">{state.success}</p>}
    </form>
  );
}
