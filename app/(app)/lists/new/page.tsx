import type { Metadata } from "next";
import { ListEditor } from "@/components/lists/list-editor";
import { describeSource } from "@/components/lists/source-copy";
import { requireUserId } from "@/lib/auth";
import { sourceFilms } from "@/lib/lists/resolve";
import { MAX_LIST_FILMS, type ListSource } from "@/lib/lists/rules";
import { getStarterResults } from "@/lib/movies/starters";
import { getUserMovies } from "@/lib/movies/store";
import { isMyFilmsFilter } from "@/lib/movies/types";
import { getProfile } from "@/lib/profile/store";
import { EditorPage, NeedsHandle } from "../editor-page";

export const metadata: Metadata = { title: "Share a list" };

// ?from=watchlist, or ?from=my-films&filter=<My films filter>: start from
// those films. Without one, start empty.
async function NewList({ searchParams }: { searchParams: PageProps<"/lists/new">["searchParams"] }) {
  const { from, filter: rawFilter } = await searchParams;
  const source: ListSource | null = from === "watchlist" ? "watchlist" : from === "my-films" ? "my_films" : null;
  const filter = source === "my_films" ? (isMyFilmsFilter(rawFilter) ? rawFilter : "all") : null;

  const userId = await requireUserId();
  const [profile, movies, starters] = await Promise.all([getProfile(userId), getUserMovies(userId), getStarterResults()]);
  if (!profile?.handle) return <NeedsHandle />;

  const films = sourceFilms(movies, source, filter);
  const copy = describeSource(source, filter);
  return (
    <>
      <p className="-mt-4 text-body-sm text-body md:text-body-md">
        {copy.from} Take films out, drag them into order or add any film, then share.
      </p>
      <ListEditor
        initial={{ name: copy.name, synced: source !== null, films: films.slice(0, MAX_LIST_FILMS), hidden: [] }}
        source={source}
        filter={filter}
        sourceIds={films.map((f) => f.tmdbId)}
        syncHint={copy.syncHint}
        copyHint={copy.copyHint}
        starters={starters}
        cancelHref={copy.back}
        deletedHref={copy.back}
      />
    </>
  );
}

export default function NewListPage({ searchParams }: PageProps<"/lists/new">) {
  return (
    <EditorPage title="Share a list">
      <NewList searchParams={searchParams} />
    </EditorPage>
  );
}
