import { Config } from "tailwindcss";

const primary = {
  50: "#f5f3ff",
  100: "#ede9fe",
  200: "#ddd6fe",
  300: "#c4b5fd",
  400: "#a78bfa",
  500: "#8b5cf6",
  600: "#7c3aed",
  700: "#6d28d9",
  800: "#5b21b6",
  900: "#4c1d95",
  950: "#2e1065",
};

const piggy = {
  fill: "#B59CFF",
  stroke: "#332061",
};

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        digits: ["knewave"],
        logo: ["knewave"],
      },
      fontSize: {
        // The shared "dialog body" size — the running text inside the intro,
        // settings, Piggy hint and install prompt. One token so the reading
        // size for all dialog copy is tuned in a single place. Size only;
        // line-height stays with each call site's `leading-*`.
        body: "0.95rem",
        // Small caption / annotation text (seat status, row hints) that sits a
        // notch below `text-xs`.
        caption: "0.7rem",
      },
      colors: {
        primary,
        piggy,
        // The dark "logo purple" used for handwritten digits, the mascot outline
        // and stroked headings. A deep violet — kept clearly purple rather than
        // near-black so it doesn't read as gray/black.
        ink: "#3f1a85",
      },
      boxShadow: {
        subtle: `1px 2px 4px var(--tw-shadow-color, rgba(63, 26, 133, 0.22))`,
        paper: `rgba(0, 0, 0, 0.07) 0px 1px 1px, rgba(0, 0, 0, 0.07) 0px 2px 2px,
                  rgba(0, 0, 0, 0.07) 0px 4px 4px, rgba(0, 0, 0, 0.07) 0px 8px 8px,
                  rgba(0, 0, 0, 0.07) 0px 16px 16px`,

        inset: `inset 0 0.1em 1px #bbb, inset 0 -0.1em 1px #fff,
                inset 0.1em 0 1px #d7d7d7, inset -0.1em 0 1px #d7d7d7;`,
      },
      keyframes: {
        boardRoll: {
          "0%, 100%": {
            transform: "translateY(0) rotate(0deg)",
          },
          "35%": {
            transform: "translateY(-2px) rotate(-0.35deg)",
          },
          "70%": {
            transform: "translateY(1px) rotate(0.25deg)",
          },
        },
        fly: {
          // Grow from small to large while floating up and fading out. Scale
          // rises monotonically (no overshoot/punch).
          "0%": { translate: "0 0", scale: "0.5", opacity: "0" },
          "15%": { opacity: "1" },
          "100%": { translate: "0 -100vh", scale: "2.4", opacity: "0" },
        },
        // Combo multiplier: scales in after "Perfekt!" has flown off, holds
        // briefly, then fades out. Played with a delay to stagger after fly.
        comboBadge: {
          "0%": { scale: "0.3", opacity: "0" },
          "30%": { scale: "1", opacity: "1" },
          "65%": { scale: "1", opacity: "1" },
          "100%": { scale: "1.4", opacity: "0" },
        },
        // Modal entrance: scale + fade in.
        popIn: {
          from: { scale: "0.9", opacity: "0" },
          to: { scale: "1", opacity: "1" },
        },
        // Podium medals flip in like a tossed coin landing face-up. Perspective
        // is baked into the transform so no parent 3D context is needed.
        coinFlip: {
          "0%": {
            transform: "perspective(420px) rotateY(-180deg) scale(0.8)",
            opacity: "0",
          },
          "55%": { opacity: "1" },
          "100%": {
            transform: "perspective(420px) rotateY(0deg) scale(1)",
            opacity: "1",
          },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        writeDown: {
          from: {
            opacity: "0",
            scale: "4",
          },
          to: {
            opacity: "1",
            scale: "1",
          },
        },
      },
      animation: {
        boardRoll: "boardRoll 650ms ease-out",
        fly: "fly 1300ms ease-in-out both",
        comboBadge: "comboBadge 1200ms ease-out 650ms both",
        popIn: "popIn 200ms ease-out",
        coinFlip: "coinFlip 600ms cubic-bezier(0.2,0.7,0.3,1.1) both",
        fadeIn: "fadeIn 200ms ease-out",
        writeDown: "writeDown 300ms ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
