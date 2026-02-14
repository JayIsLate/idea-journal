import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#FAFAFA",
        text: "#1A1A1A",
        secondary: "#888888",
        accent: "#FF4D00",
        card: "#FFFFFF",
        border: "#E5E5E5",
      },
      fontFamily: {
        mono: ["var(--font-jetbrains)", "monospace"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        stream: "720px",
      },
    },
  },
  plugins: [],
};
export default config;
