import { ArrowUpDownIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { FavoritesEditor } from "@/components/movies/favorites-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { getUserMovies, withScores } from "@/lib/movies/store";
import { favoritesInOrder } from "@/lib/recommend/profile";

export const metadata: Metadata = { title: "Edit favourites" };

async function Editor() {
  const movies = await getUserMovies(await requireUserId()).then(withScores);
  return <FavoritesEditor favorites={favoritesInOrder(movies)} />;
}

export default function EditFavoritesPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pt-5 sm:px-6 md:gap-6 md:pt-10 md:pb-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-display-md text-ink-strong md:text-display-lg">Edit favourites</h1>
        <p className="text-body-sm text-body md:text-body-md">
          Higher shapes your picks more. Drag to reorder, or tap{" "}
          <ArrowUpDownIcon className="inline size-4 align-[-0.125em] text-ink" aria-label="Move" /> to send a
          film to any spot. Tap Done to save.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4" aria-hidden>
            <Skeleton className="h-64" />
          </div>
        }
      >
        <Editor />
      </Suspense>
    </section>
  );
}
