/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./dashboard.html",
    "./src/**/*.{html,js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        alborada: {
          gold: "#C9A227",
          green: "#1F5A3D",
          cream: "#F8F5EA",
          dark: "#173A2A"
        },
        gold: "#C9A227",
        emerald: "#1F5A3D"
      }
    }
  },
  plugins: []
};
