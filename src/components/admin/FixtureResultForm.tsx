"use client";

import { useActionState } from "react";
import { updateFixtureResultAction, deleteFixtureAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function FixtureResultForm({
  fixtureId,
  homeTeamName,
  awayTeamName,
  homeGoals,
  awayGoals,
  played,
}: {
  fixtureId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  played: boolean;
}) {
  const boundAction = updateFixtureResultAction.bind(null, fixtureId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const deleteAction = deleteFixtureAction.bind(null, fixtureId);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 border-b border-zinc-100 py-2 text-sm">
      <span className="w-56">
        {homeTeamName} vs {awayTeamName}
      </span>
      <input
        name="homeGoals"
        type="number"
        min={0}
        defaultValue={homeGoals ?? ""}
        placeholder="H"
        className="w-16 rounded-md border border-zinc-300 px-2 py-1"
      />
      <span>–</span>
      <input
        name="awayGoals"
        type="number"
        min={0}
        defaultValue={awayGoals ?? ""}
        placeholder="A"
        className="w-16 rounded-md border border-zinc-300 px-2 py-1"
      />
      <label className="flex items-center gap-1 text-zinc-600">
        <input name="played" type="checkbox" defaultChecked={played} />
        Played
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 text-white px-3 py-1 hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="submit"
        formAction={deleteAction}
        className="text-zinc-400 hover:text-red-600"
      >
        Remove
      </button>
      {state.error && <span className="text-red-600">{state.error}</span>}
    </form>
  );
}
