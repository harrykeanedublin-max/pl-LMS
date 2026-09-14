"use client";

import { useActionState, useState } from "react";
import { submitPicksAction, type PickFormState } from "@/app/actions/picks";

export interface TeamOption {
  id: string;
  name: string;
}

export interface ChipStatus {
  activeThisWeek: boolean;
  usedInGameweekNumber: number | null;
}

const initialState: PickFormState = {};

export default function PickForm({
  gameweekId,
  availableTeams,
  currentTeam1Id,
  currentTeam2Id,
  doubleUp,
  gamble,
  cleanSheet,
}: {
  gameweekId: string;
  availableTeams: TeamOption[];
  currentTeam1Id?: string;
  currentTeam2Id?: string;
  doubleUp: ChipStatus;
  gamble: ChipStatus;
  cleanSheet: ChipStatus;
}) {
  const boundAction = submitPicksAction.bind(null, gameweekId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [doubleUpChecked, setDoubleUpChecked] = useState(doubleUp.activeThisWeek);

  // Teams still selectable for team2 must exclude whatever is chosen for team1, and vice versa.
  const teamOptions = (excludeId?: string) =>
    availableTeams.filter((t) => t.id !== excludeId);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">{doubleUpChecked ? "Team 1" : "Your pick"}</span>
          <select
            name="team1"
            defaultValue={currentTeam1Id ?? ""}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-base"
          >
            <option value="" disabled>
              Choose a team…
            </option>
            {teamOptions(currentTeam2Id).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        {doubleUpChecked && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Team 2</span>
            <select
              name="team2"
              defaultValue={currentTeam2Id ?? ""}
              required
              className="rounded-md border border-zinc-300 px-3 py-2 text-base"
            >
              <option value="" disabled>
                Choose a team…
              </option>
              {teamOptions(currentTeam1Id).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <fieldset className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4">
        <legend className="px-1 text-sm font-medium text-zinc-700">Chips (one-time use)</legend>
        <ChipCheckbox
          name="chip_double_up"
          label="Double up — pick two teams this week"
          status={doubleUp}
          onToggle={setDoubleUpChecked}
        />
        <ChipCheckbox
          name="chip_gamble"
          label="Gamble — win pays double, draw pays nothing, loss costs 3"
          status={gamble}
        />
        <ChipCheckbox
          name="chip_clean_sheet"
          label="Clean sheet — +2 points if your team doesn't concede"
          status={cleanSheet}
        />
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save pick"}
      </button>
    </form>
  );
}

function ChipCheckbox({
  name,
  label,
  status,
  onToggle,
}: {
  name: string;
  label: string;
  status: ChipStatus;
  onToggle?: (checked: boolean) => void;
}) {
  const disabled = status.usedInGameweekNumber !== null;
  return (
    <label className={`flex items-start gap-2 text-sm ${disabled ? "text-zinc-400" : "text-zinc-700"}`}>
      <input
        type="checkbox"
        name={name}
        defaultChecked={status.activeThisWeek}
        disabled={disabled}
        onChange={(e) => onToggle?.(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        {label}
        {disabled && (
          <span className="block text-xs text-zinc-400">
            Already used in gameweek {status.usedInGameweekNumber}
          </span>
        )}
      </span>
    </label>
  );
}
