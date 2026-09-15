"use client";

import { useActionState } from "react";
import { deleteTeamAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function DeleteTeamButton({ teamId }: { teamId: string }) {
  const boundAction = deleteTeamAction.bind(null, teamId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button type="submit" disabled={pending} className="text-sub/60 hover:text-red-600 disabled:opacity-40">
        Remove
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
