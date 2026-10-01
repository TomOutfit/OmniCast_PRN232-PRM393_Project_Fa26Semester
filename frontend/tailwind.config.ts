import type { Config } from 'tailwindcss';

/**
 * OmniCast · Design Tokens
 *
 * Two coexisting systems are exposed:
 *  • Legacy `primary-50..950`, `dark-*`, `accent-*`, `channel-*` — kept for
 *    existing screens (home, EPG grid, channel pages, etc.).
 *  • Stitch design system tokens (`surface.*`, `primary-cyan`, `secondary-*`,
 *    `tertiary-*`, `error-coral`) — exported from the canonical Live TV &
 *    EPG screen. New auth/onboarding flows use these tokens so they share
 *    the same visual DNA as the main broadcast hub.
 *
 * Fonts:
 *  • `font-display` → Outfit  (headlines, hero)
 *  • `font-sans`    → Inter   (body)
 *  • `font-mono`    → JetBrains Mono  (telemetry / labels)
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Legacy primary (sky) ── kept for back-compat
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },

        // ── Accents ──
        accent: {
          gold: '#FFD700',
          cyan: '#00D9FF',
          magenta: '#FF00FF',
        },

        // ── Dark scale (slate) ──
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },

        // ── Channel category colors ──
        channel: {
          sports: '#FF4444',
          show: '#9944FF',
          entertainment: '#FF8800',
          cine: '#FFD700',
          drama: '#FF0088',
          news: '#0088FF',
          music: '#00FF88',
          kids: '#FFBB00',
        },

        // ════════════════════════════════════════════════════════════════
        // Stitch Design System · M3 dark tokens (canonical brand colors)
        // ════════════════════════════════════════════════════════════════

        // Brand · cyan (primary)
        'primary-cyan': {
          DEFAULT: '#e0fdff',           // primary text/icon on dark surface
          container: '#00f2fe',         // primary-container (chips, buttons)
          fixed: '#6ff6ff',
          'fixed-dim': '#00dce6',
          on: '#00373a',                // text on primary container
          'on-container': '#006a70',
          'on-fixed': '#002022',
          'on-fixed-variant': '#004f53',
          inverse: '#00696f',
        },

        // Surface scale (deep navy → almost black)
        surface: {
          DEFAULT: '#0f131d',           // page bg
          dim: '#0f131d',
          bright: '#353944',
          'container-lowest': '#0a0e18',
          'container-low': '#171b26',
          container: '#1c1f2a',
          'container-high': '#262a35',
          'container-highest': '#313540',
          variant: '#313540',
          tint: '#00dce6',
          inverse: '#dfe2f1',
        },

        // Text / foreground
        'on-surface': {
          DEFAULT: '#dfe2f1',
          variant: '#b9cacb',
          inverse: '#2c303b',
        },

        // Secondary · ice blue
        secondary: {
          DEFAULT: '#9bcbff',
          container: '#3196e6',
          fixed: '#d0e4ff',
          'fixed-dim': '#9bcbff',
          on: '#003256',
          'on-container': '#002c4b',
          'on-fixed': '#001d34',
          'on-fixed-variant': '#004a7a',
        },

        // Tertiary · purple
        tertiary: {
          DEFAULT: '#fcf5ff',
          container: '#e3d4ff',
          fixed: '#e9ddff',
          'fixed-dim': '#d1bcff',
          on: '#3c0090',
          'on-container': '#7318ff',
          'on-fixed': '#23005b',
          'on-fixed-variant': '#5700c9',
        },

        // Error · coral red
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
          on: '#690005',
          'on-container': '#ffdad6',
        },

        // Outline
        outline: {
          DEFAULT: '#849495',
          variant: '#3a494b',
        },

        // Brand aliases (Stitch uses `bg-surface`, `text-on-surface`)
        background: '#0f131d',
        foreground: '#dfe2f1',
      },

      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: [
          'var(--font-display)',
          'Outfit',
          'system-ui',
          'sans-serif',
        ],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },

      animation: {
        'live-pulse': 'live-pulse 2s ease-in-out infinite',
        'live-ping': 'live-ping 1.4s cubic-bezier(0,0,.2,1) infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'glow-pulse': 'glow-pulse 2.6s ease-in-out infinite',
        'sweep': 'sweep 8s linear infinite',
      },

      keyframes: {
        'live-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'live-ping': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 242, 254, 0.45)' },
          '50%': { boxShadow: '0 0 0 10px rgba(0, 242, 254, 0)' },
        },
        'sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #020617 0%, #1e293b 50%, #0f172a 100%)',
        'card-gradient': 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.95) 100%)',
        'stitch-hero':
          'radial-gradient(ellipse at top, rgba(0,242,254,0.18) 0%, rgba(15,19,29,0) 55%)',
        'stitch-grid':
          'linear-gradient(rgba(58,73,75,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(58,73,75,0.18) 1px, transparent 1px)',
      },

      boxShadow: {
        glow: '0 0 20px rgba(14, 165, 233, 0.3)',
        'glow-gold': '0 0 20px rgba(255, 215, 0, 0.3)',
        'glow-live': '0 0 10px rgba(239, 68, 68, 0.5)',
        'glow-cyan':
          '0 0 24px rgba(0, 242, 254, 0.35), 0 8px 28px rgba(0, 242, 254, 0.18)',
        'stitch-card':
          '0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 38px -16px rgba(0,0,0,0.55)',
      },

      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },

      fontSize: {
        'label-code': ['10px', { lineHeight: '12px', letterSpacing: '0.06em' }],
        'label-telemetry': [
          '12px',
          { lineHeight: '16px', letterSpacing: '0.05em' },
        ],
        'label-badge': [
          '11px',
          { lineHeight: '14px', letterSpacing: '0.08em' },
        ],
      },
    },
  },
  plugins: [],
};

export default config;
