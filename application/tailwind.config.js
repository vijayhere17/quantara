/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './resources/js/member-panel/**/*.{js,ts,jsx,tsx}',
    './resources/views/users/dashboard.blade.php',
  ],
  theme: {
    extend: {
      colors: {
        q: {
          bg: '#0a0b14',
          'bg-2': '#0d0f1a',
          sidebar: '#0c0e18',
          card: '#10121c',
          'card-2': '#121522',
          border: 'rgba(90, 160, 255, 0.14)',
          'border-strong': 'rgba(0, 212, 255, 0.28)',
          text: '#ffffff',
          muted: '#8b95ab',
          soft: '#a8b0c4',
          cyan: '#00d4ff',
          'cyan-2': '#22e0ff',
          blue: '#3b82f6',
          purple: '#8b5cf6',
          violet: '#a855f7',
          teal: '#2dd4bf',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 18px 40px rgba(0, 0, 0, 0.35)',
        glow: '0 0 40px rgba(139, 92, 246, 0.25)',
        'glow-cyan': '0 12px 32px rgba(0, 212, 255, 0.28)',
        'btn-glow': '0 10px 28px rgba(0, 212, 255, 0.3)',
      },
      borderRadius: {
        card: '16px',
        'card-lg': '20px',
      },
      backgroundImage: {
        'q-gradient': 'linear-gradient(90deg, #00d4ff 0%, #8b5cf6 100%)',
        'q-gradient-br': 'linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%)',
        'q-name': 'linear-gradient(90deg, #a855f7 0%, #3b82f6 55%, #00d4ff 100%)',
      },
      width: {
        sidebar: '260px',
      },
      spacing: {
        sidebar: '260px',
        header: '72px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.85)' },
        },
        'glow-breathe': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.55s ease-out both',
        'pulse-dot': 'pulse-dot 1.8s ease-in-out infinite',
        'glow-breathe': 'glow-breathe 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
