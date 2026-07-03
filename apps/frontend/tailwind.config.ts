import type { Config } from 'tailwindcss';

/**
 * Tailwind config for LeadPilot.
 *
 * Design system:
 * - Inter via next/font/google -- matches Linear, Notion, Raycast typography
 * - Stone palette -- warm neutrals, not the cool grays of analytics dashboards
 * - max-w-content: 720px -- prose cap, keeps the layout readable and non-dashboard
 * - shadow-card / shadow-card-hover -- consistent card elevation tokens
 *
 * Animations:
 * - fade-in: 200ms opacity 0->1 (alerts, inline messages)
 * - fade-in-up: 250ms opacity + 4px translateY (card entry)
 * - fill-mode "both" ensures elements start invisible during animation-delay (staggered lists)
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      maxWidth: {
        content: '720px',
      },
      spacing: {
        sidebar: '240px',
      },
      boxShadow: {
        card:         '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.07), 0 1px 3px 0 rgb(0 0 0 / 0.05)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in':    'fade-in 200ms ease-out both',
        'fade-in-up': 'fade-in-up 250ms ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
