import { queueMemories } from "@/lib/memories/queue";

// Daily job: queue today's memories ("on this day", and on the 1st the month
// and year recaps). Call once a day, shortly after 00:00 UTC, with
// `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends it). Safe to
// repeat. Delivery is separate; see docs/memories.md.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET is not set", { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await queueMemories(new Date()));
}
