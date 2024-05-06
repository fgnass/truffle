import { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        digits: ["kalam"],
      },
      colors: {
        primary: colors.violet,
      },
      boxShadow: {
        subtle: `0 1px 2px rgba(44, 44, 44, 0.2)`,
        paper: `rgba(0, 0, 0, 0.07) 0px 1px 1px, rgba(0, 0, 0, 0.07) 0px 2px 2px,
                  rgba(0, 0, 0, 0.07) 0px 4px 4px, rgba(0, 0, 0, 0.07) 0px 8px 8px,
                  rgba(0, 0, 0, 0.07) 0px 16px 16px`,

        inset: `inset 0 0.1em 1px #bbb, inset 0 -0.1em 1px #fff,
                inset 0.1em 0 1px #d7d7d7, inset -0.1em 0 1px #d7d7d7;`,
      },
      keyframes: {
        fly: {
          to: {
            translate: "0 -100vh",
            scale: "2.4",
            opacity: "0",
          },
        },
      },
      animation: {
        fly: "fly 1300ms ease-in-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
