/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Slate palette uses CSS variables so themes can swap values
        slate: {
          50:  'rgb(var(--color-slate-50)  / <alpha-value>)',
          100: 'rgb(var(--color-slate-100) / <alpha-value>)',
          200: 'rgb(var(--color-slate-200) / <alpha-value>)',
          300: 'rgb(var(--color-slate-300) / <alpha-value>)',
          400: 'rgb(var(--color-slate-400) / <alpha-value>)',
          500: 'rgb(var(--color-slate-500) / <alpha-value>)',
          600: 'rgb(var(--color-slate-600) / <alpha-value>)',
          700: 'rgb(var(--color-slate-700) / <alpha-value>)',
          800: 'rgb(var(--color-slate-800) / <alpha-value>)',
          900: 'rgb(var(--color-slate-900) / <alpha-value>)',
          950: 'rgb(var(--color-slate-950) / <alpha-value>)',
        },
        // ARGOS v3 — neutral redesign palette (white/gray/dark-gray, no navy/gold)
        ink: {
          50:  '#F6F7F8',
          100: '#ECECEF',
          200: '#E6E7EA',
          300: '#C6CAD0',
          400: '#9AA1AC',
          500: '#8A909A',
          600: '#5C636E',
          700: '#3A3F47',
          800: '#2A2F36',
          900: '#1F2328',
        },
        paper:      '#F2F3F4',
        brand:      '#1F2328',
        'brand-ink':  '#FFFFFF',
        'brand-soft': '#2F333A',
        gold:       '#5C636E',
        'gold-soft': '#ECECEF',
        pos:        '#2F7D5A',
        'pos-soft':  '#D8E9DF',
        warn:       '#B38A1F',
        'warn-soft': '#F1E5C1',
        neg:        '#B0452A',
        'neg-soft':  '#EED4CA',
        info:       '#1F4A7A',
        'info-soft': '#D4E0EE',
        // ARGOS Designer UX spec (2026-05-04) — vacuum-arm panels
        // Light surfaces with single accent + viewport-only dark.
        // 기존 paper(#F8F7F3)/ink-*/gold(#B8892B)와 별개로 spec 정확도 높음.
        designer: {
          surface:   '#FAFAF7',
          'surface-2': '#F2F0EA',
          card:      '#FFFFFF',
          ink:       '#1A1A1A',
          'ink-2':   '#3A3A3A',
          muted:     '#6B6B6B',
          rule:      '#E2DED4',
          accent:    '#D4A22F',
          'accent-soft': 'rgba(212, 162, 47, 0.25)',
          risk:      '#D63F6F',
          pass:      '#3F8C6E',
          viewport:  '#1F1F23',
        },
      },
      fontFamily: {
        display: ['Pretendard', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        serif:   ['var(--font-serif)', '"IBM Plex Serif"', 'Georgia', 'serif'],
        sans:    ['Pretendard', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', '"IBM Plex Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'report':    '0 1px 2px rgba(20, 22, 26, 0.05)',
        'report-lg': '0 4px 12px rgba(20, 22, 26, 0.06), 0 2px 4px rgba(20, 22, 26, 0.04)',
      },
    },
  },
  plugins: [],
};
