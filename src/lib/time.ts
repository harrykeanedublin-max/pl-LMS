const LEAGUE_TIMEZONE = "Europe/Dublin";

/**
 * Converts a "YYYY-MM-DDTHH:mm" wall-clock string (from a datetime-local input) to
 * the correct UTC instant, always treating it as Ireland/UK local time (GMT or BST,
 * whichever applies on that date) regardless of the server's or the browser's own
 * timezone. Gameweek deadlines need to match the Premier League's home timezone
 * consistently, not whoever happens to be entering them.
 */
export function irishLocalToUtc(dateTimeLocal: string): Date | null {
  if (!dateTimeLocal) return null;
  const [datePart, timePart] = dateTimeLocal.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);
  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) return null;

  // First guess: treat the wall-clock numbers as if they were already UTC.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);

  // See what that instant actually reads as in Europe/Dublin, then correct by the
  // difference - this naturally picks up whichever of GMT/BST applies on that date.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(utcGuess)).map((p) => [p.type, p.value]));
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offset = utcGuess - asIfUtc;
  return new Date(utcGuess + offset);
}
