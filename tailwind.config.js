/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          gold: '#fbbc05',
          blue: '#485470',
        },
        secondary: {
          black: '#000000',
          white: '#FFFFFF',
          'dark-gray': '#333333',
          'medium-gray': '#666666',
          'light-gray': '#DDDDDD',
          'extra-light-gray': '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Google Sans', 'Roboto', 'sans-serif']
      },
    },
  },
  plugins: [],
}
