/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#1A1B1E',
          secondary: '#25262B',
          card: '#2C2D32',
          editor: '#FFFFFF',
        },
        accent: {
          blue: '#6C8EF5',
          blueDark: '#4F6CF0',
        },
        text: {
          primary: '#1A1A2E',
          muted: '#C1C2C5',
          faint: '#5C5F66',
        },
        status: {
          green: '#40C057',
          red: '#FA5252',
          orange: '#FD7E14',
          blue: '#228BE6',
        },
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'cursor-blink': 'blink 1s step-end infinite',
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        'typing': 'typing 0.05s steps(1)',
      },
      keyframes: {
        blink: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0 } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.93)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
