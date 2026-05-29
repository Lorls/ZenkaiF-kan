import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0B14',
          card: '#10121E',
          elevated: '#171929',
        },
        border: {
          DEFAULT: '#1E2140',
          subtle: '#161830',
        },
        gold: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
          light: '#FCD34D',
          muted: '#78450A',
        },
        ink: {
          DEFAULT: '#E2E8F0',
          muted: '#64748B',
          faint: '#334155',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-fira-code)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(245, 158, 11, 0.15)',
        'glow-sm': '0 0 10px rgba(245, 158, 11, 0.1)',
      },
    },
  },
  plugins: [],
}

export default config
