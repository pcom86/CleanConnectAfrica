import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#16a34a",
          "green-dark": "#15803d",
          "green-light": "#dcfce7",
          orange: "#ea580c",
          "orange-dark": "#c2410c",
          "orange-light": "#ffedd5",
        },
      },
    },
  },
  plugins: [],
};

export default config;
