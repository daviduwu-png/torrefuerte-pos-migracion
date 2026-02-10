/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1e3a5f",
          light: "#2d5a87",
          dark: "#132740",
        },
      },
      spacing: {
        18: "4.5rem",
      },
      screens: {
        xs: "475px",
      },
    },
  },
  plugins: [],
};
