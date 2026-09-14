"use client";

import { useActionState, useState } from "react";
import { ChipType } from "@prisma/client";
import { submitPicksAction, type PickFormState } from "@/app/actions/picks";
import TeamCrest from "@/components/TeamCrest";

export interface TeamOption {
  id: string;
  name: string;
  crestUrl: string | null;
}

export interface ChipStatus {
  activeThisWeek: boolean;
  usedInGameweekNumber: number | null;
}

const initialState: PickFormState = {};

type ChipChoice = "" | ChipType;

function initialChip(doubleUp: ChipStatus, gamble: ChipStatus, cleanSheet: ChipStatus): ChipChoice {
  if (doubleUp.activeThisWeek) return ChipType.DOUBLE_UP;
  if (gamble.activeThisWeek) return ChipType.GAMBLE;
  if (cleanSheet.activeThisWeek) return ChipType.CLEAN_SHEET;
  return "";
}

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
  const [chip, setChip] = useState<ChipChoice>(() => initialChip(doubleUp, gamble, cleanSheet));
  const [team1Id, setTeam1Id] = useState(currentTeam1Id ?? "");
  const [team2Id, setTeam2Id] = useState(currentTeam2Id ?? "");
  const doubleUpChecked = chip === ChipType.DOUBLE_UP;

  // Teams still selectable for team2 must exclude whatever is chosen for team1, and vice versa.
  const teamOptions = (excludeId?: string) =>
    availableTeams.filter((t) => t.id !== excludeId);

  const team1 = availableTeams.find((t) => t.id === team1Id);
  const team2 = availableTeams.find((t) => t.id === team2Id);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">{doubleUpChecked ? "Team 1" : "Your pick"}</span>
          <div className="flex items-center gap-2">
            <TeamCrest src={team1?.crestUrl} name={team1?.name ?? "?"} size={28} />
            <select
              name="team1"
              value={team1Id}
              onChange={(e) => setTeam1Id(e.target.value)}
              required
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-base"
            >
              <option value="" disabled>
                Choose a team…
              </option>
              {teamOptions(team2Id).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </label>

        {doubleUpChecked && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Team 2</span>
            <div className="flex items-center gap-2">
              <TeamCrest src={team2?.crestUrl} name={team2?.name ?? "?"} size={28} />
              <select
                name="team2"
                value={team2Id}
                onChange={(e) => setTeam2Id(e.target.value)}
                required
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-base"
              >
                <option value="" disabled>
                  Choose a team…
                </option>
                {teamOptions(team1Id).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </label>
        )}
      </div>

      <fieldset className="flex flex-col gap-3 rounded-md border border-emerald-100 bg-emerald-50/40 p-4">
        <legend className="px-1 text-sm font-medium text-zinc-700">
          Chip (one-time use — at most one per gameweek)
        </legend>
        <ChipRadio value="" label="No chip this week" chip={chip} onSelect={setChip} />
        <ChipRadio
          value={ChipType.DOUBLE_UP}
          label="Double up — pick two teams this week"
          status={doubleUp}
          chip={chip}
          onSelect={setChip}
        />
        <ChipRadio
          value={ChipType.GAMBLE}
          label="Gamble — win pays double, draw pays nothing, loss costs 3"
          status={gamble}
          chip={chip}
          onSelect={setChip}
        />
        <ChipRadio
          value={ChipType.CLEAN_SHEET}
          label="Clean sheet — +2 points if your team doesn't concede"
          status={cleanSheet}
          chip={chip}
          onSelect={setChip}
        />
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-800 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save pick"}
      </button>
    </form>
  );
}

function ChipRadio({
  value,
  label,
  status,
  chip,
  onSelect,
}: {
  value: ChipChoice;
  label: string;
  status?: ChipStatus;
  chip: ChipChoice;
  onSelect: (value: ChipChoice) => void;
}) {
  const disabled = Boolean(status && status.usedInGameweekNumber !== null);
  return (
    <label className={`flex items-start gap-2 text-sm ${disabled ? "text-zinc-400" : "text-zinc-700"}`}>
      <input
        type="radio"
        name="chip"
        value={value}
        checked={chip === value}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="mt-0.5 accent-emerald-700"
      />
      <span>
        {label}
        {disabled && status && (
          <span className="block text-xs text-zinc-400">
            Already used in gameweek {status.usedInGameweekNumber}
          </span>
        )}
      </span>
    </label>
  );
}
