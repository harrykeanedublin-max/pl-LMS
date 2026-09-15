"use client";

import { useActionState, useState } from "react";
import { addFixtureAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function AddFixtureForm({
  gameweekId,
  teams,
}: {
  gameweekId: string;
  teams: { id: string; name: string }[];
}) {
  const boundAction = addFixtureAction.bind(null, gameweekId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [kickoffLocal, setKickoffLocal] = useState("");

  // The datetime-local input has no timezone of its own - it's a plain "wall clock"
  // reading in whoever's browser is filling the form. Converting it to a Date here
  // (in the browser) correctly anchors it to the admin's own local timezone; sending
  // that as an ISO string means the server never has to guess.
  const kickoffIso = kickoffLocal ? new Date(kickoffLocal).toISOString() : "";

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border border-line p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Home</span>
        <select name="homeTeamId" required className="rounded-md border border-line px-3 py-2">
          <option value="">Choose…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Away</span>
        <select name="awayTeamId" required className="rounded-md border border-line px-3 py-2">
          <option value="">Choose…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Kickoff (optional)</span>
        <input
          type="datetime-local"
          value={kickoffLocal}
          onChange={(e) => setKickoffLocal(e.target.value)}
          className="rounded-md border border-line px-3 py-2"
        />
        <input type="hidden" name="kickoff" value={kickoffIso} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-forest text-cream px-4 py-2 text-sm font-medium hover:bg-forest-dark disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add fixture"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
