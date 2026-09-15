"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

export default function MobileNavToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // Nav lives in the root layout, so it isn't remounted between page
  // navigations - close the menu whenever the route actually changes
  // instead of on every click inside it (that used to unmount the sign-out
  // form mid-submission and silently break logout on mobile). Adjusting
  // state during render (React's documented pattern for this) instead of
  // an effect avoids an extra render pass.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

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
        <div className="sm:hidden absolute left-0 right-0 top-14 bg-forest border-t border-forest-dark shadow-lg z-10">
          <nav className="flex flex-col px-4 py-3 gap-1 text-sm">{children}</nav>
        </div>
      )}
    </>
  );
}
