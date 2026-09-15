"use client";

import { useActionState, useState } from "react";
import { resetPlayerPasscodeAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function ResetPasscodeForm({ playerId }: { playerId: string }) {
  const [open, setOpen] = useState(false);
  const boundAction = resetPlayerPasscodeAction.bind(null, playerId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sub hover:underline">
        Reset passcode
      </button>
    );
  }

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input
        name="passcode"
        type="text"
        placeholder="New passcode"
        required
        minLength={4}
        className="rounded-md border border-line px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-forest text-cream px-2 py-1 text-sm hover:bg-forest-dark disabled:opacity-50"
      >
        {pending ? "Saving…" : "Set"}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state.success && <span className="text-xs text-forest">{state.success}</span>}
    </form>
  );
}
