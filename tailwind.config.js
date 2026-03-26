/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        'gold-ak':         '#CBA052',
        'gold-deep':       '#A07830',
        'charcoal':        '#1E1E2E',
        'charcoal-light':  '#2C2C3E',
        'silk':            '#F2EBE3',
        'canvas':          '#FFFFFF',
        'ice':             '#F5F7FA',
        'surface':         '#0F0F1A',
        'line':            '#E5E7EB',
        'gray-medium':     '#9E9E9E',
        'emerald-success': '#059669',
        'emerald-light':   '#D1FAE5',
        'amber-warning':   '#D48806',
        'amber-light':     '#FEF3C7',
        'ruby-critical':   '#DC2626',
        'ruby-light':      '#FEE2E2',
        'sapphire-info':   '#3B82F6',
        'sapphire-light':  '#EFF6FF',
        'violet-accent':   '#7C3AED',
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(203, 160, 82, 0.35)',
        'glow-sm':   '0 0 12px rgba(203, 160, 82, 0.2)',
        'card':      '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover':'0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #CBA052, #D48806)',
        'dark-sidebar':  'linear-gradient(180deg, #1E1E2E 0%, #16162A 100%)',
      },
    },
  },
  plugins: [],
};
