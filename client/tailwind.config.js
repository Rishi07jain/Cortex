/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Warm neutral surfaces (PRD 12) - calm even with hundreds of nodes.
        paper: '#fbfaf9',
        surface: '#ffffff',
        canvas: '#f4f3f1',
        ink: {
          50: '#f6f6f5',
          100: '#e8e8e6',
          200: '#d3d3cf',
          300: '#b0b0aa',
          400: '#85857e',
          500: '#6a6a63',
          600: '#54544e',
          700: '#44443f',
          800: '#2b2b28',
          900: '#1a1a18',
        },
        // Watermelon / coral accent - used sparingly for CTAs, selection, active edges.
        melon: {
          50: '#fff1f2',
          100: '#ffe0e3',
          200: '#ffc6cc',
          300: '#ff9da8',
          400: '#fb6b7c',
          500: '#e2445c',
          600: '#c92c46',
          700: '#a81f38',
          800: '#8b1d33',
          900: '#761c30',
        },
        // Semantic node-type colours (PRD 12 "supporting colors").
        node: {
          text: '#64748b',
          document: '#5b7cc4',
          image: '#3fa08a',
          video: '#a06bc9',
          link: '#4a95b8',
          person: '#d9834a',
          event: '#c05f8c',
          place: '#7d9b4e',
          org: '#8a7cc2',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.035em',
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,26,24,0.04), 0 8px 24px -12px rgba(26,26,24,0.12)',
        float: '0 2px 6px rgba(26,26,24,0.06), 0 18px 40px -16px rgba(26,26,24,0.22)',
        nodeSelected: '0 0 0 2px #e2445c, 0 8px 24px -10px rgba(226,68,92,0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
