import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListEditor } from "@/components/lists/list-editor";
import { describeSource } from "@/components/lists/source-copy";
import { requireUserId } from "@/lib/auth";
import { resolveList, sourceFilms } from "@/lib/lists/resolve";
import { listPath } from "@/lib/lists/rules";
import { getList } from "@/lib/lists/store";
import { getStarterResults } from "@/lib/movies/starters";
import { getUserMovies } from "@/lib/movies/store";
import { getProfile } from "@/lib/profile/store";
import { profilePath } from "@/lib/profile/rules";
import { EditorPage, NeedsHandle } from "../../editor-page";

export const metadata: Metadata = { title: "Edit list" };

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function EditList({ params }: { params: PageProps<"/lists/[id]/edit">["params"] }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const userId = await requireUserId();
  const [list, profile, movies, starters] = await Promise.all([
    getList(userId, id),
    getProfile(userId),
    getUserMovies(userId),
    getStarterResults(),
  ]);
  if (!list) notFound();
  if (!profile?.handle) return <NeedsHandle />;

  const source = sourceFilms(movies, list.source, list.sourceFilter);
  const inSource = new Set(source.map((f) => f.tmdbId));
  const copy = describeSource(list.source, list.sourceFilter);
  return (
    <>
      <p className="-mt-4 text-body-sm text-body md:text-body-md">
        {copy.from} The link stays the same when you rename it.
      </p>
      <ListEditor
        listId={list.id}
        initial={{
          name: list.name,
          synced: list.synced,
          films: resolveList(list, list.items, movies),
          hidden: list.items.filter((i) => i.hidden && inSource.has(i.tmdbId)).map((i) => i.tmdbId),
        }}
        source={list.source}
        filter={list.sourceFilter}
        sourceIds={[...inSource]}
        syncHint={copy.syncHint}
        copyHint={copy.copyHint}
        starters={starters}
        cancelHref={listPath(profile.handle, list.slug)}
        deletedHref={profilePath(profile.handle)}
      />
    </>
  );
}

export default function EditListPage({ params }: PageProps<"/lists/[id]/edit">) {
  return (
    <EditorPage title="Edit list">
      <EditList params={params} />
    </EditorPage>
  );
}
