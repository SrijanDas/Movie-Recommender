// Subset of TMDB v3 response shapes we rely on. See https://developer.themoviedb.org/reference

export type TmdbGenre = { id: number; name: string };

export type TmdbCastMember = {
  id: number;
  name: string;
  character: string;
  order: number;
};

export type TmdbCrewMember = {
  id: number;
  name: string;
  job: string;
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
  overview: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  runtime: number | null;
  genres: TmdbGenre[];
  credits: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
  keywords: { keywords: TmdbKeyword[] };
};

export type TmdbPage<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};
