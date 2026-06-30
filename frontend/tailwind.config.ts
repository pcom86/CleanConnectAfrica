import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0B2E5B",
          "navy-dark": "#081E3D",
          "navy-light": "#E3F2FD",
          green: "#4CAF50",
          "green-dark": "#388E3C",
          "green-light": "#E8F5E9",
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
