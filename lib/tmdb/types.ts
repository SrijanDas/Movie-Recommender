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
  // ISO 639-1 code of the language it was made in ("en", "ko").
  original_language: string;
};

// `/movie/{id}?append_to_response=credits,keywords,external_ids`
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
  original_language: string;
  runtime: number | null;
  // The franchise it belongs to, if any ("The Dark Knight Collection").
  belongs_to_collection: { id: number; name: string } | null;
  genres: TmdbGenre[];
  credits: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
  keywords: { keywords: TmdbKeyword[] };
  // The IMDb id ("tt0111161") opens the film in players that key on it.
  external_ids?: { imdb_id: string | null };
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

// A series as it appears in list endpoints (search, discover, popular).
export type TmdbSeriesSummary = {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
};

// `/search/multi`: films, series and people in one ranked list.
export type TmdbMultiResult =
  | (TmdbMovieSummary & { media_type: "movie" })
  | (TmdbSeriesSummary & { media_type: "tv" })
  | { media_type: "person"; id: number };

// `/tv/{id}?append_to_response=credits,external_ids`
export type TmdbSeriesDetails = {
  id: number;
  name: string;
  first_air_date: string;
  last_air_date: string | null;
  // "Returning Series", "Ended", "Canceled", "In Production", …
  status: string;
  number_of_seasons: number;
  episode_run_time: number[];
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  tagline: string;
  vote_average: number;
  vote_count: number;
  genres: TmdbGenre[];
  created_by: { id: number; name: string; profile_path: string | null }[];
  credits: { cast: TmdbCastMember[] };
  external_ids?: { imdb_id: string | null };
};

// One film or series a person worked on (`combined_credits`).
export type TmdbPersonCredit = {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  character?: string;
  job?: string;
};

// `/person/{id}?append_to_response=combined_credits`
export type TmdbPerson = {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  profile_path: string | null;
  combined_credits: { cast: TmdbPersonCredit[]; crew: TmdbPersonCredit[] };
};
