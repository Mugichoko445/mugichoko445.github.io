/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./docs/**/*.{html,js}'],
  theme: {
    extend: {
      keyframes: {
        'open-menu': {
          '0%': { transform: 'scale(0.99)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'open-menu': 'open-menu 0.25s forwards',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
}
