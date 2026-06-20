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
          base: '#09090F',
          card: '#0E0F1A',
          elevated: '#161826',
        },
        border: {
          DEFAULT: '#1F2238',
          subtle: '#161930',
        },
        gold: {
          DEFAULT: '#E8A020',
          dark: '#C8850A',
          light: '#F5C842',
          muted: '#6B3D0A',
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
        glow: '0 0 20px rgba(232, 160, 32, 0.15)',
        'glow-sm': '0 0 10px rgba(232, 160, 32, 0.1)',
      },
    },
  },
  plugins: [],
}

export default config
