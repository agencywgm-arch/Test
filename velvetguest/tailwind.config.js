/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'sans-serif'],
      },
      colors: {
        apple: {
          bg: '#F5F5F7',
          black: '#1D1D1F',
          gray: '#6E6E73',
          border: '#D2D2D7',
        },
      },
    },
  },
  plugins: [],
}

