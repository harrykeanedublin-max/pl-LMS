"use client";

import { useActionState, useState } from "react";
import { updateTeamAliasesAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function EditAliasesForm({
  teamId,
  aliases,
}: {
  teamId: string;
  aliases: string[];
}) {
  const [editing, setEditing] = useState(false);
  const boundAction = updateTeamAliasesAction.bind(null, teamId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  // Switch back to display mode once a save actually succeeds, rather than
  // optimistically on click (which would unmount the form mid-submission).
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.success) setEditing(false);
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-left hover:underline">
        {aliases.length > 0 ? (
          <span className="text-sub">{aliases.join(", ")}</span>
        ) : (
          <span className="text-sub/60">Add aliases</span>
        )}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        name="aliases"
        defaultValue={aliases.join(", ")}
        placeholder="Spurs, Tottenham"
        autoFocus
        className="rounded-md border border-line px-2 py-1 text-sm w-48"
      />
      <button type="submit" disabled={pending} className="text-forest hover:underline disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
