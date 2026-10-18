import "server-only";
import { headers } from "next/headers";

const FALLBACK = "US";

// The viewer's country as an ISO 3166-1 code: the host's geo header when
// deployed (Vercel, Cloudflare), else the region in the browser's language
// ("en-IN" → "IN"), else the US.
export async function getViewerRegion(): Promise<string> {
  const h = await headers();
  const geo = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
  if (geo && /^[A-Z]{2}$/.test(geo)) return geo;
  for (const tag of (h.get("accept-language") ?? "").split(",")) {
    const region = tag.split(";")[0].trim().split("-")[1]?.toUpperCase();
    if (region && /^[A-Z]{2}$/.test(region)) return region;
  }
  return FALLBACK;
}

export function regionName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
