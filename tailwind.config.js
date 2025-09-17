/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-darkest': '#282814',
        'brand-dark': '#3c3c28',
        'brand-olive': '#50503c',
        'brand-beige-light': '#c8c8b4',
        'brand-gray': '#dcdcdc',
        'brand-beige-rosy': '#c8b4a0',
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config