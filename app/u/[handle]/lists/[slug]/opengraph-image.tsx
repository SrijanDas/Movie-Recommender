import { ImageResponse } from "next/og";
import { loadSharedList } from "@/lib/lists/public";
import { avatarImageUrl, initialsOf, parseAvatar } from "@/lib/profile/avatar";
import { posterUrl } from "@/lib/tmdb/images";

// The card chats and social apps show for a list link: its name, whose it
// is, and its first three films fanned out, like the profile card.

export const alt = "A film list on Next Movie";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANVAS = "#101010";
const CANVAS_SOFT = "#1a1a1a";
const INK = "#f2f2f2";
const MUTE = "#8b949e";
const HAIRLINE = "#3d3a39";
const PRIMARY = "#00d992";

export default async function Image({ params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const shared = await loadSharedList(handle, slug);
  const name = shared ? (shared.profile.displayName ?? shared.profile.handle) : "Next Movie";
  const title = shared?.list.name ?? "A film list";
  const count = shared?.films.length ?? 0;
  const posters = (shared?.films ?? [])
    .slice(0, 3)
    .map((m) => posterUrl(m.posterPath, "w342"))
    .filter((src): src is string => Boolean(src));
  const avatarSrc = avatarImageUrl(parseAvatar(shared?.profile.avatar), "png");

  // Back to front: #3 left, #2 right, #1 centre and on top.
  const fan = [
    { src: posters[2], x: 0, rotate: -9, y: 36 },
    { src: posters[1], x: 190, rotate: 9, y: 36 },
    { src: posters[0], x: 95, rotate: 0, y: 0 },
  ].filter((p) => p.src);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: CANVAS, color: INK, padding: 72 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 9999,
                  background: CANVAS_SOFT,
                  border: `2px solid ${HAIRLINE}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                {avatarSrc ? (
                  <img src={avatarSrc} width={64} height={64} style={{ objectFit: "cover" }} alt="" />
                ) : (
                  (initialsOf(name) ?? "")
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 30, color: INK }}>{name}</div>
                {shared && <div style={{ fontSize: 24, color: MUTE }}>{`@${shared.profile.handle}`}</div>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: -1.5, maxWidth: 580 }}>{title}</div>
              {count > 0 && <div style={{ fontSize: 32, color: MUTE }}>{`${count} ${count === 1 ? "film" : "films"}`}</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: MUTE }}>
            <svg width="44" height="44" viewBox="0 0 512 512">
              <rect width="512" height="512" rx="112" fill={PRIMARY} />
              <path d="M150 156 Q150 138 166 147 L312 241 Q326 250 312 265 L166 359 Q150 368 150 350 Z" fill={CANVAS} />
              <rect x="334" y="148" width="40" height="216" rx="10" fill={CANVAS} />
            </svg>
            <span style={{ color: INK }}>Next Movie</span>
          </div>
        </div>
        <div style={{ display: "flex", position: "relative", width: 420, height: 486 }}>
          {fan.map((p, i) => (
            <img
              key={i}
              src={p.src}
              width={230}
              height={345}
              alt=""
              style={{
                position: "absolute",
                left: p.x,
                top: 70 + p.y,
                borderRadius: 14,
                border: `2px solid ${HAIRLINE}`,
                transform: `rotate(${p.rotate}deg)`,
                objectFit: "cover",
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
