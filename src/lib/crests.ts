/**
 * Best-effort crest lookup via Wikipedia's public REST API — no scraping,
 * just their documented endpoints. Two steps: search resolves the club's
 * exact article title (handles quirks like "AFC Bournemouth" instead of
 * "Bournemouth F.C."), then the summary endpoint returns that article's
 * lead image, which is the crest for essentially every football club page.
 * Returns null on any failure; callers should treat a missing crest as
 * normal, not an error.
 */
const USER_AGENT =
  "pl-pickem/1.0 (https://github.com/harrykeanedublin-max/pl-LMS; harrykeanedublin@gmail.com)";

export async function fetchCrestUrl(teamName: string): Promise<string | null> {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(
        `${teamName} F.C.`
      )}&limit=1`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }
    );
    if (!searchRes.ok) return null;
    const searchData = (await searchRes.json()) as { pages?: { title?: string }[] };
    const title = searchData.pages?.[0]?.title;
    if (!title) return null;

    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }
    );
    if (!summaryRes.ok) return null;
    const summaryData = (await summaryRes.json()) as {
      thumbnail?: { source?: string } | null;
      originalimage?: { source?: string } | null;
    };
    return summaryData.thumbnail?.source ?? summaryData.originalimage?.source ?? null;
  } catch {
    return null;
  }
}
