"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { SEEN_ANSWERS, type Signal } from "@/lib/recommend/types";
import { deleteSeries, getSeriesSnapshot, putSeries } from "@/lib/series/store";

// Saving a series and saying how it was. Touches only user_series; see
// docs/series.md.

type Failure = { ok: false; error: string };
export type SeriesResult = { ok: true } | Failure;

const SIGN_IN_REQUIRED: Failure = { ok: false, error: "Your session ended. Sign in again." };
const SERIES_SIGNALS: readonly Signal[] = ["watchlist", ...SEEN_ANSWERS];
const isId = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 0;

function failure(error: unknown): Failure {
  console.error(error);
  return { ok: false, error: "Something went wrong. Try again." };
}

// Save to the watchlist ("watchlist") or answer Seen it. The title and
// poster come from the movie database, not the client.
export async function setSeriesSignal(seriesId: unknown, signal: unknown): Promise<SeriesResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isId(seriesId) || !SERIES_SIGNALS.includes(signal as Signal)) return { ok: false, error: "That didn’t work." };
  try {
    const snapshot = await getSeriesSnapshot(seriesId);
    if (!snapshot) return { ok: false, error: "That series couldn’t be found." };
    await putSeries(userId, seriesId, signal as Signal, snapshot);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// Take it off the watchlist, or clear its answer.
export async function forgetSeries(seriesId: unknown): Promise<SeriesResult> {
  const userId = await getCurrentUserId();
  if (!userId) return SIGN_IN_REQUIRED;
  if (!isId(seriesId)) return { ok: false, error: "That didn’t work." };
  try {
    await deleteSeries(userId, seriesId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
