import type { Config } from 'tailwindcss';

/**
 * Tailwind config for LeadPilot.
 *
 * Design system choices:
 * - Stone palette as primary — warm neutrals read as calm and editorial,
 *   not as the cool grays of analytics dashboards.
 * - System font stack — avoids an external font dependency during scaffolding.
 *   Easy to replace with Inter or similar in Phase 6.
 * - No custom color extensions yet — Tailwind's stone scale covers everything
 *   needed for the coaching-oriented aesthetic.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      maxWidth: {
        content: '720px',
      },
      spacing: {
        sidebar: '240px',
      },
    },
  },
  plugins: [],
};

export default config;
