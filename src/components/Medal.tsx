// Podium medal — one uniform sticker for every placement so gold, silver,
// bronze and the last-place poo read as a matched set: a bright disc, a dashed
// pin-stitch ring in a darker shade of the disc (inset 1px so a thin rim of the
// disc colour frames it), and a hard offset drop shadow (applied in CSS, not
// baked into the SVG). They flip in like a tossed coin landing face-up. Top
// three carry their rank number; last place carries the poo.
type Kind = "gold" | "silver" | "bronze" | "poo";

const DISC: Record<Kind, string> = {
  gold: "#fcd34d",
  silver: "#e5e7eb",
  bronze: "#fb923c",
  poo: "#bdb1e0",
};

const SHADOW = "rgba(63, 26, 133, 0.7)"; // ink, slightly transparent — a softer hard-offset shadow

// The medal's hard-offset drop shadow, shared so the results-row avatars (the
// flip side of these coins) can carry the exact same lift.
export const COIN_SHADOW = `1.5px 1.5px 0 ${SHADOW}`;

// A darker shade of the disc — same hue, just deeper — for the dashed ring and
// the rank number. Reduce only the oklch lightness (keeping chroma + hue) so it
// stays saturated: dark gold / silver / bronze, not muddy brown. Mixing toward
// black instead would drain the chroma and turn gold to brown.
const darker = (bg: string) => `oklch(from ${bg} calc(l * 0.8) c h)`;

export function Medal({
  kind,
  rank,
  delay = 0,
  animate = true,
}: {
  kind: Kind;
  rank?: number;
  delay?: number;
  // When the medal is revealed by some other motion (e.g. riding the back face
  // of a flip card), turn off the built-in coin-flip so it doesn't double up.
  animate?: boolean;
}) {
  const dark = darker(DISC[kind]);
  return (
    <span
      class={`relative grid size-11 shrink-0 place-items-center rounded-full ${
        animate ? "animate-coinFlip" : ""
      }`}
      style={{
        backgroundColor: DISC[kind],
        boxShadow: COIN_SHADOW,
        animationDelay: animate ? `${delay}ms` : undefined,
      }}
    >
      <svg
        class="absolute inset-0 size-full"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        {/* A circle (not a rounded rect) so the dashes don't bunch at corners,
            inset 1px so a thin rim of disc colour frames the ring. pathLength
            normalises the perimeter to 72 so the "1 3" pattern divides exactly
            into 18 evenly spaced dashes regardless of the real circumference. */}
        <circle
          cx="12"
          cy="12"
          r="10.5"
          pathLength="72"
          style={{ stroke: dark }}
          stroke-width="1.5"
          stroke-dasharray="1 3"
          stroke-linecap="round"
        />
        {kind === "poo" && (
          <>
            <path
              fill="#a6643b"
              d="M11.387 8c2.898 1.39 4.25 2.717 3.918 4 3.333 1.667 3.749 5.333 2.749 6s-9.334 1-11 0-1.334-3.333.838-5 5.162-2 3.495-5"
            />
            <path
              fill="#3c2617"
              d="M12.497 13.886a.5.5 0 0 0 .447.895l-.224-.448zM15.305 12l-.484-.126zm-3.918-4 .216-.45a.5.5 0 0 0-.653.693zM7.054 18l.257-.429zm11 0-.278-.416zM7.892 13l-.304-.397zm4.828 1.333.224.447c.788-.393 1.425-.802 1.9-1.232s.81-.9.945-1.422L15.305 12l-.484-.126c-.07.272-.264.585-.648.933s-.936.709-1.676 1.08zM15.305 12l.484.126c.229-.882-.154-1.707-.876-2.437-.719-.727-1.842-1.436-3.31-2.14L11.387 8l-.216.45c1.43.687 2.432 1.337 3.031 1.942.596.602.723 1.081.619 1.482zm-8.251 6-.258.429c.279.167.655.285 1.06.374.416.09.904.16 1.431.21 1.056.102 2.305.133 3.525.112a36 36 0 0 0 3.393-.206c.483-.056.915-.122 1.263-.198.325-.07.65-.163.863-.305L18.054 18l-.278-.416-.002.002-.009.004-.03.015a1 1 0 0 1-.11.041 4 4 0 0 1-.369.098c-.305.066-.701.128-1.166.181-.928.107-2.1.18-3.295.2-1.196.02-2.405-.01-3.412-.107a11 11 0 0 1-1.312-.192c-.373-.082-.622-.172-.76-.255zm11 0 .277.416c.433-.288.625-.825.68-1.347.06-.546-.016-1.19-.232-1.85-.433-1.324-1.455-2.768-3.25-3.666l-.224.447-.224.447c1.538.769 2.39 1.991 2.748 3.084.18.548.23 1.05.189 1.431-.044.406-.174.577-.242.622zM11.387 8l-.437.243c.388.698.46 1.163.406 1.487-.052.316-.24.592-.595.884-.363.299-.844.568-1.416.887-.556.31-1.181.66-1.757 1.102l.304.397.305.397c.51-.392 1.072-.708 1.636-1.023.547-.306 1.116-.62 1.564-.988.456-.375.838-.848.946-1.491.105-.635-.074-1.336-.519-2.138zm-3.495 5-.304-.397c-1.159.89-1.877 1.993-2.048 3.068-.176 1.1.233 2.144 1.256 2.758L7.054 18l.257-.429c-.643-.386-.9-1.009-.784-1.742.121-.759.656-1.655 1.67-2.432z"
            />
            <path
              stroke="#3c2617"
              stroke-linecap="round"
              d="M7.054 11.333c.666-.879-.667-1.666 0-2.666M11.58 6.333c.666-.879-.667-1.666 0-2.666M17.58 11c.666-.88-.667-1.667 0-2.667"
            />
          </>
        )}
      </svg>
      {kind !== "poo" && (
        <span
          class="emboss relative text-base font-bold"
          style={{ color: dark }}
        >
          {rank}
        </span>
      )}
    </span>
  );
}
