// Subset of TMDB v3 response shapes we rely on. See https://developer.themoviedb.org/reference

export type TmdbGenre = { id: number; name: string };

export type TmdbCastMember = {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
};

export type TmdbCrewMember = {
  id: number;
  name: string;
  job: string;
  profile_path: string | null;
};

export type TmdbKeyword = { id: number; name: string };

// A movie as it appears in list endpoints (search, discover, recommendations).
export type TmdbMovieSummary = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
};

// `/movie/{id}?append_to_response=credits,keywords`
export type TmdbMovieDetails = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  tagline: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  runtime: number | null;
  genres: TmdbGenre[];
  credits: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
  keywords: { keywords: TmdbKeyword[] };
};

// `/movie/{id}/videos`
export type TmdbVideo = {
  id: string;
  key: string;
  name: string;
  site: string; // "YouTube", "Vimeo"
  type: string; // "Trailer", "Teaser", "Clip", "Featurette", "Behind the Scenes", …
  official: boolean;
  published_at: string;
};

// `/movie/{id}/images`: one backdrop, poster or logo file.
export type TmdbImage = {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
  iso_639_1: string | null; // null: no text in the image
  vote_average: number;
  vote_count: number;
};

export type TmdbProvider = {
  provider_id: number;
  provider_name: string; // "Netflix"
  logo_path: string | null;
  display_priority: number; // lower shows first
};

// One country's offers. `link` is TMDB's watch page for the film there (unused:
// it redirects to JustWatch; chips link to each service instead).
export type TmdbRegionProviders = {
  link: string;
  flatrate?: TmdbProvider[]; // subscription
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
};

export type TmdbPage<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};
