import { DoorOpenIcon, HeartIcon, MehIcon, ThumbsUpIcon, type LucideIcon } from "lucide-react";
import type { Feedback } from "@/components/movies/movie-actions";
import type { Signal } from "@/lib/recommend/types";

// The answers to "Seen it", worst to best: the order they appear in everywhere.
// The recommendation card asks them; My films filters by them. Films added on
// My films count as "Loved it".
export const ANSWERS: {
  feedback: Feedback;
  label: string; // the answer on the card
  short: string; // the filter on My films
  ack: string;
  icon: LucideIcon;
}[] = [
  { feedback: "quit", label: "Left midway", short: "Left midway", ack: "Noted. Steering well clear.", icon: DoorOpenIcon },
  { feedback: "no_rewatch", label: "Would not rewatch", short: "No rewatch", ack: "Noted. Once was enough.", icon: MehIcon },
  { feedback: "up", label: "Kinda liked it", short: "Kinda liked", ack: "Noted. A bit more like this.", icon: ThumbsUpIcon },
  { feedback: "liked", label: "Loved it", short: "Loved", ack: "Loved. More like this.", icon: HeartIcon },
];

// The answer label for a saved film's signal, if it's a "Seen it" answer.
export function verdictOf(signal: Signal): { label: string; icon: LucideIcon } | undefined {
  return ANSWERS.find((a) => a.feedback === signal);
}
