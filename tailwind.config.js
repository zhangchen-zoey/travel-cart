/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        ctrip: {
          blue: '#0086f6',
          orange: '#ff6913',
        },
      },
    },
  },
  plugins: [],
};
