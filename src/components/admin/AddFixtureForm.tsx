"use client";

import { useActionState } from "react";
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

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Home</span>
        <select name="homeTeamId" required className="rounded-md border border-zinc-300 px-3 py-2">
          <option value="">Choose…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Away</span>
        <select name="awayTeamId" required className="rounded-md border border-zinc-300 px-3 py-2">
          <option value="">Choose…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add fixture"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
