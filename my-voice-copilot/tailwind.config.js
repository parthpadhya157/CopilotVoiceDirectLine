// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",  // all React components
    "./public/**/*.html",           // in case you have static HTML in public
  ],
  theme: {
    extend: {
      // optional: add custom colors, fonts, etc.
      colors: {
        'brand-emerald': '#10B981',
      },
    },
  },
  plugins: [],
};
