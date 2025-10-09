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
          gold: '#ffd200',
          blue: '#485470',
        },
        secondary: {
          black: '#000000',
          white: '#FFFFFF',
          'dark-gray': '#333333',
          'medium-gray': '#666666',
          'light-gray': '#DDDDDD',
          'extra-light-gray': '#F5F5F5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
