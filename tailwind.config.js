/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./contexts/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#12151B",
          soft: "#181C24",
        },
        surface: {
          DEFAULT: "#1B1F27",
          alt: "#232838",
          raised: "#282E3D",
        },
        line: "#2C313F",
        parchment: {
          DEFAULT: "#ECE9E1",
          dim: "#9AA0AC",
          faint: "#6B7180",
        },
        gold: {
          DEFAULT: "#C9A24B",
          bright: "#E0BE6E",
          dim: "#8A7238",
        },
        gain: {
          DEFAULT: "#4FAF8B",
          bright: "#6FCBA6",
        },
        loss: {
          DEFAULT: "#C1573F",
          bright: "#DB6E54",
        },
        warn: "#D98B3F",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "ledger-lines":
          "repeating-linear-gradient(to bottom, transparent, transparent 27px, #2C313F 28px)",
      },
    },
  },
  plugins: [],
};
