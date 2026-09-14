"use client";

import { useState } from "react";

export default function MobileNavToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        className="sm:hidden p-2 -mr-2 text-white"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {open && (
        <div
          className="sm:hidden absolute left-0 right-0 top-14 bg-emerald-900 border-t border-emerald-800 shadow-lg z-10"
          onClick={() => setOpen(false)}
        >
          <nav className="flex flex-col px-4 py-3 gap-1 text-sm">{children}</nav>
        </div>
      )}
    </>
  );
}
