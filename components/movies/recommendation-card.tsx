"use client";

import { EyeIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { rateMovie } from "@/components/movies/movie-actions";
import { Poster } from "@/components/movies/poster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/lib/recommend/types";
import { cn } from "@/lib/utils";

type Feedback = "up" | "down" | "seen";

const ACK: Record<Feedback, string> = {
  up: "Noted. More like this.",
  down: "Noted. Fewer like this.",
  seen: "Hidden. You’ve seen it.",
};

export function RecommendationCard({
  movie,
  signedIn,
  preload,
}: {
  movie: Recommendation;
  signedIn: boolean;
  preload?: boolean;
}) {
  const [given, setGiven] = useOptimistic<Feedback | null, Feedback>(null, (_, next) => next);
  const [pending, startTransition] = useTransition();

  const rate = (feedback: Feedback) =>
    startTransition(async () => {
      setGiven(feedback);
      const { tmdbId, title, posterPath, year } = movie;
      await rateMovie(signedIn, { tmdbId, title, posterPath, year, signal: feedback });
    });

  const because = movie.reasons.flatMap((r) => r.because);
  const becauseTitles = [...new Set(because)].slice(0, 2);

  return (
    <article
      className={cn(
        "group flex flex-col gap-3 transition-opacity duration-200",
        given && "pointer-events-none opacity-40",
      )}
      aria-busy={pending}
    >
      <div className="relative">
        <Poster
          path={movie.posterPath}
          title={movie.title}
          preload={preload}
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 50vw"
          className="transition-shadow duration-200 group-hover:shadow-glow"
        />
        {given && (
          <p className="absolute inset-x-2 bottom-2 rounded-lg bg-background/90 px-3 py-2 text-center text-body-sm text-ink">
            {ACK[given]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-body-md font-semibold leading-snug text-ink">
          {movie.title}{" "}
          {movie.year && <span className="font-mono text-code font-normal text-mute">{movie.year}</span>}
        </h3>
        {movie.reasons.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Why it was picked">
            {movie.reasons.map((r) => (
              <li key={r.text}>
                <Badge variant="outline" className="h-auto whitespace-normal px-2.5 py-1 text-left text-caption font-normal text-body">
                  {r.text}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {becauseTitles.length > 0 && (
          <p className="text-caption text-mute">Because you like {becauseTitles.join(" and ")}</p>
        )}
      </div>

      <div className="mt-auto flex gap-1" role="group" aria-label={`Feedback on ${movie.title}`}>
        <Button variant="outline" size="icon" aria-label="More like this" title="More like this" onClick={() => rate("up")}>
          <ThumbsUpIcon />
        </Button>
        <Button variant="outline" size="icon" aria-label="Not for me" title="Not for me" onClick={() => rate("down")}>
          <ThumbsDownIcon />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-mute" onClick={() => rate("seen")}>
          <EyeIcon />
          Seen it
        </Button>
      </div>
    </article>
  );
}
