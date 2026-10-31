// Stremio is a free, open-source player that keys films by IMDb id. Its
// detail route is /detail/{type}/{id}/{videoId} (stremio-web routesRegexp.js);
// the app registers the stremio:// scheme and the same app runs on the web.
export const STREMIO = "Stremio";

export const stremioLinks = (imdbId: string) => ({
  app: `stremio:///detail/movie/${imdbId}/${imdbId}`,
  web: `https://web.stremio.com/#/detail/movie/${imdbId}/${imdbId}`,
});
