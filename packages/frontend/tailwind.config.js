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
        // ARGOS design system palette (fixed — does not theme-swap)
        argos: {
          bg:         '#F4F6FA', // page background
          bgAlt:      '#EEF1F6', // alternate surface
          surface:    '#FFFFFF', // cards
          border:     '#E5E9F0', // card / divider border
          borderSoft: '#EEF1F6', // faint dividers
          ink:        '#1E2838', // primary navy ink
          inkSoft:    '#4A5468', // secondary ink
          muted:      '#6B7585', // muted text
          faint:      '#98A2B3', // caption / placeholder
          navy:       '#1E2838', // dark blocks (sidebar logo block, dark buttons)
          navyDark:   '#141B26', // darker navy
          blue:       '#2563EB', // primary accent
          blueHover:  '#1D4ED8',
          blueSoft:   '#3B82F6',
          chip:       '#DBE8FA', // soft blue chip bg
          chipInk:    '#2563EB',
          chipAlt:    '#E8EEFB',
          success:    '#22C55E',
          successBg:  '#DCFCE7',
          successInk: '#15803D',
          danger:     '#EF4444',
          dangerBg:   '#FEE2E2',
          dangerInk:  '#B91C1C',
          warning:    '#F59E0B',
          warningBg:  '#FEF3C7',
          warningInk: '#B45309',
        },
        // ARGOS v2 — consulting report palette (active design system)
        ink: {
          50:  '#F6F7F9',
          100: '#EDEFF3',
          200: '#D9DDE4',
          300: '#B4BBC7',
          400: '#818A9B',
          500: '#5A6475',
          600: '#3D4656',
          700: '#2A3342',
          800: '#18202E',
          900: '#0B1E3A',
        },
        paper:      '#F8F7F3',
        brand:      '#0B1E3A',
        'brand-ink':  '#FFFFFF',
        'brand-soft': '#15325B',
        gold:       '#B8892B',
        'gold-soft': '#E7D9B2',
        pos:        '#2F7D5A',
        'pos-soft':  '#D8E9DF',
        warn:       '#B38A1F',
        'warn-soft': '#F1E5C1',
        neg:        '#B0452A',
        'neg-soft':  '#EED4CA',
        info:       '#1F4A7A',
        'info-soft': '#D4E0EE',
      },
      fontFamily: {
        display: ['var(--font-sans)', 'Inter', 'Pretendard', 'system-ui', 'sans-serif'],
        serif:   ['var(--font-serif)', '"Source Serif 4"', 'Georgia', 'serif'],
        sans:    ['var(--font-sans)', 'Inter', 'Pretendard', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', '"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'argos-card': '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        'argos-raised': '0 4px 12px rgba(16, 24, 40, 0.06), 0 2px 4px rgba(16, 24, 40, 0.04)',
      },
    },
  },
  plugins: [],
};
