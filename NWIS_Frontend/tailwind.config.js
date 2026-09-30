/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nwis: {
          navy: {
            950: '#070D18',
            900: '#0A1322',
            850: '#0E1A2D',
            800: '#132238',
            700: '#1C314E',
          },
          primary: {
            DEFAULT: '#B91C1C', // NWIS Crimson accent as in design
            hover: '#991B1B',
            active: '#7F1D1D',
            light: '#FEF2F2',
          },
          cyan: {
            DEFAULT: '#0284C7',
            light: '#E0F2FE',
            dark: '#0369A1',
          },
          teal: {
            DEFAULT: '#0D9488',
            light: '#CCFBF1',
          },
          surface: {
            light: '#F8FAFC',
            card: '#FFFFFF',
            border: '#E2E8F0',
          },
          slate: {
            900: '#0F172A',
            800: '#1E293B',
            700: '#334155',
            600: '#475569',
            500: '#64748B',
            400: '#94A3B8',
            300: '#CBD5E1',
            200: '#E2E8F0',
            100: '#F1F5F9',
            50: '#F8FAFC',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
