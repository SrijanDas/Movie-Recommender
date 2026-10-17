"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { importLocalMovies } from "@/app/actions";
import { clearLocalMovies, readLocalMovies } from "@/lib/movies/local";

// Guards against StrictMode's double effect and repeat mounts mid-import.
let importing = false;

// Rendered only when signed in. Moves the guest list this browser kept in
// localStorage into the account, then clears it. On failure the local copy
// stays so the next page load retries. Renders nothing.
export function ImportLocalList() {
  const router = useRouter();
  useEffect(() => {
    const local = readLocalMovies();
    if (importing || local.length === 0) return;
    importing = true;
    importLocalMovies(local.map(({ tmdbId, signal }) => ({ tmdbId, signal })))
      .then((result) => {
        if (!result.ok) return;
        clearLocalMovies();
        if (result.added) {
          toast.success(`Saved ${result.added} ${result.added === 1 ? "film" : "films"} from this device to your account`);
        }
        router.refresh();
      })
      .catch(console.error)
      .finally(() => {
        importing = false;
      });
  }, [router]);
  return null;
}
