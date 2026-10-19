// TMDB has no per-service links (only its own country page, which bounces to
// JustWatch), so each chip searches the service itself for the title. Matched
// by name so variants ("Netflix Standard with Ads", "Amazon Video") share one.
const SEARCH: [RegExp, (q: string) => string][] = [
  [/^netflix/i, (q) => `https://www.netflix.com/search?q=${q}`],
  [/^amazon/i, (q) => `https://www.primevideo.com/search?phrase=${q}`],
  [/^apple tv/i, (q) => `https://tv.apple.com/search?term=${q}`],
  [/^google play/i, (q) => `https://play.google.com/store/search?q=${q}&c=movies`],
  [/^youtube/i, (q) => `https://www.youtube.com/results?search_query=${q}`],
  [/^disney/i, (q) => `https://www.disneyplus.com/search?q=${q}`],
  [/^hulu/i, (q) => `https://www.hulu.com/search?q=${q}`],
  [/^mubi/i, (q) => `https://mubi.com/search/films?query=${q}`],
  [/^tubi/i, (q) => `https://tubitv.com/search/${q}`],
  [/^crunchyroll/i, (q) => `https://www.crunchyroll.com/search?q=${q}`],
];

// Services we don't know fall back to a web search, whose top hit is almost
// always the film's page on that service.
export function providerLink(providerName: string, title: string) {
  const search = SEARCH.find(([pattern]) => pattern.test(providerName))?.[1];
  if (search) return search(encodeURIComponent(title));
  return `https://www.google.com/search?q=${encodeURIComponent(`${title} ${providerName}`)}`;
}
