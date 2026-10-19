"use client";

import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The film search input: icon, field, spinner while searching, and a clear
// button once there's text. Shared by /search, the favourites picker, and
// My films (which searches only your own list, hence `placeholder`).
export function SearchField({
  value,
  onChange,
  loading = false,
  autoFocus,
  size = "md",
  placeholder = "Search for a film",
}: {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  autoFocus?: boolean;
  size?: "md" | "lg";
  placeholder?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-3 rounded-lg border border-input bg-muted px-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
        size === "lg" ? "h-12" : "h-11",
      )}
    >
      <SearchIcon className="size-5 shrink-0 text-mute" aria-hidden />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        autoFocus={autoFocus}
        autoComplete="off"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-mute [&::-webkit-search-cancel-button]:hidden",
          size === "lg" ? "text-body-lg" : "text-body-md",
        )}
      />
      {loading && <Loader2Icon className="size-4 shrink-0 animate-spin text-mute" aria-label="Searching" />}
      {value && (
        <Button variant="ghost" size="icon-sm" aria-label="Clear search" onClick={() => onChange("")}>
          <XIcon />
        </Button>
      )}
    </label>
  );
}
