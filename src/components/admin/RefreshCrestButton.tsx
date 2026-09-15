"use client";

import { useActionState } from "react";
import { refreshTeamCrestAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function RefreshCrestButton({ teamId }: { teamId: string }) {
  const boundAction = refreshTeamCrestAction.bind(null, teamId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button type="submit" disabled={pending} className="text-sub/60 hover:text-forest disabled:opacity-40">
        {pending ? "Looking…" : "Refresh crest"}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
