/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDF7F6',
          100: '#F9ECE9',
          200: '#F2D7D0',
          300: '#E6B9AE',
          400: '#D59483',
          500: '#C27360',
          600: '#A75644',
          700: '#874132',
          800: '#6C3227',
          900: '#4A231A',
        },
        charcoal: {
          50: '#F6F5F5',
          100: '#E3E0DE',
          500: '#645451',
          800: '#3D312F',
          900: '#261E1D',
        },
        roseGold: '#D49B8B',
        creamBg: '#FAF6F4',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(195, 115, 96, 0.08), 0 2px 6px -1px rgba(74, 35, 26, 0.04)',
        'card': '0 10px 30px -5px rgba(74, 35, 26, 0.06), 0 4px 12px -2px rgba(195, 115, 96, 0.04)',
        'glow': '0 0 25px rgba(212, 155, 139, 0.35)',
      }
    },
  },
  plugins: [],
};
