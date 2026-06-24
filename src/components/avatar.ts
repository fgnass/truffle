import { Avatar } from "@dicebear/core";
import initialFace from "@dicebear/styles/initial-face.json";

type AvatarEntry = {
  color: string;
  uri: string;
};

const DEFAULT_AVATAR_COLOR = "#94a3b8";

// Piggy (the computer opponent) gets the brand theme violet instead of a hashed
// palette colour. `PIGGY_COLOR` is the tile base (= primary-600);
// `PIGGY_FEATURE_COLOR` is the darker shade used for its name/eyes the way
// `featureColor()` darkens a human's avatar colour (= primary-800).
export const PIGGY_COLOR = "#7c3aed";
export const PIGGY_FEATURE_COLOR = "#5b21b6";

const avatarCache = new Map<string, AvatarEntry>();

function extractBackgroundColor(svg: string) {
  const background = svg.match(
    /<rect\b(?=[^>]*\bwidth="70")(?=[^>]*\bheight="70")(?=[^>]*\bfill="(#[0-9a-fA-F]{6})")[^>]*>/i,
  );
  if (background) return background[1];

  const fills = [...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map(
    (match) => match[1],
  );
  for (let i = fills.length - 1; i >= 0; i--) {
    if (fills[i].toLowerCase() !== "#000000") return fills[i];
  }
  return DEFAULT_AVATAR_COLOR;
}

function avatarEntryFor(name: string) {
  let entry = avatarCache.get(name);
  if (!entry) {
    const avatar = new Avatar(initialFace, { seed: name });
    const svg = avatar.toString();
    entry = {
      color: extractBackgroundColor(svg),
      uri: avatar.toDataUri(),
    };
    avatarCache.set(name, entry);
  }
  return entry;
}

export function colorFor(name: string) {
  return avatarEntryFor(name).color;
}

// The avatar draws its eyes + initial as a darkened shade of the background.
// Approximate that for text rendered next to it (e.g. the player's name).
export function featureColor(name: string) {
  return `color-mix(in srgb, ${colorFor(name)} 50%, black)`;
}

export function avatarFor(name: string) {
  return avatarEntryFor(name).uri;
}
