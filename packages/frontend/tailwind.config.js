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
      },
      fontFamily: {
        display: ['Inter', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'argos-card': '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        'argos-raised': '0 4px 12px rgba(16, 24, 40, 0.06), 0 2px 4px rgba(16, 24, 40, 0.04)',
      },
    },
  },
  plugins: [],
};
