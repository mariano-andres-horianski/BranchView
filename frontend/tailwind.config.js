/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        corporate: {
          sidebar: "#0f172a", // Dark navy
          blue: "#1d4ed8",    // Corporate blue
          light: "#f8fafc",   // Very light gray background
        }
      }
    },
  },
  plugins: [],
}
