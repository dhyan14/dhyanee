/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#7c3aed',
          light: '#8b5cf6',
          dark: '#6d28d9',
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease forwards',
        'pulse-glow': 'pulseGlow 2s infinite',
        'spin-slow': 'spinSlow 3s linear infinite',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
        siren: 'siren 0.5s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(124,58,237,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(124,58,237,0.6)' },
        },
        spinSlow: { to: { transform: 'rotate(360deg)' } },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        siren: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
