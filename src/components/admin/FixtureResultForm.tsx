"use client";

import { useActionState } from "react";
import { updateFixtureResultAction, deleteFixtureAction, type ActionState } from "@/app/admin/actions";
import TeamCrest from "@/components/TeamCrest";

const initialState: ActionState = {};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FixtureResultForm({
  fixtureId,
  homeTeamName,
  homeTeamCrestUrl,
  awayTeamName,
  awayTeamCrestUrl,
  kickoff,
  homeGoals,
  awayGoals,
  played,
}: {
  fixtureId: string;
  homeTeamName: string;
  homeTeamCrestUrl: string | null;
  awayTeamName: string;
  awayTeamCrestUrl: string | null;
  kickoff: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  played: boolean;
}) {
  const boundAction = updateFixtureResultAction.bind(null, fixtureId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const deleteAction = deleteFixtureAction.bind(null, fixtureId);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 border-b border-zinc-100 py-2 text-sm">
      <span className="w-56 flex items-center gap-1.5">
        <TeamCrest src={homeTeamCrestUrl} name={homeTeamName} size={18} />
        {homeTeamName} vs {awayTeamName}
        <TeamCrest src={awayTeamCrestUrl} name={awayTeamName} size={18} />
      </span>
      <input
        name="kickoff"
        type="datetime-local"
        defaultValue={toLocalInputValue(kickoff)}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
      />
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
        className="rounded-md bg-emerald-800 text-white px-3 py-1 hover:bg-emerald-700 disabled:opacity-50"
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
