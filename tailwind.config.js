/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Carbon/cement gray base
        carbon: {
          50: '#f5f6f7',
          100: '#e4e7ea',
          200: '#c8cdd3',
          300: '#9ea7b1',
          400: '#6e7a87',
          500: '#4f5a66',
          600: '#3a434d',
          700: '#2a313a',
          800: '#1c2229',
          900: '#12161b',
          950: '#0a0d11',
        },
        // Dodge-inspired red/amber accent
        scat: {
          50: '#fff1ed',
          100: '#ffe0d4',
          200: '#ffbda8',
          300: '#ff9270',
          400: '#ff6440',
          500: '#f03e16',
          600: '#d32d09',
          700: '#af220b',
          800: '#8c1e10',
          900: '#731e12',
          950: '#3f0c05',
        },
        // Steel blue secondary
        steel: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bcdcff',
          300: '#8ec6ff',
          400: '#58a5ff',
          500: '#2f84f8',
          600: '#1666ee',
          700: '#1350d4',
          800: '#1543ab',
          900: '#163a86',
          950: '#102451',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['Oswald', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
