/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary:      '#7B3FF2',
          primaryLight: '#A67CF7',
          primaryDark:  '#5A1ED9',
          orange:       '#FF7A2F',
          green:        '#36D9A0',
          rose:         '#E0389A',
          live:         '#F0365A',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #7B3FF2, #E0389A)',
      },
      animation: {
        'pulse-live': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}

