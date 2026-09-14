"use client";

import { useActionState } from "react";
import { updateConfigAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export default function ConfigForm({
  poolName,
  entryFeeEuro,
  numGameweeks,
  splitFirst,
  splitSecond,
  splitThird,
}: {
  poolName: string;
  entryFeeEuro: number;
  numGameweeks: number;
  splitFirst: number;
  splitSecond: number;
  splitThird: number;
}) {
  const [state, formAction, pending] = useActionState(updateConfigAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-sm">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Pool name</span>
        <input
          name="poolName"
          defaultValue={poolName}
          required
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Entry fee (€)</span>
        <input
          name="entryFeeEuro"
          type="number"
          min={1}
          defaultValue={entryFeeEuro}
          required
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Number of gameweeks</span>
        <input
          name="numGameweeks"
          type="number"
          min={1}
          defaultValue={numGameweeks}
          required
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4">
        <legend className="px-1 text-sm font-medium text-zinc-700">Payout split (% of pot, must total 100)</legend>
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">1st</span>
            <input
              name="splitFirst"
              type="number"
              min={0}
              max={100}
              defaultValue={splitFirst}
              className="w-20 rounded-md border border-zinc-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">2nd</span>
            <input
              name="splitSecond"
              type="number"
              min={0}
              max={100}
              defaultValue={splitSecond}
              className="w-20 rounded-md border border-zinc-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">3rd</span>
            <input
              name="splitThird"
              type="number"
              min={0}
              max={100}
              defaultValue={splitThird}
              className="w-20 rounded-md border border-zinc-300 px-2 py-1"
            />
          </label>
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
