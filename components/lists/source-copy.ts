import { ANSWERS } from "@/components/movies/feedback";
import type { ListSource } from "@/lib/lists/rules";
import { isMyFilmsFilter } from "@/lib/movies/types";

// How the list editor talks about where a list comes from.
export function describeSource(
  source: ListSource | null,
  filter: string | null,
): { from: string; name: string; syncHint: string; copyHint: string; back: string } {
  if (source === "watchlist") {
    return {
      from: "From your watchlist.",
      name: "My watchlist",
      syncHint: "Films you save to your watchlist are added here. Films you watch are removed.",
      copyHint: "The list stays as it is now. Changes to your watchlist won’t affect it.",
      back: "/watchlist",
    };
  }
  if (source === "my_films") {
    const f = isMyFilmsFilter(filter) ? filter : "all";
    if (f === "favorite") {
      return {
        from: "From your favourites, in your order.",
        name: "My favourites",
        syncHint: "New favourites are added here. Films you take out of your favourites are removed.",
        copyHint: "The list stays as it is now. Changes to your favourites won’t affect it.",
        back: "/my-movies?show=favourites",
      };
    }
    if (f === "someday") {
      return {
        from: "From the films you might watch someday.",
        name: "Someday",
        syncHint: "Films you mark “Might watch someday” are added here. Films you watch or save are removed.",
        copyHint: "The list stays as it is now. Changes to your someday films won’t affect it.",
        back: "/my-movies?show=someday",
      };
    }
    if (f === "all") {
      return {
        from: "From everything you’ve seen.",
        name: "Films I’ve seen",
        syncHint: "Films you mark as seen are added here. Films you remove from My films are removed.",
        copyHint: "The list stays as it is now. Changes to My films won’t affect it.",
        back: "/my-movies",
      };
    }
    const label = ANSWERS.find((a) => a.feedback === f)?.label ?? "Seen it";
    return {
      from: `From the films you called “${label}”.`,
      name: f === "peak" ? "Peak films" : label,
      syncHint: `Films you rate “${label}” are added here. Films you rate differently are removed.`,
      copyHint: "The list stays as it is now. Changing your ratings won’t affect it.",
      back: `/my-movies?show=${f}`,
    };
  }
  return { from: "Pick any films you like.", name: "", syncHint: "", copyHint: "", back: "/account" };
}
