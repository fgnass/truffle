// Shared "stitched card" look: rounded corners, a light-purple gradient, a soft
// purple shadow and a dashed seam (an outline, so it follows the radius and
// stays concentric). Used by the Piggy hint modal and the Setup / player-picker
// cards so the whole app feels consistent. Layout (padding, gap, width) stays
// with each call site.
export const stitchedCard =
  "rounded-3xl bg-gradient-to-b from-primary-50 to-primary-100 emboss " +
  "shadow-[0_20px_50px_-12px_rgba(45,16,89,0.55)] ring-1 ring-primary-200 " +
  "outline outline-2 outline-dashed outline-primary-300/80 -outline-offset-[9px]";
