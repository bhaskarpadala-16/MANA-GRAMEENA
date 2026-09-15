import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        herbal: {
          50: '#f4f8f4',
          100: '#e5efe6',
          200: '#cbdfcd',
          300: '#a4c6a8',
          400: '#75a67c',
          500: '#4f8757',
          600: '#3a6c42',
          700: '#2f5635',
          800: '#255234',
          900: '#1c3d27',
          950: '#0d2215',
        },
        terracotta: {
          50: '#fcf6f3',
          100: '#f7ebe4',
          200: '#edd6ca',
          300: '#dfb7a4',
          400: '#cf9177',
          500: '#bf6641',
          600: '#a25333',
          700: '#864129',
          800: '#6f3624',
          900: '#5b2f21',
        },
        cream: {
          50: '#fdfcf9',
          100: '#fbf9f4',
          200: '#f4f0e6',
          300: '#ede7d8',
          400: '#ded4c0',
          500: '#cbbda5',
        },
        gold: {
          400: '#f3d082',
          500: '#dfac50',
          600: '#c8963e',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
