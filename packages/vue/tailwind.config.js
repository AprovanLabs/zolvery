/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}', './docs/**/*.{md,html}'],
  theme: {
    extend: {
      backgroundImage: {
        striped: 'repeating-linear-gradient(45deg, currentColor 0%, currentColor 25%, lch(from currentColor calc(l - 20) c h) 25%, lch(from currentColor calc(l - 20) c h) 50%)',
        bordered: 'radial-gradient(currentColor 0px, currentColor 50%, lch(from currentColor calc(l - 20) c h) 50%, lch(from currentColor calc(l - 20) c h) 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-primeui')],
};
