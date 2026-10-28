import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        lemon: "#DFFF00",
        soft: "#F5F5F3",
        line: "#E5E5E5",
        muted: "#666666",
        panel: "#1A1A1A",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
        arabic: ["var(--font-arabic)", "system-ui", "sans-serif"],
      },
      letterSpacing: { tightest: "-0.045em" },
      boxShadow: { card: "0 1px 2px rgba(17,17,17,0.04), 0 12px 32px -18px rgba(17,17,17,0.18)" },
      maxWidth: { shell: "1280px" },
      keyframes: {
        rise: { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "none" } },
      },
      animation: { rise: "rise .5s cubic-bezier(.2,.7,.2,1) both" },
    },
  },
  plugins: [],
};
export default config;
