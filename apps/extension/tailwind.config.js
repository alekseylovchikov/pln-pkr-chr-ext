/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      animation: {
        spin: 'spin 0.8s linear infinite',
      },
    },
  },
  plugins: [],
};
