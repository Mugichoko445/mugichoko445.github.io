/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./docs/**/*.{html,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        accent:       '#3b6db5',
        'accent-dark': '#2d5690',
        surface:      '#f0f0f0',
        primary:      '#212121',
        muted:        '#757575',
        subtle:       '#f5f5f5',
      },
      maxWidth: {
        site: '71.25rem',
      },
    },
  },
}
