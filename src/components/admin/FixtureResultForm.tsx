"use client";

import { useActionState, useState } from "react";
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
  const [kickoffLocal, setKickoffLocal] = useState(() => toLocalInputValue(kickoff));

  // The datetime-local input has no timezone of its own - it's a plain "wall clock"
  // reading in whoever's browser is filling the form. Converting it to a Date here
  // (in the browser) correctly anchors it to the admin's own local timezone; sending
  // that as an ISO string means the server never has to guess.
  const kickoffIso = kickoffLocal ? new Date(kickoffLocal).toISOString() : "";

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 border-b border-dashed border-line py-2 text-sm">
      <span className="w-56 flex items-center gap-1.5">
        <TeamCrest src={homeTeamCrestUrl} name={homeTeamName} size={18} />
        {homeTeamName} vs {awayTeamName}
        <TeamCrest src={awayTeamCrestUrl} name={awayTeamName} size={18} />
      </span>
      <input
        type="datetime-local"
        value={kickoffLocal}
        onChange={(e) => setKickoffLocal(e.target.value)}
        className="rounded-md border border-line px-2 py-1 text-xs"
      />
      <input type="hidden" name="kickoff" value={kickoffIso} />
      <input
        name="homeGoals"
        type="number"
        min={0}
        defaultValue={homeGoals ?? ""}
        placeholder="H"
        className="w-16 rounded-md border border-line px-2 py-1"
      />
      <span>–</span>
      <input
        name="awayGoals"
        type="number"
        min={0}
        defaultValue={awayGoals ?? ""}
        placeholder="A"
        className="w-16 rounded-md border border-line px-2 py-1"
      />
      <label className="flex items-center gap-1 text-sub">
        <input name="played" type="checkbox" defaultChecked={played} />
        Played
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-forest text-cream px-3 py-1 hover:bg-forest-dark disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="submit"
        formAction={deleteAction}
        className="text-sub/60 hover:text-red-600"
      >
        Remove
      </button>
      {state.error && <span className="text-red-600">{state.error}</span>}
    </form>
  );
}
