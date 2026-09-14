import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17212B",
        brand: "#175CD3",
        mint: "#E5F8F2",
      },
    },
  },
  plugins: [],
};

export default config;
